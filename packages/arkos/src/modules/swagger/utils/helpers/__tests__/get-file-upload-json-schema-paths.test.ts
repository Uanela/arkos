import { ArkosConfig } from "../../../../../exports";
import getFileUploadJsonSchemaPaths from "../get-file-upload-json-schema-paths";

jest.mock("fs");
jest.mock("../../../../../utils/dynamic-loader", () => ({
  getModuleComponents: jest.fn(),
}));

jest.mock("../../../../file-upload/file-upload.service", () => ({
  fileUploadDefaultRestrictions: {
    images: {
      maxSize: 1024 * 1024 * 15,
      maxCount: 30,
      supportedFilesRegex: /jpeg|jpg|png|gif|webp/,
    },
    videos: {
      maxSize: 1024 * 1024 * 5096,
      maxCount: 10,
      supportedFilesRegex: /mp4|avi|mov|mkv/,
    },
    documents: {
      maxSize: 1024 * 1024 * 50,
      maxCount: 30,
      supportedFilesRegex: /pdf|doc|docx/,
    },
    files: {
      maxSize: 1024 * 1024 * 5096,
      maxCount: 10,
      supportedFilesRegex: /.*/,
    },
  },
}));

describe("getFileUploadJsonSchemaPaths", () => {
  const mockConfig: ArkosConfig = {
    fileUpload: {
      baseRoute: "/api/uploads/",
      baseUploadDir: "uploads",
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return empty paths when fileUpload is not configured", async () => {
    const config = { ...mockConfig, fileUpload: undefined };
    const result = await getFileUploadJsonSchemaPaths(config);
    expect(result).toEqual({});
  });

  it("should include all file upload endpoints", async () => {
    const result = await getFileUploadJsonSchemaPaths(mockConfig);

    expect(result).toHaveProperty("/api/uploads/{filePath*}");
    expect(result).toHaveProperty("/api/uploads/{fileType}");
    expect(result).toHaveProperty("/api/uploads/{fileType}/{fileName}");
  });

  it("should configure GET endpoint for static file serving", async () => {
    const result = await getFileUploadJsonSchemaPaths(mockConfig);
    const getEndpoint: any = result["/api/uploads/{filePath*}"]?.get;

    expect(getEndpoint).toBeDefined();
    expect(getEndpoint?.operationId).toBe("findFile");
    expect(getEndpoint?.tags).toContain("File Upload");
    expect(getEndpoint?.parameters).toHaveLength(1);
    expect(getEndpoint?.parameters?.[0].name).toBe("filePath");
  });

  it("should configure POST endpoint with multipart/form-data", async () => {
    const result = await getFileUploadJsonSchemaPaths(mockConfig);
    const postEndpoint: any = result["/api/uploads/{fileType}"]?.post;

    expect(postEndpoint).toBeDefined();
    expect(postEndpoint?.operationId).toBe("uploadFile");
    expect(postEndpoint?.requestBody?.content).toHaveProperty(
      "multipart/form-data"
    );
  });

  it("should include image processing query parameters", async () => {
    const result = await getFileUploadJsonSchemaPaths(mockConfig);
    const postEndpoint: any = result["/api/uploads/{fileType}"]?.post;

    const paramNames = postEndpoint?.parameters?.map((p: any) => p.name);
    expect(paramNames).toContain("format");
    expect(paramNames).toContain("width");
    expect(paramNames).toContain("height");
    expect(paramNames).toContain("resizeTo");
  });

  it("should document file type enum in path parameter", async () => {
    const result = await getFileUploadJsonSchemaPaths(mockConfig);
    const postEndpoint: any = result["/api/uploads/{fileType}"]?.post;

    const fileTypeParam = postEndpoint?.parameters?.find(
      (p: any) => p.name === "fileType"
    );
    expect(fileTypeParam?.schema?.enum).toEqual([
      "images",
      "videos",
      "documents",
      "files",
    ]);
  });

  it("should include file restrictions in descriptions", async () => {
    const result = await getFileUploadJsonSchemaPaths(mockConfig);
    const postEndpoint: any = result["/api/uploads/{fileType}"]?.post;

    const schema =
      postEndpoint?.requestBody?.content?.["multipart/form-data"]?.schema;
    const imagesDesc = schema?.properties?.images?.description;

    expect(imagesDesc).toContain("Maximum file size:");
    expect(imagesDesc).toContain("Maximum files per upload:");
    expect(imagesDesc).toContain("Supported formats:");
  });

  it("should configure PATCH endpoint for file updates", async () => {
    const result = await getFileUploadJsonSchemaPaths(mockConfig);
    const patchEndpoint = result["/api/uploads/{fileType}/{fileName}"]?.patch;

    expect(patchEndpoint).toBeDefined();
    expect(patchEndpoint?.operationId).toBe("updateFile");
    expect(patchEndpoint?.parameters).toContainEqual(
      expect.objectContaining({ name: "fileName" })
    );
  });

  it("should configure DELETE endpoint for file deletion", async () => {
    const result = await getFileUploadJsonSchemaPaths(mockConfig);
    const deleteEndpoint = result["/api/uploads/{fileType}/{fileName}"]?.delete;

    expect(deleteEndpoint).toBeDefined();
    expect(deleteEndpoint?.operationId).toBe("deleteFile");
    expect(deleteEndpoint?.responses).toHaveProperty("204");
    expect(deleteEndpoint?.responses).toHaveProperty("404");
  });

  it("should respect custom base route configuration", async () => {
    const customConfig = {
      ...mockConfig,
      fileUpload: {
        ...mockConfig.fileUpload,
        baseRoute: "/custom/files/",
      },
    };

    const result = await getFileUploadJsonSchemaPaths(customConfig);

    expect(result).toHaveProperty("/custom/files/{filePath*}");
    expect(result).toHaveProperty("/custom/files/{fileType}");
    expect(result).toHaveProperty("/custom/files/{fileType}/{fileName}");
  });

  it("should handle base route without trailing slash", async () => {
    const customConfig = {
      ...mockConfig,
      fileUpload: {
        ...mockConfig.fileUpload,
        baseRoute: "/api/uploads",
      },
    };

    const result = await getFileUploadJsonSchemaPaths(customConfig);

    expect(result).toHaveProperty("/api/uploads/{filePath*}");
    expect(result).toHaveProperty("/api/uploads/{fileType}");
  });

  it("should merge custom restrictions with defaults", async () => {
    const customConfig = {
      ...mockConfig,
      fileUpload: {
        ...mockConfig.fileUpload,
        restrictions: {
          images: {
            maxSize: 1024 * 1024 * 10,
          },
        },
      },
    };

    const result = await getFileUploadJsonSchemaPaths(customConfig);
    const postEndpoint: any = result["/api/uploads/{fileType}"]?.post;
    const schema =
      postEndpoint?.requestBody?.content?.["multipart/form-data"]?.schema;

    expect(schema?.properties?.images?.description).toContain("10 MB");
  });

  it("should handle concurrent requests safely", async () => {
    const promises = Array(5)
      .fill(0)
      .map(() => getFileUploadJsonSchemaPaths(mockConfig));
    const results = await Promise.all(promises);

    results.forEach((result) => {
      expect(result).toHaveProperty("/api/uploads/{filePath*}");
      expect(result).toHaveProperty("/api/uploads/{fileType}");
    });
  });

  it("should format file sizes correctly", async () => {
    const result = await getFileUploadJsonSchemaPaths(mockConfig);
    const postEndpoint: any = result["/api/uploads/{fileType}"]?.post;
    const schema =
      postEndpoint?.requestBody?.content?.["multipart/form-data"]?.schema;

    const imagesDesc = schema?.properties?.images?.description;
    const videosDesc = schema?.properties?.videos?.description;
    const documentsDesc = schema?.properties?.documents?.description;

    expect(imagesDesc).toMatch(/\d+(\.\d+)?\s+(KB|MB|GB)/);
    expect(videosDesc).toMatch(/\d+(\.\d+)?\s+(KB|MB|GB)/);
    expect(documentsDesc).toMatch(/\d+(\.\d+)?\s+(KB|MB|GB)/);
  });

  it("should include proper response schemas for upload", async () => {
    const result = await getFileUploadJsonSchemaPaths(mockConfig);
    const postEndpoint: any = result["/api/uploads/{fileType}"]?.post;

    const successResponse =
      postEndpoint?.responses?.["200"]?.content?.["application/json"]?.schema;

    expect(successResponse?.properties).toHaveProperty("success");
    expect(successResponse?.properties).toHaveProperty("data");
    expect(successResponse?.properties).toHaveProperty("message");
  });

  it("should handle oneOf for single and multiple file responses", async () => {
    const result = await getFileUploadJsonSchemaPaths(mockConfig);
    const postEndpoint: any = result["/api/uploads/{fileType}"]?.post;

    const dataProperty =
      postEndpoint?.responses?.["200"]?.content?.["application/json"]?.schema
        ?.properties?.data;

    expect(dataProperty).toHaveProperty("oneOf");
    expect(dataProperty?.oneOf).toHaveLength(2);
  });

  describe("Authentication and Authorization", () => {
    it("should include security when authenticationControl is true", async () => {
      const {
        getModuleComponents,
      } = require("../../../../../utils/dynamic-loader");

      getModuleComponents.mockReturnValue({
        authConfigs: {
          authenticationControl: true,
        },
      });

      const result = await getFileUploadJsonSchemaPaths(mockConfig);
      const getEndpoint = result["/api/uploads/{filePath*}"]?.get;

      expect(getEndpoint?.security).toEqual([{ BearerAuth: [] }]);
      expect(getEndpoint?.responses).toHaveProperty("401");
      expect(getEndpoint?.responses).toHaveProperty("403");
    });

    it("should include security for specific actions", async () => {
      const {
        getModuleComponents,
      } = require("../../../../../utils/dynamic-loader");

      getModuleComponents.mockReturnValue({
        authConfigs: {
          authenticationControl: {
            Create: true,
            Update: true,
            Delete: true,
            View: false,
          },
        },
      });

      const result = await getFileUploadJsonSchemaPaths(mockConfig);

      expect(result["/api/uploads/{fileType}"]?.post?.security).toEqual([
        { BearerAuth: [] },
      ]);
      expect(
        result["/api/uploads/{fileType}/{fileName}"]?.patch?.security
      ).toEqual([{ BearerAuth: [] }]);
      expect(
        result["/api/uploads/{fileType}/{fileName}"]?.delete?.security
      ).toEqual([{ BearerAuth: [] }]);
      expect(result["/api/uploads/{filePath*}"]?.get?.security).toBeUndefined();
    });

    it("should not include security when authenticationControl is false", async () => {
      const {
        getModuleComponents,
      } = require("../../../../../utils/dynamic-loader");

      getModuleComponents.mockReturnValue({
        authConfigs: {
          authenticationControl: false,
        },
      });

      const result = await getFileUploadJsonSchemaPaths(mockConfig);

      expect(result["/api/uploads/{filePath*}"]?.get?.security).toBeUndefined();
      expect(result["/api/uploads/{fileType}"]?.post?.security).toBeUndefined();
    });

    it("should include 401 and 403 responses only when secured", async () => {
      const {
        getModuleComponents,
      } = require("../../../../../utils/dynamic-loader");

      getModuleComponents.mockReturnValue({
        authConfigs: {
          authenticationControl: { Create: true },
        },
      });

      const result = await getFileUploadJsonSchemaPaths(mockConfig);
      const postEndpoint: any = result["/api/uploads/{fileType}"]?.post;

      expect(postEndpoint?.responses).toHaveProperty("401");
      expect(postEndpoint?.responses).toHaveProperty("403");
      expect(postEndpoint?.responses?.["401"]?.description).toBe(
        "Authentication required"
      );
      expect(postEndpoint?.responses?.["403"]?.description).toContain(
        "Insufficient permissions"
      );
    });
  });

  describe("Endpoint Disabling", () => {
    it("should exclude disabled endpoints", async () => {
      const {
        getModuleComponents,
      } = require("../../../../../utils/dynamic-loader");

      getModuleComponents.mockReturnValue({
        router: {
          config: {
            disable: {
              uploadFile: true,
              updateFile: true,
            },
          },
        },
      });

      const result = await getFileUploadJsonSchemaPaths(mockConfig);

      expect(result["/api/uploads/{fileType}"]?.post).toBeUndefined();
      expect(
        result["/api/uploads/{fileType}/{fileName}"]?.patch
      ).toBeUndefined();
      expect(result["/api/uploads/{filePath*}"]?.get).toBeDefined();
      expect(
        result["/api/uploads/{fileType}/{fileName}"]?.delete
      ).toBeDefined();
    });

    it("should return empty paths when entire router is disabled", async () => {
      const {
        getModuleComponents,
      } = require("../../../../../utils/dynamic-loader");

      getModuleComponents.mockReturnValue({
        router: {
          config: {
            disable: true,
          },
        },
      });

      const result = await getFileUploadJsonSchemaPaths(mockConfig);
      expect(result).toEqual({});
    });

    it("should include all endpoints when none are disabled", async () => {
      const {
        getModuleComponents,
      } = require("../../../../../utils/dynamic-loader");

      getModuleComponents.mockReturnValue({
        router: {
          config: {
            disable: false,
          },
        },
      });

      const result = await getFileUploadJsonSchemaPaths(mockConfig);

      expect(result["/api/uploads/{filePath*}"]?.get).toBeDefined();
      expect(result["/api/uploads/{fileType}"]?.post).toBeDefined();
      expect(result["/api/uploads/{fileType}/{fileName}"]?.patch).toBeDefined();
      expect(
        result["/api/uploads/{fileType}/{fileName}"]?.delete
      ).toBeDefined();
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty restrictions object", async () => {
      const customConfig = {
        ...mockConfig,
        fileUpload: {
          ...mockConfig.fileUpload,
          restrictions: {},
        },
      };

      const result = await getFileUploadJsonSchemaPaths(customConfig);
      expect(result).toBeDefined();
    });

    it("should handle missing regex patterns gracefully", async () => {
      const customConfig = {
        ...mockConfig,
        fileUpload: {
          ...mockConfig.fileUpload,
          restrictions: {
            images: {
              maxSize: 1024 * 1024,
              maxCount: 10,
            },
          },
        },
      };

      const result = await getFileUploadJsonSchemaPaths(customConfig);
      expect(result).toBeDefined();
    });

    it("should handle zero byte file size", async () => {
      const customConfig = {
        ...mockConfig,
        fileUpload: {
          ...mockConfig.fileUpload,
          restrictions: {
            images: {
              maxSize: 0,
              maxCount: 1,
              supportedFilesRegex: /jpg/,
            },
          },
        },
      };

      const result = await getFileUploadJsonSchemaPaths(customConfig);
      const postEndpoint: any = result["/api/uploads/{fileType}"]?.post;
      const schema =
        postEndpoint?.requestBody?.content?.["multipart/form-data"]?.schema;

      expect(schema?.properties?.images?.description).toContain("0 Bytes");
    });

    it("should maintain path structure consistency", async () => {
      const result = await getFileUploadJsonSchemaPaths(mockConfig);
      const paths = Object.keys(result);

      paths.forEach((path) => {
        expect(path).toMatch(/^\/api\/uploads/);
      });
    });
  });
});
