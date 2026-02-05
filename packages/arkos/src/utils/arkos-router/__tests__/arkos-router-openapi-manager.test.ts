import arkosRouterOpenApiManager from "../arkos-router-openapi-manager";
import { UploadConfig } from "../types/upload-config";

describe("arkosRouterOpenApiManager", () => {
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

        const existingSchema: any = {
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

        const existingSchema: any = {
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

  describe("ArkosRouterOpenAPIManager - validateMultipartFormDocs", () => {
    describe("Single file upload validation", () => {
      it("should pass validation for correct single file schema", () => {
        const userSchema = {
          type: "object",
          properties: {
            avatar: {
              type: "string",
              format: "binary",
            },
          },
        };

        const uploadConfig: UploadConfig = {
          type: "single",
          field: "avatar",
        };

        expect(() =>
          arkosRouterOpenApiManager.validateMultipartFormDocs(
            userSchema,
            "/users/avatar",
            uploadConfig
          )
        ).not.toThrow();
      });

      it("should pass validation for required single file schema", () => {
        const userSchema = {
          type: "object",
          properties: {
            document: {
              type: "string",
              format: "binary",
            },
          },
          required: ["document"],
        };

        const uploadConfig: UploadConfig = {
          type: "single",
          field: "document",
          required: true,
        };

        expect(() =>
          arkosRouterOpenApiManager.validateMultipartFormDocs(
            userSchema,
            "/upload/document",
            uploadConfig
          )
        ).not.toThrow();
      });

      it("should throw error when single file field is missing", () => {
        const userSchema = {
          type: "object",
          properties: {
            name: { type: "string" },
          },
        };

        const uploadConfig: UploadConfig = {
          type: "single",
          field: "avatar",
        };

        expect(() =>
          arkosRouterOpenApiManager.validateMultipartFormDocs(
            userSchema,
            "/users/avatar",
            uploadConfig
          )
        ).toThrow(
          "ValidationError: Invalid multipart/form-data schema for route '/users/avatar':\n  - Missing upload field 'avatar' in multipart/form-data schema"
        );
      });

      it("should throw error when single file has wrong type", () => {
        const userSchema = {
          type: "object",
          properties: {
            avatar: {
              type: "array",
              format: "binary",
            },
          },
        };

        const uploadConfig: UploadConfig = {
          type: "single",
          field: "avatar",
        };

        expect(() =>
          arkosRouterOpenApiManager.validateMultipartFormDocs(
            userSchema,
            "/users/avatar",
            uploadConfig
          )
        ).toThrow("Upload field 'avatar' must have type 'string', got 'array'");
      });

      it("should throw error when single file missing binary format", () => {
        const userSchema = {
          type: "object",
          properties: {
            avatar: {
              type: "string",
            },
          },
        };

        const uploadConfig: UploadConfig = {
          type: "single",
          field: "avatar",
        };

        expect(() =>
          arkosRouterOpenApiManager.validateMultipartFormDocs(
            userSchema,
            "/users/avatar",
            uploadConfig
          )
        ).toThrow(
          "Upload field 'avatar' must have format 'binary', got 'undefined'"
        );
      });

      it("should throw error when required field not marked as required in schema", () => {
        const userSchema = {
          type: "object",
          properties: {
            document: {
              type: "string",
              format: "binary",
            },
          },
        };

        const uploadConfig: UploadConfig = {
          type: "single",
          field: "document",
          required: true,
        };

        expect(() =>
          arkosRouterOpenApiManager.validateMultipartFormDocs(
            userSchema,
            "/upload/document",
            uploadConfig
          )
        ).toThrow(
          "Upload field 'document' is required in config but not marked as required in schema"
        );
      });

      it("should throw error when optional field marked as required in schema", () => {
        const userSchema = {
          type: "object",
          properties: {
            avatar: {
              type: "string",
              format: "binary",
            },
          },
          required: ["avatar"],
        };

        const uploadConfig: UploadConfig = {
          type: "single",
          field: "avatar",
          required: false,
        };

        expect(() =>
          arkosRouterOpenApiManager.validateMultipartFormDocs(
            userSchema,
            "/users/avatar",
            uploadConfig
          )
        ).toThrow(
          "Upload field 'avatar' is not required in config but marked as required in schema"
        );
      });
    });

    describe("Array file upload validation", () => {
      it("should pass validation for correct array file schema", () => {
        const userSchema = {
          type: "object",
          properties: {
            photos: {
              type: "array",
              items: {
                type: "string",
                format: "binary",
              },
            },
          },
        };

        const uploadConfig: UploadConfig = {
          type: "array",
          field: "photos",
        };

        expect(() =>
          arkosRouterOpenApiManager.validateMultipartFormDocs(
            userSchema,
            "/gallery/photos",
            uploadConfig
          )
        ).not.toThrow();
      });

      it("should pass validation for required array file schema", () => {
        const userSchema = {
          type: "object",
          properties: {
            attachments: {
              type: "array",
              items: {
                type: "string",
                format: "binary",
              },
            },
          },
          required: ["attachments"],
        };

        const uploadConfig: UploadConfig = {
          type: "array",
          field: "attachments",
          required: true,
        };

        expect(() =>
          arkosRouterOpenApiManager.validateMultipartFormDocs(
            userSchema,
            "/upload/attachments",
            uploadConfig
          )
        ).not.toThrow();
      });

      it("should throw error when array field is missing", () => {
        const userSchema = {
          type: "object",
          properties: {
            name: { type: "string" },
          },
        };

        const uploadConfig: UploadConfig = {
          type: "array",
          field: "photos",
        };

        expect(() =>
          arkosRouterOpenApiManager.validateMultipartFormDocs(
            userSchema,
            "/gallery/photos",
            uploadConfig
          )
        ).toThrow(
          "Missing upload field 'photos' in multipart/form-data schema"
        );
      });

      it("should throw error when array field has wrong type", () => {
        const userSchema = {
          type: "object",
          properties: {
            photos: {
              type: "string",
              format: "binary",
            },
          },
        };

        const uploadConfig: UploadConfig = {
          type: "array",
          field: "photos",
        };

        expect(() =>
          arkosRouterOpenApiManager.validateMultipartFormDocs(
            userSchema,
            "/gallery/photos",
            uploadConfig
          )
        ).toThrow("Upload field 'photos' must have type 'array', got 'string'");
      });

      it("should throw error when array items missing binary format", () => {
        const userSchema = {
          type: "object",
          properties: {
            photos: {
              type: "array",
              items: {
                type: "string",
              },
            },
          },
        };

        const uploadConfig: UploadConfig = {
          type: "array",
          field: "photos",
        };

        expect(() =>
          arkosRouterOpenApiManager.validateMultipartFormDocs(
            userSchema,
            "/gallery/photos",
            uploadConfig
          )
        ).toThrow(
          "Upload field 'photos' must have items with type 'string' and format 'binary'"
        );
      });

      it("should throw error when array items have wrong type", () => {
        const userSchema = {
          type: "object",
          properties: {
            photos: {
              type: "array",
              items: {
                type: "number",
                format: "binary",
              },
            },
          },
        };

        const uploadConfig: UploadConfig = {
          type: "array",
          field: "photos",
        };

        expect(() =>
          arkosRouterOpenApiManager.validateMultipartFormDocs(
            userSchema,
            "/gallery/photos",
            uploadConfig
          )
        ).toThrow(
          "Upload field 'photos' must have items with type 'string' and format 'binary'"
        );
      });

      it("should throw error when array items are missing", () => {
        const userSchema = {
          type: "object",
          properties: {
            photos: {
              type: "array",
            },
          },
        };

        const uploadConfig: UploadConfig = {
          type: "array",
          field: "photos",
        };

        expect(() =>
          arkosRouterOpenApiManager.validateMultipartFormDocs(
            userSchema,
            "/gallery/photos",
            uploadConfig
          )
        ).toThrow(
          "Upload field 'photos' must have items with type 'string' and format 'binary'"
        );
      });
    });

    describe("Multiple fields upload validation", () => {
      it("should pass validation for correct multiple fields schema", () => {
        const userSchema = {
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
        };

        const uploadConfig: UploadConfig = {
          type: "fields",
          fields: [{ name: "avatar" }, { name: "resume" }],
        };

        expect(() =>
          arkosRouterOpenApiManager.validateMultipartFormDocs(
            userSchema,
            "/users/profile",
            uploadConfig
          )
        ).not.toThrow();
      });

      it("should pass validation for required multiple fields schema", () => {
        const userSchema = {
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
        };

        const uploadConfig: UploadConfig = {
          type: "fields",
          fields: [{ name: "id_front" }, { name: "id_back" }],
          required: true,
        };

        expect(() =>
          arkosRouterOpenApiManager.validateMultipartFormDocs(
            userSchema,
            "/verify/identity",
            uploadConfig
          )
        ).not.toThrow();
      });

      it("should throw error when one field is missing", () => {
        const userSchema = {
          type: "object",
          properties: {
            avatar: {
              type: "array",
              items: {
                type: "string",
                format: "binary",
              },
            },
          },
        };

        const uploadConfig: UploadConfig = {
          type: "fields",
          fields: [{ name: "avatar" }, { name: "resume" }],
        };

        expect(() =>
          arkosRouterOpenApiManager.validateMultipartFormDocs(
            userSchema,
            "/users/profile",
            uploadConfig
          )
        ).toThrow(
          "Missing upload field 'resume' in multipart/form-data schema"
        );
      });

      it("should throw error when all fields are missing", () => {
        const userSchema = {
          type: "object",
          properties: {
            name: { type: "string" },
          },
        };

        const uploadConfig: UploadConfig = {
          type: "fields",
          fields: [{ name: "avatar" }, { name: "resume" }],
        };

        expect(() =>
          arkosRouterOpenApiManager.validateMultipartFormDocs(
            userSchema,
            "/users/profile",
            uploadConfig
          )
        ).toThrow(
          /Missing upload field 'avatar'.*Missing upload field 'resume'/s
        );
      });

      it("should throw error when field has wrong type in multiple fields", () => {
        const userSchema = {
          type: "object",
          properties: {
            avatar: {
              type: "string",
              format: "binary",
            },
            resume: {
              type: "array",
              items: {
                type: "string",
                format: "binary",
              },
            },
          },
        };

        const uploadConfig: UploadConfig = {
          type: "fields",
          fields: [{ name: "avatar" }, { name: "resume" }],
        };

        expect(() =>
          arkosRouterOpenApiManager.validateMultipartFormDocs(
            userSchema,
            "/users/profile",
            uploadConfig
          )
        ).toThrow("Upload field 'avatar' must have type 'array', got 'string'");
      });

      it("should throw error when required fields not all marked as required", () => {
        const userSchema = {
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
          required: ["id_front"],
        };

        const uploadConfig: UploadConfig = {
          type: "fields",
          fields: [{ name: "id_front" }, { name: "id_back" }],
          required: true,
        };

        expect(() =>
          arkosRouterOpenApiManager.validateMultipartFormDocs(
            userSchema,
            "/verify/identity",
            uploadConfig
          )
        ).toThrow(
          "Upload field 'id_back' is required in config but not marked as required in schema"
        );
      });
    });

    describe("Multiple errors collection", () => {
      it("should collect and report all errors at once", () => {
        const userSchema = {
          type: "object",
          properties: {
            avatar: {
              type: "number",
            },
          },
        };

        const uploadConfig: UploadConfig = {
          type: "single",
          field: "avatar",
          required: true,
        };

        expect(() =>
          arkosRouterOpenApiManager.validateMultipartFormDocs(
            userSchema,
            "/users/avatar",
            uploadConfig
          )
        ).toThrow(
          /Upload field 'avatar' must have type 'string'.*Upload field 'avatar' must have format 'binary'.*Upload field 'avatar' is required in config/s
        );
      });

      it("should collect multiple missing fields and type errors", () => {
        const userSchema = {
          type: "object",
          properties: {
            avatar: {
              type: "string",
            },
          },
          required: ["avatar", "resume"],
        };

        const uploadConfig: UploadConfig = {
          type: "fields",
          fields: [{ name: "avatar" }, { name: "resume" }],
        };

        expect(() =>
          arkosRouterOpenApiManager.validateMultipartFormDocs(
            userSchema,
            "/users/profile",
            uploadConfig
          )
        ).toThrow(
          Error(
            `ValidationError: Invalid multipart/form-data schema for route '/users/profile':
  - Upload field 'avatar' must have type 'array', got 'string'
  - Upload field 'avatar' is not required in config but marked as required in schema
  - Missing upload field 'resume' in multipart/form-data schema`
          )
        );
      });
    });

    describe("Edge cases", () => {
      it("should handle undefined uploadConfig gracefully", () => {
        const userSchema = {
          type: "object",
          properties: {},
        };

        expect(() =>
          arkosRouterOpenApiManager.validateMultipartFormDocs(
            userSchema,
            "/upload",
            undefined
          )
        ).not.toThrow();
      });

      it("should handle empty properties in userSchema", () => {
        const userSchema = {
          type: "object",
        };

        const uploadConfig: UploadConfig = {
          type: "single",
          field: "avatar",
        };

        expect(() =>
          arkosRouterOpenApiManager.validateMultipartFormDocs(
            userSchema,
            "/users/avatar",
            uploadConfig
          )
        ).toThrow(
          "Missing upload field 'avatar' in multipart/form-data schema"
        );
      });

      it("should handle null userSchema", () => {
        const uploadConfig: UploadConfig = {
          type: "single",
          field: "avatar",
        };

        expect(() =>
          arkosRouterOpenApiManager.validateMultipartFormDocs(
            null,
            "/users/avatar",
            uploadConfig
          )
        ).toThrow(
          "Missing upload field 'avatar' in multipart/form-data schema"
        );
      });

      it("should handle empty fields array in uploadConfig", () => {
        const userSchema = {
          type: "object",
          properties: {},
        };

        const uploadConfig: UploadConfig = {
          type: "fields",
          fields: [],
        };

        expect(() =>
          arkosRouterOpenApiManager.validateMultipartFormDocs(
            userSchema,
            "/upload",
            uploadConfig
          )
        ).not.toThrow();
      });

      it("should work with additional properties in schema", () => {
        const userSchema = {
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
        };

        const uploadConfig: UploadConfig = {
          type: "single",
          field: "avatar",
        };

        expect(() =>
          arkosRouterOpenApiManager.validateMultipartFormDocs(
            userSchema,
            "/users/profile",
            uploadConfig
          )
        ).not.toThrow();
      });

      it("should validate with maxCount in uploadConfig", () => {
        const userSchema = {
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
        };

        const uploadConfig: UploadConfig = {
          type: "array",
          field: "photos",
          maxCount: 10,
        };

        expect(() =>
          arkosRouterOpenApiManager.validateMultipartFormDocs(
            userSchema,
            "/gallery/photos",
            uploadConfig
          )
        ).not.toThrow();
      });
    });

    describe("Error message format", () => {
      it("should include route path in error message", () => {
        const userSchema = {
          type: "object",
          properties: {},
        };

        const uploadConfig: UploadConfig = {
          type: "single",
          field: "avatar",
        };

        expect(() =>
          arkosRouterOpenApiManager.validateMultipartFormDocs(
            userSchema,
            "/api/v1/users/:id/avatar",
            uploadConfig
          )
        ).toThrow(
          "ValidationError: Invalid multipart/form-data schema for route '/api/v1/users/:id/avatar'"
        );
      });

      it("should format multiple errors with proper indentation", () => {
        const userSchema = {
          type: "object",
          properties: {
            avatar: {
              type: "number",
              format: "text",
            },
          },
        };

        const uploadConfig: UploadConfig = {
          type: "single",
          field: "avatar",
          required: true,
        };

        try {
          arkosRouterOpenApiManager.validateMultipartFormDocs(
            userSchema,
            "/upload",
            uploadConfig
          );
        } catch (error: any) {
          expect(error.message).toContain("  - ");
          expect(error.message.split("\n").length).toBeGreaterThan(1);
        }
      });
    });
  });
});
