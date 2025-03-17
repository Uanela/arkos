import { NextFunction, Request, Response } from "express";
import catchAsync from "../error-handler/utils/catch-async";
import APIFeatures from "../../utils/features/api.features";
import { BaseService } from "./base.service";
import AppError from "../error-handler/utils/app-error";
import { pascalCase } from "change-case-all";
import { getExpressApp } from "../../server";
import { getModels } from "../../utils/helpers/models.helpers";

export async function handlerFactory(modelName: string, modelModules: any) {
  const baseService = new BaseService(modelName);
  const { middlewares } = modelModules;

  return {
    createOne: catchAsync(
      async (req: Request, res: Response, next: NextFunction) => {
        const data = await baseService.createOne(
          req.body,
          req.query?.prismaQueryOptions as string
        );

        if (middlewares?.afterCreateOne) {
          (req as any).responseData = { data };
          (req as any).responseStatus = 201;
          return next();
        }

        res.status(201).json({ data });
      }
    ),

    createMany: catchAsync(
      async (req: Request, res: Response, next: NextFunction) => {
        const { data, total } = await baseService.createMany(req.body);

        if (middlewares?.afterCreateMany) {
          (req as any).responseData = { total, results: data.length, data };
          (req as any).responseStatus = 201;
          return next();
        }

        res.status(201).json({ total, results: data.length, data });
      }
    ),

    findMany: catchAsync(
      async (req: Request, res: Response, next: NextFunction) => {
        const features = new APIFeatures(
          req,
          modelName,
          baseService.relationFields?.singular.reduce(
            (acc: Record<string, boolean>, curr) => {
              acc[curr.name] = true;
              return acc;
            },
            {}
          )
        )
          .filter()
          .sort()
          .limitFields()
          .paginate();

        const { data, total } = await baseService.findMany(features.filters);

        if (middlewares?.afterFindMany) {
          (req as any).responseData = { total, results: data.length, data };
          (req as any).responseStatus = 200;
          return next();
        }

        res.status(200).json({ total, results: data.length, data });
      }
    ),

    findOne: catchAsync(
      async (req: Request, res: Response, next: NextFunction) => {
        const data = await baseService.findOne(
          req.params,
          req.query?.prismaQueryOptions as string
        );

        if (middlewares?.afterFindOne) {
          (req as any).responseData = { data };
          (req as any).responseStatus = 200;
          return next();
        }

        res.status(200).json({ data });
      }
    ),

    updateOne: catchAsync(
      async (req: Request, res: Response, next: NextFunction) => {
        const data = await baseService.updateOne(
          req.params,
          req.body,
          req.query?.prismaQueryOptions as string
        );

        if (middlewares?.afterUpdateOne) {
          (req as any).responseData = { data };
          (req as any).responseStatus = 200;
          return next();
        }

        res.status(200).json({ data });
      }
    ),

    updateMany: catchAsync(
      async (req: Request, res: Response, next: NextFunction) => {
        if (
          !Object.keys(req.query).some(
            (value) => value !== "prismaQueryOptions"
          )
        ) {
          return next(
            new AppError("Filter criteria not provided for bulk update.", 400)
          );
        }

        const features = new APIFeatures(req, modelName).filter().sort();
        delete features.filters.include;

        const { data, total } = await baseService.updateMany(
          features.filters,
          req.body
        );

        if (middlewares?.afterUpdateMany) {
          (req as any).responseData = { total, results: data.length, data };
          (req as any).responseStatus = 200;
          return next();
        }

        res.status(200).json({ total, results: data.length, data });
      }
    ),

    deleteOne: catchAsync(
      async (req: Request, res: Response, next: NextFunction) => {
        await baseService.deleteOne(req.params);

        if (middlewares?.afterDeleteOne) {
          (req as any).responseData = { id: String(req.params.id) };
          (req as any).responseStatus = 204;
          return next();
        }

        res.status(204).send();
      }
    ),

    deleteMany: catchAsync(
      async (req: Request, res: Response, next: NextFunction) => {
        if (
          !Object.keys(req.query).some(
            (value) => value !== "prismaQueryOptions"
          )
        ) {
          return next(
            new AppError("Filter criteria not provided for bulk deletion.", 400)
          );
        }

        const features = new APIFeatures(req, modelName).filter().sort();
        delete features.filters.include;

        const { data, total } = await baseService.deleteMany(features.filters);

        if (middlewares?.afterDeleteMany) {
          (req as any).responseData = { total, results: data.length, data };
          (req as any).responseStatus = 200;
          return next();
        }

        res.status(200).json({ total, results: data.length, data });
      }
    ),
  };
}

export function getAvalibleRoutes(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const routes: { method: string; path: string }[] = [];
  req.params;
  const app = getExpressApp();

  app._router.stack.forEach((middleware: any) => {
    if (middleware.route) {
      Object.keys(middleware.route.methods).forEach((method) => {
        routes.push({
          method: method.toUpperCase(),
          path: middleware.route.path,
        });
      });
    } else if (middleware.handle && middleware.handle.stack) {
      middleware.handle.stack.forEach((routerMiddleware: any) => {
        if (routerMiddleware.route) {
          Object.keys(routerMiddleware.route.methods).forEach((method) => {
            const fullPath =
              (middleware.regexp
                ? middleware.regexp.toString().replace("/", "")
                : "") + routerMiddleware.route.path;
            routes.push({
              method: method.toUpperCase(),
              path: routerMiddleware.route.path,
            });
          });
        }
      });
    }
  });

  res.json(routes);
}

export const getDatabaseModels = catchAsync(async (req, res, next) => {
  const models = getModels();
  res.status(200).json({ data: models.map((model) => pascalCase(model)) });
});
