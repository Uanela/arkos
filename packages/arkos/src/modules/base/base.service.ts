import {
  camelCase,
  kebabCase,
  pascalCase,
} from "../../utils/helpers/change-case.helpers";
import {
  getModels,
  getPrismaModelRelations,
  RelationFields,
} from "../../utils/helpers/models.helpers";
import deepmerge from "../../utils/helpers/deepmerge.helper";
import { handleRelationFieldsInBody } from "./utils/helpers/base.service.helpers";
import { getPrismaInstance } from "../../utils/helpers/prisma.helpers";
import authService from "../auth/auth.service";
import { ArkosNextFunction, ArkosRequest, ArkosResponse } from "../../types";
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
} from "./types/base.service.types";

export interface ServiceContext {
  req?: ArkosRequest;
  res?: ArkosResponse;
  next?: ArkosNextFunction;
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
 *   async beforeCreateOne(data: CreateOneData<Product>, queryOptions?: CreateOneOptions<Product>, context?: ServiceContext) {
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
  relationFields: RelationFields;

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
    this.relationFields = getPrismaModelRelations(pascalCase(modelName))!;
  }

  /**
   * Creates a single record in the database.
   *
   * @param {CreateOneData<T>} data - The data to create the record with.
   * @param {CreateOneOptions<T>} [queryOptions] - Additional query options to modify the Prisma query.
   * @param {ServiceContext} [context] - Request context containing req, res, and next for accessing HTTP-specific information.
   * @returns {Promise<CreateOneResult<T>>} The created record.
   */
  async createOne<TOptions extends CreateOneOptions<T>>(
    data: CreateOneData<T>,
    queryOptions?: TOptions,
    context?: ServiceContext
  ): Promise<CreateOneResult<T>> {
    if (this.beforeCreateOne)
      await this.beforeCreateOne({ data, queryOptions, context });

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

    if (this.afterCreateOne)
      await this.afterCreateOne({ result, data, queryOptions, context });

    return result;
  }

  /**
   * Creates multiple records in the database.
   *
   * @param {CreateManyData<T>} data - An array of data to create records with.
   * @param {CreateManyOptions<T>} [queryOptions] - Additional query options to modify the Prisma query.
   * @param {ServiceContext} [context] - Request context containing req, res, and next for accessing HTTP-specific information.
   * @returns {Promise<CreateManyResult<T>>} The result of the createMany operation.
   */
  async createMany<TOptions extends CreateManyOptions<T>>(
    data: CreateManyData<T>,
    queryOptions?: TOptions,
    context?: ServiceContext
  ): Promise<CreateManyResult<T>> {
    if (this.beforeCreateMany)
      await this.beforeCreateMany({ data, queryOptions, context });

    const prisma = getPrismaInstance();
    const dataWithRelationFieldsHandled: any[] = [];

    if (Array.isArray(data))
      await new Promise((resolve) => {
        (data as { [x: string]: any; password?: string }[]).forEach(
          async (curr, i) => {
            if ("password" in curr && this.modelName === "user")
              if (!authService.isPasswordHashed(curr.password!))
                data[i].password = await authService.hashPassword(
                  curr?.password!
                );

            dataWithRelationFieldsHandled[i] = handleRelationFieldsInBody(
              data[i] as Record<string, any>,
              {
                ...this.relationFields,
              },
              ["delete", "disconnect", "update"]
            );

            if (i === data.length - 1) resolve(null);
          }
        );
      });

    const result = await (prisma[this.modelName] as T).createMany(
      deepmerge(
        { data: dataWithRelationFieldsHandled },
        (queryOptions as {}) || {}
      ) as {
        data: any;
      }
    );

    if (this.afterCreateMany)
      await this.afterCreateMany({ result, queryOptions, context });

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
    context?: ServiceContext
  ): Promise<number> {
    if (this.beforeCount) await this.beforeCount({ filters, context });

    const prisma = getPrismaInstance();

    const result = await (prisma[this.modelName] as T).count({
      where: filters,
    });

    if (this.afterCount) await this.afterCount({ result, filters, context });

    return result;
  }

