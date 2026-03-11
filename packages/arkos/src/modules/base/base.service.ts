import {
  camelCase,
  kebabCase,
  pascalCase,
} from "../../utils/helpers/change-case.helpers";
import deepmerge from "../../utils/helpers/deepmerge.helper";
import {
  handleRelationFieldsInBody,
  ModelGroupRelationFields,
} from "./utils/helpers/base.service.helpers";
import { getPrismaInstance } from "../../utils/helpers/prisma.helpers";
import authService from "../auth/auth.service";
import { PrismaClient } from "../../generated";
import {
  CountFilters,
  CreateData,
  CreateManyData,
  CreateManyOptions,
  CreateOptions,
  Delegate,
  DeleteManyFilters,
  DeleteOneFilters,
  FindManyFilters,
  FindManyOptions,
  FindOneFilters,
  FindOneOptions,
  GetPayload,
  Models,
  UpdateManyData,
  UpdateManyFilters,
  UpdateManyOptions,
  UpdateOneData,
  UpdateOneFilters,
  UpdateOneOptions,
} from "./types/base.service.types";
import serviceHooksManager from "./utils/service-hooks-manager";
import prismaSchemaParser from "../../utils/prisma/prisma-schema-parser";
import { ArkosLoadableRegistry } from "../../components/arkos-loadable-registry";
import {
  ArkosServiceHookInstance,
  ServiceHookContext,
} from "../../components/arkos-service-hook/types";
import { serviceHookReader } from "../../components/arkos-service-hook/reader";

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
    prisma: PrismaClient,
    config: ServiceOperationConfig,
    context: BaseService<any>
  ) => Promise<any>;
  hooks?: ServiceOperationHooks;
}

/**
 * Base service class for handling CRUD operations on a specific model.
 * This class provides standard implementation of data operations that can be extended
 * by model-specific service classes.
 *
 * @class BaseService
 *
 * @example
 * ```ts
 * import { BaseService } from "arkos/services";
 *
 * export class UserService extends BaseService<"user"> {}
 *
 * const userService = new UserService("user");
 * ```
 *
 * @see {@link https://www.arkosjs.com/docs/api-reference/the-base-service-class}
 * @see {@link https://www.arkosjs.com/docs/guide/accessing-request-context-in-services}
 */
export class BaseService<TModelName extends keyof Models = keyof Models> {
  private static registry: ArkosLoadableRegistry;
  modelName: TModelName;
  relationFields: ModelGroupRelationFields;
  prisma: PrismaClient;

  constructor(modelName: TModelName) {
    this.modelName = camelCase(modelName as string) as TModelName;
    const modelFields = prismaSchemaParser.getModelRelations(
      modelName as string
    );

    this.relationFields = {
      singular:
        modelFields?.filter((field) => field.isRelation && !field.isArray) ||
        [],
      list:
        modelFields?.filter((field) => field.isRelation && field.isArray) || [],
    };
    this.prisma = getPrismaInstance();
  }

  private getServiceHook() {
    const registry = BaseService.registry;
    if (!registry)
      throw Error(
        `Trying to use BaseService built-in methods before calling app.load() or app.listen() is not supported, see https://www.arkosjs.com/docs/core-concepts/routing/setup#setting-up-your-app`
      );

    return registry.getItem(
      "ArkosServiceHook",
      kebabCase(this.modelName)
    ) as ArkosServiceHookInstance<TModelName>;
  }

  static configure(registry: ArkosLoadableRegistry) {
    BaseService.registry = registry;
  }

