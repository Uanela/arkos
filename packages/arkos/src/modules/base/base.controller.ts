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

export interface OperationHooks {
  beforeQuery?: (req: ArkosRequest) => void | Promise<void>;
  afterQuery?: (
    queryData: { where: any; queryOptions: any },
    req: ArkosRequest
  ) => void | Promise<void>;
  beforeService?: (args: any[], req: ArkosRequest) => any[] | Promise<any[]>;
  afterService?: (data: any, req: ArkosRequest) => any | Promise<any>;
  beforeResponse?: (responseData: any, req: ArkosRequest) => any | Promise<any>;
}

interface OperationConfig {
  operationType: string;
  serviceMethod: string;
  successStatus: number;
  queryFeatures: ("filter" | "sort" | "limitFields" | "paginate")[];
  requiresQueryForBulk?: boolean;
  preventORFilter?: boolean;
  responseBuilder?: (data: any, additionalData?: any) => any;
  errorHandler?: (
    data: any,
    req: ArkosRequest,
    modelName: string
  ) => AppError | null;
  usesRequestParams?: boolean;
  usesRequestBody?: boolean;
  hooks?: OperationHooks;
}

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

  private executeOperation = (config: OperationConfig) => {
    return catchAsync(
      async (
        req: ArkosRequest,
        res: ArkosResponse,
        next: ArkosNextFunction
      ) => {
        if (config.hooks?.beforeQuery) await config.hooks.beforeQuery(req);

        if (config.requiresQueryForBulk) {
          if (
            Object.keys(req.query).every((key) =>
              ["filterMode", "prismaQueryOptions"].includes(key)
            )
          ) {
            return next(
              new AppError(
                `Filter criteria not provided for bulk ${config.operationType.replace(/Many$/, "")}.`,
                400,
                {},
                "MissingRequestQueryParameters"
              )
            );
          }
        }

        if (config.preventORFilter && req.query.filterMode === "OR") {
          throw new AppError(
            `req.query.filterMode === OR is not valid for ${config.operationType} operation`,
            400
          );
        }

        if (config.preventORFilter) req.query.filterMode = "AND";

        let apiFeatures = new APIFeatures(req, this.modelName);

        config.queryFeatures.forEach((feature) => {
          switch (feature) {
            case "filter":
              apiFeatures = apiFeatures.filter();
              break;
            case "sort":
              apiFeatures = apiFeatures.sort();
              break;
            case "limitFields":
              apiFeatures = apiFeatures.limitFields();
              break;
            case "paginate":
              apiFeatures = apiFeatures.paginate();
              break;
          }
        });

        const { where, ...queryOptions } = apiFeatures.filters;

        if (config.hooks?.afterQuery)
          await config.hooks.afterQuery({ where, queryOptions }, req);

        let serviceArgs = this.buildServiceArgs(
          config,
          req,
          where,
          queryOptions
        );

        if (config.hooks?.beforeService)
          serviceArgs = await config.hooks.beforeService(serviceArgs, req);

        const serviceMethod = this.service[
          config.serviceMethod as keyof BaseService<any>
        ] as Function;
        let result = await serviceMethod.apply(this.service, serviceArgs);

        if (config.hooks?.afterService)
          result = await config.hooks.afterService(result, req);

        let data = result;
        let additionalData: any = null;

        if (config.operationType === "findMany") {
          const [records, total] = await Promise.all([
            result,
            this.service.count(where, {
              user: req?.user,
              accessToken: req?.accessToken,
            }),
          ]);
          data = records;
          additionalData = { total, results: records.length };
        }

        const error = config.errorHandler
          ? config.errorHandler(data, req, this.modelName)
          : this.defaultErrorHandler(data, req, config.operationType);

        if (error) return next(error);

        let responseData = config.responseBuilder
          ? config.responseBuilder(data, additionalData)
          : this.defaultResponseBuilder(
              data,
              additionalData,
              config.operationType
            );

        if (config.hooks?.beforeResponse) {
          responseData = await config.hooks.beforeResponse(responseData, req);
        }

        const interceptorName = `after${config.operationType.charAt(0).toUpperCase()}${config.operationType.slice(1)}`;

        if (this.interceptors[interceptorName]) {
          this.setResponseData(req, res, responseData, config.successStatus);
          next();
          return;
        }

        if (config.operationType === "deleteOne") {
          res.status(config.successStatus).send();
          return;
        }

        res.status(config.successStatus).json(responseData);
      }
    );
  };

  /**
   * Sets response data for both legacy (req.responseData) and modern (res.locals) support
   */
  private setResponseData(
    req: ArkosRequest,
    res: ArkosResponse,
    data: any,
    status: number
  ): void {
    (res as any).originalData = data;
    req.responseData = data;
    res.locals.data = data;
    (res as any).originalStatus = status;
    req.responseStatus = status;
    res.locals.status = status;

    // Special handling for deleteOne
    if (status === 204) {
      req.additionalData = data;
      res.locals.additionalData = data;
      (res as any).originalAdditionalData = data;
    }
  }

  /**
   * Builds service method arguments based on operation configuration
   */
  private buildServiceArgs(
    config: OperationConfig,
    req: ArkosRequest,
    where: any,
    queryOptions: any
  ): any[] {
    const context = { user: req?.user, accessToken: req?.accessToken };
    const mergedOptions = deepmerge(req.prismaQueryOptions || {}, queryOptions);

    switch (config.operationType) {
      case "createOne":
      case "createMany":
        return [req.body, mergedOptions, context];

      case "findMany":
        return [where, queryOptions, context];

      case "findOne":
        return [{ ...req.params, ...where }, mergedOptions, context];

      case "updateOne":
        return [{ ...req.params, ...where }, req.body, mergedOptions, context];

      case "updateMany":
        // Remove include for bulk operations
        delete queryOptions.include;
        return [where, req.body, queryOptions, context];

      case "batchUpdate":
        return [
          req.body.map((data: any) => ({
            ...data,
            where: { ...data.where, ...where },
          })),
          mergedOptions,
          context,
        ];

      case "deleteOne":
        return [{ ...req.params, ...where }, context];

      case "deleteMany":
        return [where, context];

      case "batchDelete":
        return [
          req.body.map((data: any) => ({
            ...data,
            where: { ...data.where, ...where },
          })),
          context,
        ];

      default:
        throw new Error(`Unknown operation type: ${config.operationType}`);
    }
  }

  /**
   * Default error handler for operations
   */
  private defaultErrorHandler(
    data: any,
    req: ArkosRequest,
    operationType: string
  ): AppError | null {
    if (!data || (Array.isArray(data) && data.length === 0)) {
      // Handle different error scenarios
      if (operationType.includes("create") || operationType.includes("batch")) {
        return new AppError(
          "Failed to create the resources. Please check your input.",
          400,
          { body: req.body }
        );
      }

      if (
        operationType === "findOne" ||
        operationType === "updateOne" ||
        operationType === "deleteOne"
      ) {
        if (
          Object.keys(req.params).length === 1 &&
          "id" in req.params &&
          req.params.id !== "me"
        ) {
          return new AppError(
            `${pascalCase(String(this.modelName))} with ID ${req.params?.id} not found`,
            404,
            {},
            "NotFound"
          );
        } else {
          return new AppError(
            `${pascalCase(String(this.modelName))} not found`,
            404,
            {},
            "NotFound"
          );
        }
      }

      if (operationType === "updateMany" || operationType === "deleteMany") {
        const isUpdate = operationType === "updateMany";
        return new AppError(
          isUpdate
            ? `${pluralize(pascalCase(String(this.modelName)))} not found`
            : `No records found to delete`,
          404,
          {},
          "NotFound"
        );
      }
    }

    // Special handling for operations that return count
    if (
      data &&
      typeof data === "object" &&
      "count" in data &&
      data.count === 0
    ) {
      return new AppError(
        operationType === "updateMany"
          ? `${pluralize(pascalCase(String(this.modelName)))} not found`
          : `No records found to delete`,
        404,
        {},
        "NotFound"
      );
    }

    return null;
  }

  /**
   * Default response builder for operations
   */
  private defaultResponseBuilder(
    data: any,
    additionalData: any,
    operationType: string
  ): any {
    if (operationType === "findMany" && additionalData)
      return {
        total: additionalData.total,
        results: additionalData.results,
        data,
      };

    if (
      operationType.includes("Many") &&
      data &&
      typeof data === "object" &&
      "count" in data
    )
      return { results: data.count, data };

    if (operationType.includes("batch") && Array.isArray(data))
      return { results: data.length, data };

    return { data };
  }

  /**
   * Creates a single resource
   */
  createOne = this.executeOperation({
    operationType: "createOne",
    serviceMethod: "createOne",
    successStatus: 201,
    queryFeatures: ["limitFields"],
    usesRequestBody: true,
  });

  /**
   * Creates multiple resources in a single operation
   */
  createMany = this.executeOperation({
    operationType: "createMany",
    serviceMethod: "createMany",
    successStatus: 201,
    queryFeatures: ["limitFields"],
    usesRequestBody: true,
    hooks: {
      async beforeQuery(req) {
        if (!req.body || (Array.isArray(req.body) && req.body.length === 0))
          throw new AppError(
            "Expected request body array to contain at least on item but received none",
            400,
            { body: req.body },
            "MissingArrayRequestBody"
          );
      },
    },
  });

  /**
   * Retrieves multiple resources with filtering, sorting, pagination, and field selection
   */
  findMany = this.executeOperation({
    operationType: "findMany",
    serviceMethod: "findMany",
    successStatus: 200,
    queryFeatures: ["filter", "sort", "limitFields", "paginate"],
  });

  /**
   * Retrieves a single resource by its identifier
   */
  findOne = this.executeOperation({
    operationType: "findOne",
    serviceMethod: "findOne",
    successStatus: 200,
    queryFeatures: ["limitFields", "filter"],
    usesRequestParams: true,
  });

  /**
   * Updates a single resource by its identifier
   */
  updateOne = this.executeOperation({
    operationType: "updateOne",
    serviceMethod: "updateOne",
    successStatus: 200,
    queryFeatures: ["limitFields", "filter"],
    usesRequestParams: true,
    usesRequestBody: true,
  });

  /**
   * Updates multiple resources that match specified criteria
   */
  updateMany = this.executeOperation({
    operationType: "updateMany",
    serviceMethod: "updateMany",
    successStatus: 200,
    queryFeatures: ["filter", "limitFields"],
    requiresQueryForBulk: true,
    preventORFilter: true,
    usesRequestBody: true,
  });

  /**
   * Updates multiple resources with different data in a single transaction
   */
  batchUpdate = this.executeOperation({
    operationType: "batchUpdate",
    serviceMethod: "batchUpdate",
    successStatus: 200,
    queryFeatures: ["limitFields", "filter"],
    usesRequestBody: true,
  });

  /**
   * Deletes a single resource by its identifier
   */
  deleteOne = this.executeOperation({
    operationType: "deleteOne",
    serviceMethod: "deleteOne",
    successStatus: 204,
    queryFeatures: ["filter"],
    usesRequestParams: true,
  });

  /**
   * Deletes multiple resources that match specified criteria
   */
  deleteMany = this.executeOperation({
    operationType: "deleteMany",
    serviceMethod: "deleteMany",
    successStatus: 200,
    queryFeatures: ["filter"],
    requiresQueryForBulk: true,
    preventORFilter: true,
  });

  /**
   * Deletes multiple resources with different filters in a single transaction
   */
  batchDelete = this.executeOperation({
    operationType: "batchDelete",
    serviceMethod: "batchDelete",
    successStatus: 200,
    queryFeatures: ["filter"],
    usesRequestBody: true,
  });
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
