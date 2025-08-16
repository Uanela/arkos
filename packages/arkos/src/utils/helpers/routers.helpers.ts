// import catchAsync, {
//   CatchAsyncReturnType,
// } from "../../modules/error-handler/utils/catch-async";

// function throwErrorIfInterceptorIsNotAFunction(middleware: any) {
//   if (
//     (middleware || middleware === undefined || middleware === null) &&
//     typeof middleware !== "function"
//   )
//     throw Error(
//       `Validation Error: Invalid interceptor middleware of type ${typeof middleware}, they must be a function or an array of function. checkout https://arkosjs.com/docs/core-concepts/interceptor-middlewares`
//     );
// }

// export const safeCatchAsync = (middleware: any) => {
//   return middleware ? catchAsync(middleware) : undefined;
// };

// // Helper function to handle middleware arrays or single functions
// export const processMiddleware = (middleware: any) => {
//   if (!middleware) return [];

//   if (Array.isArray(middleware)) {
//     return middleware
//       .filter((mw) => !!mw)
//       .map((mw) => {
//         throwErrorIfInterceptorIsNotAFunction(mw);
//         return safeCatchAsync(mw);
//       }) as CatchAsyncReturnType[];
//   } else {
//     throwErrorIfInterceptorIsNotAFunction(middleware);
//     return [safeCatchAsync(middleware)] as CatchAsyncReturnType[];
//   }
// };
import catchAsync, {
  CatchAsyncReturnType,
} from "../../modules/error-handler/utils/catch-async";

function throwErrorIfInterceptorIsNotAFunction(middleware: any) {
  if (middleware && typeof middleware !== "function") {
    throw Error(
      `Validation Error: Invalid interceptor middleware of type ${typeof middleware}, they must be a function or an array of function. checkout https://arkosjs.com/docs/core-concepts/interceptor-middlewares`
    );
  }
}

export const safeCatchAsync = (middleware: any) => {
  // Check for truthy non-function values and throw error
  if (middleware && typeof middleware !== "function") {
    throw Error(
      `Validation Error: Invalid interceptor middleware of type ${typeof middleware}, they must be a function or an array of function. checkout https://arkosjs.com/docs/core-concepts/interceptor-middlewares`
    );
  }
  return middleware ? catchAsync(middleware) : undefined;
};

// Helper function to handle middleware arrays or single functions
export const processMiddleware = (middleware: any) => {
  if (!middleware) return [];
  if (Array.isArray(middleware)) {
    return middleware
      .filter((mw) => !!mw)
      .map((mw) => {
        throwErrorIfInterceptorIsNotAFunction(mw);
        return safeCatchAsync(mw);
      }) as CatchAsyncReturnType[];
  } else {
    throwErrorIfInterceptorIsNotAFunction(middleware);
    return [safeCatchAsync(middleware)] as CatchAsyncReturnType[];
  }
};
