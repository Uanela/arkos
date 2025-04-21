import { ArkosRequest, ArkosResponse, ArkosNextFunction } from "../../types";
import catchAsync from "../error-handler/utils/catch-async";
import APIFeatures from "../../utils/features/api.features";
import { BaseService } from "./base.service";
import AppError from "../error-handler/utils/app-error";
import { kebabCase } from "../../utils/helpers/change-case.helpers";
import { getExpressApp } from "../../server";
import { getModelModules, getModels } from "../../utils/helpers/models.helpers";
import { getAppRoutes } from "../../utils/helpers/base.controller.helpers";

/**
 * BaseController class providing standardized RESTful API endpoints for any prisma model
 * @class BaseController
 */
export class BaseController {
  /**
   * Service instance to handle business logic operations
   * @private
   */
  private baseService: BaseService;

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
    this.baseService = new BaseService(modelName);
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
      const data = await this.baseService.createOne(
        req.body,
        req.query?.prismaQueryOptions as string
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
      const { data, total } = await this.baseService.createMany(req.body);

      if (this.middlewares.afterCreateMany) {
        req.responseData = { total, results: data.length, data };
        req.responseStatus = 201;
        return next();
      }

      res.status(201).json({ total, results: data.length, data });
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
      const features = new APIFeatures(
        req,
        this.modelName,
        this.baseService.relationFields?.singular.reduce(
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

      const { data, total } = await this.baseService.findMany(features.filters);

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
      const data = await this.baseService.findOne(
        req.params,
        req.query?.prismaQueryOptions as string
      );

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
      const data = await this.baseService.updateOne(
        req.params,
        req.body,
        req.query?.prismaQueryOptions as string
      );

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
      const features = new APIFeatures(req, this.modelName).filter().sort();
      delete features.filters.include;

      const { data, total } = await this.baseService.updateMany(
        features.filters,
        req.body
      );

      if (this.middlewares.afterUpdateMany) {
        req.responseData = { total, results: data.length, data };
        req.responseStatus = 200;
        return next();
      }

      res.status(200).json({ total, results: data.length, data });
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
      await this.baseService.deleteOne(req.params);

      if (this.middlewares.afterDeleteOne) {
        req.responseData = { id: String(req.params.id) };
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
      const features = new APIFeatures(req, this.modelName).filter().sort();
      delete features.filters.include;

      const { data, total } = await this.baseService.deleteMany(
        features.filters
      );

      if (this.middlewares.afterDeleteMany) {
        req.responseData = { total, results: data.length, data };
        req.responseStatus = 200;
        return next();
      }

      res.status(200).json({ total, results: data.length, data });
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
