import { IRouter } from "express";
import { OpenAPIV3 } from "openapi-types";
import { ZodSchema } from "zod";
import { Options as RateLimitOptions } from "express-rate-limit";
import { AccessControlRules } from "../../../types/auth";
import { ArkosErrorRequestHandler, ArkosRequestHandler } from "../../../types";
import { CorsOptions } from "cors";

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
}
