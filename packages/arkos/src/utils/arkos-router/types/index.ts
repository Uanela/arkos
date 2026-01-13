import { IRoute, IRouter } from "express";
import { ZodSchema } from "zod";
import { Options as RateLimitOptions } from "express-rate-limit";
import { Options as QueryParserOptions } from "../../../utils/helpers/query-parser.helpers";
import { AccessControlConfig } from "../../../types/auth";
import { ArkosErrorRequestHandler, ArkosRequestHandler } from "../../../types";
import compression from "compression";
import { OpenApiConfig } from "./openapi-config";
import { UploadConfig } from "./upload-config";
import { BodyParserConfig } from "./body-parser-config";

export type PathParams = string | RegExp | Array<string | RegExp>;

export type ArkosAnyRequestHandler =
  | ArkosRequestHandler
  | ArkosErrorRequestHandler
  | Array<ArkosRequestHandler | ArkosErrorRequestHandler>;

/**
 * Handler function for HTTP methods that accepts route configuration and request handlers.
 *
 * @param {ArkosRouteConfig} config - The route configuration object.
 * @param {...(ArkosRequestHandler | ArkosErrorRequestHandler)[]} handlers - Request and error handlers for the route.
 * @returns {IRouter} The Express router instance.
 */
type RouterMethodHandler<T> = (
  config: ArkosRouteConfig | PathParams,
  ...handlers: Array<ArkosAnyRequestHandler>
) => T;

export type ArkosRouteMethodHandler<T> = (
  config: ArkosAnyRequestHandler | Omit<ArkosRouteConfig, "path">,
  ...handlers: Array<
    | ArkosRequestHandler
    | ArkosErrorRequestHandler
    | Array<ArkosRequestHandler | ArkosErrorRequestHandler>
  >
) => T;

export interface ArkosIRoute extends IRoute {
  /** GET method handler with route configuration support */
  get: ArkosRouteMethodHandler<this>;
  /** POST method handler with route configuration support */
  post: ArkosRouteMethodHandler<this>;
  /** PUT method handler with route configuration support */
  put: ArkosRouteMethodHandler<this>;
  /** PATCH method handler with route configuration support */
  patch: ArkosRouteMethodHandler<this>;
  /** DELETE method handler with route configuration support */
  delete: ArkosRouteMethodHandler<this>;
  /** OPTIONS method handler with route configuration support */
  options: ArkosRouteMethodHandler<this>;
  /** HEAD method handler with route configuration support */
  head: ArkosRouteMethodHandler<this>;
  // /** TRACE method handler with route configuration support */
  trace: ArkosRouteMethodHandler<this>;
  /** ALL methods handler with route configuration support */
  all: ArkosRouteMethodHandler<this>;
}

/**
 * Creates an enhanced Express Router with features like OpenAPI documentation capabilities and smart data validation.
 *
 * The ArkosRouter extends the standard Express Router with the ability to
 * automatically capture OpenAPI metadata from route configurations.
 *
 * @example
 * const router = ArkosRouter();
 *
 * router.get(
 *   {
 *     path: "/users/:id",
 *     openapi: {
 *       summary: "Get user by ID",
 *       tags: ["Users"]
 *     }
 *   },
 *   (req, res) => { ... }
 * );
 *
 * @returns {IArkosRouter} A proxied Express Router instance with enhanced OpenAPI capabilities
 *
 * @see {@link ArkosRouteConfig} for configuration options
 */
export interface IArkosRouter extends IRouter {
  /** GET method handler with route configuration support */
  get: RouterMethodHandler<this>;
  /** POST method handler with route configuration support */
  post: RouterMethodHandler<this>;
  /** PUT method handler with route configuration support */
  put: RouterMethodHandler<this>;
  /** PATCH method handler with route configuration support */
  patch: RouterMethodHandler<this>;
  /** DELETE method handler with route configuration support */
  delete: RouterMethodHandler<this>;
  /** OPTIONS method handler with route configuration support */
  options: RouterMethodHandler<this>;
  /** HEAD method handler with route configuration support */
  head: RouterMethodHandler<this>;
  // /** TRACE method handler with route configuration support */
  trace: RouterMethodHandler<this>;
  /** ALL methods handler with route configuration support */
  all: RouterMethodHandler<this>;