  /**
   * Finds multiple records based on provided filters.
   *
   * @param {FindManyFilters<T>} filters - The filters to apply to the query.
   * @param {FindManyOptions<T>} [queryOptions] - Additional query options to modify the Prisma query.
   * @param {ServiceContext} [context] - Request context containing req, res, and next for accessing HTTP-specific information.
   * @returns {Promise<FindManyResult<T>>} The found data.
   */
  async findMany<TOptions extends FindManyOptions<T>>(
    filters?: FindManyFilters<T>,
    queryOptions?: TOptions,
    context?: ServiceContext
  ): Promise<FindManyResult<T, TOptions>> {
    if (this.beforeFindMany)
      await this.beforeFindMany({ filters, queryOptions, context });

    const prisma = getPrismaInstance();

    const result = await (prisma[this.modelName] as T).findMany(
      deepmerge({ where: filters }, (queryOptions as {}) || {}) as {
        where: any;
      } & TOptions
    );

    if (this.afterFindMany)
      await this.afterFindMany({ result, filters, queryOptions, context });

    return result;
  }

  /**
   * Finds a single record by its ID.
   *
   * @param {string | number} id - The ID of the record to find.
   * @param {FindByIdOptions<T>} [queryOptions] - Additional query options to modify the Prisma query.
   * @returns {Promise<FindByIdResult<T>>} The found record or null if not found.
   */
  async findById<TOptions extends FindByIdOptions<T>>(
    id: string | number,
    queryOptions?: TOptions
  ): Promise<FindByIdResult<T>> {
    const prisma = getPrismaInstance();

    return await (prisma[this.modelName] as T).findUnique(
      deepmerge(
        {
          where: { id },
        },
        queryOptions || {}
      ) as { where: { id: string | number } }
    );
  }

  /**
   * Finds a single record by its parameters.
   *
   * @param {FindOneFilters<T>} filters - The parameters to find the record by.
   * @param {FindOneOptions<T>} [queryOptions] - Additional query options to modify the Prisma query.
   * @param {ServiceContext} [context] - Request context containing req, res, and next for accessing HTTP-specific information.
   * @returns {Promise<FindOneResult<T>>} The found record or null if not found.
   */
  async findOne<TOptions extends FindOneOptions<T>>(
    filters: FindOneFilters<T>,
    queryOptions?: TOptions,
    context?: ServiceContext
  ): Promise<FindOneResult<T>> {
    if (this.beforeFindOne)
      await this.beforeFindOne({ filters, queryOptions, context });

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

    if (this.afterFindOne)
      await this.afterFindOne({ result, filters, queryOptions, context });

    return result;
  }

