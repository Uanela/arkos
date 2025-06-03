import { ArkosRequest, ArkosResponse, ArkosNextFunction } from "../../types";
import catchAsync from "../error-handler/utils/catch-async";
import APIFeatures from "../../utils/features/api.features";
import { BaseService } from "./base.service";
import AppError from "../error-handler/utils/app-error";
import { kebabCase, pascalCase } from "../../utils/helpers/change-case.helpers";
import { getModelModules, getModels } from "../../utils/helpers/models.helpers";
import { getAppRoutes } from "./utils/helpers/base.controller.helpers";
import pluralize from "pluralize";

/**
 * The `BaseController` class provides standardized RESTful API endpoints
 * for any Prisma model based on its name. It supports automatic integration
 * with Prisma services and dynamic middleware hooks for extending behaviors.
 *
 * This controller includes:
 * - `createOne` / `createMany`
 * - `findOne` / `findMany`
 * - `updateOne` / `updateMany`
 * - `deleteOne` / `deleteMany`
 *
 * It handles:
 * - Prisma query options
 * - APIFeatures: filtering, sorting, pagination, field limiting
 * - Middleware hooks: `afterCreateOne`, `afterUpdateMany`, etc.
 *
 * @class BaseController
 * @example
 *
 * **Extending the Controller**
 *
 * ```ts
 * // src/modules/product/product.controller.ts
 *
 * class ProductController extends BaseController {}
 *
 * const productController = new ProcutController("product")
 *
 * export default productController
 *
 * ```
 * **Using in custom Router**
 *
 * ```ts
 * // src/modules/product/product.router.ts
 *
 * import { Router } from "express";
 * import productController from "./product.controller";
 *
 * const productRouter = Router();
 *
 * // Arkos handles this base endpoints by default it
 * // is just an example
 *
 * productRouter.post("/", productController.createOne);
 * productRouter.get("/", productController.findMany);
 * productRouter.get("/:id", productController.findOne);
 * productRouter.patch("/:id", productController.updateOne);
 * productRouter.delete("/:id", productController.deleteOne);
 *
 * export default productRouter
 * ```
 *
 * @param {string} modelName - The Prisma model name this controller handles.
 *
 * @see {@link https://www.arkosjs.com/docs/api-reference/the-base-controller-class}
 *--
 *
 * **See about how Arkos handles routers**
 * @see {@link https://www.arkosjs.com/docs/guide/adding-custom-routers}
 */
export class BaseController {
  /**
   * Service instance to handle business logic operations
   * @private
   */
  private service: BaseService<any>;

  /**
   * Name of the model this controller handles
   * @private
   */
  private modelName: string;

  /**
   * Model-specific middlewares loaded from model modules
   * @private
   */
  private middlewares: any;

  /**
   * Creates a new BaseController instance
   * @param {string} modelName - The name of the model for which this controller will handle operations
   */
  constructor(modelName: string) {
    this.modelName = modelName;
    this.service = new BaseService(modelName);
    this.middlewares = getModelModules(modelName)?.middlewares || {};
  }

  /**
   * Creates a single resource
   * @param {ArkosRequest} req - Express request object
   * @param {ArkosResponse} res - Express response object
   * @param {ArkosNextFunction} next - Express next function
   * @returns {Promise<void>}
   */
  createOne = catchAsync(
    async (req: ArkosRequest, res: ArkosResponse, next: ArkosNextFunction) => {
      const data = await this.service.createOne(
        req.body,
        req.prismaQueryOptions
      );

      if (this.middlewares.afterCreateOne) {
        req.responseData = { data };
        req.responseStatus = 201;
        return next();
      }

      res.status(201).json({ data });
    }
  );

