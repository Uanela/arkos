import { ArkosRequest, ArkosResponse, ArkosNextFunction } from "../../types";
import catchAsync from "../error-handler/utils/catch-async";
import { BaseService } from "./base.service";
import AppError from "../error-handler/utils/app-error";
import { kebabCase, pascalCase } from "../../utils/helpers/change-case.helpers";
import { getModuleComponents } from "../../utils/dynamic-loader";
import pluralize from "pluralize";
import sheu from "../../utils/sheu";
import prismaSchemaParser from "../../utils/prisma/prisma-schema-parser";
import { APIFeatures } from "../../exports/utils";
import deepmerge from "../../utils/helpers/deepmerge.helper";

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
 *
 * @param {string} modelName - The Prisma model name this controller handles.
 *
 * @see {@link https://www.arkosjs.com/docs/api-reference/the-base-controller-class}
 *--
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
   * Model-specific interceptors loaded from model modules
   * @private
   */
  private interceptors: any;

  /**
   * Creates a new BaseController instance
   * @param {string} modelName - The name of the model for which this controller will handle operations
   */
  constructor(modelName: string) {
    const components = getModuleComponents(modelName);

    this.modelName = modelName;
    this.service = new BaseService(modelName);
    this.interceptors = components?.interceptors || {};
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
      const { where, ...queryOptions } = new APIFeatures(
        req,
        this.modelName
      ).limitFields().filters;

      const data = await this.service.createOne(
        req.body,
        deepmerge(req.prismaQueryOptions || {}, queryOptions),
        { user: req?.user, accessToken: req?.accessToken }
      );

      if (this.interceptors.afterCreateOne) {
        req.responseData = { data };
        res.locals.data = { data };
        req.responseStatus = 201;
        res.locals.status = 201;
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
      const { where, ...queryOptions } = new APIFeatures(
        req,
        this.modelName
      ).limitFields().filters;

      const data = await this.service.createMany(
        req.body,
        deepmerge(req.prismaQueryOptions || {}, queryOptions),
        { user: req?.user, accessToken: req?.accessToken }
      );

      if (!data)
        return next(
          new AppError(
            "Failed to create the resources. Please check your input.",
            400,
            { body: req.body }
          )
        );

      if (this.interceptors.afterCreateMany) {
        req.responseData = { data };
        res.locals.data = { data };
        req.responseStatus = 201;
        res.locals.status = 201;
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
      const { where, ...queryOptions } = new APIFeatures(req, this.modelName)
        .filter()
        .sort()
        .limitFields()
        .paginate().filters;

      const [data, total] = (await Promise.all([
        this.service.findMany(where, queryOptions, {
          user: req?.user,
          accessToken: req?.accessToken,
        }),
        this.service.count(where, {
          user: req?.user,
          accessToken: req?.accessToken,
        }),
      ])) as [Record<string, any>[], number];

      if (this.interceptors.afterFindMany) {
        req.responseData = { total, results: data.length, data };
        res.locals.data = { total, results: data.length, data };
        req.responseStatus = 200;
        res.locals.status = 200;
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
      const { where, ...queryOptions } = new APIFeatures(
        req,
        this.modelName
      ).limitFields().filters;

      const data = await this.service.findOne(
        req.params,
        deepmerge(req.prismaQueryOptions || {}, queryOptions),
        { user: req?.user, accessToken: req?.accessToken }
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
              "NotFound"
            )
          );
        } else {
          return next(
            new AppError(
              `${pascalCase(String(this.modelName))} not found`,
              404,
              {},
              "NotFound"
            )
          );
        }
      }

      if (this.interceptors.afterFindOne) {
        req.responseData = { data };
        res.locals.data = { data };
        req.responseStatus = 200;
        res.locals.status = 200;
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
      const { where, ...queryOptions } = new APIFeatures(
        req,
        this.modelName
      ).limitFields().filters;

      const data = await this.service.updateOne(
        req.params,
        req.body,
        deepmerge(req.prismaQueryOptions || {}, queryOptions),
        { user: req?.user, accessToken: req?.accessToken }
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
              "NotFound"
            )
          );
        } else {
          return next(
            new AppError(
              `${pascalCase(String(this.modelName))} not found`,
              404,
              {},
              "NotFound"
            )
          );
        }
      }

      if (this.interceptors.afterUpdateOne) {
        req.responseData = { data };
        res.locals.data = { data };
        req.responseStatus = 200;
        res.locals.status = 200;
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
          new AppError(
            "Filter criteria not provided for bulk update.",
            400,
            {},
            "MissingRequestQueryParameters"
          )
        );
      }

      const { where, ...queryOptions } = new APIFeatures(req, this.modelName)
        .filter()
        .sort()
        .limitFields()
        .paginate().filters;

      delete queryOptions.include;

      const data = (await this.service.updateMany(
        where,
        req.body,
        queryOptions,
        { user: req?.user, accessToken: req?.accessToken }
      )) as { count: number };

      if (!data || data.count === 0)
        return next(
          new AppError(
            `${pluralize(pascalCase(String(this.modelName)))} not found`,
            404
          )
        );

      if (this.interceptors.afterUpdateMany) {
        req.responseData = { results: data.count, data };
        res.locals.data = { results: data.count, data };
        req.responseStatus = 200;
        res.locals.status = 200;
        return next();
      }

      res.status(200).json({ results: data.count, data });
    }
  );

  /**
   * Updates multiple resources with different data in a single transaction
   * @param {ArkosRequest} req - Express request object
   * @param {ArkosResponse} res - Express response object
   * @param {ArkosNextFunction} next - Express next function
   * @returns {Promise<void>}
   */
  batchUpdate = catchAsync(
    async (req: ArkosRequest, res: ArkosResponse, next: ArkosNextFunction) => {
      const { where, ...queryOptions } = new APIFeatures(
        req,
        this.modelName
      ).limitFields().filters;

      const data = await this.service.batchUpdate(
        req.body,
        deepmerge(req.prismaQueryOptions || {}, queryOptions),
        { user: req?.user, accessToken: req?.accessToken }
      );

      if (!data || data.length === 0)
        return next(
          new AppError(
            "Failed to update the resources. Please check your input.",
            400,
            { body: req.body }
          )
        );

      if (this.interceptors.afterBatchUpdate) {
        req.responseData = { results: data.length, data };
        res.locals.data = { results: data.length, data };
        req.responseStatus = 200;
        res.locals.status = 200;
        return next();
      }

      res.status(200).json({ results: data.length, data });
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
      const data = await this.service.deleteOne(req.params, {
        user: req?.user,
        accessToken: req?.accessToken,
      });

      if (!data) {
        if (Object.keys(req.params).length === 1 && "id" in req.params) {
          return next(
            new AppError(
              `${pascalCase(String(this.modelName))} with ID ${
                req.params?.id
              } not found`,
              404,
              {},
              "NotFound"
            )
          );
        } else {
          return next(
            new AppError(
              `${pascalCase(String(this.modelName))} not found`,
              404,
              {},
              "NotFound"
            )
          );
        }
      }

      if (this.interceptors.afterDeleteOne) {
        req.additionalData = { data };
        res.locals.additionalData = { data };
        req.responseStatus = 204;
        res.locals.status = 204;
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
          new AppError(
            "Filter criteria not provided for bulk deletion.",
            400,
            {},
            "MissingRequestQueryParameters"
          )
        );
      }

      const { where } = new APIFeatures(req, this.modelName).filter().filters;

      const data = await this.service.deleteMany(where, {
        user: req?.user,
        accessToken: req?.accessToken,
      });

      if (!data || data.count === 0) {
        return next(
          new AppError(`No records found to delete`, 404, {}, "NotFound")
        );
      }

      if (this.interceptors.afterDeleteMany) {
        req.responseData = { results: data.count, data };
        res.locals.data = { results: data.count, data };
        req.responseStatus = 200;
        res.locals.status = 200;
        return next();
      }

      res.status(200).json({ results: data.count, data });
    }
  );

  /**
   * Deletes multiple resources with different filters in a single transaction
   * @param {ArkosRequest} req - Express request object
   * @param {ArkosResponse} res - Express response object
   * @param {ArkosNextFunction} next - Express next function
   * @returns {Promise<void>}
   */
  batchDelete = catchAsync(
    async (req: ArkosRequest, res: ArkosResponse, next: ArkosNextFunction) => {
      const data = await this.service.batchDelete(req.body, {
        user: req?.user,
        accessToken: req?.accessToken,
      });

      if (!data || data.length === 0)
        return next(
          new AppError(
            "Failed to delete the resources. Please check your input.",
            400,
            { body: req.body }
          )
        );

      if (this.interceptors.afterBatchDelete) {
        req.responseData = { results: data.length, data };
        res.locals.data = { results: data.length, data };
        req.responseStatus = 200;
        res.locals.status = 200;
        return next();
      }

      res.status(200).json({ results: data.length, data });
    }
  );
}

/**
 * Returns a list of all available resource endpoints based on the application's models
 *
 * Will soon be removed
 *
 * @param {ArkosRequest} req - Express request object
 * @param {ArkosResponse} res - Express response object
 * @param {ArkosNextFunction} next - Express next function
 * @returns {Promise<void>}
 */
export const getAvailableResources = catchAsync(
  async (_: any, res: ArkosResponse) => {
    sheu.warn(
      "This route `/api/available-resources` will be deprecated from 1.4.0-beta, consider using /api/auth-actions instead."
    );

    res.status(200).json({
      data: [
        ...prismaSchemaParser
          .getModelsAsArrayOfStrings()
          .map((model) => kebabCase(model)),
        "file-upload",
      ],
    });
  }
);
