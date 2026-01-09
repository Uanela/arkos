import { OpenAPIV3 } from "openapi-types";
import deepmerge from "../helpers/deepmerge.helper";
import { UploadConfig } from "./types/upload-config";

class ArkosRouterOpenAPIManager {
  /**
   * Generates OpenAPI schema for file upload fields in multipart/form-data requests.
   * Converts upload configuration into OpenAPI-compliant schema and merges with existing body schema.
   *
   * @param {UploadConfig} uploadConfig - The upload configuration from config.experimental.uploads
   * @param {any} existingSchema - Existing JSON schema from config.validation.body (optional)
   * @returns {{ schema: any }} OpenAPI schema object for multipart/form-data content type
   *
   * @example
   * // Single file upload
   * addUploadFields({ type: 'single', field: 'avatar', maxSize: 5242880 })
   * // Returns: { schema: { type: 'object', properties: { avatar: { type: 'string', format: 'binary' } } } }
   *
   * @example
   * // Array file upload
   * addUploadFields({ type: 'array', field: 'gallery', maxCount: 10 })
   *
   * @example
   * // Multiple fields upload
   * addUploadFields({ type: 'fields', fields: [{ name: 'avatar', maxCount: 1 }, { name: 'resume', maxCount: 1 }] })
   */
  addUploadFields(
    uploadConfig: UploadConfig,
    existingSchema: any = {}
  ): OpenAPIV3.SchemaObject {
    const uploadSchema: any = {
      type: "object",
      properties: {},
      required: [],
    };

    if (uploadConfig.type === "single") {
      uploadSchema.properties[uploadConfig.field] = {
        type: "string",
        format: "binary",
        ...(uploadConfig.maxSize && {
          description: `Max size: ${uploadConfig.maxSize} bytes`,
        }),
      };
      if (uploadConfig.required) {
        uploadSchema.required.push(uploadConfig.field);
      }
    } else if (uploadConfig.type === "array") {
      uploadSchema.properties[uploadConfig.field] = {
        type: "array",
        items: {
          type: "string",
          format: "binary",
        },
        ...(uploadConfig.maxCount && { maxItems: uploadConfig.maxCount }),
        ...(uploadConfig.maxSize && {
          description: `Max size per file: ${uploadConfig.maxSize} bytes`,
        }),
      };
      if (uploadConfig.required) {
        uploadSchema.required.push(uploadConfig.field);
      }
    } else if (uploadConfig.type === "fields") {
      for (const field of uploadConfig.fields) {
        uploadSchema.properties[field.name] = {
          type: "array",
          items: {
            type: "string",
            format: "binary",
          },
          ...(field.maxCount && { maxItems: field.maxCount }),
          ...(uploadConfig.maxSize && {
            description: `Max size per file: ${uploadConfig.maxSize} bytes`,
          }),
        };
        if (uploadConfig.required) {
          uploadSchema.required.push(field.name);
        }
      }
    }

    // Clean up empty required array
    if (uploadSchema.required.length === 0) delete uploadSchema.required;

    return deepmerge(existingSchema, uploadSchema);
  }
}

const arkosRouterOpenApiManager = new ArkosRouterOpenAPIManager();

export default arkosRouterOpenApiManager;
