import {
  camelCase,
  kebabCase,
  pascalCase,
} from "../../utils/helpers/change-case.helpers";
import { getModuleComponents } from "../../utils/dynamic-loader";
import deepmerge from "../../utils/helpers/deepmerge.helper";
import {
  handleRelationFieldsInBody,
  ModelGroupRelationFields,
} from "./utils/helpers/base.service.helpers";
import { getPrismaInstance } from "../../utils/helpers/prisma.helpers";
import authService from "../auth/auth.service";
import {
  ModelDelegate,
  CreateOneData,
  CreateOneOptions,
  CreateOneResult,
  CreateManyData,
  CreateManyOptions,
  CreateManyResult,
  CountFilters,
  FindManyFilters,
  FindManyOptions,
  FindManyResult,
  FindByIdOptions,
  FindByIdResult,
  FindOneFilters,
  FindOneOptions,
  FindOneResult,
  UpdateOneFilters,
  UpdateOneData,
  UpdateOneOptions,
  UpdateOneResult,
  UpdateManyFilters,
  UpdateManyData,
  UpdateManyOptions,
  UpdateManyResult,
  DeleteOneFilters,
  DeleteOneResult,
  DeleteManyFilters,
  DeleteManyResult,
  ServiceBaseContext,
} from "./types/base.service.types";
import serviceHooksManager from "./utils/service-hooks-manager";
import prismaSchemaParser from "../../utils/prisma/prisma-schema-parser";

export interface ServiceOperationHooks {
  beforeOperation?: (params: any) => void | Promise<void>;
  afterOperation?: (result: any, params: any) => void | Promise<void>;
  beforePrisma?: (prismaArgs: any, params: any) => any | Promise<any>;
  afterPrisma?: (result: any, params: any) => any | Promise<any>;
}

interface ServiceOperationConfig {
  operationType: string;
  prismaMethod: string;
  requiresPasswordHashing?: boolean;
  relationFieldsHandling?: string[];
  returnsFallback?: any;
  customPrismaLogic?: (
    args: any[],
    prisma: any,
    config: ServiceOperationConfig,
    context: BaseService<any>
  ) => Promise<any>;
  hooks?: ServiceOperationHooks;
}

/**
 * Base service class for handling CRUD operations on a specific model.
 * This class provides standard implementation of data operations that can be extended
 *
 * by model-specific service classes.
 *
 * @class BaseService
 *
 * @usage
 *
 * **Example:** creating a simple service
 *
 * ```ts
 * import prisma from '../../utils/prisma'
 *
 * const userService = new BaseService<typeof prisma.user>("user")
 * ```
 *
 * **Example:** accessing request context in hooks
 *
 * ```ts
 * class ProductService extends BaseService<Product> {
 *   async beforeCreateOne(data: CreateOneData<Product>, queryOptions?: CreateOneOptions<Product>, context?: ServiceBaseContext) {
 *     // Access current user from request context
 *     const userId = context?.user?.id;
 *     if (userId) {
 *       data.createdBy = userId;
 *     }
 *   }
 * }
 * ```
 *
 * @see {@link https://www.arkosjs.com/docs/api-reference/the-base-service-class}
 * @see {@link https://www.arkosjs.com/docs/guide/accessing-request-context-in-services}
 *
 */
export class BaseService<T extends ModelDelegate = any> {
  modelName: string;
  relationFields: ModelGroupRelationFields;
  prisma: any;

  constructor(modelName: string) {
    this.modelName = camelCase(modelName);
    const modelFields = prismaSchemaParser.getModelRelations(modelName);

    this.relationFields = {
      singular:
        modelFields?.filter((field) => field.isRelation && !field.isArray) ||
        [],
      list:
        modelFields?.filter((field) => field.isRelation && field.isArray) || [],
    };
    this.prisma = getPrismaInstance();
  }

