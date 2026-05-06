import { OpenAPIV3 } from "openapi-types";
import deepmerge from "../helpers/deepmerge.helper";
import {
  ArkosRouterBaseUploadConfig,
  UploadConfig,
  UploadConfigFieldEntry,
} from "./types/upload-config";

class ArkosRouterOpenAPIManager {
  private resolveSchemaFieldName(name: string): string {
    return name.replace(/\[\]/g, "[0]");
  }
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
   * addUploadFields({
   *   type: 'fields',
   *   fields: [
   *     { name: 'avatar', type: 'single', uploadDir: 'images' },
   *     { name: 'gallery', type: 'array', maxCount: 6, uploadDir: 'gallery' },
   *     { name: 'banners[][images]', type: 'array', maxCount: 5, uploadDir: 'banners' }
   *   ]
   * })
   */
  addUploadFields(
    uploadConfig: UploadConfig,
    existingSchema: OpenAPIV3.SchemaObject = {}
  ): OpenAPIV3.SchemaObject {
    const uploadSchema: any = {
      type: "object",
      properties: {},
      required: [],
    };

    if (uploadConfig.type === "single") {
      const schemaKey = this.resolveSchemaFieldName(uploadConfig.field);
      uploadSchema.properties[schemaKey] = {
        type: "string",
        format: "binary",
        ...(uploadConfig.maxSize && {
          description: `Max size: ${uploadConfig.maxSize} bytes`,
        }),
        ...(uploadConfig.description && {
          description: uploadConfig.description,
        }),
      };
      if (uploadConfig.required !== false) {
        uploadSchema.required.push(schemaKey);
      }
    } else if (uploadConfig.type === "array") {
      const schemaKey = this.resolveSchemaFieldName(uploadConfig.field);
      uploadSchema.properties[schemaKey] = {
        type: "array",
        items: {
          type: "string",
          format: "binary",
        },
        ...(uploadConfig.maxCount && { maxItems: uploadConfig.maxCount }),
        ...(uploadConfig.minCount && { minItems: uploadConfig.minCount }),
        ...(uploadConfig.maxSize && {
          description: `Max size per file: ${uploadConfig.maxSize} bytes`,
        }),
        ...(uploadConfig.description && {
          description: uploadConfig.description,
        }),
      };
      if (uploadConfig.required !== false) {
        uploadSchema.required.push(schemaKey);
      }
    } else if (uploadConfig.type === "fields") {
      for (const field of uploadConfig.fields) {
        uploadSchema.properties[this.resolveSchemaFieldName(field.name)] =
          this.buildFieldSchema(field, uploadConfig);

        // legacy shape has no type and no required — default to required
        const isRequired =
          (field as any).type === undefined
            ? (uploadConfig as any).required !== false
            : (field as any).required !== false;

        if (isRequired) {
          uploadSchema.required.push(this.resolveSchemaFieldName(field.name));
        }
      }
    }

    // Clean up empty required array
    if (uploadSchema.required.length === 0) delete uploadSchema.required;

    return deepmerge(existingSchema as any, uploadSchema);
  }

  /**
   * Builds the OpenAPI property schema for a single field entry.
   * Legacy entries (no type) are treated as array.
   */
  private buildFieldSchema(
    field: UploadConfigFieldEntry,
    config: ArkosRouterBaseUploadConfig
  ): object {
    if (field.type === "single") {
      return {
        type: "string",
        format: "binary",
        ...(field.maxSize &&
          !config.maxSize && {
            description: `Max size: ${field.maxSize} bytes`,
          }),
        ...(config.maxSize &&
          !field.maxSize && {
            description: `Max size: ${config.maxSize} bytes`,
          }),
        ...(field.description && { description: field.description }),
      };
    }

    // type === "array" or legacy (no type) — both produce array schema
    return {
      type: "array",
      items: {
        type: "string",
        format: "binary",
      },
      ...(field.maxCount && { maxItems: field.maxCount }),
      ...(field.type === "array" &&
        field.minCount && { minItems: field.minCount }),
      ...((field.maxSize &&
        !config.maxSize && {
          description: `Max size per file: ${field.maxSize} bytes`,
        }) ||
        (config.maxSize &&
          !field.maxSize && {
            description: `Max size per file: ${config.maxSize} bytes`,
          })),
      ...(field.type === "array" &&
        field.description && {
          description: field.description,
        }),
    };
  }

