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
  /**
   * The camelCase name of the model
   * @public
   */
  modelName: string;

  /**
   * Object containing singular and list relation fields for the model
   * @public
   */
  relationFields: ModelGroupRelationFields;

  /**
   * Instance of the Prisma client
   * @public
   */
  prisma: any;

  /**
   * Creates an instance of BaseService.
   * @param {string} modelName - The name of the model to perform operations on.
   */
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
  }

  /**
   * Creates a single record in the database.
   *
   * @param {CreateOneData<T>} data - The data to create the record with.
   * @param {CreateOneOptions<T>} [queryOptions] - Additional query options to modify the Prisma query.
   * @param {ServiceBaseContext} [context] - Request context containing user and accessToken for accessing HTTP-specific information.
   * @returns {Promise<CreateOneResult<T>>} The created record.
   */
  async createOne<TOptions extends CreateOneOptions<T>>(
    data: CreateOneData<T>,
    queryOptions?: TOptions,
    context?: ServiceBaseContext
  ): Promise<CreateOneResult<T>> {
    const serviceHooks = getModuleComponents(this.modelName)?.hooks;

    try {
      if (
        serviceHooks?.beforeCreateOne &&
        context?.skip !== "before" &&
        context?.skip !== "all" &&
        !context?.skip?.includes("before")
      )
        await serviceHooksManager.handleHook(serviceHooks.beforeCreateOne, {
          data,
          queryOptions,
          context,
        });

      if (kebabCase(this.modelName) === "user" && (data as any).password)
        if (!authService.isPasswordHashed((data as any).password))
          (data as any).password = await authService.hashPassword(
            (data as any).password
          );

      const prisma = getPrismaInstance();

      const dataWithRelationFieldsHandled = handleRelationFieldsInBody(
        data as Record<string, any>,
        {
          ...this.relationFields,
        },
        ["delete", "disconnect", "update"]
      );

      const result = await (prisma[this.modelName] as T).create(
        deepmerge(
          {
            data: dataWithRelationFieldsHandled,
          },
          (queryOptions as {}) || {}
        ) as { data: any }
      );

      if (
        serviceHooks?.afterCreateOne &&
        context?.skip !== "after" &&
        context?.skip !== "all" &&
        !context?.skip?.includes("after")
      )
        await serviceHooksManager.handleHook(serviceHooks.afterCreateOne, {
          result,
          data,
          queryOptions,
          context,
        });

      return result;
    } catch (err: any) {
      if (
        serviceHooks?.onCreateOneError &&
        context?.skip !== "error" &&
        context?.skip !== "all" &&
        !context?.skip?.includes("error")
      )
        await serviceHooksManager.handleHook(serviceHooks.onCreateOneError, {
          error: err,
          data,
          queryOptions,
          context,
        });

      if (context?.throwOnError !== false) throw err;
      return undefined as any;
    }
  }

  /**
   * Creates multiple records in the database.
   *
   * @param {CreateManyData<T>} data - An array of data to create records with.
   * @param {CreateManyOptions<T>} [queryOptions] - Additional query options to modify the Prisma query.
   * @param {ServiceBaseContext} [context] - Request context containing user and accessToken for accessing HTTP-specific information.
   * @returns {Promise<CreateManyResult<T>>} The result of the createMany operation.
   */
  async createMany<TOptions extends CreateManyOptions<T>>(
    data: CreateManyData<T>,
    queryOptions?: TOptions,
    context?: ServiceBaseContext
  ): Promise<CreateManyResult<T>> {
    const serviceHooks = getModuleComponents(this.modelName)?.hooks;

    try {
      if (
        serviceHooks?.beforeCreateMany &&
        context?.skip !== "before" &&
        context?.skip !== "all" &&
        !context?.skip?.includes("before")
      ) {
        await serviceHooksManager.handleHook(serviceHooks.beforeCreateMany, {
          data,
          queryOptions,
          context,
        });
      }

      const prisma = getPrismaInstance();
      const dataWithRelationFieldsHandled: any[] = [];

      if (Array.isArray(data)) {
        for (let i = 0; i < data.length; i++) {
          const curr = data[i];
          if ("password" in curr && this.modelName === "user") {
            if (!authService.isPasswordHashed(curr.password!)) {
              data[i].password = await authService.hashPassword(
                curr?.password!
              );
            }
          }
          dataWithRelationFieldsHandled[i] = handleRelationFieldsInBody(
            data[i] as Record<string, any>,
            { ...this.relationFields },
            ["delete", "disconnect", "update"]
          );
        }
      }

      const result = await (prisma[this.modelName] as T).createMany(
        deepmerge(
          { data: dataWithRelationFieldsHandled },
          (queryOptions as {}) || {}
        ) as {
          data: any;
        }
      );

      if (
        serviceHooks?.afterCreateMany &&
        context?.skip !== "after" &&
        context?.skip !== "all" &&
        !context?.skip?.includes("after")
      )
        await serviceHooksManager.handleHook(serviceHooks.afterCreateMany, {
          result,
          data,
          queryOptions,
          context,
        });

      return result;
    } catch (err: any) {
      if (
        serviceHooks?.onCreateManyError &&
        context?.skip !== "error" &&
        context?.skip !== "all" &&
        !context?.skip?.includes("error")
      )
        await serviceHooksManager.handleHook(serviceHooks.onCreateManyError, {
          error: err,
          data,
          queryOptions,
          context,
        });

      if (context?.throwOnError !== false) throw err;
      return undefined as any;
    }
  }

  /**
   * Counts records based on provided filters.
   *
   * @param {CountFilters<T>} filters - The filters to apply to the query.
   * @returns {Promise<number>} The count of records matching the filters.
   */
  async count(
    filters?: CountFilters<T>,
    context?: ServiceBaseContext
  ): Promise<number> {
    const serviceHooks = getModuleComponents(this.modelName)?.hooks;

    try {
      if (
        serviceHooks?.beforeCount &&
        context?.skip !== "before" &&
        context?.skip !== "all" &&
        !context?.skip?.includes("before")
      ) {
        await serviceHooksManager.handleHook(serviceHooks.beforeCount, {
          filters,
          context,
        });
      }

      const prisma = getPrismaInstance();

      const result = await (prisma[this.modelName] as T).count({
        where: filters,
      });

      if (
        serviceHooks?.afterCount &&
        context?.skip !== "after" &&
        context?.skip !== "all" &&
        !context?.skip?.includes("after")
      ) {
        await serviceHooksManager.handleHook(serviceHooks.afterCount, {
          result,
          filters,
          context,
        });
      }

      return result;
    } catch (err: any) {
      if (
        serviceHooks?.onCountError &&
        context?.skip !== "error" &&
        context?.skip !== "all" &&
        !context?.skip?.includes("error")
      )
        await serviceHooksManager.handleHook(serviceHooks.onCountError, {
          error: err,
          filters,
          context,
        });

      if (context?.throwOnError !== false) throw err;
      return 0;
    }
  }

  /**
   * Finds multiple records based on provided filters.
   *
   * @param {FindManyFilters<T>} filters - The filters to apply to the query.
   * @param {FindManyOptions<T>} [queryOptions] - Additional query options to modify the Prisma query.
   * @param {ServiceBaseContext} [context] - Request context containing user and accessToken for accessing HTTP-specific information.
   * @returns {Promise<FindManyResult<T>>} The found data.
   */
  async findMany<TOptions extends FindManyOptions<T>>(
    filters?: FindManyFilters<T>,
    queryOptions?: TOptions,
    context?: ServiceBaseContext
  ): Promise<FindManyResult<T, TOptions>> {
    const serviceHooks = getModuleComponents(this.modelName)?.hooks;

    try {
      if (
        serviceHooks?.beforeFindMany &&
        context?.skip !== "before" &&
        context?.skip !== "all" &&
        !context?.skip?.includes("before")
      ) {
        await serviceHooksManager.handleHook(serviceHooks.beforeFindMany, {
          filters,
          queryOptions,
          context,
        });
      }

      const prisma = getPrismaInstance();

      const result = await (prisma[this.modelName] as T).findMany(
        deepmerge({ where: filters }, (queryOptions as {}) || {}) as {
          where: any;
        } & TOptions
      );

      if (
        serviceHooks?.afterFindMany &&
        context?.skip !== "after" &&
        context?.skip !== "all" &&
        !context?.skip?.includes("after")
      )
        await serviceHooksManager.handleHook(serviceHooks.afterFindMany, {
          result,
          filters,
          queryOptions,
          context,
        });

      return result;
    } catch (err: any) {
      if (
        serviceHooks?.onFindManyError &&
        context?.skip !== "error" &&
        context?.skip !== "all" &&
        !context?.skip?.includes("error")
      )
        await serviceHooksManager.handleHook(serviceHooks.onFindManyError, {
          error: err,
          filters,
          queryOptions,
          context,
        });

      if (context?.throwOnError !== false) throw err;
      return [] as any;
    }
  }

  /**
   * Finds a single record by its ID.
   *
   * @param {string | number} id - The ID of the record to find.
   * @param {FindByIdOptions<T>} [queryOptions] - Additional query options to modify the Prisma query.
   * @param {ServiceBaseContext} [context] - Request context containing user and accessToken for accessing HTTP-specific information.
   * @returns {Promise<FindByIdResult<T>>} The found record or null if not found.
   */
  async findById<TOptions extends FindByIdOptions<T>>(
    id: string | number,
    queryOptions?: TOptions,
    context?: ServiceBaseContext
  ): Promise<FindByIdResult<T>> {
    const serviceHooks = getModuleComponents(this.modelName)?.hooks;

    try {
      if (
        serviceHooks?.beforeFindById &&
        context?.skip !== "before" &&
        context?.skip !== "all" &&
        !context?.skip?.includes("before")
      ) {
        await serviceHooksManager.handleHook(serviceHooks.beforeFindById, {
          id,
          queryOptions,
          context,
        });
      }

      const prisma = getPrismaInstance();

      const result = await (prisma[this.modelName] as T).findUnique(
        deepmerge(
          {
            where: { id },
          },
          queryOptions || {}
        ) as { where: { id: string | number } }
      );

      if (
        serviceHooks?.afterFindById &&
        context?.skip !== "after" &&
        context?.skip !== "all" &&
        !context?.skip?.includes("after")
      ) {
        await serviceHooksManager.handleHook(serviceHooks.afterFindById, {
          result,
          id,
          queryOptions,
          context,
        });
      }

      return result;
    } catch (err: any) {
      if (
        serviceHooks?.onFindByIdError &&
        context?.skip !== "error" &&
        context?.skip !== "all" &&
        !context?.skip?.includes("error")
      )
        await serviceHooksManager.handleHook(serviceHooks.onFindByIdError, {
          error: err,
          id,
          queryOptions,
          context,
        });

      if (context?.throwOnError !== false) throw err;
      return undefined as any;
    }
  }

  /**
   * Finds a single record by its parameters.
   *
   * @param {FindOneFilters<T>} filters - The parameters to find the record by.
   * @param {FindOneOptions<T>} [queryOptions] - Additional query options to modify the Prisma query.
   * @param {ServiceBaseContext} [context] - Request context containing user and accessToken for accessing HTTP-specific information.
   * @returns {Promise<FindOneResult<T>>} The found record or null if not found.
   */
  async findOne<TOptions extends FindOneOptions<T>>(
    filters: FindOneFilters<T>,
    queryOptions?: TOptions,
    context?: ServiceBaseContext
  ): Promise<FindOneResult<T>> {
    const serviceHooks = getModuleComponents(this.modelName)?.hooks;

    try {
      if (
        serviceHooks?.beforeFindOne &&
        context?.skip !== "before" &&
        context?.skip !== "all" &&
        !context?.skip?.includes("before")
      ) {
        await serviceHooksManager.handleHook(serviceHooks.beforeFindOne, {
          filters,
          queryOptions,
          context,
        });
      }

      const prisma = getPrismaInstance();

      let result;
      if (
        Object.keys(filters as Record<string, any>).length === 1 &&
        "id" in (filters as Record<string, any>) &&
        (filters as any).id !== "me"
      )
        result = await (prisma[this.modelName] as T).findUnique(
          deepmerge(
            {
              where: filters,
            },
            (queryOptions as {}) || {}
          ) as { where: any }
        );
      else
        result = await (prisma[this.modelName] as T).findFirst(
          deepmerge(
            {
              where: filters,
            },
            (queryOptions as {}) || {}
          ) as { where: any }
        );

      if (
        serviceHooks?.afterFindOne &&
        context?.skip !== "after" &&
        context?.skip !== "all" &&
        !context?.skip?.includes("after")
      )
        await serviceHooksManager.handleHook(serviceHooks.afterFindOne, {
          result,
          filters,
          queryOptions,
          context,
        });

      return result;
    } catch (err: any) {
      if (
        serviceHooks?.onFindOneError &&
        context?.skip !== "error" &&
        context?.skip !== "all" &&
        !context?.skip?.includes("error")
      )
        await serviceHooksManager.handleHook(serviceHooks.onFindOneError, {
          error: err,
          filters,
          queryOptions,
          context,
        });

      if (context?.throwOnError !== false) throw err;
      return undefined as any;
    }
  }

  /**
   * Updates a single record by its ID.
   *
   * @param {UpdateOneFilters<T>} filters - The parameters to find the record by.
   * @param {UpdateOneData<T>} data - The data to update the record with.
   * @param {UpdateOneOptions<T>} [queryOptions] - Additional query options to modify the Prisma query.
   * @param {ServiceBaseContext} [context] - Request context containing user and accessToken for accessing HTTP-specific information.
   * @returns {Promise<UpdateOneResult<T>>} The updated record or null if not found.
   */
  async updateOne<TOptions extends UpdateOneOptions<T>>(
    filters: UpdateOneFilters<T>,
    data: UpdateOneData<T>,
    queryOptions?: TOptions,
    context?: ServiceBaseContext
  ): Promise<UpdateOneResult<T>> {
    const serviceHooks = getModuleComponents(this.modelName)?.hooks;

    try {
      if (
        serviceHooks?.beforeUpdateOne &&
        context?.skip !== "before" &&
        context?.skip !== "all" &&
        !context?.skip?.includes("before")
      )
        await serviceHooksManager.handleHook(serviceHooks.beforeUpdateOne, {
          filters,
          data,
          queryOptions,
          context,
        });

      if (kebabCase(this.modelName) === "user" && (data as any)?.password) {
        if (!authService.isPasswordHashed((data as any).password!))
          (data as any).password = await authService.hashPassword(
            (data as any)?.password
          );
      }

      const prisma = getPrismaInstance();

      const dataWithRelationFieldsHandled = handleRelationFieldsInBody(
        data as Record<string, any>,
        {
          ...this.relationFields,
        }
      );

      const result = await (prisma[this.modelName] as T).update(
        deepmerge(
          {
            where: filters,
            data: dataWithRelationFieldsHandled,
          },
          (queryOptions as {}) || {}
        ) as { where: any; data: any }
      );

      if (
        serviceHooks?.afterUpdateOne &&
        context?.skip !== "after" &&
        context?.skip !== "all" &&
        !context?.skip?.includes("after")
      )
        await serviceHooksManager.handleHook(serviceHooks.afterUpdateOne, {
          result,
          filters,
          data,
          queryOptions,
          context,
        });

      return result;
    } catch (err: any) {
      if (
        serviceHooks?.onUpdateOneError &&
        context?.skip !== "error" &&
        context?.skip !== "all" &&
        !context?.skip?.includes("error")
      )
        await serviceHooksManager.handleHook(serviceHooks.onUpdateOneError, {
          error: err,
          filters,
          data,
          queryOptions,
          context,
        });

      if (context?.throwOnError !== false) throw err;
      return undefined as any;
    }
  }

  /**
   * Updates multiple records based on the provided filter and data.
   *
   * @param {UpdateManyFilters<T>} filters - The filters to identify records to update.
   * @param {UpdateManyData<T>} data - The data to update the records with.
   * @param {UpdateManyOptions<T>} [queryOptions] - Additional query options.
   * @param {ServiceBaseContext} [context] - Request context containing user and accessToken for accessing HTTP-specific information.
   * @returns {Promise<UpdateManyResult<T>>} The result of the updateMany operation.
   */
  async updateMany<TOptions extends UpdateManyOptions<T>>(
    filters: UpdateManyFilters<T>,
    data: UpdateManyData<T>,
    queryOptions?: TOptions,
    context?: ServiceBaseContext
  ): Promise<UpdateManyResult<T>> {
    const serviceHooks = getModuleComponents(this.modelName)?.hooks;

    try {
      if (
        serviceHooks?.beforeUpdateMany &&
        context?.skip !== "before" &&
        context?.skip !== "all" &&
        !context?.skip?.includes("before")
      )
        await serviceHooksManager.handleHook(serviceHooks.beforeUpdateMany, {
          filters,
          data,
          queryOptions,
          context,
        });

      const prisma = getPrismaInstance();

      if (
        this.modelName === "user" &&
        "password" in (data as any) &&
        (data as any)?.password
      ) {
        if (!authService.isPasswordHashed((data as any).password)) {
          (data as any).password = await authService.hashPassword(
            (data as any)?.password
          );
        }
      }

      const firstMerge = deepmerge({ data }, (queryOptions as {}) || {});

      const result = await (prisma[this.modelName] as T).updateMany(
        deepmerge({ where: filters }, firstMerge) as {
          where: any;
          data: any;
        }
      );

      if (
        serviceHooks?.afterUpdateMany &&
        context?.skip !== "after" &&
        context?.skip !== "all" &&
        !context?.skip?.includes("after")
      )
        await serviceHooksManager.handleHook(serviceHooks.afterUpdateMany, {
          result,
          filters,
          data,
          queryOptions,
          context,
        });

      return result;
    } catch (err: any) {
      if (
        serviceHooks?.onUpdateManyError &&
        context?.skip !== "error" &&
        context?.skip !== "all" &&
        !context?.skip?.includes("error")
      )
        await serviceHooksManager.handleHook(serviceHooks.onUpdateManyError, {
          error: err,
          filters,
          data,
          queryOptions,
          context,
        });

      if (context?.throwOnError !== false) throw err;
      return undefined as any;
    }
  }

  /**
   * Updates multiple records with different data in a single transaction.
   *
   * @param {Array<{filters: UpdateOneFilters<T>, data: UpdateOneData<T>}>} dataArray - Array of objects containing filters and data for each update.
   * @param {UpdateOneOptions<T>} [queryOptions] - Additional query options to modify the Prisma queries.
   * @param {ServiceBaseContext} [context] - Request context containing user and accessToken for accessing HTTP-specific information.
   * @returns {Promise<Array<UpdateOneResult<T>>>} Array of updated records.
   */
  async batchUpdate<TOptions extends UpdateOneOptions<T>>(
    dataArray: UpdateOneData<T>[],
    queryOptions?: TOptions,
    context?: ServiceBaseContext
  ): Promise<Array<UpdateOneResult<T>>> {
    const serviceHooks = getModuleComponents(this.modelName)?.hooks;

    try {
      if (
        serviceHooks?.beforeBatchUpdate &&
        context?.skip !== "before" &&
        context?.skip !== "all" &&
        !context?.skip?.includes("before")
      )
        await serviceHooksManager.handleHook(serviceHooks.beforeBatchUpdate, {
          data: dataArray,
          queryOptions,
          context,
        });

      const prisma = getPrismaInstance();

      const results = await prisma.$transaction(async (tx: any) => {
        const updatePromises = dataArray.map(async (data) => {
          let processedData = data;
          if (
            kebabCase(this.modelName) === "user" &&
            (processedData as any)?.password
          ) {
            if (!authService.isPasswordHashed((processedData as any).password!))
              (processedData as any).password = await authService.hashPassword(
                (processedData as any)?.password
              );
          }

          const finalPrismaQueryParams = handleRelationFieldsInBody(
            {
              batchedData: {
                ...(processedData as Record<string, any>),
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
              (queryOptions as {}) || {}
            ) as { where: any; data: any }
          );
        });

        return await Promise.all(updatePromises);
      });

      if (
        serviceHooks?.afterBatchUpdate &&
        context?.skip !== "after" &&
        context?.skip !== "all" &&
        !context?.skip?.includes("after")
      )
        await serviceHooksManager.handleHook(serviceHooks.afterBatchUpdate, {
          results,
          data: dataArray,
          queryOptions,
          context,
        });

      return results;
    } catch (err: any) {
      if (
        serviceHooks?.onBatchUpdateError &&
        context?.skip !== "error" &&
        context?.skip !== "all" &&
        !context?.skip?.includes("error")
      )
        await serviceHooksManager.handleHook(serviceHooks.onBatchUpdateError, {
          error: err,
          data: dataArray,
          queryOptions,
          context,
        });

      if (context?.throwOnError !== false) throw err;
      return undefined as any;
    }
  }

  /**
   * Deletes a single record by its ID.
   *
   * @param {DeleteOneFilters<T>} filters - The parameters to find the record by.
   * @param {ServiceBaseContext} [context] - Request context containing user and accessToken for accessing HTTP-specific information.
   * @returns {Promise<DeleteOneResult<T>>} The deleted record or null if an error occurs.
   */
  async deleteOne(
    filters: DeleteOneFilters<T>,
    context?: ServiceBaseContext
  ): Promise<DeleteOneResult<T>> {
    const serviceHooks = getModuleComponents(this.modelName)?.hooks;

    try {
      if (
        serviceHooks?.beforeDeleteOne &&
        context?.skip !== "before" &&
        context?.skip !== "all" &&
        !context?.skip?.includes("before")
      )
        await serviceHooksManager.handleHook(serviceHooks.beforeDeleteOne, {
          filters,
          context,
        });

      const prisma = getPrismaInstance();

      const result = await (prisma[this.modelName] as T).delete({
        where: filters,
      });

      if (
        serviceHooks?.afterDeleteOne &&
        context?.skip !== "after" &&
        context?.skip !== "all" &&
        !context?.skip?.includes("after")
      )
        await serviceHooksManager.handleHook(serviceHooks.afterDeleteOne, {
          result,
          filters,
          context,
        });

      return result;
    } catch (err: any) {
      if (
        serviceHooks?.onDeleteOneError &&
        context?.skip !== "error" &&
        context?.skip !== "all" &&
        !context?.skip?.includes("error")
      )
        await serviceHooksManager.handleHook(serviceHooks.onDeleteOneError, {
          error: err,
          filters,
          context,
        });

      if (context?.throwOnError !== false) throw err;
      return undefined as any;
    }
  }

  /**
   * Deletes multiple records based on the provided filter.
   *
   * @param {DeleteManyFilters<T>} filters - The filter to identify records to delete.
   * @param {ServiceBaseContext} [context] - Request context containing user and accessToken for accessing HTTP-specific information.
   * @returns {Promise<DeleteManyResult<T>>} The result of the deleteMany operation.
   */
  async deleteMany(
    filters: DeleteManyFilters<T>,
    context?: ServiceBaseContext
  ): Promise<DeleteManyResult<T>> {
    const serviceHooks = getModuleComponents(this.modelName)?.hooks;

    try {
      if (
        serviceHooks?.beforeDeleteMany &&
        context?.skip !== "before" &&
        context?.skip !== "all" &&
        !context?.skip?.includes("before")
      )
        await serviceHooksManager.handleHook(serviceHooks.beforeDeleteMany, {
          filters,
          context,
        });

      const prisma = getPrismaInstance();

      const result = await (prisma[this.modelName] as T).deleteMany({
        where: filters,
      });

      if (
        serviceHooks?.afterDeleteMany &&
        context?.skip !== "after" &&
        context?.skip !== "all" &&
        !context?.skip?.includes("after")
      )
        await serviceHooksManager.handleHook(serviceHooks.afterDeleteMany, {
          result,
          filters,
          context,
        });

      return result;
    } catch (err: any) {
      if (
        serviceHooks?.onDeleteManyError &&
        context?.skip !== "error" &&
        context?.skip !== "all" &&
        !context?.skip?.includes("error")
      )
        await serviceHooksManager.handleHook(serviceHooks.onDeleteManyError, {
          error: err,
          filters,
          context,
        });

      if (context?.throwOnError !== false) throw err;
      return undefined as any;
    }
  }

  /**
   * Deletes multiple records with different filters in a single transaction.
   *
   * @param {Array<DeleteOneFilters<T>>} batchFilters - Array of filter objects for each deletion.
   * @param {ServiceBaseContext} [context] - Request context containing user and accessToken for accessing HTTP-specific information.
   * @returns {Promise<Array<DeleteOneResult<T>>>} Array of deleted records.
   */
  async batchDelete(
    batchFilters: Array<DeleteOneFilters<T>>,
    context?: ServiceBaseContext
  ): Promise<Array<DeleteOneResult<T>>> {
    const serviceHooks = getModuleComponents(this.modelName)?.hooks;

    try {
      if (
        serviceHooks?.beforeBatchDelete &&
        context?.skip !== "before" &&
        context?.skip !== "all" &&
        !context?.skip?.includes("before")
      )
        await serviceHooksManager.handleHook(serviceHooks.beforeBatchDelete, {
          batchFilters,
          context,
        });

      const prisma = getPrismaInstance();

      const results = await prisma.$transaction(async (tx: any) => {
        const deletePromises = batchFilters.map(async (filters) => {
          const filtersWithRelationFieldsHandled = handleRelationFieldsInBody(
            filters as Record<string, any>,
            {
              ...this.relationFields,
            }
          );

          return await (tx[this.modelName] as T).delete({
            where: filtersWithRelationFieldsHandled,
          });
        });

        return await Promise.all(deletePromises);
      });

      if (
        serviceHooks?.afterBatchDelete &&
        context?.skip !== "after" &&
        context?.skip !== "all" &&
        !context?.skip?.includes("after")
      )
        await serviceHooksManager.handleHook(serviceHooks.afterBatchDelete, {
          results,
          batchFilters,
          context,
        });

      return results;
    } catch (err: any) {
      if (
        serviceHooks?.onBatchDeleteError &&
        context?.skip !== "error" &&
        context?.skip !== "all" &&
        !context?.skip?.includes("error")
      )
        await serviceHooksManager.handleHook(serviceHooks.onBatchDeleteError, {
          error: err,
          batchFilters,
          context,
        });

      if (context?.throwOnError !== false) throw err;
      return undefined as any;
    }
  }
}