  private executeOperation = (config: ServiceOperationConfig) => {
    return async (...args: any[]): Promise<any> => {
      const context = args[args.length - 1] as ServiceBaseContext;

      try {
        let argsWithRelationFieldsHandled =
          await this.processRelationFieldsInBody(args, config);
        let prismaFinalArgs = await this.handlePasswordHashing(
          argsWithRelationFieldsHandled,
          config
        );

        await this.executeHooks(
          "before",
          config.operationType,
          this.buildHookParams(argsWithRelationFieldsHandled, config),
          context
        );

        if (config.hooks?.beforeOperation)
          await config.hooks.beforeOperation(
            this.buildHookParams(argsWithRelationFieldsHandled, config)
          );

        if (config.hooks?.beforePrisma) {
          argsWithRelationFieldsHandled = await config.hooks.beforePrisma(
            argsWithRelationFieldsHandled,
            this.buildHookParams(argsWithRelationFieldsHandled, config)
          );
        }

        const prisma = getPrismaInstance();
        let result: any;

        if (config.customPrismaLogic) {
          result = await config.customPrismaLogic(
            argsWithRelationFieldsHandled,
            prisma,
            config,
            this
          );
        } else {
          const prismaArgs = this.buildPrismaArgs(prismaFinalArgs, config);
          result = await (prisma[this.modelName] as T)[
            config.prismaMethod as keyof T
          ](prismaArgs);
        }

        if (config.hooks?.afterPrisma) {
          result = await config.hooks.afterPrisma(
            result,
            this.buildHookParams(argsWithRelationFieldsHandled, config)
          );
        }

        await this.executeHooks(
          "after",
          config.operationType,
          {
            ...this.buildHookParams(argsWithRelationFieldsHandled, config),
            result,
          },
          context
        );

        if (config.hooks?.afterOperation) {
          await config.hooks.afterOperation(
            result,
            this.buildHookParams(argsWithRelationFieldsHandled, config)
          );
        }

        return result;
      } catch (err: any) {
        await this.executeHooks(
          "error",
          config.operationType,
          { ...this.buildHookParams(args, config), error: err },
          context
        );
        if (context?.throwOnError !== false) throw err;
        return config.returnsFallback;
      }
    };
  };

  private executeTransactionOperation = (config: ServiceOperationConfig) => {
    return async (...args: any[]): Promise<any> => {
      const context = args[args.length - 1] as ServiceBaseContext;

      try {
        let argsWithRelationFieldsHandled =
          await this.processRelationFieldsInBody(args, config);
        let prismaFinalArgs = await this.handlePasswordHashing(
          argsWithRelationFieldsHandled,
          config
        );

        await this.executeHooks(
          "before",
          config.operationType,
          this.buildTransactionHookParams(
            argsWithRelationFieldsHandled,
            config
          ),
          context
        );

        const prisma = getPrismaInstance();
        const results = await this.executeTransactionLogic(
          prismaFinalArgs,
          config,
          prisma
        );

        await this.executeHooks(
          "after",
          config.operationType,
          {
            ...this.buildTransactionHookParams(
              argsWithRelationFieldsHandled,
              config
            ),
            results,
          },
          context
        );
        return results;
      } catch (err: any) {
        await this.executeHooks(
          "error",
          config.operationType,
          { ...this.buildTransactionHookParams(args, config), error: err },
          context
        );
        if (context?.throwOnError !== false) throw err;
        return config.returnsFallback;
      }
    };
  };

  private async executeHooks(
    hookType: "before" | "after" | "error",
    operationType: string,
    params: any,
    context?: ServiceBaseContext
  ): Promise<void> {
    const serviceHooks = getModuleComponents(this.modelName)?.hooks;
    if (!serviceHooks) return;

    const skipCondition =
      context?.skip === hookType ||
      context?.skip === "all" ||
      (Array.isArray(context?.skip) && context.skip.includes(hookType));

    if (skipCondition) return;

    const hookName = `${hookType === "error" ? "on" : hookType}${operationType.charAt(0).toUpperCase()}${operationType.slice(1)}${hookType === "error" ? "Error" : ""}`;
    const hook = serviceHooks[hookName as keyof typeof serviceHooks];

    if (hook) await serviceHooksManager.handleHook(hook, params);
  }

