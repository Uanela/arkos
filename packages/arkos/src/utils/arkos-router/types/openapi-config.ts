import { OpenAPIV3 } from "openapi-types";
import { ZodSchema } from "zod";

/**
 * Represents a schema-like object that can be used for OpenAPI documentation.
 * Accepts Zod schemas, class constructors (DTOs), or plain JSON Schema objects.
 */
type SchemaLike =
  | ZodSchema
  | (new (...args: any[]) => object)
  | OpenAPIV3.SchemaObject;

/**
 * Extended media type object that accepts SchemaLike in addition to standard OpenAPI schemas.
 */
type ExtendedMediaTypeObject = Omit<OpenAPIV3.MediaTypeObject, "schema"> & {
  schema: SchemaLike;
};

/**
 * Represents a parameter object with support for Zod schemas, class constructors, or JSON Schema.
 * Extends OpenAPI's ParameterObject to accept SchemaLike types for the schema field.
 *
 * @example
 * // Using JSON Schema (standard OpenAPI)
 * {
 *   name: "userId",
 *   in: "path",
 *   required: true,
 *   schema: { type: "string", format: "uuid" }
 * }
 *
 * @example
 * // Using Zod schema
 * {
 *   name: "limit",
 *   in: "query",
 *   schema: z.number().int().min(1).max(100)
 * }
 *
 * @example
 * // Using class constructor (DTO)
 * {
 *   name: "filter",
 *   in: "query",
 *   schema: FilterDto
 * }
 */
export type ExtendedParameterObject = Omit<
  OpenAPIV3.ParameterObject,
  "schema"
> & {
  /**
   * The schema defining the type used for the parameter.
   * Can be a Zod schema, class constructor, or standard JSON Schema object.
   */
  schema?: SchemaLike;
};

/**
 * Shorthand response definition. Can be:
 * - A SchemaLike (assumes application/json content-type and default description)
 * - An object with `content` as SchemaLike and optional `description`
 * - A full OpenAPI response object with custom content-types
 *
 * @example
 * // Shorthand: Just the schema (assumes application/json + "Success" description)
 * 200: ProfileDto
 *
 * @example
 * // Medium: Schema with custom description
 * 404: {
 *   content: ErrorDto,
 *   description: "User not found"
 * }
 *
 * @example
 * // Full: Multiple content-types with custom configuration
 * 500: {
 *   content: {
 *     "application/json": { schema: ErrorDto },
 *     "text/plain": { schema: PlainErrorDto }
 *   },
 *   description: "Internal server error"
 * }
 */
type ResponseDefinition =
  | SchemaLike
  | {
      content: SchemaLike;
      description?: string;
    }
  | (Omit<OpenAPIV3.ResponseObject, "content"> & {
      content?: {
        [media: string]: ExtendedMediaTypeObject;
      };
    });

/**
 * Shorthand request body definition. Can be:
 * - A SchemaLike (assumes application/json content-type)
 * - An object with `content` as SchemaLike and optional configuration
 * - A full OpenAPI request body object with custom content-types
 *
 * @example
 * // Shorthand: Just the schema (assumes application/json)
 * requestBody: CreateUserDto
 *
 * @example
 * // Medium: Schema with configuration
 * requestBody: {
 *   content: CreateUserDto,
 *   required: true,
 *   description: "User creation payload"
 * }
 *
 * @example
 * // Full: Multiple content-types
 * requestBody: {
 *   content: {
 *     "application/json": { schema: CreateUserDto },
 *     "multipart/form-data": { schema: CreateUserFormDto }
 *   },
 *   required: true
 * }
 */
type RequestBodyDefinition =
  | SchemaLike
  | {
      content: SchemaLike;
      required?: boolean;
      description?: string;
    }
  | (Omit<OpenAPIV3.RequestBodyObject, "content"> & {
      content: {
        [media: string]: ExtendedMediaTypeObject;
      };
    });

/**
 * Extended OpenAPI Operation object with enhanced requestBody and responses.
 *
 * NOTE: If you define validation in the `validation` field, DO NOT redefine
 * the same schemas here. The framework will automatically generate OpenAPI docs
 * from your validation schemas. This field is only for:
 * - Endpoints that don't use validation (docs-only)
 * - Additional metadata (summary, description, tags, etc.)
 *
 * Defining both validation and openapi schemas for the same field will cause
 * a startup error to prevent documentation drift.
 */
type ExtendedOperationObject = Omit<
  OpenAPIV3.OperationObject,
  "responses" | "requestBody"
> & {
  /**
   * Response definitions keyed by HTTP status code.
   * Supports shorthand, medium, and full OpenAPI formats.
   */
  responses?: {
    [statusCode: number]: ResponseDefinition;
  };

  /**
   * Request body definition.
   * Supports shorthand, medium, and full OpenAPI formats.
   *
   * WARNING: Do not define this if you're using `validation.body` -
   * it will be auto-generated from your validation schema.
   */
  requestBody?: RequestBodyDefinition;
  /**
   * Array of parameter definitions for path, query, header, and cookie parameters.
   * Each parameter's schema can be a Zod schema, class constructor, or JSON Schema.
   *
   * WARNING: Do NOT define parameters here if you're using `validation.query`,
   * `validation.params`, `validation.headers`, or `validation.cookies`.
   * Those validation schemas will automatically generate parameter documentation.
   * Defining both will cause a startup error.
   *
   * Only use this field for:
   * - Documentation-only endpoints (no validation)
   * - Routes where you explicitly don't want validation
   *
   * Note: In practice, documenting parameters without validation is rare.
   * Most APIs validate their inputs, so you'll typically use the `validation` field instead.
   *
   * @example
   * // Standard JSON Schema (most common for parameters)
   * parameters: [
   *   {
   *     name: "userId",
   *     in: "path",
   *     required: true,
   *     schema: { type: "string", format: "uuid" }
   *   },
   *   {
   *     name: "limit",
   *     in: "query",
   *     schema: { type: "integer", minimum: 1, maximum: 100 }
   *   }
   * ]
   *
   * @example
   * // Using Zod (less common for parameters, but supported)
   * parameters: [
   *   {
   *     name: "page",
   *     in: "query",
   *     schema: z.number().int().positive()
   *   }
   * ]
   */
  parameters?: (ExtendedParameterObject | OpenAPIV3.ReferenceObject)[];
};

/**
 * OpenAPI configuration for a route.
 * Set to `false` to exclude this route from OpenAPI documentation.
 * Otherwise, provide operation metadata and schema definitions.
 *
 * @example
 * // Exclude from docs
 * openapi: false
 *
 * @example
 * // Simple documentation with shorthand
 * openapi: {
 *   summary: "Get user profile",
 *   responses: {
 *     200: ProfileDto,
 *     404: ErrorDto
 *   }
 * }
 *
 * @example
 * // Complex documentation with multiple content-types
 * openapi: {
 *   summary: "Upload file",
 *   requestBody: {
 *     content: {
 *       "multipart/form-data": { schema: FileUploadDto }
 *     },
 *     required: true
 *   },
 *   responses: {
 *     200: {
 *       content: {
 *         "application/json": { schema: UploadResultDto }
 *       },
 *       description: "File uploaded successfully"
 *     }
 *   }
 * }
 */
export type OpenApiConfig = false | Partial<ExtendedOperationObject>;