  /**
   * Updates a single record by its ID.
   *
   * @param {UpdateOneFilters<T>} filters - The parameters to find the record by.
   * @param {UpdateOneData<T>} data - The data to update the record with.
   * @param {UpdateOneOptions<T>} [queryOptions] - Additional query options to modify the Prisma query.
   * @param {ServiceContext} [context] - Request context containing req, res, and next for accessing HTTP-specific information.
   * @returns {Promise<UpdateOneResult<T>>} The updated record or null if not found.
   */
  async updateOne<TOptions extends UpdateOneOptions<T>>(
    filters: UpdateOneFilters<T>,
    data: UpdateOneData<T>,
    queryOptions?: TOptions,
    context?: ServiceContext
  ): Promise<UpdateOneResult<T>> {
    if (this.beforeUpdateOne)
      await this.beforeUpdateOne({ filters, data, queryOptions, context });

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

    if (this.afterUpdateOne)
      await this.afterUpdateOne({
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
   * @param {ServiceContext} [context] - Request context containing req, res, and next for accessing HTTP-specific information.
   * @returns {Promise<UpdateManyResult<T>>} The result of the updateMany operation.
   */
  async updateMany<TOptions extends UpdateManyOptions<T>>(
    filters: UpdateManyFilters<T>,
    data: UpdateManyData<T>,
    queryOptions?: TOptions,
    context?: ServiceContext
  ): Promise<UpdateManyResult<T>> {
    if (this.beforeUpdateMany)
      await this.beforeUpdateMany({ filters, data, queryOptions, context });

    const prisma = getPrismaInstance();

    if (Array.isArray(data) && this.modelName === "user")
      await new Promise((resolve) => {
        (data as { [x: string]: any; password?: string }[]).forEach(
          async (curr, i) => {
            if ("password" in data[i])
              if (!authService.isPasswordHashed(curr.password!))
                (data[i] as any).password = await authService.hashPassword(
                  curr.password!
                );

            if (i === data.length - 1) resolve(undefined);
          }
        );
      });

    const firstMerge = deepmerge({ data }, (queryOptions as {}) || {});

    const result = await (prisma[this.modelName] as T).updateMany(
      deepmerge({ where: filters }, firstMerge) as {
        where: any;
        data: any;
      }
    );

    if (this.afterUpdateMany)
      await this.afterUpdateMany({
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
   * @param {ServiceContext} [context] - Request context containing req, res, and next for accessing HTTP-specific information.
   * @returns {Promise<DeleteOneResult<T>>} The deleted record or null if an error occurs.
   */
  async deleteOne(
    filters: DeleteOneFilters<T>,
    context?: ServiceContext
  ): Promise<DeleteOneResult<T>> {
    if (this.beforeDeleteOne) await this.beforeDeleteOne({ filters, context });

    const prisma = getPrismaInstance();

    const result = await (prisma[this.modelName] as T).delete({
      where: filters,
    });

    if (this.afterDeleteOne)
      await this.afterDeleteOne({ result, filters, context });

    return result;
  }

  /**
   * Deletes multiple records based on the provided filter.
   *
   * @param {DeleteManyFilters<T>} filters - The filter to identify records to delete.
   * @param {ServiceContext} [context] - Request context containing req, res, and next for accessing HTTP-specific information.
   * @returns {Promise<DeleteManyResult<T>>} The result of the deleteMany operation.
   */
  async deleteMany(
    filters: DeleteManyFilters<T>,
    context?: ServiceContext
  ): Promise<DeleteManyResult<T>> {
    if (this.beforeDeleteMany)
      await this.beforeDeleteMany({ filters, context });

    const prisma = getPrismaInstance();

    const result = await (prisma[this.modelName] as T).deleteMany({
      where: filters,
    });

    if (this.afterDeleteMany)
      await this.afterDeleteMany({ result, filters, context });

    return result;
  }

  /**
   * Hook that executes before creating a single record.
   * Override this method to implement custom logic that should run before record creation.
   *
   * @param {CreateOneData<T>} data - The data that will be used to create the record. You can modify this object.
   * @param {CreateOneOptions<T>} [queryOptions] - Additional query options that will be passed to Prisma.
   * @param {ServiceContext} [context] - Request context containing req, res, and next for accessing HTTP-specific information.
   * @returns {Promise<void>}
   *
   * @example
   * ```ts
   * async beforeCreateOne({ data, queryOptions, context }) {
   *   // Add audit fields
   *   data.createdBy = context?.req.user?.id;
   *   data.createdAt = new Date();
   * }
   * ```
   */
  protected async beforeCreateOne?(args: {
    data: CreateOneData<T>;
    queryOptions?: CreateOneOptions<T>;
    context?: ServiceContext;
  }): Promise<void> {}

  /**
   * Hook that executes after creating a single record.
   * Override this method to implement custom logic that should run after record creation.
   *
   * @param {CreateOneResult<T>} data - The created record returned from the database.
   * @param {CreateOneOptions<T>} [queryOptions] - The query options that were passed to Prisma.
   * @param {ServiceContext} [context] - Request context containing req, res, and next for accessing HTTP-specific information.
   * @returns {Promise<void>}
   *
   * @example
   * ```ts
   * async afterCreateOne({ result, queryOptions, context }) {
   *   // Send notification
   *   await notificationService.sendWelcomeEmail(result.email);
   * }
   * ```
   */
  protected async afterCreateOne?(args: {
    result: CreateOneResult<T>;
    data: CreateOneData<T>;
    queryOptions?: CreateOneOptions<T>;
    context?: ServiceContext;
  }): Promise<void> {}

  /**
   * Hook that executes before creating multiple records.
   * Override this method to implement custom logic that should run before batch record creation.
   *
   * @param {CreateManyData<T>} data - The array of data objects that will be used to create records. You can modify this array.
   * @param {CreateManyOptions<T>} [queryOptions] - Additional query options that will be passed to Prisma.
   * @param {ServiceContext} [context] - Request context containing req, res, and next for accessing HTTP-specific information.
   * @returns {Promise<void>}
   *
   * @example
   * ```ts
   * async beforeCreateMany({ data, queryOptions, context }) {
   *   // Add audit fields to all records
   *   const userId = context?.req.user?.id;
   *   data.forEach(item => {
   *     item.createdBy = userId;
   *   });
   * }
   * ```
   */
  protected async beforeCreateMany?(args: {
    data: CreateManyData<T>;
    queryOptions?: CreateManyOptions<T>;
    context?: ServiceContext;
  }): Promise<void> {}

  /**
   * Hook that executes after creating multiple records.
   * Override this method to implement custom logic that should run after batch record creation.
   *
   * @param {CreateManyResult<T>} result - The result of the createMany operation, containing count information.
   * @param {CreateManyOptions<T>} [queryOptions] - The query options that were passed to Prisma.
   * @param {ServiceContext} [context] - Request context containing req, res, and next for accessing HTTP-specific information.
   * @returns {Promise<void>}
   *
   * @example
   * ```ts
   * async afterCreateMany({ result, queryOptions, context }) {
   *   // Log batch creation
   *   console.info(`Created ${result.count} records`);
   * }
   * ```
   */
  protected async afterCreateMany?(args: {
    result: CreateManyResult<T>;
    queryOptions?: CreateManyOptions<T>;
    context?: ServiceContext;
  }): Promise<void> {}

  /**
   * Hook that executes before finding multiple records.
   * Override this method to implement custom logic that should run before querying multiple records.
   *
   * @param {FindManyFilters<T>} [filters] - The filters that will be applied to the query. You can modify this object.
   * @param {FindManyOptions<T>} [queryOptions] - Additional query options that will be passed to Prisma.
   * @param {ServiceContext} [context] - Request context containing req, res, and next for accessing HTTP-specific information.
   * @returns {Promise<void>}
   *
   * @example
   * ```ts
   * async beforeFindMany(filters, queryOptions, context) {
   *   // Add tenant filtering
   *   filters.tenantId = context?.req.user?.tenantId;
   * }
   * ```
   */
  protected async beforeCount?(args: {
    filters?: CountFilters<T>;
    context?: ServiceContext;
  }): Promise<void> {}

  /**
   * Hook that executes before finding multiple records.
   * Override this method to implement custom logic that should run before querying multiple records.
   *
   * @param {FindManyFilters<T>} [filters] - The filters that will be applied to the query. You can modify this object.
   * @param {FindManyOptions<T>} [queryOptions] - Additional query options that will be passed to Prisma.
   * @param {ServiceContext} [context] - Request context containing req, res, and next for accessing HTTP-specific information.
   * @returns {Promise<void>}
   *
   * @example
   * ```ts
   * async beforeFindMany(filters, queryOptions, context) {
   *   // Add tenant filtering
   *   filters.tenantId = context?.req.user?.tenantId;
   * }
   * ```
   */
  protected async afterCount?(args: {
    result: number;
    filters?: CountFilters<T>;
    context?: ServiceContext;
  }): Promise<void> {}

  /**
   * Hook that executes before finding multiple records.
   * Override this method to implement custom logic that should run before querying multiple records.
   *
   * @param {FindManyFilters<T>} [filters] - The filters that will be applied to the query. You can modify this object.
   * @param {FindManyOptions<T>} [queryOptions] - Additional query options that will be passed to Prisma.
   * @param {ServiceContext} [context] - Request context containing req, res, and next for accessing HTTP-specific information.
   * @returns {Promise<void>}
   *
   * @example
   * ```ts
   * async beforeFindMany(filters, queryOptions, context) {
   *   // Add tenant filtering
   *   filters.tenantId = context?.req.user?.tenantId;
   * }
   * ```
   */
  protected async beforeFindMany?(args: {
    filters?: FindManyFilters<T>;
    queryOptions?: FindManyOptions<T>;
    context?: ServiceContext;
  }): Promise<void> {}

  /**
   * Hook that executes after finding multiple records.
   * Override this method to implement custom logic that should run after querying multiple records.
   *
   * @param {FindManyResult<T>} result - The array of records returned from the database.
   * @param {FindManyFilters<T>} [filters] - The filters that were applied to the query.
   * @param {FindManyOptions<T>} [queryOptions] - The query options that were passed to Prisma.
   * @param {ServiceContext} [context] - Request context containing req, res, and next for accessing HTTP-specific information.
   * @returns {Promise<void>}
   *
   * @example
   * ```ts
   * async afterFindMany(result, filters, queryOptions, context) {
   *   // Remove sensitive fields for non-admin users
   *   if (!context?.req.user?.isAdmin) {
   *     result.forEach(item => delete item.password);
   *   }
   * }
   * ```
   */
  protected async afterFindMany?(args: {
    result: FindManyResult<T>;
    filters?: FindManyFilters<T>;
    queryOptions?: FindManyOptions<T>;
    context?: ServiceContext;
  }): Promise<void> {}

  /**
   * Hook that executes before finding a single record.
   * Override this method to implement custom logic that should run before querying a single record.
   *
   * @param {FindOneFilters<T>} filters - The filters that will be applied to find the record. You can modify this object.
   * @param {FindOneOptions<T>} [queryOptions] - Additional query options that will be passed to Prisma.
   * @param {ServiceContext} [context] - Request context containing req, res, and next for accessing HTTP-specific information.
   * @returns {Promise<void>}
   *
   * @example
   * ```ts
   * async beforeFindOne(filters, queryOptions, context) {
   *   // Replace 'me' with current user ID
   *   if (filters.id === 'me') {
   *     filters.id = context?.req.user?.id;
   *   }
   * }
   * ```
   */
  protected async beforeFindOne?(args: {
    filters: FindOneFilters<T>;
    queryOptions?: FindOneOptions<T>;
    context?: ServiceContext;
  }): Promise<void> {}

  /**
   * Hook that executes after finding a single record.
   * Override this method to implement custom logic that should run after querying a single record.
   *
   * @param {FindOneResult<T>} result - The record returned from the database (or null if not found).
   * @param {FindOneFilters<T>} filters - The filters that were applied to find the record.
   * @param {FindOneOptions<T>} [queryOptions] - The query options that were passed to Prisma.
   * @param {ServiceContext} [context] - Request context containing req, res, and next for accessing HTTP-specific information.
   * @returns {Promise<void>}
   *
   * @example
   * ```ts
   * async afterFindOne(result, filters, queryOptions, context) {
   *   // Log access for security purposes
   *   if (result) {
   *     auditService.logAccess(context?.req.user?.id, result.id);
   *   }
   * }
   * ```
   */
  protected async afterFindOne?(args: {
    result: FindOneResult<T>;
    filters: FindOneFilters<T>;
    queryOptions?: FindOneOptions<T>;
    context?: ServiceContext;
  }): Promise<void> {}

  /**
   * Hook that executes before updating a single record.
   * Override this method to implement custom logic that should run before record update.
   *
   * @param {UpdateOneFilters<T>} filters - The filters used to identify the record to update.
   * @param {UpdateOneData<T>} data - The data that will be used to update the record. You can modify this object.
   * @param {UpdateOneOptions<T>} [queryOptions] - Additional query options that will be passed to Prisma.
   * @param {ServiceContext} [context] - Request context containing req, res, and next for accessing HTTP-specific information.
   * @returns {Promise<void>}
   *
   * @example
   * ```ts
   * async beforeUpdateOne({ filters, data, queryOptions, context }) {
    
   *   // Add audit fields
   *   data.updatedBy = context?.req.user?.id;
   *   data.updatedAt = new Date();
   * }
   * ```
   */
  protected async beforeUpdateOne?(args: {
    filters: UpdateOneFilters<T>;
    data: UpdateOneData<T>;
    queryOptions?: UpdateOneOptions<T>;
    context?: ServiceContext;
  }): Promise<void> {}

  /**
   * Hook that executes after updating a single record.
   * Override this method to implement custom logic that should run after record update.
   *
   * @param {UpdateOneResult<T>} result - The updated record returned from the database.
   * @param {UpdateOneFilters<T>} filters - The filters that were used to identify the record.
   * @param {UpdateOneData<T>} data - The data that was used to update the record.
   * @param {UpdateOneOptions<T>} [queryOptions] - The query options that were passed to Prisma.
   * @param {ServiceContext} [context] - Request context containing req, res, and next for accessing HTTP-specific information.
   * @returns {Promise<void>}
   *
   * @example
   * ```ts
   * async afterUpdateOne({ result, filters, data, queryOptions, context }) {
   *   // Send notification if status changed
   *   if (data.status && data.status !== result.previousStatus) {
   *     await notificationService.sendStatusUpdate(result);
   *   }
   * }
   * ```
   */
  protected async afterUpdateOne?(args: {
    result: UpdateOneResult<T>;
    filters: UpdateOneFilters<T>;
    data: UpdateOneData<T>;
    queryOptions?: UpdateOneOptions<T>;
    context?: ServiceContext;
  }): Promise<void> {}

  /**
   * Hook that executes before updating multiple records.
   * Override this method to implement custom logic that should run before batch record update.
   *
   * @param {UpdateManyFilters<T>} filters - The filters used to identify records to update.
   * @param {UpdateManyData<T>} data - The data that will be used to update the records. You can modify this object.
   * @param {UpdateManyOptions<T>} [queryOptions] - Additional query options that will be passed to Prisma.
   * @param {ServiceContext} [context] - Request context containing req, res, and next for accessing HTTP-specific information.
   * @returns {Promise<void>}
   *
   * @example
   * ```ts
   * async beforeUpdateMany({ filters, data, queryOptions, context }) {
    
   *   // Add audit fields for batch updates
   *   data.updatedBy = context?.req.user?.id;
   *   data.batchUpdateId = generateBatchId();
   * }
   * ```
   */
  protected async beforeUpdateMany?(args: {
    filters: UpdateManyFilters<T>;
    data: UpdateManyData<T>;
    queryOptions?: UpdateManyOptions<T>;
    context?: ServiceContext;
  }): Promise<void> {}

  /**
   * Hook that executes after updating multiple records.
   * Override this method to implement custom logic that should run after batch record update.
   *
   * @param {UpdateManyResult<T>} result - The result of the updateMany operation, containing count information.
   * @param {UpdateManyFilters<T>} filters - The filters that were used to identify records.
   * @param {UpdateManyData<T>} data - The data that was used to update the records.
   * @param {UpdateManyOptions<T>} [queryOptions] - The query options that were passed to Prisma.
   * @param {ServiceContext} [context] - Request context containing req, res, and next for accessing HTTP-specific information.
   * @returns {Promise<void>}
   *
   * @example
   * ```ts
   * async afterUpdateMany({ result, filters, data, queryOptions, context }) {
   *   // Log batch update
   *   console.info(`Updated ${result.count} records`);
   *   await auditService.logBatchUpdate(result.count, filters);
   * }
   * ```
   */
  protected async afterUpdateMany?(args: {
    result: UpdateManyResult<T>;
    filters: UpdateManyFilters<T>;
    data: UpdateManyData<T>;
    queryOptions?: UpdateManyOptions<T>;
    context?: ServiceContext;
  }): Promise<void> {}

  /**
   * Hook that executes before deleting a single record.
   * Override this method to implement custom logic that should run before record deletion.
   *
   * @param {DeleteOneFilters<T>} filters - The filters used to identify the record to delete.
   * @param {ServiceContext} [context] - Request context containing req, res, and next for accessing HTTP-specific information.
   * @returns {Promise<void>}
   *
   * @example
   * ```ts
   * async beforeDeleteOne(filters, context) {
   *   // Check if user has permission to delete
   *   const record = await this.findOne(filters);
   *   if (record.ownerId !== context?.req.user?.id) {
   *     throw new Error('Unauthorized to delete this record');
   *   }
   * }
   * ```
   */
  protected async beforeDeleteOne?(args: {
    filters: DeleteOneFilters<T>;
    context?: ServiceContext;
  }): Promise<void> {}

  /**
   * Hook that executes after deleting a single record.
   * Override this method to implement custom logic that should run after record deletion.
   *
   * @param {DeleteOneResult<T>} result - The deleted record returned from the database.
   * @param {DeleteOneFilters<T>} filters - The filters that were used to identify the record.
   * @param {ServiceContext} [context] - Request context containing req, res, and next for accessing HTTP-specific information.
   * @returns {Promise<void>}
   *
   * @example
   * ```ts
   * async afterDeleteOne(result, filters, context) {
   *   // Clean up related resources
   *   await fileService.deleteUserFiles(result.id);
   *   await cacheService.invalidateUserCache(result.id);
   * }
   * ```
   */
  protected async afterDeleteOne?(args: {
    result: DeleteOneResult<T>;
    filters: DeleteOneFilters<T>;
    context?: ServiceContext;
  }): Promise<void> {}

  /**
   * Hook that executes before deleting multiple records.
   * Override this method to implement custom logic that should run before batch record deletion.
   *
   * @param {DeleteManyFilters<T>} filters - The filters used to identify records to delete.
   * @param {ServiceContext} [context] - Request context containing req, res, and next for accessing HTTP-specific information.
   * @returns {Promise<void>}
   *
   * @example
   * ```ts
   * async beforeDeleteMany(filters, context) {
   *   // Validate bulk deletion permissions
   *   if (!context?.req.user?.isAdmin) {
   *     throw new Error('Only admins can perform bulk deletions');
   *   }
   * }
   * ```
   */
  protected async beforeDeleteMany?(args: {
    filters: DeleteManyFilters<T>;
    context?: ServiceContext;
  }): Promise<void> {}

  /**
   * Hook that executes after deleting multiple records.
   * Override this method to implement custom logic that should run after batch record deletion.
   *
   * @param {DeleteManyResult<T>} result - The result of the deleteMany operation, containing count information.
   * @param {DeleteManyFilters<T>} filters - The filters that were used to identify records.
   * @param {ServiceContext} [context] - Request context containing req, res, and next for accessing HTTP-specific information.
   * @returns {Promise<void>}
   *
   * @example
   * ```ts
   * async afterDeleteMany(result, filters, context) {
   *   // Log bulk deletion for audit purposes
   *   console.info(`Deleted ${result.count} records`);
   *   await auditService.logBulkDeletion(result.count, filters, context?.req.user?.id);
   * }
   * ```
   */
  async afterDeleteMany?(args: {
    result: DeleteManyResult<T>;
    filters: DeleteManyFilters<T>;
    context?: ServiceContext;
  }): Promise<void> {}
}

/**
 * Generates a set of base service instances for all available models.
 *
 * @returns {Record<string, BaseService>} A dictionary of base service instances, keyed by model name.
 */
export function getBaseServices(): Record<string, BaseService<any>> {
  const models = getModels();
  const baseServices: Record<string, BaseService<any>> = {};
  models.forEach((model) => {
    baseServices[`${camelCase(model)}`] = new BaseService(model);
  });
  return baseServices;
}
