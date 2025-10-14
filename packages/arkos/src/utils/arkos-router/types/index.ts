import { ErrorRequestHandler, IRouter, RequestHandler } from "express";
import { OpenAPIV3 } from "openapi-types";
import { ZodSchema } from "zod";

type MethodHandler = (
  config: ArkosRouteConfig,
  ...handlers: (RequestHandler | ErrorRequestHandler)[]
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
    | boolean
    | {
        resource: string;
        action: string;
        rule?: any;
      };
  validation?:
    | undefined
    | {
        query?: ZodSchema | (new (...args: any[]) => object) | undefined;
        body?: ZodSchema | (new (...args: any[]) => object) | undefined;
        params?: ZodSchema | (new (...args: any[]) => object) | undefined;
      };
  openapi?: boolean | Partial<OpenAPIV3.OperationObject>;
}