  private buildHookParams(args: any[], config: ServiceOperationConfig): any {
    const context = args[args.length - 1];

    switch (config.operationType) {
      case "createOne":
      case "createMany":
        return { data: args[0], queryOptions: args[1], context };
      case "findMany":
        return { filters: args[0], queryOptions: args[1], context };
      case "findById":
        return { id: args[0], queryOptions: args[1], context };
      case "findOne":
        return { filters: args[0], queryOptions: args[1], context };
      case "updateOne":
        return {
          filters: args[0],
          data: args[1],
          queryOptions: args[2],
          context,
        };
      case "updateMany":
        return {
          filters: args[0],
          data: args[1],
          queryOptions: args[2],
          context,
        };
      case "deleteOne":
        return { filters: args[0], context };
      case "deleteMany":
        return { filters: args[0], context };
      case "count":
        return { filters: args[0], context };
      default:
        return { context };
    }
  }

  private buildTransactionHookParams(
    args: any[],
    config: ServiceOperationConfig
  ): any {
    const context = args[args.length - 1];

    switch (config.operationType) {
      case "batchUpdate":
        return { data: args[0], queryOptions: args[1], context };
      case "batchDelete":
        return { batchFilters: args[0], context };
      default:
        return { context };
    }
  }

  private async handlePasswordHashing(
    args: any[],
    config: ServiceOperationConfig
  ): Promise<any[]> {
    let processedArgs = [...args];

    if (config.requiresPasswordHashing) {
      const dataIndex = config.operationType.includes("update") ? 1 : 0;
      const data = processedArgs[dataIndex];

      if (Array.isArray(data)) {
        for (const i in data) {
          if (this.shouldHashPassword(data[i]))
            processedArgs[dataIndex][i] = await this.processPasswordHashing(
              data[i]
            );
        }
      } else if (this.shouldHashPassword(data)) {
        processedArgs[dataIndex] = await this.processPasswordHashing(data);
      }
    }

    return processedArgs;
  }

  private async processRelationFieldsInBody(
    args: any[],
    config: ServiceOperationConfig
  ): Promise<any[]> {
    let processedArgs = [...args];

    if (config.relationFieldsHandling) {
      const dataIndex = config.operationType.includes("update") ? 1 : 0;

      if (config.operationType === "batchUpdate") {
        const dataArray = processedArgs[0];
        if (Array.isArray(dataArray)) {
          processedArgs[0] = dataArray.map((data) =>
            handleRelationFieldsInBody(
              data as Record<string, any>,
              this.relationFields,
              config.relationFieldsHandling
            )
          );
        }
      } else if (config.operationType === "batchDelete") {
        const batchFilters = processedArgs[0];
        if (Array.isArray(batchFilters)) {
          processedArgs[0] = batchFilters.map((filters) =>
            handleRelationFieldsInBody(
              filters as Record<string, any>,
              this.relationFields
            )
          );
        }
      } else if (config.operationType === "createMany") {
        const data = processedArgs[dataIndex];
        if (Array.isArray(data)) {
          processedArgs[dataIndex] = data.map((item) =>
            handleRelationFieldsInBody(
              item as Record<string, any>,
              this.relationFields,
              config.relationFieldsHandling
            )
          );
        }
      } else {
        const data = processedArgs[dataIndex];
        if (data) {
          processedArgs[dataIndex] = handleRelationFieldsInBody(
            data as Record<string, any>,
            this.relationFields,
            config.relationFieldsHandling
          );
        }
      }
    }

    return processedArgs;
  }

  private buildPrismaArgs(args: any[], config: ServiceOperationConfig): any {
    switch (config.operationType) {
      case "createOne":
      case "createMany":
        return deepmerge({ data: args[0] }, args[1] || {});

      case "findMany":
        return deepmerge({ where: args[0] }, args[1] || {});

      case "findById":
        return deepmerge({ where: { id: args[0] } }, args[1] || {});

      case "findOne":
        return deepmerge({ where: args[0] }, args[1] || {});

      case "updateOne":
        return deepmerge({ where: args[0], data: args[1] }, args[2] || {});

      case "updateMany":
        const firstMerge = deepmerge({ data: args[1] }, args[2] || {});
        return deepmerge({ where: args[0] }, firstMerge);

      case "deleteOne":
      case "deleteMany":
        return { where: args[0] };

      case "count":
        return { where: args[0] };

      default:
        return {};
    }
  }

