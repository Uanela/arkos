import {
  ArkosRequest,
  ArkosResponse,
  ArkosNextFunction,
  ArkosRequestHandler,
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
 * export const getManyPosts = catchAsync(async (req: ArkosRequest, res: ArkosResponse, next: ArkosNextFunction) => {
 *    const posts = await getSomePosts()
 *    res.status(200).json({ data: posts })
 * })
 * ```
 */
const catchAsync =
  (fn: ArkosRequestHandler) =>
  async (req: ArkosRequest, res: ArkosResponse, next: ArkosNextFunction) => {
    try {
      await fn(req, res, next);
    } catch (err) {
      next(err);
    }
  };

export default catchAsync;
