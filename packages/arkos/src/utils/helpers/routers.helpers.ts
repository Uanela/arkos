import { catchAsync } from "../../exports/error-handler";
import { CatchAsyncReturnType } from "../../modules/error-handler/utils/catch-async";

export const safeCatchAsync = (middleware: any) => {
  return middleware ? catchAsync(middleware) : undefined;
};

// Helper function to handle middleware arrays or single functions
export const processMiddleware = (middleware: any) => {
  if (!middleware) return [];

  if (Array.isArray(middleware)) {
    return middleware
      .filter((mw) => !!mw)
      .map((mw) => safeCatchAsync(mw)) as CatchAsyncReturnType[];
  } else return [safeCatchAsync(middleware)] as CatchAsyncReturnType[];
};