  /**
   * Creates multiple resources in a single operation
   * @param {ArkosRequest} req - Express request object
   * @param {ArkosResponse} res - Express response object
   * @param {ArkosNextFunction} next - Express next function
   * @returns {Promise<void>}
   */
  createMany = catchAsync(
    async (req: ArkosRequest, res: ArkosResponse, next: ArkosNextFunction) => {
      const data = await this.service.createMany(
        req.body,
        req.prismaQueryOptions
      );

      if (!data) {
        return next(
          new AppError(
            "Failed to create the resources. Please check your input.",
            400
          )
        );
      }

      if (this.middlewares.afterCreateMany) {
        req.responseData = { data };
        req.responseStatus = 201;
        return next();
      }

      res.status(201).json({ data });
    }
  );

  /**
   * Retrieves multiple resources with filtering, sorting, pagination, and field selection
   * @param {ArkosRequest} req - Express request object
   * @param {ArkosResponse} res - Express response object
   * @param {ArkosNextFunction} next - Express next function
   * @returns {Promise<void>}
   */
  findMany = catchAsync(
    async (req: ArkosRequest, res: ArkosResponse, next: ArkosNextFunction) => {
      const {
        filters: { where, ...queryOptions },
      } = new APIFeatures(
        req,
        this.modelName,
        this.service.relationFields?.singular.reduce(
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

      // Execute both operations separately
      const [data, total] = (await Promise.all([
        this.service.findMany(where, queryOptions),
        this.service.count(where),
      ])) as [Record<string, any>[], number];

      if (this.middlewares.afterFindMany) {
        req.responseData = { total, results: data.length, data };
        req.responseStatus = 200;
        return next();
      }

      res.status(200).json({ total, results: data.length, data });
    }
  );

  /**
   * Retrieves a single resource by its identifier
   * @param {ArkosRequest} req - Express request object
   * @param {ArkosResponse} res - Express response object
   * @param {ArkosNextFunction} next - Express next function
   * @returns {Promise<void>}
   */
  findOne = catchAsync(
    async (req: ArkosRequest, res: ArkosResponse, next: ArkosNextFunction) => {
      const data = await this.service.findOne(
        req.params,
        req.prismaQueryOptions
      );

      if (!data) {
        if (
          Object.keys(req.params).length === 1 &&
          "id" in req.params &&
          req.params.id !== "me"
        ) {
          return next(
            new AppError(
              `${pascalCase(String(this.modelName))} with ID ${
                req.params?.id
              } not found`,
              404,
              {},
              "not_found"
            )
          );
        } else {
          return next(
            new AppError(
              `${pascalCase(String(this.modelName))} not found`,
              404,
              {},
              "not_found"
            )
          );
        }
      }

      if (this.middlewares.afterFindOne) {
        req.responseData = { data };
        req.responseStatus = 200;
        return next();
      }

      res.status(200).json({ data });
    }
  );

  /**
   * Updates a single resource by its identifier
   * @param {ArkosRequest} req - Express request object
   * @param {ArkosResponse} res - Express response object
   * @param {ArkosNextFunction} next - Express next function
   * @returns {Promise<void>}
   */
  updateOne = catchAsync(
    async (req: ArkosRequest, res: ArkosResponse, next: ArkosNextFunction) => {
      const data = await this.service.updateOne(
        req.params,
        req.body,
        req.prismaQueryOptions
      );

      if (!data) {
        if (Object.keys(req.params).length === 1 && "id" in req.params) {
          return next(
            new AppError(
              `${pascalCase(String(this.modelName))} with ID ${
                req.params?.id
              } not found`,
              404,
              {},
              "not_found"
            )
          );
        } else {
          return next(
            new AppError(
              `${pascalCase(String(this.modelName))} not found`,
              404,
              {},
              "not_found"
            )
          );
        }
      }

      if (this.middlewares.afterUpdateOne) {
        req.responseData = { data };
        req.responseStatus = 200;
        return next();
      }

      res.status(200).json({ data });
    }
  );

  /**
   * Updates multiple resources that match specified criteria
   * @param {ArkosRequest} req - Express request object
   * @param {ArkosResponse} res - Express response object
   * @param {ArkosNextFunction} next - Express next function
   * @returns {Promise<void>}
   */
  updateMany = catchAsync(
    async (req: ArkosRequest, res: ArkosResponse, next: ArkosNextFunction) => {
      if (!Object.keys(req.query).some((key) => key !== "prismaQueryOptions")) {
        return next(
          new AppError("Filter criteria not provided for bulk update.", 400)
        );
      }

      req.query.filterMode = req.query?.filterMode || "AND";
      const {
        filters: { where, ...queryOptions },
      } = new APIFeatures(req, this.modelName).filter().sort();
      delete queryOptions.include;

      const data = (await this.service.updateMany(
        where,
        req.body,
        queryOptions
      )) as { count: number };

      if (!data || data.count === 0) {
        return next(
          new AppError(
            `${pluralize(pascalCase(String(this.modelName)))} not found`,
            404
          )
        );
      }

      if (this.middlewares.afterUpdateMany) {
        req.responseData = { results: data.count, data };
        req.responseStatus = 200;
        return next();
      }

      res.status(200).json({ results: data.count, data });
    }
  );

  /**
   * Deletes a single resource by its identifier
   * @param {ArkosRequest} req - Express request object
   * @param {ArkosResponse} res - Express response object
   * @param {ArkosNextFunction} next - Express next function
   * @returns {Promise<void>}
   */
  deleteOne = catchAsync(
    async (req: ArkosRequest, res: ArkosResponse, next: ArkosNextFunction) => {
      const data = await this.service.deleteOne(req.params);

      if (!data) {
        if (Object.keys(req.params).length === 1 && "id" in req.params) {
          return next(
            new AppError(
              `${pascalCase(String(this.modelName))} with ID ${
                req.params?.id
              } not found`,
              404,
              {},
              "not_found"
            )
          );
        } else {
          return next(
            new AppError(
              `${pascalCase(String(this.modelName))} not found`,
              404,
              {},
              "not_found"
            )
          );
        }
      }

      if (this.middlewares.afterDeleteOne) {
        req.additionalData = { data };
        req.responseStatus = 204;
        return next();
      }

      res.status(204).send();
    }
  );

  /**
   * Deletes multiple resources that match specified criteria
   * @param {ArkosRequest} req - Express request object
   * @param {ArkosResponse} res - Express response object
   * @param {ArkosNextFunction} next - Express next function
   * @returns {Promise<void>}
   */
  deleteMany = catchAsync(
    async (req: ArkosRequest, res: ArkosResponse, next: ArkosNextFunction) => {
      if (!Object.keys(req.query).some((key) => key !== "prismaQueryOptions")) {
        return next(
          new AppError("Filter criteria not provided for bulk deletion.", 400)
        );
      }

      req.query.filterMode = req.query?.filterMode || "AND";
      const {
        filters: { where },
      } = new APIFeatures(req, this.modelName).filter().sort();

      const data = await this.service.deleteMany(where);

      if (!data || data.count === 0) {
        return next(new AppError(`No records found to delete`, 404));
      }

      if (this.middlewares.afterDeleteMany) {
        req.responseData = { results: data.count, data };
        req.responseStatus = 200;
        return next();
      }

      res.status(200).json({ results: data.count, data });
    }
  );
}

/**
 * Returns a list of all registered API routes in the Express application
 * @param {ArkosRequest} req - Express request object
 * @param {ArkosResponse} res - Express response object
 * @param {ArkosNextFunction} next - Express next function
 * @returns {void}
 */
export function getAvalibleRoutes(
  req: ArkosRequest,
  res: ArkosResponse,
  next: ArkosNextFunction
) {
  const routes = getAppRoutes();

  res.json(routes);
}

/**
 * Returns a list of all available resource endpoints based on the application's models
 * @param {ArkosRequest} req - Express request object
 * @param {ArkosResponse} res - Express response object
 * @param {ArkosNextFunction} next - Express next function
 * @returns {Promise<void>}
 */
export const getAvailableResources = catchAsync(async (req, res, next) => {
  const models = getModels();
  res.status(200).json({
    data: [...models.map((model) => kebabCase(model)), "file-upload"],
  });
});
