import { OpenAPIV3 } from "openapi-types";
import { isClass, isZodSchema } from "../../../../utils/dynamic-loader";
import zodToJsonSchema from "zod-to-json-schema";
import classValidatorToJsonSchema from "./class-validator-to-json-schema";
import { getArkosConfig } from "../../../../server";

/**
 * Singleton class responsible for converting various schema formats (Zod, Class DTOs, JSON Schema)
 * into OpenAPI-compliant schema objects. Handles shorthand syntax for responses, request bodies,
 * and parameters.
 */
class OpenAPIchemaConverter {
  private validatorToJsonSchema: (schema: any) => any;

  constructor() {
    this.validatorToJsonSchema = (schema: any) => {
      const validationResolver = getArkosConfig().validation?.resolver;
      const fn =
        validationResolver === "zod"
          ? zodToJsonSchema
          : classValidatorToJsonSchema;

      return fn(schema);
    };
  }

  /**
   * Checks if a value is a schema-like object (Zod, Class, or JSON Schema).
   *
   * @param value - The value to check
   * @returns True if the value is a schema-like object
   */
  private isSchemaLike(value: any): boolean {
    if (!value) return false;

    if (isZodSchema(value)) return true;

    if (isClass(value)) return true;

    if (this.isPlainObject(value) && value.type) return true;

    return false;
  }

  /**
   * Checks if a value is a plain JavaScript object.
   *
   * @param value - The value to check
   * @returns True if the value is a plain object
   */
  private isPlainObject(value: any): boolean {
    return Object.prototype.toString.call(value) === "[object Object]";
  }

  /**
   * Converts a schema-like object (Zod, Class, or JSON Schema) into a JSON Schema object.
   *
   * @param schema - The schema to convert
   * @returns The JSON Schema representation, or undefined if schema is null/undefined
   */
  private convertToJsonSchema(schema: any): any {
    if (this.isPlainObject(schema) && schema?.type) return schema;

    if (isZodSchema(schema) || isClass(schema))
      return this.validatorToJsonSchema(schema);

    throw new Error(
      `Unsupported schema type. Expected Zod schema, class constructor, or JSON Schema object.`
    );
  }

  /**
   * Gets the default description for an HTTP status code.
   *
   * @param statusCode - The HTTP status code
   * @returns A human-readable default description
   */
  private getDefaultDescription(statusCode: string): string {
    const defaults: Record<string, string> = {
      "200": "Success",
      "201": "Created",
      "202": "Accepted",
      "204": "No Content",
      "400": "Bad Request",
      "401": "Unauthorized",
      "403": "Forbidden",
      "404": "Not Found",
      "409": "Conflict",
      "422": "Unprocessable Entity",
      "500": "Internal Server Error",
      "502": "Bad Gateway",
      "503": "Service Unavailable",
    };

    return defaults[statusCode] || "Response";
  }

  /**
   * Converts a response definition (shorthand, medium, or full format) into a standard
   * OpenAPI ResponseObject.
   *
   * Supports three formats:
   * 1. Shorthand: ProfileDto → assumes application/json + default description
   * 2. Medium: { content: ProfileDto, description: "..." } → custom description
   * 3. Full: { content: { "application/json": { schema: ProfileDto } } } → full control
   *
   * @param statusCode - The HTTP status code for this response
   * @param definition - The response definition to convert
   * @returns A standard OpenAPI ResponseObject
   */
  convertResponseDefinition(
    statusCode: string,
    definition: any
  ): OpenAPIV3.ResponseObject {
    if (!definition.content && this.isSchemaLike(definition)) {
      return {
        description: this.getDefaultDescription(statusCode),
        content: {
          "application/json": {
            schema: this.convertToJsonSchema(definition),
          },
        },
      };
    }

    if (definition.content && this.isSchemaLike(definition.content)) {
      return {
        description:
          definition.description || this.getDefaultDescription(statusCode),
        content: {
          "application/json": {
            schema: this.convertToJsonSchema(definition.content),
          },
        },
        ...(definition.headers && { headers: definition.headers }),
        ...(definition.links && { links: definition.links }),
      };
    }

    if (definition.content) {
      const converted: OpenAPIV3.ResponseObject = {
        description:
          definition.description || this.getDefaultDescription(statusCode),
        content: {},
      };

      for (const [mediaType, mediaObj] of Object.entries(
        definition.content
      ) as any[]) {
        converted.content![mediaType] = {
          ...mediaObj,
          schema: this.convertToJsonSchema(mediaObj.schema),
        };
      }

      if (definition.headers) converted.headers = definition.headers;
      if (definition.links) converted.links = definition.links;

      return converted;
    }

    return definition;
  }

  /**
   * Converts a request body definition (shorthand, medium, or full format) into a standard
   * OpenAPI RequestBodyObject.
   *
   * Supports three formats:
   * 1. Shorthand: CreateUserDto → assumes application/json + required: true
   * 2. Medium: { content: CreateUserDto, required?: boolean } → custom config
   * 3. Full: { content: { "application/json": { schema: CreateUserDto } } } → full control
   *
   * @param definition - The request body definition to convert
   * @returns A standard OpenAPI RequestBodyObject, or undefined if no definition provided
   */
  convertRequestBodyDefinition(
    definition: any
  ): OpenAPIV3.RequestBodyObject | undefined {
    if (!definition) return undefined;

    if (!definition.content && this.isSchemaLike(definition)) {
      return {
        required: true,
        content: {
          "application/json": {
            schema: this.convertToJsonSchema(definition),
          },
        },
      };
    }

    if (definition.content && this.isSchemaLike(definition.content)) {
      return {
        required: definition.required === false ? false : true,
        description: definition.description,
        content: {
          "application/json": {
            schema: this.convertToJsonSchema(definition.content),
          },
        },
      };
    }

    if (definition.content) {
      const converted: OpenAPIV3.RequestBodyObject = {
        required: definition.required ?? true,
        content: {},
      };

      if (definition.description)
        converted.description = definition.description;

      for (const [mediaType, mediaObj] of Object.entries(
        definition.content
      ) as any[]) {
        converted.content[mediaType] = {
          ...mediaObj,
          schema: this.convertToJsonSchema(mediaObj.schema),
        };
      }

      return converted;
    }

    return definition;
  }

