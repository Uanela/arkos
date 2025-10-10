import { Router } from "express";
import { IArkosRouter, ArkosRouteConfig } from "./types";
import { OpenAPIV3 } from "openapi-types";
import RouteConfigValidator from "./route-config-validator";
import RouteConfigRegistry from "./route-config-registry";
import { extractArkosRoutes, getMiddlewareStack } from "./utils/helpers";
import { getArkosConfig } from "../../exports";
import { catchAsync } from "../../exports/error-handler";
import { ArkosErrorRequestHandler, ArkosRequestHandler } from "../../types";

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
        return function (
          firstArg: any,
          ...handlers: (ArkosRequestHandler | ArkosErrorRequestHandler)[]
        ) {
          let route = firstArg;
          if (RouteConfigValidator.isArkosRouteConfig(firstArg)) {
            const config = firstArg as ArkosRouteConfig;
            const method = prop as string;
            route = config.route;

            if (handlers.length > 0) {
              handlers = handlers.map((handler) =>
                catchAsync(handler, {
                  type: handler.length > 3 ? "error" : "normal",
                })
              );

              const finalHandler = handlers[handlers.length - 1];
              RouteConfigRegistry.register(finalHandler, config, method);
            }

            const arkosConfig = getArkosConfig();
            const validationConfig = arkosConfig.validation;
            const authenticationConfig = arkosConfig.authentication;

            if (
              validationConfig?.strict &&
              (!("validation" in config) ||
                ("validation" in config &&
                  !config.validation &&
                  config.validation !== undefined))
            )
              throw Error(
                "When using strict validation you must either pass { validation: false } in order to explicitly tell that no input will be received, or pass `undefined` for each input type e.g { validation: { query: undefined } } in order to deny the input of given request input."
              );

            if (!validationConfig?.resolver && config.validation)
              throw Error(
                "Trying to pass validators into route config validation option without choosing a validation resolver under arkos.init({ validation: { resolver: '' } })"
              );

            if (!authenticationConfig?.mode && config.authentication)
              throw Error(
                "Trying to authenticate a route without choosing an authentication mode under arkos.init({ authentication: { mode: '' } })"
              );

            handlers = [...getMiddlewareStack(config), ...handlers];
          } else
            throw Error(
              `First argument of ArkosRouter().${prop as string}() must be a valid ArkosRouteConfig but recevied ${firstArg}`
            );

          return originalMethod.call(target, route, ...handlers);
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