  private async executeTransactionLogic(
    args: any[],
    config: ServiceOperationConfig,
    prisma: any
  ): Promise<any> {
    if (config.operationType === "batchUpdate") {
      const dataArray = args[0];
      const queryOptions = args[1];

      return await prisma.$transaction(async (tx: any) => {
        const updatePromises = dataArray.map(async (data: any) => {
          let processedData = data;
          if (this.shouldHashPassword(data)) {
            processedData = await this.processPasswordHashing(data);
          }

          const finalPrismaQueryParams = handleRelationFieldsInBody(
            {
              batchedData: {
                ...processedData,
                apiAction: "update",
              },
            } as Record<string, any>,
            {
              singular: [
                {
                  ...prismaSchemaParser.getField({
                    type: pascalCase(this.modelName),
                  })!,
                  name: "batchedData",
                },
              ],
              list: [],
            }
          );

          return await (tx[this.modelName] as T).update(
            deepmerge(
              finalPrismaQueryParams.batchedData?.update,
              queryOptions || {}
            ) as { where: any; data: any }
          );
        });

        return await Promise.all(updatePromises);
      });
    }

    if (config.operationType === "batchDelete") {
      const batchFilters = args[0];

      return await prisma.$transaction(async (tx: any) => {
        const deletePromises = batchFilters.map(async (filters: any) => {
          return await (tx[this.modelName] as T).delete({
            where: filters,
          });
        });

        return await Promise.all(deletePromises);
      });
    }

    throw new Error(`Unknown transaction operation: ${config.operationType}`);
  }

  private shouldHashPassword(data: any): boolean {
    return kebabCase(this.modelName) === "user" && data?.password;
  }

  private async processPasswordHashing(data: any): Promise<any> {
    if (Array.isArray(data)) {
      const processedArray = [];
      for (let i = 0; i < data.length; i++) {
        const curr = data[i];
        if (
          "password" in curr &&
          !authService.isPasswordHashed(curr.password!)
        ) {
          processedArray[i] = {
            ...curr,
            password: await authService.hashPassword(curr.password!),
          };
        } else {
          processedArray[i] = curr;
        }
      }
      return processedArray;
    } else {
      if (data.password && !authService.isPasswordHashed(data.password)) {
        return {
          ...data,
          password: await authService.hashPassword(data.password),
        };
      }
    }
    return data;
  }

  async createOne<TOptions extends CreateOneOptions<T>>(
    data: CreateOneData<T>,
    queryOptions?: TOptions,
    context?: ServiceBaseContext
  ): Promise<CreateOneResult<T>> {
    return this.executeOperation({
      operationType: "createOne",
      prismaMethod: "create",
      requiresPasswordHashing: true,
      relationFieldsHandling: ["delete", "disconnect", "update"],
      returnsFallback: undefined,
    })(data, queryOptions, context);
  }

  async createMany<TOptions extends CreateManyOptions<T>>(
    data: CreateManyData<T>,
    queryOptions?: TOptions,
    context?: ServiceBaseContext
  ): Promise<CreateManyResult<T>> {
    return this.executeOperation({
      operationType: "createMany",
      prismaMethod: "createMany",
      requiresPasswordHashing: true,
      relationFieldsHandling: ["delete", "disconnect", "update"],
      returnsFallback: undefined,
    })(data, queryOptions, context);
  }

  async count(
    filters?: CountFilters<T>,
    context?: ServiceBaseContext
  ): Promise<number> {
    return this.executeOperation({
      operationType: "count",
      prismaMethod: "count",
      returnsFallback: 0,
    })(filters, context);
  }

  async findMany<TOptions extends FindManyOptions<T>>(
    filters?: FindManyFilters<T>,
    queryOptions?: TOptions,
    context?: ServiceBaseContext
  ): Promise<FindManyResult<T, TOptions>> {
    return this.executeOperation({
      operationType: "findMany",
      prismaMethod: "findMany",
      returnsFallback: [],
    })(filters, queryOptions, context);
  }