  /**
   * Validates that a user-defined multipart/form-data schema includes all required upload fields
   * with correct types, formats, and required flags.
   *
   * @param {any} userDefinedMultipartSchema - The schema object from openapi.requestBody.content['multipart/form-data'].schema
   * @param {UploadConfig} uploadConfig - The upload configuration from config.experimental.uploads
   * @param {string} routePath - The route path for error context
   * @throws {Error} If upload fields are missing or incorrectly defined
   *
   * @example
   * validateMultipartFormDocs(
   *   { type: 'object', properties: { avatar: { type: 'string', format: 'binary' } } },
   *   { type: 'single', field: 'avatar', required: true },
   *   '/users/:id/avatar'
   * )
   */
  validateMultipartFormDocs(
    userDefinedMultipartSchema: any,
    routePath: string,
    uploadConfig?: UploadConfig
  ): void {
    const errors: string[] = [];
    const properties = userDefinedMultipartSchema?.properties || {};
    const requiredFields = userDefinedMultipartSchema?.required || [];

    const expectedFields: Array<{
      name: string;
      required: boolean;
      expectedType: "single" | "array";
    }> = [];

    if (uploadConfig?.type === "single") {
      expectedFields.push({
        name: uploadConfig.field,
        required: uploadConfig.required !== false,
        expectedType: "single",
      });
    } else if (uploadConfig?.type === "array") {
      expectedFields.push({
        name: uploadConfig.field,
        required: uploadConfig.required !== false,
        expectedType: "array",
      });
    } else if (uploadConfig?.type === "fields") {
      for (const field of uploadConfig.fields) {
        if (!("type" in field)) {
          expectedFields.push({
            name: field.name,
            // legacy shape has no type and no required — default to required
            required:
              (uploadConfig as ArkosRouterBaseUploadConfig).required ===
              undefined
                ? true
                : ((uploadConfig as ArkosRouterBaseUploadConfig)
                    .required as boolean),
            expectedType: "array",
          });
        } else if (field.type)
          expectedFields.push({
            name: field.name,
            required:
              field.type === undefined ? true : field.required !== false,
            expectedType: field.type ?? "array",
          });
      }
    }

    for (const { name, required, expectedType } of expectedFields) {
      const schemaKey = this.resolveSchemaFieldName(name);
      const fieldSchema = properties[schemaKey];

      if (!fieldSchema) {
        errors.push(
          `Missing upload field '${name}' in multipart/form-data schema`
        );
        continue;
      }

      if (expectedType === "single") {
        if (fieldSchema.type !== "string")
          errors.push(
            `Upload field '${name}' must have type 'string', got '${fieldSchema.type}'`
          );

        if (fieldSchema.format !== "binary")
          errors.push(
            `Upload field '${name}' must have format 'binary', got '${fieldSchema.format || "undefined"}'`
          );
      } else if (expectedType === "array") {
        if (fieldSchema.type !== "array") {
          errors.push(
            `Upload field '${name}' must have type 'array', got '${fieldSchema.type}'`
          );
        } else if (
          !fieldSchema.items ||
          fieldSchema.items.type !== "string" ||
          fieldSchema.items.format !== "binary"
        )
          errors.push(
            `Upload field '${name}' must have items with type 'string' and format 'binary'`
          );
      }

      const isMarkedRequired = requiredFields.includes(schemaKey);
      if (required && !isMarkedRequired)
        errors.push(
          `Upload field '${name}' is required in config but not marked as required in schema`
        );

      if (!required && isMarkedRequired)
        errors.push(
          `Upload field '${name}' is not required in config but marked as required in schema`
        );
    }

    if (errors.length > 0) {
      throw new Error(
        `ValidationError: Invalid multipart/form-data schema for route '${routePath}':\n${errors.map((e) => `  - ${e}`).join("\n")}`
      );
    }
  }
}

const arkosRouterOpenApiManager = new ArkosRouterOpenAPIManager();

export default arkosRouterOpenApiManager;
