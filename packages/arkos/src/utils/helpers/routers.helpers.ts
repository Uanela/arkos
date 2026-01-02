import pluralize from "pluralize";
import catchAsync, {
  CatchAsyncReturnType,
} from "../../modules/error-handler/utils/catch-async";
import { AccessAction, AuthConfigs } from "../../types/auth";
import { kebabCase } from "./change-case.helpers";
import {
  AuthRouterEndpoint,
  RouterConfig,
  RouterEndpoint,
} from "../../types/router-config";
import { isEndpointDisabled } from "../../modules/base/utils/helpers/base.router.helpers";
import deepmerge from "./deepmerge.helper";
import { ArkosRouteConfig } from "../arkos-router/types";
import { ArkosConfig } from "../../exports";

function throwErrorIfInterceptorIsNotAFunction(middleware: any) {
  if (middleware && typeof middleware !== "function")
    throw Error(
      `Validation Error: Invalid interceptor of type ${typeof middleware}, they must be a function or an array of function. checkout https://arkosjs.com/docs/core-concepts/interceptor-middlewares`
    );
}

export const safeCatchAsync = (
  middleware: any,
  options: { type: "error" | "normal" } = { type: "normal" }
) => {
  if (middleware && typeof middleware !== "function")
    throw Error(
      `Validation Error: Invalid interceptor of type ${typeof middleware}, they must be a function or an array of function. checkout https://arkosjs.com/docs/core-concepts/interceptor-middlewares`
    );

  return middleware ? catchAsync(middleware, options) : undefined;
};

export const processMiddleware = (
  middleware: any,
  options: { type: "error" | "normal" } = { type: "normal" }
) => {
  if (!middleware) return [];
  if (Array.isArray(middleware)) {
    return middleware
      .filter((mw) => !!mw)
      .map((mw) => {
        throwErrorIfInterceptorIsNotAFunction(mw);
        return safeCatchAsync(mw, options);
      }) as CatchAsyncReturnType[];
  } else {
    throwErrorIfInterceptorIsNotAFunction(middleware);
    return [safeCatchAsync(middleware, options)] as CatchAsyncReturnType[];
  }
};

export function getAuthenticationConfig(
  endpoint: RouterEndpoint | AuthRouterEndpoint,
  modelName: string,
  authConfigs?: AuthConfigs
) {
  const actionMap: Record<any, AccessAction> = {
    createOne: "Create",
    findOneAuthAction: "View",
    findManyAuthAction: "View",
    findMany: "View",
    createMany: "Create",
    updateMany: "Update",
    deleteMany: "Delete",
    findOne: "View",
    updateOne: "Update",
    deleteOne: "Delete",
  };

  const action = actionMap[endpoint];
  const authenticationControl = authConfigs?.authenticationControl;

  if (authenticationControl === true) return true;
  else if (
    (authenticationControl &&
      typeof authenticationControl === "object" &&
      (authenticationControl[action] === true ||
        authenticationControl[action] !== false)) ||
    (!authenticationControl && authenticationControl !== false)
  ) {
    return {
      resource: kebabCase(pluralize.singular(modelName)),
      action: action,
      rule: Array.isArray(authConfigs?.accessControl)
        ? authConfigs?.accessControl
        : (authConfigs?.accessControl || {})?.[action],
    };
  }

  return false;
}

/**
 * Creates a route configuration object for a specific endpoint
 * @param endpoint - The router endpoint type
 * @param routeName - The pluralized route name (e.g., "users")
 * @param path - The path suffix for the route (e.g., "", "/:id", "/many")
 * @param routerConfig - The router configuration object
 * @param modelNameInKebab - The model name in kebab-case
 * @param authConfigs - Authentication configurations
 * @param validationSchema - Optional validation schema for the endpoint
 * @returns Route configuration object
 */
export function createRouteConfig(
  arkosConfig: ArkosConfig,
  endpoint: RouterEndpoint | AuthRouterEndpoint,
  routeName: string,
  path: string,
  routerConfig: RouterConfig<any>,
  modelNameInKebab: string,
  authConfigs: any,
  validationSchema?: any
) {
  let config: ArkosRouteConfig = {
    path: `/${routeName}${path}`,
    disabled: isEndpointDisabled(routerConfig, endpoint),
    ...(arkosConfig.authentication?.mode && {
      authentication:
        typeof authConfigs === "boolean"
          ? authConfigs
          : getAuthenticationConfig(endpoint, modelNameInKebab, authConfigs),
    }),
    validation: validationSchema ? { body: validationSchema } : undefined,
  };

  const endpointConfig = (routerConfig as any)[endpoint];
  if (endpointConfig) config = deepmerge(config, endpointConfig);

  return config;
}
