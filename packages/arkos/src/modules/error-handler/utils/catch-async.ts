import {
  ArkosRequest,
  ArkosResponse,
  ArkosNextFunction,
  ArkosRequestHandler,
  ArkosErrorRequestHandler,
} from "../../../types";

/**
 * Used to wrap request handlers and middleware for automatic catch async errors and throw to next to invoke the global error handler
 *
 * @param {ArkosRequestHandler} fn - an express request handler or middleware that will be called with req, res, next, with catch attached for error handling
 * @returns
 *
 * @example
 * ```typescript
 * import { ArkosRequest, ArkosResponse, ArkosNextFunction } from 'arkos'
 *
 * export const getManyPosts = catchAsync(async
 * (req: ArkosRequest, res: ArkosResponse, next: ArkosNextFunction) => {
 *    const posts = await getSomePosts()
 *    res.status(200).json({ data: posts })
 * })
 * ```
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
      ): Promise<any> => {
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
      ): Promise<any> => {
        try {
          return (await (fn as ArkosRequestHandler)(req, res, next)) as void;
        } catch (err) {
          next(err);
        }
      };

export type CatchAsyncReturnType = ReturnType<typeof catchAsync>;

export default catchAsync;
