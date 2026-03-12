import getFileUploadJsonSchemaPaths from "../get-file-upload-json-schema-paths";
import { routeHookReader } from "../../../../../components/arkos-route-hook/reader";

jest.mock("fs");
jest.mock("../../../../../components/arkos-loadable-registry", () => ({
  __esModule: true,
  default: { getItem: jest.fn() },
}));
jest.mock("../../../../../components/arkos-route-hook/reader", () => ({
  routeHookReader: {
    getRouteConfig: jest.fn(),
  },
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

const mockGetRouteConfig = routeHookReader.getRouteConfig as jest.Mock;

describe("getFileUploadJsonSchemaPaths", () => {
  const mockConfig: any = {
    fileUpload: {
      baseRoute: "/api/uploads/",
      baseUploadDir: "uploads",
    },
  };
  const mockPaths = {};

  beforeEach(() => {
    jest.clearAllMocks();
    // Default: no auth, no disabled endpoints
    mockGetRouteConfig.mockReturnValue({});
  });

  it("should return empty paths when fileUpload is not configured", () => {
    const config = { ...mockConfig, fileUpload: undefined } as any;
    const result = getFileUploadJsonSchemaPaths(config, mockPaths);
    expect(result).toEqual({});
  });

  it("should include all file upload endpoints", () => {
    const result = getFileUploadJsonSchemaPaths(mockConfig, mockPaths);

    expect(result).toHaveProperty("/api/uploads/{filePath*}");
    expect(result).toHaveProperty("/api/uploads/{fileType}");
    expect(result).toHaveProperty("/api/uploads/{fileType}/{fileName}");
  });

  it("should configure GET endpoint for static file serving", () => {
    const result = getFileUploadJsonSchemaPaths(mockConfig, mockPaths);
    const getEndpoint: any = result["/api/uploads/{filePath*}"]?.get;

    expect(getEndpoint).toBeDefined();
    expect(getEndpoint?.operationId).toBe("findFile");
    expect(getEndpoint?.tags).toContain("File Upload");
    expect(getEndpoint?.parameters).toHaveLength(1);
    expect(getEndpoint?.parameters?.[0].name).toBe("filePath");
  });

  it("should configure POST endpoint with multipart/form-data", () => {
    const result = getFileUploadJsonSchemaPaths(mockConfig, mockPaths);
    const postEndpoint: any = result["/api/uploads/{fileType}"]?.post;

    expect(postEndpoint).toBeDefined();
    expect(postEndpoint?.operationId).toBe("uploadFile");
    expect(postEndpoint?.requestBody?.content).toHaveProperty(
      "multipart/form-data"
    );
  });

  it("should include image processing query parameters", () => {
    const result = getFileUploadJsonSchemaPaths(mockConfig, mockPaths);
    const postEndpoint: any = result["/api/uploads/{fileType}"]?.post;

    const paramNames = postEndpoint?.parameters?.map((p: any) => p.name);
    expect(paramNames).toContain("format");
    expect(paramNames).toContain("width");
    expect(paramNames).toContain("height");
    expect(paramNames).toContain("resizeTo");
  });

  it("should document file type enum in path parameter", () => {
    const result = getFileUploadJsonSchemaPaths(mockConfig, mockPaths);
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

  it("should include file restrictions in descriptions", () => {
    const result = getFileUploadJsonSchemaPaths(mockConfig, mockPaths);
    const postEndpoint: any = result["/api/uploads/{fileType}"]?.post;

    const schema =
      postEndpoint?.requestBody?.content?.["multipart/form-data"]?.schema;
    const imagesDesc = schema?.properties?.images?.description;

    expect(imagesDesc).toContain("Maximum file size:");
    expect(imagesDesc).toContain("Maximum files per upload:");
    expect(imagesDesc).toContain("Supported formats:");
  });

  it("should configure PATCH endpoint for file updates", () => {
    const result = getFileUploadJsonSchemaPaths(mockConfig, mockPaths);
    const patchEndpoint = result["/api/uploads/{fileType}/{fileName}"]?.patch;

    expect(patchEndpoint).toBeDefined();
    expect(patchEndpoint?.operationId).toBe("updateFile");
    expect(patchEndpoint?.parameters).toContainEqual(
      expect.objectContaining({ name: "fileName" })
    );
  });

  it("should configure DELETE endpoint for file deletion", () => {
    const result = getFileUploadJsonSchemaPaths(mockConfig, mockPaths);
    const deleteEndpoint = result["/api/uploads/{fileType}/{fileName}"]?.delete;

    expect(deleteEndpoint).toBeDefined();
    expect(deleteEndpoint?.operationId).toBe("deleteFile");
    expect(deleteEndpoint?.responses).toHaveProperty("204");
    expect(deleteEndpoint?.responses).toHaveProperty("404");
  });

  it("should respect custom base route configuration", () => {
    const customConfig = {
      ...mockConfig,
      fileUpload: { ...mockConfig.fileUpload, baseRoute: "/custom/files/" },
    };

    const result = getFileUploadJsonSchemaPaths(customConfig, mockPaths);

    expect(result).toHaveProperty("/custom/files/{filePath*}");
    expect(result).toHaveProperty("/custom/files/{fileType}");
    expect(result).toHaveProperty("/custom/files/{fileType}/{fileName}");
  });

  it("should handle base route without trailing slash", () => {
    const customConfig = {
      ...mockConfig,
      fileUpload: { ...mockConfig.fileUpload, baseRoute: "/api/uploads" },
    };

    const result = getFileUploadJsonSchemaPaths(customConfig, mockPaths);

    expect(result).toHaveProperty("/api/uploads/{filePath*}");
    expect(result).toHaveProperty("/api/uploads/{fileType}");
  });

  it("should merge custom restrictions with defaults", () => {
    const customConfig = {
      ...mockConfig,
      fileUpload: {
        ...mockConfig.fileUpload,
        restrictions: { images: { maxSize: 1024 * 1024 * 10 } },
      },
    };

    const result = getFileUploadJsonSchemaPaths(customConfig, mockPaths);
    const postEndpoint: any = result["/api/uploads/{fileType}"]?.post;
    const schema =
      postEndpoint?.requestBody?.content?.["multipart/form-data"]?.schema;

    expect(schema?.properties?.images?.description).toContain("10 MB");
  });

  it("should format file sizes correctly", () => {
    const result = getFileUploadJsonSchemaPaths(mockConfig, mockPaths);
    const postEndpoint: any = result["/api/uploads/{fileType}"]?.post;
    const schema =
      postEndpoint?.requestBody?.content?.["multipart/form-data"]?.schema;

    expect(schema?.properties?.images?.description).toMatch(
      /\d+(\.\d+)?\s+(KB|MB|GB)/
    );
    expect(schema?.properties?.videos?.description).toMatch(
      /\d+(\.\d+)?\s+(KB|MB|GB)/
    );
    expect(schema?.properties?.documents?.description).toMatch(
      /\d+(\.\d+)?\s+(KB|MB|GB)/
    );
  });

  it("should include proper response schemas for upload", () => {
    const result = getFileUploadJsonSchemaPaths(mockConfig, mockPaths);
    const postEndpoint: any = result["/api/uploads/{fileType}"]?.post;

    const successResponse =
      postEndpoint?.responses?.["200"]?.content?.["application/json"]?.schema;

    expect(successResponse?.properties).toHaveProperty("success");
    expect(successResponse?.properties).toHaveProperty("data");
    expect(successResponse?.properties).toHaveProperty("message");
  });

  it("should use passed paths properties", () => {
    const result = getFileUploadJsonSchemaPaths(mockConfig, {
      "/api/uploads/{fileType}": {
        post: {
          responses: {
            200: {
              description: "",
              content: {
                "application/json": {
                  schema: { properties: { fileType: { type: "string" } } },
                },
              },
            },
          },
        },
      },
    });
    const postEndpoint: any = result["/api/uploads/{fileType}"]?.post;
    const successResponse =
      postEndpoint?.responses?.["200"]?.content?.["application/json"]?.schema;

    expect(successResponse?.properties).toHaveProperty("fileType");
  });

  it("should handle oneOf for single and multiple file responses", () => {
    const result = getFileUploadJsonSchemaPaths(mockConfig, mockPaths);
    const postEndpoint: any = result["/api/uploads/{fileType}"]?.post;

    const dataProperty =
      postEndpoint?.responses?.["200"]?.content?.["application/json"]?.schema
        ?.properties?.data;

    expect(dataProperty).toHaveProperty("oneOf");
    expect(dataProperty?.oneOf).toHaveLength(2);
  });

  describe("Authentication and Authorization", () => {
    it("should include security when authentication is true for all operations", () => {
      mockGetRouteConfig.mockReturnValue({ authentication: true });

      const result = getFileUploadJsonSchemaPaths(mockConfig, mockPaths);
      const getEndpoint = result["/api/uploads/{filePath*}"]?.get;

      expect(getEndpoint?.security).toEqual([{ BearerAuth: [] }]);
      expect(getEndpoint?.responses).toHaveProperty("401");
      expect(getEndpoint?.responses).toHaveProperty("403");
    });

    it("should include security for specific actions", () => {
      mockGetRouteConfig.mockImplementation((_, operation) => ({
        authentication:
          operation === "uploadFile" ||
          operation === "updateFile" ||
          operation === "deleteFile",
      }));

      const result = getFileUploadJsonSchemaPaths(mockConfig, mockPaths);

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

    it("should not include security when authentication is false", () => {
      mockGetRouteConfig.mockReturnValue({ authentication: false });

      const result = getFileUploadJsonSchemaPaths(mockConfig, mockPaths);

      expect(result["/api/uploads/{filePath*}"]?.get?.security).toBeUndefined();
      expect(result["/api/uploads/{fileType}"]?.post?.security).toBeUndefined();
    });

    it("should include 401 and 403 responses only when secured", () => {
      mockGetRouteConfig.mockImplementation((_, operation) => ({
        authentication: operation === "uploadFile",
      }));

      const result = getFileUploadJsonSchemaPaths(mockConfig, mockPaths);
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
    it("should exclude disabled endpoints", () => {
      mockGetRouteConfig.mockImplementation((_, operation) => ({
        disabled: operation === "uploadFile" || operation === "updateFile",
      }));

      const result = getFileUploadJsonSchemaPaths(mockConfig, mockPaths);

      expect(result["/api/uploads/{fileType}"]?.post).toBeUndefined();
      expect(
        result["/api/uploads/{fileType}/{fileName}"]?.patch
      ).toBeUndefined();
      expect(result["/api/uploads/{filePath*}"]?.get).toBeDefined();
      expect(
        result["/api/uploads/{fileType}/{fileName}"]?.delete
      ).toBeDefined();
    });

    it("should return empty paths when all endpoints are disabled", () => {
      mockGetRouteConfig.mockReturnValue({ disabled: true });

      const result = getFileUploadJsonSchemaPaths(mockConfig, mockPaths);
      expect(result).toEqual({});
    });

    it("should include all endpoints when none are disabled", () => {
      mockGetRouteConfig.mockReturnValue({ disabled: false });

      const result = getFileUploadJsonSchemaPaths(mockConfig, mockPaths);

      expect(result["/api/uploads/{filePath*}"]?.get).toBeDefined();
      expect(result["/api/uploads/{fileType}"]?.post).toBeDefined();
      expect(result["/api/uploads/{fileType}/{fileName}"]?.patch).toBeDefined();
      expect(
        result["/api/uploads/{fileType}/{fileName}"]?.delete
      ).toBeDefined();
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty restrictions object", () => {
      const customConfig = {
        ...mockConfig,
        fileUpload: { ...mockConfig.fileUpload, restrictions: {} },
      };

      const result = getFileUploadJsonSchemaPaths(customConfig, mockPaths);
      expect(result).toBeDefined();
    });

    it("should handle missing regex patterns gracefully", () => {
      const customConfig = {
        ...mockConfig,
        fileUpload: {
          ...mockConfig.fileUpload,
          restrictions: { images: { maxSize: 1024 * 1024, maxCount: 10 } },
        },
      };

      const result = getFileUploadJsonSchemaPaths(customConfig, mockPaths);
      expect(result).toBeDefined();
    });

    it("should handle zero byte file size", () => {
      const customConfig = {
        ...mockConfig,
        fileUpload: {
          ...mockConfig.fileUpload,
          restrictions: {
            images: { maxSize: 0, maxCount: 1, supportedFilesRegex: /jpg/ },
          },
        },
      };

      const result = getFileUploadJsonSchemaPaths(customConfig, mockPaths);
      const postEndpoint: any = result["/api/uploads/{fileType}"]?.post;
      const schema =
        postEndpoint?.requestBody?.content?.["multipart/form-data"]?.schema;

      expect(schema?.properties?.images?.description).toContain("0 Bytes");
    });

    it("should maintain path structure consistency", () => {
      const result = getFileUploadJsonSchemaPaths(mockConfig, mockPaths);
      const paths = Object.keys(result);

      paths.forEach((path) => {
        expect(path).toMatch(/^\/api\/uploads/);
      });
    });
  });
});