  /**
   * Converts an array of parameter definitions, transforming any Zod/Class schemas
   * into JSON Schema objects.
   *
   * @param parameters - Array of parameter definitions to convert
   * @returns Array of standard OpenAPI ParameterObjects, or undefined if no parameters provided
   */
  convertParameters(
    parameters: any[] | undefined
  ): (OpenAPIV3.ParameterObject | OpenAPIV3.ReferenceObject)[] | undefined {
    if (!parameters) return undefined;

    return parameters.map((param) => {
      if (param.$ref) return param;

      if (param.schema)
        return {
          ...param,
          schema: this.convertToJsonSchema(param.schema),
        };

      return param;
    });
  }

  /**
   * Converts all responses in a responses object, handling shorthand, medium, and full formats.
   *
   * @param responses - Object containing response definitions keyed by status code
   * @returns Object with converted OpenAPI ResponseObjects
   */
  convertResponses(
    responses: Record<string, any> | undefined
  ): Record<string, OpenAPIV3.ResponseObject> | undefined {
    if (!responses) return undefined;

    const converted: Record<string, OpenAPIV3.ResponseObject> = {};

    for (const [statusCode, definition] of Object.entries(responses)) {
      converted[statusCode] = this.convertResponseDefinition(
        statusCode,
        definition
      );
    }

    return converted;
  }

  /**
   * Converts a complete OpenAPI operation configuration, processing responses, requestBody,
   * and parameters to handle shorthand syntax and schema conversions.
   *
   * @param config - The OpenAPI operation configuration to convert
   * @returns The converted configuration with all schemas transformed to JSON Schema
   */
  convertOpenAPIConfig(config: any): any {
    if (!config || config === false) return config;

    const converted = { ...config };

    if (config.responses)
      converted.responses = this.convertResponses(config.responses);

    if (config.requestBody)
      converted.requestBody = this.convertRequestBodyDefinition(
        config.requestBody
      );

    if (config.parameters)
      converted.parameters = this.convertParameters(config.parameters);

    return converted;
  }

  jsonSchemaToOpenApiParameters(
    paramType: string,
    schema: any,
    prefix = "",
    visitedRefs = new Set<string>()
  ): any[] {
    const params: any[] = [];

    if (schema.$ref) {
      const refPath = schema.$ref;
      if (visitedRefs.has(refPath)) return params;

      visitedRefs.add(refPath);
      const resolvedSchema = this.resolveRef(schema, refPath);
      if (resolvedSchema) {
        params.push(
          ...this.jsonSchemaToOpenApiParameters(
            paramType,
            resolvedSchema,
            prefix,
            visitedRefs
          )
        );
      }
      visitedRefs.delete(refPath);
      return params;
    }

    if (schema.type === "object" && schema.properties) {
      for (const [key, value] of Object.entries(schema.properties) as any) {
        const paramName = prefix ? `${prefix}[${key}]` : key;

        if (value.$ref) {
          const refPath = value.$ref;
          if (visitedRefs.has(refPath)) continue;

          visitedRefs.add(refPath);
          const resolvedSchema = this.resolveRef(schema, refPath);

          if (resolvedSchema) {
            if (resolvedSchema.type === "object" && resolvedSchema.properties) {
              params.push(
                ...this.jsonSchemaToOpenApiParameters(
                  paramType,
                  resolvedSchema,
                  paramName,
                  visitedRefs
                )
              );
            } else {
              const param = {
                in: paramType,
                name: paramName,
                required: schema.required?.includes(key) || false,
                schema: {
                  type: resolvedSchema.type,
                  ...(resolvedSchema.enum && { enum: resolvedSchema.enum }),
                  ...(resolvedSchema.format && {
                    format: resolvedSchema.format,
                  }),
                },
              };
              params.push(param);
            }
          }
          visitedRefs.delete(refPath);
        } else if (value.type === "object" && value.properties) {
          params.push(
            ...this.jsonSchemaToOpenApiParameters(
              paramType,
              value,
              paramName,
              visitedRefs
            )
          );
        } else {
          const param = {
            in: paramType,
            name: paramName,
            required: schema.required?.includes(key) || false,
            schema: {
              type: value.type,
              ...(value.enum && { enum: value.enum }),
              ...(value.format && { format: value.format }),
            },
          };
          params.push(param);
        }
      }
    }

    return params;
  }

  resolveRef(rootSchema: any, refPath: string): any {
    if (!refPath.startsWith("#/properties/")) {
      return null;
    }

    const path = refPath.substring(2).split("/");
    let current = rootSchema;

    for (const part of path) {
      if (current && current[part] !== undefined) {
        current = current[part];
      } else {
        return null;
      }
    }

    return current;
  }
}

const openApiSchemaConverter = new OpenAPIchemaConverter();

export default openApiSchemaConverter;