  route<T extends string>(prefix: T): ArkosIRoute;
  route(prefix: PathParams): ArkosIRoute;
}

/**
 * Configuration object for defining routes in Arkos.js.
 */
export type ArkosRouteConfig = {
  /**
   * Disables the route by not mounting it internally.
   */
  disabled?: boolean;
  /**
   * The URL path pattern for the route.
   *
   * @example "/api/users/:id"
   */
  path: PathParams;
  /**
   * Authentication and authorization configuration.
   *
   * @remarks
   * - Set to `true` to require authentication without specific permissions.
   * - Set to `false` or omit to allow unauthenticated access.
   * - Provide an object to specify resource-based access control with resource name, action, and optional custom rules.
   */
  authentication?:
    | boolean
    | {
        resource: string;
        action: string;
        rule?: AccessControlConfig;
      };
  /**
   * Request validation configuration using Zod schemas or class constructors.
   *
   * @remarks
   * - Set to `false` to disable all validation.
   * - Provide an object with `query`, `body`, and/or `params` properties to validate specific parts of the request.
   * - Each property accepts a Zod schema, a class constructor, or `false` to disable validation for that part.
   */
  validation?:
    | false
    | {
        query?: ZodSchema | (new (...args: any[]) => object) | false;
        body?: ZodSchema | (new (...args: any[]) => object) | false;
        params?: ZodSchema | (new (...args: any[]) => object) | false;
      };

  /**
   * Rate limiting configuration for this route.
   *
   * @see {@link https://www.npmjs.com/package/express-rate-limit express-rate-limit} for available options.
   */
  rateLimit?: Partial<RateLimitOptions>;

  /**
   * Allows to define options for npm package compression.
   * Nothing is passed by default.
   *
   * @see {@link https://www.npmjs.com/package/compression compression} for further details.
   */
  compression?: compression.CompressionOptions;
  /**
   * Options to define how query must be parsed.
   *
   * @example
   * ```
   * GET /api/product?saleId=null
   * ```
   *
   * Normally would parsed to { saleId: "null" } so query parser
   * trough setting option `parseNull` will transform { saleId: null }
   *
   * @default
   * ```
   * {
   *   parseNull: true,
   *   parseUndefined: true,
   *   parseBoolean: true,
   * }
   * ```
   *
   * @remarks
   * parseNumber may convert fields that are string but you only passed
   * numbers to query pay attention to this.
   *
   * Soon a feature to converted the query to the end prisma type will be added.
   */
  queryParser?: QueryParserOptions;
  /**
   * Configuration for request body parsing.
   *
   * @property {("json" | "urlencoded" | "raw" | "text")} parser - The type of body parser to use.
   * @property {object} [options] - Parser-specific options passed to the corresponding Express body parser middleware.
   *
   * @remarks
   * - When `parser` is `"json"`, options are passed to `express.json()`.
   * - When `parser` is `"urlencoded"`, options are passed to `express.urlencoded()`.
   * - When `parser` is `"raw"`, options are passed to `express.raw()`.
   * - When `parser` is `"text"`, options are passed to `express.text()`.
   * - Set to `false` to disable body parsing for this route.
   *
   * @see {@link https://expressjs.com/en/api.html#express.json Express body parser documentation}
   */
  bodyParser?: BodyParserConfig | BodyParserConfig[] | false;
  /**
   * Experimental features to be battled tested before being stable
   *
   * PS: These features may be changed without any previous warning.
   */
  experimental?: {
    /**
     * OpenAPI specification for this route.
     *
     * @remarks
     * - Set to `false` to exclude this route from OpenAPI documentation.
     * - Provide a partial OpenAPI operation object to document the route.
     */
    openapi?: false | OpenApiConfig;
    /**
     * Configuration for file upload handling in routes.
     * Supports single file, multiple files from same field, or multiple fields with files.
     */
    uploads?: UploadConfig;
  };
};
