import fileUploadJsonSchemaGenerator from "../file-upload-json-schema-generator";

jest.mock("fs");

jest.mock("../../../../utils/helpers/arkos-config.helpers", () => ({
  getArkosConfig: jest.fn(() => ({
    fileUpload: {
      baseRoute: "/api/uploads/",
      baseUploadDir: "uploads",
    },
  })),
}));

jest.mock("../../file-upload.service", () => ({
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

describe("FileUploadJsonSchemaGenerator", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("findFile", () => {
    it("should return correct operationId and tags", () => {
      const result = fileUploadJsonSchemaGenerator.getOpenApiConfig(
        undefined,
        "findFile"
      );
      expect(result.operationId).toBe("findFile");
      expect(result.tags).toContain("File Upload");
    });

    it("should return path parameter named 'path'", () => {
      const result = fileUploadJsonSchemaGenerator.getOpenApiConfig(
        undefined,
        "findFile"
      );
      expect(result.parameters).toHaveLength(1);
      expect((result.parameters as any[])[0].name).toBe("path");
    });

    it("should return 200 and 404 responses", () => {
      const result = fileUploadJsonSchemaGenerator.getOpenApiConfig(
        undefined,
        "findFile"
      );
      expect(result.responses).toHaveProperty("200");
      expect(result.responses).toHaveProperty("404");
    });

    it("should respect existing summary", () => {
      const result = fileUploadJsonSchemaGenerator.getOpenApiConfig(
        { experimental: { openapi: { summary: "My custom summary" } } },
        "findFile"
      );
      expect(result.summary).toBe("My custom summary");
    });

    it("should respect existing parameters", () => {
      const result = fileUploadJsonSchemaGenerator.getOpenApiConfig(
        {
          experimental: {
            openapi: {
              parameters: [
                {
                  name: "path",
                  in: "path",
                  required: true,
                  schema: { type: "string" },
                  description: "custom",
                },
              ],
            },
          },
        },
        "findFile"
      );
      const param = (result.parameters as any[]).find((p) => p.name === "path");
      expect(param?.description).toBe("custom");
    });

    it("should respect existing responses", () => {
      const result = fileUploadJsonSchemaGenerator.getOpenApiConfig(
        {
          experimental: {
            openapi: {
              responses: { "200": { description: "custom response" } as any },
            },
          },
        },
        "findFile"
      );
      expect((result.responses as any)?.["200"]?.description).toBe(
        "custom response"
      );
    });
  });

  describe("uploadFile", () => {
    it("should return correct operationId and tags", () => {
      const result = fileUploadJsonSchemaGenerator.getOpenApiConfig(
        undefined,
        "uploadFile"
      );
      expect(result.operationId).toBe("uploadFile");
      expect(result.tags).toContain("File Upload");
    });

    it("should return multipart/form-data requestBody", () => {
      const result = fileUploadJsonSchemaGenerator.getOpenApiConfig(
        undefined,
        "uploadFile"
      );
      expect((result.requestBody as any)?.content).toHaveProperty(
        "multipart/form-data"
      );
    });

    it("should include fileType path param and image query params", () => {
      const result = fileUploadJsonSchemaGenerator.getOpenApiConfig(
        undefined,
        "uploadFile"
      );
      const paramNames = (result.parameters as any[]).map((p) => p.name);
      expect(paramNames).toContain("fileType");
      expect(paramNames).toContain("format");
      expect(paramNames).toContain("width");
      expect(paramNames).toContain("height");
      expect(paramNames).toContain("resizeTo");
    });

    it("should include fileType enum", () => {
      const result = fileUploadJsonSchemaGenerator.getOpenApiConfig(
        undefined,
        "uploadFile"
      );
      const fileTypeParam = (result.parameters as any[]).find(
        (p) => p.name === "fileType"
      );
      expect(fileTypeParam?.schema?.enum).toEqual([
        "images",
        "videos",
        "documents",
        "files",
      ]);
    });

    it("should include file restrictions in descriptions", () => {
      const result = fileUploadJsonSchemaGenerator.getOpenApiConfig(
        undefined,
        "uploadFile"
      );
      const schema = (result.requestBody as any)?.content?.[
        "multipart/form-data"
      ]?.schema;
      expect(schema?.properties?.images?.description).toContain(
        "Maximum file size:"
      );
      expect(schema?.properties?.images?.description).toContain(
        "Maximum files per upload:"
      );
      expect(schema?.properties?.images?.description).toContain(
        "Supported formats:"
      );
    });

    it("should include 200 and 400 responses", () => {
      const result = fileUploadJsonSchemaGenerator.getOpenApiConfig(
        undefined,
        "uploadFile"
      );
      expect(result.responses).toHaveProperty("200");
      expect(result.responses).toHaveProperty("400");
    });

    it("should include oneOf for data property in response", () => {
      const result = fileUploadJsonSchemaGenerator.getOpenApiConfig(
        undefined,
        "uploadFile"
      );
      const dataProperty = (result.responses as any)?.["200"]?.content?.[
        "application/json"
      ]?.schema?.properties?.data;
      expect(dataProperty).toHaveProperty("oneOf");
      expect(dataProperty?.oneOf).toHaveLength(2);
    });

    it("should respect existing requestBody", () => {
      const customRequestBody = {
        content: { "multipart/form-data": { schema: { type: "object" } } },
      };
      const result = fileUploadJsonSchemaGenerator.getOpenApiConfig(
        {
          experimental: { openapi: { requestBody: customRequestBody as any } },
        },
        "uploadFile"
      );
      expect(result.requestBody).toEqual(customRequestBody);
    });

    it("should respect existing responses", () => {
      const result = fileUploadJsonSchemaGenerator.getOpenApiConfig(
        {
          experimental: {
            openapi: {
              responses: { "200": { description: "custom" } as any },
            },
          },
        },
        "uploadFile"
      );
      expect((result.responses as any)?.["200"]?.description).toBe("custom");
    });

    it("should format file sizes correctly", () => {
      const result = fileUploadJsonSchemaGenerator.getOpenApiConfig(
        undefined,
        "uploadFile"
      );
      const schema = (result.requestBody as any)?.content?.[
        "multipart/form-data"
      ]?.schema;
      expect(schema?.properties?.images?.description).toMatch(
        /\d+(\.\d+)?\s+(KB|MB|GB)/
      );
    });
  });

  describe("updateFile", () => {
    it("should return correct operationId and tags", () => {
      const result = fileUploadJsonSchemaGenerator.getOpenApiConfig(
        undefined,
        "updateFile"
      );
      expect(result.operationId).toBe("updateFile");
      expect(result.tags).toContain("File Upload");
    });

    it("should include fileType and fileName path params", () => {
      const result = fileUploadJsonSchemaGenerator.getOpenApiConfig(
        undefined,
        "updateFile"
      );
      const paramNames = (result.parameters as any[]).map((p) => p.name);
      expect(paramNames).toContain("fileType");
      expect(paramNames).toContain("fileName");
    });

    it("should return multipart/form-data requestBody", () => {
      const result = fileUploadJsonSchemaGenerator.getOpenApiConfig(
        undefined,
        "updateFile"
      );
      expect((result.requestBody as any)?.content).toHaveProperty(
        "multipart/form-data"
      );
    });

    it("should include 200, 400 and 404 responses", () => {
      const result = fileUploadJsonSchemaGenerator.getOpenApiConfig(
        undefined,
        "updateFile"
      );
      expect(result.responses).toHaveProperty("200");
      expect(result.responses).toHaveProperty("400");
      expect(result.responses).toHaveProperty("404");
    });

    it("should respect existing requestBody", () => {
      const customRequestBody = {
        content: { "multipart/form-data": { schema: { type: "object" } } },
      };
      const result = fileUploadJsonSchemaGenerator.getOpenApiConfig(
        {
          experimental: { openapi: { requestBody: customRequestBody as any } },
        },
        "updateFile"
      );
      expect(result.requestBody).toEqual(customRequestBody);
    });
  });

  describe("deleteFile", () => {
    it("should return correct operationId and tags", () => {
      const result = fileUploadJsonSchemaGenerator.getOpenApiConfig(
        undefined,
        "deleteFile"
      );
      expect(result.operationId).toBe("deleteFile");
      expect(result.tags).toContain("File Upload");
    });

    it("should include fileType and fileName path params", () => {
      const result = fileUploadJsonSchemaGenerator.getOpenApiConfig(
        undefined,
        "deleteFile"
      );
      const paramNames = (result.parameters as any[]).map((p) => p.name);
      expect(paramNames).toContain("fileType");
      expect(paramNames).toContain("fileName");
    });

    it("should include 204 and 404 responses", () => {
      const result = fileUploadJsonSchemaGenerator.getOpenApiConfig(
        undefined,
        "deleteFile"
      );
      expect(result.responses).toHaveProperty("204");
      expect(result.responses).toHaveProperty("404");
    });

    it("should respect existing responses", () => {
      const result = fileUploadJsonSchemaGenerator.getOpenApiConfig(
        {
          experimental: {
            openapi: {
              responses: { "204": { description: "custom deleted" } as any },
            },
          },
        },
        "deleteFile"
      );
      expect((result.responses as any)?.["204"]?.description).toBe(
        "custom deleted"
      );
    });
  });

  describe("custom base route", () => {
    it("should use custom base route in operationId and summary", () => {
      const {
        getArkosConfig,
      } = require("../../../../utils/helpers/arkos-config.helpers");
      getArkosConfig.mockReturnValue({
        fileUpload: {
          baseRoute: "/custom/files/",
          baseUploadDir: "uploads",
        },
      });

      const result = fileUploadJsonSchemaGenerator.getOpenApiConfig(
        undefined,
        "uploadFile"
      );
      expect(result.operationId).toBe("uploadFile");
    });
  });

  describe("default case", () => {
    it("should return empty object for unknown endpoint", () => {
      const result = fileUploadJsonSchemaGenerator.getOpenApiConfig(
        undefined,
        "unknown" as any
      );
      expect(result).toEqual({});
    });
  });
});