  private executeOperation = (config: ServiceOperationConfig) => {
    return async (...args: any[]): Promise<any> => {
      const context = args[args.length - 1] as ServiceHookContext;

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
          result = await (
            prisma[this.modelName as string] as Delegate<TModelName>
          )[config.prismaMethod](prismaArgs);
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
      const context = args[args.length - 1] as ServiceHookContext;

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
    context?: ServiceHookContext
  ): Promise<void> {
    const serviceHook = this.getServiceHook();
    if (!serviceHook) return;

    const skipCondition =
      context?.skip === hookType ||
      context?.skip === "all" ||
      (Array.isArray(context?.skip) && context.skip.includes(hookType));

    if (skipCondition) return;

    const hooks = serviceHookReader.getHooks(serviceHook, operationType);
    if (!hooks) return;

    const handlers =
      hookType === "before"
        ? hooks.before
        : hookType === "after"
          ? hooks.after
          : hooks.onError;

    if (handlers?.length)
      await serviceHooksManager.handleHook(handlers, params);
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
    prisma: PrismaClient
  ): Promise<any> {
    if (config.operationType === "batchUpdate") {
      const dataArray = args[0];
      const queryOptions = args[1];

      return await (prisma as any).$transaction(async (tx: any) => {
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
                    type: pascalCase(this.modelName as string),
                  })!,
                  name: "batchedData",
                },
              ],
              list: [],
            }
          );

          return await tx[this.modelName as string].update(
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

      return await (prisma as any).$transaction(async (tx: any) => {
        const deletePromises = batchFilters.map(async (filters: any) => {
          return await tx[this.modelName as string].delete({ where: filters });
        });

        return await Promise.all(deletePromises);
      });
    }

    throw new Error(`Unknown transaction operation: ${config.operationType}`);
  }

  private shouldHashPassword(data: any): boolean {
    return kebabCase(this.modelName as string) === "user" && data?.password;
  }

  private async processPasswordHashing(data: any): Promise<any> {
    if (Array.isArray(data)) {
      const processedArray: any[] = [];
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

  // ─── Public API ─────────────────────────────────────────────────────────────

  /**
   * Creates a single record in the database.
   *
   * @param data - The data for creating the record
   * @param queryOptions - Optional Prisma query options (select, include, etc.)
   * @param context - Optional service execution context
   *
   * @example
   * ```ts
   * const user = await userService.createOne({
   *   name: "John Doe",
   *   email: "john@example.com"
   * });
   * ```
   */
  async createOne<TOptions extends CreateOptions<TModelName>>(
    data: CreateData<TModelName>,
    queryOptions?: TOptions,
    context?: ServiceHookContext
  ): Promise<GetPayload<TModelName, TOptions>> {
    return this.executeOperation({
      operationType: "createOne",
      prismaMethod: "create",
      requiresPasswordHashing: true,
      relationFieldsHandling: ["delete", "disconnect", "update"],
      returnsFallback: undefined,
    })(data, queryOptions, context);
  }

  /**
   * Creates multiple records in the database.
   *
   * @param data - Array of data objects or object with data array
   * @param queryOptions - Optional Prisma query options
   * @param context - Optional service execution context
   *
   * @example
   * ```ts
   * const result = await userService.createMany([
   *   { name: "John Doe", email: "john@example.com" },
   *   { name: "Jane Smith", email: "jane@example.com" }
   * ]);
   * ```
   */
  async createMany<TOptions extends CreateManyOptions<TModelName>>(
    data: CreateManyData<TModelName>,
    queryOptions?: TOptions,
    context?: ServiceHookContext
  ): Promise<GetPayload<TModelName, TOptions>[]> {
    return this.executeOperation({
      operationType: "createMany",
      prismaMethod: "createMany",
      requiresPasswordHashing: true,
      relationFieldsHandling: ["delete", "disconnect", "update"],
      returnsFallback: undefined,
    })(data, queryOptions, context);
  }

  /**
   * Counts records matching the specified filters.
   *
   * @param filters - Optional where conditions
   * @param queryOptions - Optional Prisma query options
   * @param context - Optional service execution context
   *
   * @example
   * ```ts
   * const total = await userService.count({ status: "active" });
   * ```
   */
  async count(
    filters?: CountFilters<TModelName>,
    context?: ServiceHookContext
  ): Promise<number> {
    return this.executeOperation({
      operationType: "count",
      prismaMethod: "count",
      returnsFallback: 0,
    })(filters, context);
  }

  /**
   * Finds multiple records matching the specified filters.
   *
   * @param filters - Optional where conditions
   * @param queryOptions - Optional Prisma query options (select, include, orderBy, skip, take, etc.)
   * @param context - Optional service execution context
   *
   * @example
   * ```ts
   * const users = await userService.findMany(
   *   { status: "active" },
   *   { orderBy: { createdAt: "desc" }, take: 10 }
   * );
   * ```
   */
  async findMany<TOptions extends FindManyOptions<TModelName>>(
    filters?: FindManyFilters<TModelName>,
    queryOptions?: TOptions,
    context?: ServiceHookContext
  ): Promise<GetPayload<TModelName, TOptions>[]> {
    return this.executeOperation({
      operationType: "findMany",
      prismaMethod: "findMany",
      returnsFallback: [],
    })(filters, queryOptions, context);
  }

  /**
   * Finds a single record by its ID.
   *
   * @param id - The unique identifier of the record
   * @param queryOptions - Optional Prisma query options (select, include, etc.)
   * @param context - Optional service execution context
   *
   * @example
   * ```ts
   * const user = await userService.findById("user-123");
   * ```
   */
  async findById<TOptions extends FindOneOptions<TModelName>>(
    id: string | number,
    queryOptions?: TOptions,
    context?: ServiceHookContext
  ): Promise<GetPayload<TModelName, TOptions> | null> {
    return this.executeOperation({
      operationType: "findById",
      prismaMethod: "findUnique",
      returnsFallback: undefined,
    })(id, queryOptions, context);
  }

  /**
   * Finds the first record matching the specified filters.
   *
   * @param filters - Where conditions to filter records
   * @param queryOptions - Optional Prisma query options
   * @param context - Optional service execution context
   *
   * @example
   * ```ts
   * const user = await userService.findOne({ email: "john@example.com" });
   * ```
   */
  async findOne<TOptions extends FindOneOptions<TModelName>>(
    filters: FindOneFilters<TModelName>,
    queryOptions?: TOptions,
    context?: ServiceHookContext
  ): Promise<GetPayload<TModelName, TOptions> | null> {
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
          return await (prisma as any)[serviceContext.modelName].findUnique(
            deepmerge({ where: filters }, queryOptions || {})
          );
        } else {
          return await (prisma as any)[serviceContext.modelName].findFirst(
            deepmerge({ where: filters }, queryOptions || {})
          );
        }
      },
    })(filters, queryOptions, context);
  }

  /**
   * Updates a single record matching the specified filters.
   *
   * @param filters - Where conditions to identify the record
   * @param data - The data to update
   * @param queryOptions - Optional Prisma query options
   * @param context - Optional service execution context
   *
   * @example
   * ```ts
   * const updated = await userService.updateOne(
   *   { id: "user-123" },
   *   { name: "John Updated" }
   * );
   * ```
   */
  async updateOne<TOptions extends UpdateOneOptions<TModelName>>(
    filters: UpdateOneFilters<TModelName>,
    data: UpdateOneData<TModelName>,
    queryOptions?: TOptions,
    context?: ServiceHookContext
  ): Promise<GetPayload<TModelName, TOptions>> {
    return this.executeOperation({
      operationType: "updateOne",
      prismaMethod: "update",
      requiresPasswordHashing: true,
      relationFieldsHandling: [],
      returnsFallback: undefined,
    })(filters, data, queryOptions, context);
  }

  /**
   * Updates a single record matching the specified id.
   *
   * @param id - The unique identifier of the record
   * @param data - The data to update
   * @param queryOptions - Optional Prisma query options
   * @param context - Optional service execution context
   *
   * @example
   * ```ts
   * const updated = await userService.updateById("user-123", { name: "John Updated" });
   * ```
   */
  async updateById<TOptions extends UpdateOneOptions<TModelName>>(
    id: string | number,
    data: UpdateOneData<TModelName>,
    queryOptions?: TOptions,
    context?: ServiceHookContext
  ): Promise<GetPayload<TModelName, TOptions>> {
    return this.executeOperation({
      operationType: "updateOne",
      prismaMethod: "update",
      requiresPasswordHashing: true,
      relationFieldsHandling: [],
      returnsFallback: undefined,
    })({ id }, data, queryOptions, context);
  }

  /**
   * Updates multiple records matching the specified filters.
   *
   * @param filters - Where conditions to identify records
   * @param data - The data to update
   * @param queryOptions - Optional Prisma query options
   * @param context - Optional service execution context
   *
   * @example
   * ```ts
   * const result = await userService.updateMany(
   *   { status: "pending" },
   *   { status: "active" }
   * );
   * ```
   */
  async updateMany<TOptions extends UpdateManyOptions<TModelName>>(
    filters: UpdateManyFilters<TModelName>,
    data: UpdateManyData<TModelName>,
    queryOptions?: TOptions,
    context?: ServiceHookContext
  ): Promise<{ count: number }> {
    return this.executeOperation({
      operationType: "updateMany",
      prismaMethod: "updateMany",
      requiresPasswordHashing: true,
      relationFieldsHandling: [],
      returnsFallback: undefined,
    })(filters, data, queryOptions, context);
  }

  /**
   * Deletes a single record by its ID.
   *
   * @param id - The unique identifier of the record
   * @param context - Optional service execution context
   *
   * @example
   * ```ts
   * const deleted = await userService.deleteById("user-123");
   * ```
   */
  async deleteById(
    id: string | number,
    context?: ServiceHookContext
  ): Promise<GetPayload<TModelName, any>> {
    return this.executeOperation({
      operationType: "deleteOne",
      prismaMethod: "delete",
      returnsFallback: undefined,
    })({ id }, context);
  }

  /**
   * Deletes a single record matching the specified filters.
   *
   * @param filters - Where conditions to identify the record
   * @param context - Optional service execution context
   *
   * @example
   * ```ts
   * const deleted = await userService.deleteOne({ id: "user-123" });
   * ```
   */
  async deleteOne(
    filters: DeleteOneFilters<TModelName>,
    context?: ServiceHookContext
  ): Promise<GetPayload<TModelName, any>> {
    return this.executeOperation({
      operationType: "deleteOne",
      prismaMethod: "delete",
      returnsFallback: undefined,
    })(filters, context);
  }

  /**
   * Deletes multiple records matching the specified filters.
   *
   * @param filters - Where conditions to identify records
   * @param context - Optional service execution context
   *
   * @example
   * ```ts
   * const result = await userService.deleteMany({ status: "inactive" });
   * ```
   */
  async deleteMany(
    filters: DeleteManyFilters<TModelName>,
    context?: ServiceHookContext
  ): Promise<{ count: number }> {
    return this.executeOperation({
      operationType: "deleteMany",
      prismaMethod: "deleteMany",
      returnsFallback: undefined,
    })(filters, context);
  }

  /**
   * Performs multiple update operations in a single transaction.
   *
   * @param dataArray - Array of update objects each containing filter criteria and data
   * @param queryOptions - Optional Prisma query options applied to all updates
   * @param context - Optional service execution context
   *
   * @example
   * ```ts
   * const results = await userService.batchUpdate([
   *   { id: "user-1", status: "active" },
   *   { id: "user-2", status: "inactive" }
   * ]);
   * ```
   */
  async batchUpdate<TOptions extends UpdateOneOptions<TModelName>>(
    dataArray: UpdateOneData<TModelName>[],
    queryOptions?: TOptions,
    context?: ServiceHookContext
  ): Promise<GetPayload<TModelName, TOptions>[]> {
    return this.executeTransactionOperation({
      operationType: "batchUpdate",
      prismaMethod: "update",
      requiresPasswordHashing: true,
      relationFieldsHandling: [],
      returnsFallback: undefined,
    })(dataArray, queryOptions, context);
  }

  /**
   * Performs multiple delete operations in a single transaction.
   *
   * @param batchFilters - Array of where conditions each identifying a record to delete
   * @param context - Optional service execution context
   *
   * @example
   * ```ts
   * const deleted = await userService.batchDelete([
   *   { id: "user-1" },
   *   { id: "user-2" }
   * ]);
   * ```
   */
  async batchDelete(
    batchFilters: Array<DeleteOneFilters<TModelName>>,
    context?: ServiceHookContext
  ): Promise<GetPayload<TModelName, any>[]> {
    return this.executeTransactionOperation({
      operationType: "batchDelete",
      prismaMethod: "delete",
      relationFieldsHandling: [],
      returnsFallback: undefined,
    })(batchFilters, context);
  }
}
