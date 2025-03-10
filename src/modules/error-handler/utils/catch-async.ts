import { NextFunction, Request, RequestHandler, Response } from 'express'

const catchAsync =
  (fn: RequestHandler) => (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next)?.catch((err: Error) => {
      return next(err)
    })
  }

export default catchAsync
