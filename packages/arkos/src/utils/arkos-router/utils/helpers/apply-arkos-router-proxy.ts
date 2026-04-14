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
  name: "app" | "ArkosRouter()" = "ArkosRouter()"
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
          // if not an ArkosUseConfig object, fall through to native Express use
          if (
            !config ||
            typeof config !== "object" ||
            Array.isArray(config) ||
            typeof config === "function"
          )
            return originalMethod.call(target, config, ...handlers);

          if ((config as ArkosUseConfig).disabled) return;

          const useConfig = config as ArkosUseConfig;
          const path = useConfig.path
            ? applyPrefix(options?.prefix, useConfig.path)
            : undefined;

          const arkosConfig = getArkosConfig();
          const authenticationConfig = arkosConfig.authentication;

          if (useConfig.authentication && !authenticationConfig?.mode)
            throw ExitError(
              `Trying to authenticate route use${path ? ` ${path}` : ""} without choosing an authentication mode under arkos.config.${getUserFileExtension()}

For further help see https://www.arkosjs.com/docs/core-concepts/authentication/setup.`
            );

          const middlewareStack = getMiddlewareStack(useConfig);

          const allHandlers = [...middlewareStack, ...handlers];

          return path
            ? originalMethod.call(target, path, ...allHandlers)
            : originalMethod.call(target, ...allHandlers);
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
              const fullConfig: ArkosRouteConfig = {
                ...config,
                ...(options?.openapi
                  ? {
                      experimental: {
                        openapi: options.openapi,
                      },
                    }
                  : {}),
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
            throw Error(
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
            throw Error(
              "Please pass valid value for path field to use in your route"
            );

          const method = prop as string;
          const UndefinedHandlerError = (handler: any) =>
            Error(
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
            throw Error(
              "When using strict validation you must either pass { validation: false } in order to explicitly tell that no input will be received, or pass `undefined` for each input type e.g { validation: { query: undefined } } in order to deny the input of given request input."
            );

          if (
            !validationConfig?.resolver &&
            Object.keys(config.validation || {}).length > 0
          )
            throw Error(
              `Trying to pass validators into route ${route} config validation option without choosing a validation resolver under arkos.init({ validation: { resolver: '' } })`
            );

          if (config.authentication && !authenticationConfig?.mode)
            throw Error(
              `Trying to authenticate route ${route} without choosing an authentication mode under arkos.config.${getUserFileExtension()}

For further help see https://www.arkosjs.com/docs/core-concepts/authentication/setup.`
            );

          handlers = [...getMiddlewareStack(config), ...handlers];

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
