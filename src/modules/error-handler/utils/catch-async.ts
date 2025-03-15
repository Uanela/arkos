import { NextFunction, Request, RequestHandler, Response } from "express";

/**
 * Used to wrap request handlers and middleware for automatic catch async errors and throw to next to invoke the global error handler
 *
 * @param {RequestHandler} fn - an express request handler or middleware that will be called with req, res, next, with catch attached for error handling
 * @returns
 *
 * @example
 * ```typescript
 * export const getManyPosts = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
 *    const posts = await getSomePosts()
 *    res.status(200).json({ data: posts })
 * })
 * ```
 */
const catchAsync =
  (fn: RequestHandler) => (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next)?.catch((err: Error) => {
      return next(err);
    });
  };

export default catchAsync;
