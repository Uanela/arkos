import pluralize from "pluralize";
import catchAsync, {
  CatchAsyncReturnType,
} from "../../modules/error-handler/utils/catch-async";
import { AccessAction, AuthConfigs } from "../../types/auth";
import { kebabCase } from "./change-case.helpers";
import { AuthRouterEndpoint, RouterEndpoint } from "../../types/router-config";
import ExitError from "./exit-error";

function throwErrorIfInterceptorIsNotAFunction(middleware: any) {
  if (middleware && typeof middleware !== "function")
    throw ExitError(
      `Validation Error: Invalid interceptor of type ${typeof middleware}, they must be a function or an array of function. checkout https://arkosjs.com/docs/core-concepts/interceptor-middlewares`
    );
}

export const safeCatchAsync = (
  middleware: any,
  options: { type: "error" | "normal" } = { type: "normal" }
) => {
  if (middleware && typeof middleware !== "function")
    throw ExitError(
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
    const rule: any = authConfigs?.accessControl;
    return {
      resource: kebabCase(pluralize.singular(modelName)),
      action: action,
      rule: rule && (action in rule ? rule[action] : rule),
    };
  }

  return false;
}
