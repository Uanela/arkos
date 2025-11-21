import {
  ArkosRequest,
  ArkosResponse,
  ArkosNextFunction,
  ArkosRequestHandler,
  ArkosErrorRequestHandler,
} from "../../../types";

/**
 * Wraps async request handlers and middleware to automatically catch errors and pass them to the global error handler.
 * 
 * This utility eliminates the need for try-catch blocks in every route handler by automatically
 * catching any thrown errors or rejected promises and forwarding them to Express's error handling middleware.
 *
 * @template T - The type of request handler (normal or error handler)
 * @param {ArkosRequestHandler | ArkosErrorRequestHandler} fn - An Express request handler or middleware function
 * @param {Object} options - Configuration options
 * @param {('error'|'normal')} options.type - Type of handler: 'error' for error middleware, 'normal' for regular handlers (default: 'normal')
 * @returns {Function} A wrapped function that catches async errors and forwards them to next()
 *
 * @example
 * // Basic usage with a controller
 * import { ArkosRequest, ArkosResponse, ArkosNextFunction, catchAsync } from 'arkos'
 *
 * export const getManyPosts = catchAsync(async (
 *   req: ArkosRequest, 
 *   res: ArkosResponse, 
 *   next: ArkosNextFunction
 * ) => {
 *   const posts = await getSomePosts() // If this throws, catchAsync handles it
 *   res.status(200).json({ data: posts })
 * })
 *
 * @example
 * // Usage with error middleware
 * export const customErrorHandler = catchAsync(async (
 *   err: any,
 *   req: ArkosRequest,
 *   res: ArkosResponse,
 *   next: ArkosNextFunction
 * ) => {
 *   // Custom error processing
 *   await logError(err)
 *   next(err)
 * }, { type: 'error' })
 */
const catchAsync = (
  fn: ArkosRequestHandler | ArkosErrorRequestHandler,
  options: { type: "error" | "normal" } = { type: "normal" }
): any =>
  options?.type === "error"
    ? async (
        err: any,
        req: ArkosRequest,
        res: ArkosResponse,
        next: ArkosNextFunction
      ): Promise<void> => {
        try {
          return (await (fn as any)(err, req, res, next)) as void;
        } catch (err) {
          next(err);
        }
      }
    : async (
        req: ArkosRequest,
        res: ArkosResponse,
        next: ArkosNextFunction
      ): Promise<void> => {
        try {
          return (await (fn as ArkosRequestHandler)(req, res, next)) as void;
        } catch (err) {
          next(err);
        }
      };

export type CatchAsyncReturnType = ReturnType<typeof catchAsync>;

export default catchAsync;
