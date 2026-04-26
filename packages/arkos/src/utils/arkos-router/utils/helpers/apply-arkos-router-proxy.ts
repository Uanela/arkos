import { RouterOptions } from "express";
import {
  ArkosAnyRequestHandler,
  ArkosRouteConfig,
  ArkosUseConfig,
  IArkosRoute,
  PathParams,
} from "../../types";
import RouteConfigValidator from "../../route-config-validator";
import { applyPrefix, getMiddlewareStack } from ".";
import { getUserFileExtension } from "../../../helpers/fs.helpers";
import { getArkosConfig } from "../../../../server";
import RouteConfigRegistry from "../../route-config-registry";
import { catchAsync } from "../../../../exports/error-handler";
import deepmerge from "../../../helpers/deepmerge.helper";
import ExitError from "../../../helpers/exit-error";
import uploadManager from "./upload-manager";

export function applyArkosRouterProxy<T extends object>(
  target: T,
  options?: RouterOptions & {
    prefix?: string | RegExp | Array<string | RegExp>;
    openapi?: { tags?: string[] };
  },
  name: "app" | "router" = "router"
): T {
  return new Proxy(target, {
    get(target, prop, receiver) {
      const originalMethod = Reflect.get(target, prop, receiver) as Function;

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
      ] as const;

      if (prop === "use") {
        return function (
          config: ArkosUseConfig | PathParams | ArkosAnyRequestHandler,
          ...handlers: ArkosAnyRequestHandler[]
        ) {
          // normalize function/router to ArkosUseConfig
          if (typeof config === "function" || Array.isArray(config)) {
            handlers = [config as ArkosAnyRequestHandler, ...handlers];
            config = {} as ArkosUseConfig;
          } else if (
            !config ||
            typeof config !== "object" ||
            typeof config === "string" ||
            config instanceof RegExp
          ) {
            throw ExitError(
              `First argument of ${name}.use() must be a valid ArkosRouteConfig object or a middleware function, but received ${typeof config === "object" ? JSON.stringify(config, null, 2) : config}.`
            );
          }

          if ((config as ArkosUseConfig).disabled) return;

          const useConfig = config as ArkosUseConfig;
          const path = applyPrefix(options?.prefix, useConfig.path ?? "/");

          const arkosConfig = getArkosConfig();
          const authenticationConfig = arkosConfig.authentication;

          if (useConfig.authentication && !authenticationConfig?.mode)
            throw ExitError(
              `Trying to authenticate route use${path ? ` ${path}` : ""} without choosing an authentication mode under arkos.config.${getUserFileExtension()}

For further help see https://www.arkosjs.com/docs/core-concepts/authentication/setup.`
            );

          const middlewareStack = getMiddlewareStack(useConfig);
          const allHandlers = [...middlewareStack, ...handlers];

          return originalMethod.call(target, path, ...allHandlers);
        };
      }

      if (prop === "route") {
        return function (path: PathParams) {
          const routeChain: any = {};

          httpMethods.forEach((method) => {
            routeChain[method] = function (
              config: ArkosAnyRequestHandler | Omit<ArkosRouteConfig, "path">,
              ...handlers: ArkosAnyRequestHandler[]
            ) {
              if (typeof config === "function" || Array.isArray(config))
                throw ExitError(
                  `First argument of ${name}.route("${path}").${method}() must be a valid ArkosRouteConfig object without path field, but received ${typeof config === "object" ? JSON.stringify(config, null, 2) : config}`
                );

              const fullConfig: ArkosRouteConfig = {
                ...config,
                path,
              };

              receiver[method](fullConfig, ...handlers);
              return routeChain as IArkosRoute;
            };
          });

          return routeChain;
        };
      }

      if (httpMethods.includes(prop as any)) {
        return function (
          config: ArkosRouteConfig,
          ...handlers: ArkosAnyRequestHandler[]
        ) {
          if (config.disabled) return;

          if (!RouteConfigValidator.isArkosRouteConfig(config))
            throw ExitError(
              `First argument of ${name}.${prop as string}() must be a valid ArkosRouteConfig object with path field, but recevied ${typeof config === "object" ? JSON.stringify(config, null, 2) : config}`
            );

          const path = applyPrefix(options?.prefix, config.path);

          config = {
            ...config,
            ...(options?.openapi
              ? {
                  experimental: {
                    ...config?.experimental,
                    openapi: deepmerge(
                      options.openapi || {},
                      config?.experimental?.openapi || {}
                    ),
                  },
                }
              : {}),
            path,
          };

          if ([null, undefined].includes(path as any))
            throw ExitError(
              "Please pass valid value for path field to use in your route"
            );

          const method = prop as string;
          const UndefinedHandlerError = (handler: any) =>
            ExitError(
              `Wrong value for handler in route ${method.toUpperCase()} ${path}, recevied ${handler}.`
            );

          if (handlers.length > 0) {
            const flattenHandlers = (arr: any[]): ArkosAnyRequestHandler[] => {
              return arr.reduce((flat, item) => {
                return flat.concat(
                  Array.isArray(item) ? flattenHandlers(item) : item
                );
              }, []);
            };

            const flatHandlers = flattenHandlers(handlers);

            handlers = flatHandlers.map((handler: ArkosAnyRequestHandler) => {
              if (!handler) throw UndefinedHandlerError(handler);

              if (typeof handler !== "function") {
                throw UndefinedHandlerError(handler);
              }

              return catchAsync(handler, {
                type: handler.length > 3 ? "error" : "normal",
              });
            });

            const finalHandler = handlers[handlers.length - 1];
            RouteConfigRegistry.register(finalHandler, config, method);
          }

          const arkosConfig = getArkosConfig();
          const validationConfig = arkosConfig.validation;
          const authenticationConfig = arkosConfig.authentication;
          const strictValidation = validationConfig?.strict;
          const route = `${method.toUpperCase()} ${path}`;

          if (
            strictValidation &&
            (!("validation" in config) ||
              ("validation" in config &&
                !config.validation &&
                config.validation !== undefined))
          )
            throw ExitError(
              "When using strict validation you must either pass { validation: false } in order to explicitly tell that no input will be received, or pass `undefined` for each input type e.g { validation: { query: undefined } } in order to deny the input of given request input."
            );

          if (
            !validationConfig?.resolver &&
            Object.keys(config.validation || {}).length > 0
          )
            throw ExitError(
              `Trying to pass validators into route ${route} config validation option without choosing a validation resolver under arkos.init({ validation: { resolver: '' } })`
            );

          if (config.authentication && !authenticationConfig?.mode)
            throw ExitError(
              `Trying to authenticate route ${route} without choosing an authentication mode under arkos.config.${getUserFileExtension()}

For further help see https://www.arkosjs.com/docs/core-concepts/authentication/setup.`
            );

          handlers = [...getMiddlewareStack(config), ...handlers];

          if (handlers.length === 0)
            throw ExitError(
              `No handlers provided for route ${method.toUpperCase()} ${path}.`
            );

          if (
            config.experimental?.uploads &&
            config.experimental.uploads.deleteOnError !== false
          )
            handlers.push(
              catchAsync(
                uploadManager.handleFileCleanup(config.experimental.uploads),
                { type: "error" }
              )
            );

          return originalMethod.call(target, path, ...handlers);
        };
      }
      // }
      return originalMethod;
    },
  });
}
