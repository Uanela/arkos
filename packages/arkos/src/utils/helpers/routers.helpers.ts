import catchAsync, {
  CatchAsyncReturnType,
} from "../../modules/error-handler/utils/catch-async";
import ExitError from "./exit-error";

function throwErrorIfInterceptorIsNotAFunction(middleware: any) {
  if (middleware && typeof middleware !== "function")
    throw ExitError(
      `Validation Error: Invalid interceptor of type ${typeof middleware}, they must be a function or an array of function. checkout https://arkosjs.com/docs/core-concepts/components/interceptors`
    );
}

export const safeCatchAsync = (
  middleware: any,
  options: { type: "error" | "normal" } = { type: "normal" }
) => {
  if (middleware && typeof middleware !== "function")
    throw ExitError(
      `Validation Error: Invalid interceptor of type ${typeof middleware}, they must be a function or an array of function. checkout https://arkosjs.com/docs/core-concepts/components/interceptors`
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
