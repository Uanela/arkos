import { camelCase, kebabCase } from "../../utils/helpers/change-case.helpers";
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
 *     const userId = context?.req.user?.id;
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
   * @param {ServiceBaseContext} [context] - Request context containing req, res, and next for accessing HTTP-specific information.
   * @returns {Promise<CreateOneResult<T>>} The created record.
   */
  async createOne<TOptions extends CreateOneOptions<T>>(
    data: CreateOneData<T>,
    queryOptions?: TOptions,
    context?: ServiceBaseContext
  ): Promise<CreateOneResult<T>> {
    const serviceHooks = getModuleComponents(this.modelName)?.hooks;

    if (serviceHooks?.beforeCreateOne)
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

    if (serviceHooks?.afterCreateOne)
      await serviceHooksManager.handleHook(serviceHooks.afterCreateOne, {
        result,
        data,
        queryOptions,
        context,
      });

    return result;
  }

  /**
   * Creates multiple records in the database.
   *
   * @param {CreateManyData<T>} data - An array of data to create records with.
   * @param {CreateManyOptions<T>} [queryOptions] - Additional query options to modify the Prisma query.
   * @param {ServiceBaseContext} [context] - Request context containing req, res, and next for accessing HTTP-specific information.
   * @returns {Promise<CreateManyResult<T>>} The result of the createMany operation.
   */
  async createMany<TOptions extends CreateManyOptions<T>>(
    data: CreateManyData<T>,
    queryOptions?: TOptions,
    context?: ServiceBaseContext
  ): Promise<CreateManyResult<T>> {
    const serviceHooks = getModuleComponents(this.modelName)?.hooks;

    if (serviceHooks?.beforeCreateMany) {
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
            data[i].password = await authService.hashPassword(curr?.password!);
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

    if (serviceHooks?.afterCreateMany)
      await serviceHooksManager.handleHook(serviceHooks.afterCreateMany, {
        result,
        data,
        queryOptions,
        context,
      });

    return result;
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

    if (serviceHooks?.beforeCount) {
      await serviceHooksManager.handleHook(serviceHooks.beforeCount, {
        filters,
        context,
      });
    }

    const prisma = getPrismaInstance();

    const result = await (prisma[this.modelName] as T).count({
      where: filters,
    });

    if (serviceHooks?.afterCount) {
      await serviceHooksManager.handleHook(serviceHooks.afterCount, {
        result,
        filters,
        context,
      });
    }

    return result;
  }

  /**
   * Finds multiple records based on provided filters.
   *
   * @param {FindManyFilters<T>} filters - The filters to apply to the query.
   * @param {FindManyOptions<T>} [queryOptions] - Additional query options to modify the Prisma query.
   * @param {ServiceBaseContext} [context] - Request context containing req, res, and next for accessing HTTP-specific information.
   * @returns {Promise<FindManyResult<T>>} The found data.
   */
  async findMany<TOptions extends FindManyOptions<T>>(
    filters?: FindManyFilters<T>,
    queryOptions?: TOptions,
    context?: ServiceBaseContext
  ): Promise<FindManyResult<T, TOptions>> {
    const serviceHooks = getModuleComponents(this.modelName)?.hooks;

    if (serviceHooks?.beforeFindMany) {
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

    if (serviceHooks?.afterFindMany)
      await serviceHooksManager.handleHook(serviceHooks.afterFindMany, {
        result,
        filters,
        queryOptions,
        context,
      });

    return result;
  }

  /**
   * Finds a single record by its ID.
   *
   * @param {string | number} id - The ID of the record to find.
   * @param {FindByIdOptions<T>} [queryOptions] - Additional query options to modify the Prisma query.
   * @param {ServiceBaseContext} [context] - Request context containing req, res, and next for accessing HTTP-specific information.
   * @returns {Promise<FindByIdResult<T>>} The found record or null if not found.
   */
  async findById<TOptions extends FindByIdOptions<T>>(
    id: string | number,
    queryOptions?: TOptions,
    context?: ServiceBaseContext
  ): Promise<FindByIdResult<T>> {
    const serviceHooks = getModuleComponents(this.modelName)?.hooks;

    if (serviceHooks?.beforeFindById) {
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

    if (serviceHooks?.afterFindById) {
      await serviceHooksManager.handleHook(serviceHooks.afterFindById, {
        result,
        id,
        queryOptions,
        context,
      });
    }

    return result;
  }

  /**
   * Finds a single record by its parameters.
   *
   * @param {FindOneFilters<T>} filters - The parameters to find the record by.
   * @param {FindOneOptions<T>} [queryOptions] - Additional query options to modify the Prisma query.
   * @param {ServiceBaseContext} [context] - Request context containing req, res, and next for accessing HTTP-specific information.
   * @returns {Promise<FindOneResult<T>>} The found record or null if not found.
   */
  async findOne<TOptions extends FindOneOptions<T>>(
    filters: FindOneFilters<T>,
    queryOptions?: TOptions,
    context?: ServiceBaseContext
  ): Promise<FindOneResult<T>> {
    const serviceHooks = getModuleComponents(this.modelName)?.hooks;

    if (serviceHooks?.beforeFindOne) {
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

    if (serviceHooks?.afterFindOne)
      await serviceHooksManager.handleHook(serviceHooks.afterFindOne, {
        result,
        filters,
        queryOptions,
        context,
      });

    return result;
  }

  /**
   * Updates a single record by its ID.
   *
   * @param {UpdateOneFilters<T>} filters - The parameters to find the record by.
   * @param {UpdateOneData<T>} data - The data to update the record with.
   * @param {UpdateOneOptions<T>} [queryOptions] - Additional query options to modify the Prisma query.
   * @param {ServiceBaseContext} [context] - Request context containing req, res, and next for accessing HTTP-specific information.
   * @returns {Promise<UpdateOneResult<T>>} The updated record or null if not found.
   */
  async updateOne<TOptions extends UpdateOneOptions<T>>(
    filters: UpdateOneFilters<T>,
    data: UpdateOneData<T>,
    queryOptions?: TOptions,
    context?: ServiceBaseContext
  ): Promise<UpdateOneResult<T>> {
    const serviceHooks = getModuleComponents(this.modelName)?.hooks;

    if (serviceHooks?.beforeUpdateOne)
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

    if (serviceHooks?.afterUpdateOne)
      await serviceHooksManager.handleHook(serviceHooks.afterUpdateOne, {
        result,
        filters,
        data,
        queryOptions,
        context,
      });

    return result;
  }

  /**
   * Updates multiple records based on the provided filter and data.
   *
   * @param {UpdateManyFilters<T>} filters - The filters to identify records to update.
   * @param {UpdateManyData<T>} data - The data to update the records with.
   * @param {UpdateManyOptions<T>} [queryOptions] - Additional query options.
   * @param {ServiceBaseContext} [context] - Request context containing req, res, and next for accessing HTTP-specific information.
   * @returns {Promise<UpdateManyResult<T>>} The result of the updateMany operation.
   */
  async updateMany<TOptions extends UpdateManyOptions<T>>(
    filters: UpdateManyFilters<T>,
    data: UpdateManyData<T>,
    queryOptions?: TOptions,
    context?: ServiceBaseContext
  ): Promise<UpdateManyResult<T>> {
    const serviceHooks = getModuleComponents(this.modelName)?.hooks;

    if (serviceHooks?.beforeUpdateMany)
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

    if (serviceHooks?.afterUpdateMany)
      await serviceHooksManager.handleHook(serviceHooks.afterUpdateMany, {
        result,
        filters,
        data,
        queryOptions,
        context,
      });

    return result;
  }

  /**
   * Deletes a single record by its ID.
   *
   * @param {DeleteOneFilters<T>} filters - The parameters to find the record by.
   * @param {ServiceBaseContext} [context] - Request context containing req, res, and next for accessing HTTP-specific information.
   * @returns {Promise<DeleteOneResult<T>>} The deleted record or null if an error occurs.
   */
  async deleteOne(
    filters: DeleteOneFilters<T>,
    context?: ServiceBaseContext
  ): Promise<DeleteOneResult<T>> {
    const serviceHooks = getModuleComponents(this.modelName)?.hooks;

    if (serviceHooks?.beforeDeleteOne)
      await serviceHooksManager.handleHook(serviceHooks.beforeDeleteOne, {
        filters,
        context,
      });

    const prisma = getPrismaInstance();

    const result = await (prisma[this.modelName] as T).delete({
      where: filters,
    });

    if (serviceHooks?.afterDeleteOne)
      await serviceHooksManager.handleHook(serviceHooks.afterDeleteOne, {
        result,
        filters,
        context,
      });

    return result;
  }

  /**
   * Deletes multiple records based on the provided filter.
   *
   * @param {DeleteManyFilters<T>} filters - The filter to identify records to delete.
   * @param {ServiceBaseContext} [context] - Request context containing req, res, and next for accessing HTTP-specific information.
   * @returns {Promise<DeleteManyResult<T>>} The result of the deleteMany operation.
   */
  async deleteMany(
    filters: DeleteManyFilters<T>,
    context?: ServiceBaseContext
  ): Promise<DeleteManyResult<T>> {
    const serviceHooks = getModuleComponents(this.modelName)?.hooks;

    if (serviceHooks?.beforeDeleteMany)
      await serviceHooksManager.handleHook(serviceHooks.beforeDeleteMany, {
        filters,
        context,
      });

    const prisma = getPrismaInstance();

    const result = await (prisma[this.modelName] as T).deleteMany({
      where: filters,
    });

    if (serviceHooks?.afterDeleteMany)
      await serviceHooksManager.handleHook(serviceHooks.afterDeleteMany, {
        result,
        filters,
        context,
      });

    return result;
  }
}
