import express, { Router } from "express";
import { IArkosRouter, ArkosRouteConfig } from "./types";
import { OpenAPIV3 } from "openapi-types";
import RouteConfigValidator from "./route-config-validator";
import RouteConfigRegistry from "./route-config-registry";
import { extractArkosRoutes } from "./utils/helpers";

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
 *     route: "/users/:id",
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
export default function ArkosRouter(): IArkosRouter {
  const router: IArkosRouter = Router();

  return new Proxy(router, {
    get(target, prop, receiver) {
      const originalMethod = Reflect.get(target, prop, receiver);

      const httpMethods = [
        "get",
        "post",
        "put",
        "patch",
        "delete",
        "all",
        "head",
        "trace",
        "options",
      ];

      if (httpMethods.includes(prop as string)) {
        return function (firstArg: any, ...handlers: any[]) {
          if (RouteConfigValidator.isArkosRouteConfig(firstArg)) {
            const config = firstArg as ArkosRouteConfig;
            const method = prop as string;

            if (handlers.length > 0) {
              const finalHandler = handlers[handlers.length - 1];
              RouteConfigRegistry.register(finalHandler, config, method);
            }

            return originalMethod.call(target, config.route, ...handlers);
          } else {
            return originalMethod.call(target, firstArg, ...handlers);
          }
        };
      }
      return originalMethod;
    },
  }) as IArkosRouter;
}

export function generateOpenAPIFromApp(app: any) {
  const routes = extractArkosRoutes(app);
  const paths: Record<
    string,
    Record<string, Partial<OpenAPIV3.OperationObject>>
  > = {};

  routes.forEach(({ path, method, config }) => {
    if (config?.openapi === false) return;

    if (!paths[path]) paths[path] = {};

    if (typeof config?.openapi === "boolean") {
      config = {
        ...config,
        openapi: {},
      };
    }

    const openapi =
      typeof config?.openapi === "object" && config.openapi !== null
        ? config.openapi
        : {};

    paths[path][method.toLowerCase()] = {
      summary: openapi?.summary || `${method} ${path}`,
      description: openapi?.description || `${method} ${path}`,
      tags: openapi?.tags || ["Others"],
      operationId: `${method}:${path}`,
      ...openapi,
    };
  });

  return paths;
}
