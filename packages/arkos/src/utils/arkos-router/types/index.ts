import { IRouter } from "express";
import { OpenAPIV3 } from "openapi-types";
import { ZodSchema } from "zod";
import { Options as RateLimitOptions } from "express-rate-limit";
import { AccessControlRules } from "../../../types/auth";
import { ArkosErrorRequestHandler, ArkosRequestHandler } from "../../../types";
import { CorsOptions } from "cors";
import express from "express";

type MethodHandler = (
  config: ArkosRouteConfig,
  ...handlers: (ArkosRequestHandler | ArkosErrorRequestHandler)[]
) => IArkosRouter;

export interface IArkosRouter
  extends Omit<
    IRouter,
    | "get"
    | "post"
    | "put"
    | "patch"
    | "delete"
    | "options"
    | "head"
    | "trace"
    | "all"
  > {
  get: MethodHandler;
  post: MethodHandler;
  put: MethodHandler;
  patch: MethodHandler;
  delete: MethodHandler;
  options: MethodHandler;
  head: MethodHandler;
  trace: MethodHandler;
  all: MethodHandler;
}

export interface ArkosRouteConfig {
  route: string;
  authentication?:
    | false
    | {
        resource: string;
        action: string;
        rule?: AccessControlRules;
      };
  validation?:
    | false
    | {
        query?: ZodSchema | (new (...args: any[]) => object) | false;
        body?: ZodSchema | (new (...args: any[]) => object) | false;
        params?: ZodSchema | (new (...args: any[]) => object) | false;
      };
  openapi?: boolean | Partial<OpenAPIV3.OperationObject>;
  rateLimit?: Partial<RateLimitOptions>;
  /**
   * Configuration for CORS (Cross-Origin Resource Sharing).
   *
   * @property {string | string[] | "all"} [allowedOrigins] - List of allowed origins. If set to `"all"`, all origins are accepted.
   * @property {import('cors').CorsOptions} [options] - Additional CORS options passed directly to the `cors` middleware.
   * @property {import('cors').CorsOptionsDelegate} [customMiddleware] - A custom middleware function that overrides the default behavior.
   *
   * @remarks
   * If `customMiddleware` is provided, both `allowedOrigins` and `options` will be ignored in favor of the custom logic.
   *
   * See https://www.npmjs.com/package/cors
   */
  cors?: {
    /**
     * Defines allowed origins to acess the API.
     */
    allowedOrigins?: string | string[] | "*";
    options?: CorsOptions;
  };
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
   * See https://expressjs.com/en/api.html#express.json
   */
  bodyParser?:
    | { parser: "json"; options?: Parameters<typeof express.json>[0] }
    | {
        parser: "urlencoded";
        options?: Parameters<typeof express.urlencoded>[0];
      }
    | { parser: "raw"; options?: Parameters<typeof express.raw>[0] }
    | { parser: "text"; options?: Parameters<typeof express.text>[0] }
    | false;
}