  async findById<TOptions extends FindByIdOptions<T>>(
    id: string | number,
    queryOptions?: TOptions,
    context?: ServiceBaseContext
  ): Promise<FindByIdResult<T>> {
    return this.executeOperation({
      operationType: "findById",
      prismaMethod: "findUnique",
      returnsFallback: undefined,
    })(id, queryOptions, context);
  }

  async findOne<TOptions extends FindOneOptions<T>>(
    filters: FindOneFilters<T>,
    queryOptions?: TOptions,
    context?: ServiceBaseContext
  ): Promise<FindOneResult<T>> {
    return this.executeOperation({
      operationType: "findOne",
      prismaMethod: "findFirst",
      returnsFallback: undefined,
      customPrismaLogic: async (args, prisma, _, serviceContext) => {
        const filters = args[0];
        const queryOptions = args[1];

        if (
          Object.keys(filters as Record<string, any>).length === 1 &&
          "id" in (filters as Record<string, any>) &&
          (filters as any).id !== "me"
        ) {
          return await (prisma[serviceContext.modelName] as T).findUnique(
            deepmerge({ where: filters }, queryOptions || {})
          );
        } else {
          return await (prisma[serviceContext.modelName] as T).findFirst(
            deepmerge({ where: filters }, queryOptions || {})
          );
        }
      },
    })(filters, queryOptions, context);
  }

  async updateOne<TOptions extends UpdateOneOptions<T>>(
    filters: UpdateOneFilters<T>,
    data: UpdateOneData<T>,
    queryOptions?: TOptions,
    context?: ServiceBaseContext
  ): Promise<UpdateOneResult<T>> {
    return this.executeOperation({
      operationType: "updateOne",
      prismaMethod: "update",
      requiresPasswordHashing: true,
      relationFieldsHandling: [],
      returnsFallback: undefined,
    })(filters, data, queryOptions, context);
  }

  async updateMany<TOptions extends UpdateManyOptions<T>>(
    filters: UpdateManyFilters<T>,
    data: UpdateManyData<T>,
    queryOptions?: TOptions,
    context?: ServiceBaseContext
  ): Promise<UpdateManyResult<T>> {
    return this.executeOperation({
      operationType: "updateMany",
      prismaMethod: "updateMany",
      requiresPasswordHashing: true,
      relationFieldsHandling: [],
      returnsFallback: undefined,
    })(filters, data, queryOptions, context);
  }

  async deleteOne(
    filters: DeleteOneFilters<T>,
    context?: ServiceBaseContext
  ): Promise<DeleteOneResult<T>> {
    return this.executeOperation({
      operationType: "deleteOne",
      prismaMethod: "delete",
      returnsFallback: undefined,
    })(filters, context);
  }

  async deleteMany(
    filters: DeleteManyFilters<T>,
    context?: ServiceBaseContext
  ): Promise<DeleteManyResult<T>> {
    return this.executeOperation({
      operationType: "deleteMany",
      prismaMethod: "deleteMany",
      returnsFallback: undefined,
    })(filters, context);
  }

  async batchUpdate<TOptions extends UpdateOneOptions<T>>(
    dataArray: UpdateOneData<T>[],
    queryOptions?: TOptions,
    context?: ServiceBaseContext
  ): Promise<Array<UpdateOneResult<T>>> {
    return this.executeTransactionOperation({
      operationType: "batchUpdate",
      prismaMethod: "update",
      requiresPasswordHashing: true,
      relationFieldsHandling: [],
      returnsFallback: undefined,
    })(dataArray, queryOptions, context);
  }

  async batchDelete(
    batchFilters: Array<DeleteOneFilters<T>>,
    context?: ServiceBaseContext
  ): Promise<Array<DeleteOneResult<T>>> {
    return this.executeTransactionOperation({
      operationType: "batchDelete",
      prismaMethod: "delete",
      relationFieldsHandling: [],
      returnsFallback: undefined,
    })(batchFilters, context);
  }
}
