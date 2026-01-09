import arkosRouterOpenApiManager from "../arkos-router-openapi-manager";
import { UploadConfig } from "../types/upload-config";

describe("ArkosRouterOpenAPIManager - addUploadFields", () => {
  describe("Single file upload", () => {
    it("should generate schema for single file upload without options", () => {
      const uploadConfig: UploadConfig = {
        type: "single",
        field: "avatar",
      };

      const result = arkosRouterOpenApiManager.addUploadFields(uploadConfig);

      expect(result).toEqual({
        type: "object",
        properties: {
          avatar: {
            type: "string",
            format: "binary",
          },
        },
      });
    });

    it("should generate schema for single file upload with maxSize", () => {
      const uploadConfig: UploadConfig = {
        type: "single",
        field: "avatar",
        maxSize: 5242880,
      };

      const result = arkosRouterOpenApiManager.addUploadFields(uploadConfig);

      expect(result).toEqual({
        type: "object",
        properties: {
          avatar: {
            type: "string",
            format: "binary",
            description: "Max size: 5242880 bytes",
          },
        },
      });
    });

    it("should generate schema for required single file upload", () => {
      const uploadConfig: UploadConfig = {
        type: "single",
        field: "document",
        required: true,
      };

      const result = arkosRouterOpenApiManager.addUploadFields(uploadConfig);

      expect(result).toEqual({
        type: "object",
        properties: {
          document: {
            type: "string",
            format: "binary",
          },
        },
        required: ["document"],
      });
    });

    it("should generate schema for required single file upload with maxSize", () => {
      const uploadConfig: UploadConfig = {
        type: "single",
        field: "resume",
        required: true,
        maxSize: 10485760,
      };

      const result = arkosRouterOpenApiManager.addUploadFields(uploadConfig);

      expect(result).toEqual({
        type: "object",
        properties: {
          resume: {
            type: "string",
            format: "binary",
            description: "Max size: 10485760 bytes",
          },
        },
        required: ["resume"],
      });
    });
  });

  describe("Array file upload", () => {
    it("should generate schema for array file upload without options", () => {
      const uploadConfig: UploadConfig = {
        type: "array",
        field: "gallery",
      };

      const result = arkosRouterOpenApiManager.addUploadFields(uploadConfig);

      expect(result).toEqual({
        type: "object",
        properties: {
          gallery: {
            type: "array",
            items: {
              type: "string",
              format: "binary",
            },
          },
        },
      });
    });

    it("should generate schema for array file upload with maxCount", () => {
      const uploadConfig: UploadConfig = {
        type: "array",
        field: "photos",
        maxCount: 10,
      };

      const result = arkosRouterOpenApiManager.addUploadFields(uploadConfig);

      expect(result).toEqual({
        type: "object",
        properties: {
          photos: {
            type: "array",
            items: {
              type: "string",
              format: "binary",
            },
            maxItems: 10,
          },
        },
      });
    });

    it("should generate schema for array file upload with maxSize", () => {
      const uploadConfig: UploadConfig = {
        type: "array",
        field: "images",
        maxSize: 2097152,
      };

      const result = arkosRouterOpenApiManager.addUploadFields(uploadConfig);

      expect(result).toEqual({
        type: "object",
        properties: {
          images: {
            type: "array",
            items: {
              type: "string",
              format: "binary",
            },
            description: "Max size per file: 2097152 bytes",
          },
        },
      });
    });

    it("should generate schema for required array file upload with all options", () => {
      const uploadConfig: UploadConfig = {
        type: "array",
        field: "attachments",
        maxCount: 5,
        maxSize: 1048576,
        required: true,
      };

      const result = arkosRouterOpenApiManager.addUploadFields(uploadConfig);

      expect(result).toEqual({
        type: "object",
        properties: {
          attachments: {
            type: "array",
            items: {
              type: "string",
              format: "binary",
            },
            maxItems: 5,
            description: "Max size per file: 1048576 bytes",
          },
        },
        required: ["attachments"],
      });
    });
  });

  describe("Fields file upload", () => {
    it("should generate schema for multiple fields without options", () => {
      const uploadConfig: UploadConfig = {
        type: "fields",
        fields: [{ name: "avatar" }, { name: "resume" }],
      };

      const result = arkosRouterOpenApiManager.addUploadFields(uploadConfig);

      expect(result).toEqual({
        type: "object",
        properties: {
          avatar: {
            type: "array",
            items: {
              type: "string",
              format: "binary",
            },
          },
          resume: {
            type: "array",
            items: {
              type: "string",
              format: "binary",
            },
          },
        },
      });
    });

    it("should generate schema for multiple fields with maxCount", () => {
      const uploadConfig: UploadConfig = {
        type: "fields",
        fields: [
          { name: "photos", maxCount: 5 },
          { name: "documents", maxCount: 3 },
        ],
      };

      const result = arkosRouterOpenApiManager.addUploadFields(uploadConfig);

      expect(result).toEqual({
        type: "object",
        properties: {
          photos: {
            type: "array",
            items: {
              type: "string",
              format: "binary",
            },
            maxItems: 5,
          },
          documents: {
            type: "array",
            items: {
              type: "string",
              format: "binary",
            },
            maxItems: 3,
          },
        },
      });
    });

    it("should generate schema for multiple fields with maxSize", () => {
      const uploadConfig: UploadConfig = {
        type: "fields",
        fields: [{ name: "avatar" }, { name: "cover" }],
        maxSize: 5242880,
      };

      const result = arkosRouterOpenApiManager.addUploadFields(uploadConfig);

      expect(result).toEqual({
        type: "object",
        properties: {
          avatar: {
            type: "array",
            items: {
              type: "string",
              format: "binary",
            },
            description: "Max size per file: 5242880 bytes",
          },
          cover: {
            type: "array",
            items: {
              type: "string",
              format: "binary",
            },
            description: "Max size per file: 5242880 bytes",
          },
        },
      });
    });

    it("should generate schema for required multiple fields", () => {
      const uploadConfig: UploadConfig = {
        type: "fields",
        fields: [{ name: "id_front" }, { name: "id_back" }],
        required: true,
      };

      const result = arkosRouterOpenApiManager.addUploadFields(uploadConfig);

      expect(result).toEqual({
        type: "object",
        properties: {
          id_front: {
            type: "array",
            items: {
              type: "string",
              format: "binary",
            },
          },
          id_back: {
            type: "array",
            items: {
              type: "string",
              format: "binary",
            },
          },
        },
        required: ["id_front", "id_back"],
      });
    });

    it("should generate schema for multiple fields with all options", () => {
      const uploadConfig: UploadConfig = {
        type: "fields",
        fields: [
          { name: "avatar", maxCount: 1 },
          { name: "gallery", maxCount: 10 },
        ],
        maxSize: 3145728,
        required: true,
      };

      const result = arkosRouterOpenApiManager.addUploadFields(uploadConfig);

      expect(result).toEqual({
        type: "object",
        properties: {
          avatar: {
            type: "array",
            items: {
              type: "string",
              format: "binary",
            },
            maxItems: 1,
            description: "Max size per file: 3145728 bytes",
          },
          gallery: {
            type: "array",
            items: {
              type: "string",
              format: "binary",
            },
            maxItems: 10,
            description: "Max size per file: 3145728 bytes",
          },
        },
        required: ["avatar", "gallery"],
      });
    });
  });

  describe("Merging with existing schema", () => {
    it("should merge upload fields with existing schema properties", () => {
      const uploadConfig: UploadConfig = {
        type: "single",
        field: "avatar",
      };

      const existingSchema = {
        type: "object",
        properties: {
          name: { type: "string" },
          email: { type: "string" },
        },
        required: ["name"],
      };

      const result = arkosRouterOpenApiManager.addUploadFields(
        uploadConfig,
        existingSchema
      );

      expect(result).toEqual({
        type: "object",
        properties: {
          name: { type: "string" },
          email: { type: "string" },
          avatar: {
            type: "string",
            format: "binary",
          },
        },
        required: ["name"],
      });
    });

    it("should merge required fields from both schemas", () => {
      const uploadConfig: UploadConfig = {
        type: "single",
        field: "document",
        required: true,
      };

      const existingSchema = {
        type: "object",
        properties: {
          title: { type: "string" },
        },
        required: ["title"],
      };

      const result = arkosRouterOpenApiManager.addUploadFields(
        uploadConfig,
        existingSchema
      );

      expect(result).toEqual({
        type: "object",
        properties: {
          title: { type: "string" },
          document: {
            type: "string",
            format: "binary",
          },
        },
        required: ["title", "document"],
      });
    });

    it("should handle empty existing schema", () => {
      const uploadConfig: UploadConfig = {
        type: "array",
        field: "files",
        maxCount: 3,
      };

      const result = arkosRouterOpenApiManager.addUploadFields(
        uploadConfig,
        {}
      );

      expect(result).toEqual({
        type: "object",
        properties: {
          files: {
            type: "array",
            items: {
              type: "string",
              format: "binary",
            },
            maxItems: 3,
          },
        },
      });
    });

    it("should use default empty object when no existing schema provided", () => {
      const uploadConfig: UploadConfig = {
        type: "single",
        field: "photo",
      };

      const result = arkosRouterOpenApiManager.addUploadFields(uploadConfig);

      expect(result).toEqual({
        type: "object",
        properties: {
          photo: {
            type: "string",
            format: "binary",
          },
        },
      });
    });
  });

  describe("Edge cases", () => {
    it("should handle single field in fields array", () => {
      const uploadConfig: UploadConfig = {
        type: "fields",
        fields: [{ name: "single_file" }],
      };

      const result = arkosRouterOpenApiManager.addUploadFields(uploadConfig);

      expect(result).toEqual({
        type: "object",
        properties: {
          single_file: {
            type: "array",
            items: {
              type: "string",
              format: "binary",
            },
          },
        },
      });
    });

    it("should handle empty fields array", () => {
      const uploadConfig: UploadConfig = {
        type: "fields",
        fields: [],
      };

      const result = arkosRouterOpenApiManager.addUploadFields(uploadConfig);

      expect(result).toEqual({
        type: "object",
        properties: {},
      });
    });
  });
});
