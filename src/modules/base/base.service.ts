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
 * import { prisma } from '../../utils/prisma'
 *
 * const userService = new BaseService<typeof prisma.user>("user")
 * ```
 *
 * @see {@link https://www.arkosjs.com/docs/api-reference/the-base-service-class}
 *
 */
export class BaseService<ModelDelegate extends Record<string, any> = any> {
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
   * @param {Parameters<ModelDelegate["create"]>[0] extends { data: infer D; [x: string]: any } ? D : any} data - The data to create the record with.
   * @param {TOptions} [queryOptions] - Additional query options to modify the Prisma query.
   * @returns {Promise<ReturnType<ModelDelegate["create"]>>} The created record.
   */
  async createOne<
    TOptions extends Omit<Parameters<ModelDelegate["create"]>[0], "data">,
  >(
    data: Parameters<ModelDelegate["create"]>[0] extends {
      data: infer D;
      [x: string]: any;
    }
      ? D
      : any,
    queryOptions?: TOptions
  ): Promise<
    ModelDelegate["create"] extends (args: { data: any } & TOptions) => infer R
      ? R
      : any
  > {
    // user uer Password123 true false Promise { true }
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

    return await (prisma[this.modelName] as ModelDelegate).create(
      deepmerge(
        {
          data: dataWithRelationFieldsHandled,
        },
        (queryOptions as {}) || {}
      ) as { data: any } & TOptions
    );
  }

  /**
   * Creates multiple records in the database.
   *
   * @param {Parameters<ModelDelegate["createMany"]>[0] extends { data: infer D; [x: string]: any } ? D : any} data - An array of data to create records with.
   * @param {TOptions} [queryOptions] - Additional query options to modify the Prisma query.
   * @returns {Promise<ReturnType<ModelDelegate["createMany"]>>} The result of the createMany operation.
   */
  async createMany<
    TOptions extends Omit<Parameters<ModelDelegate["createMany"]>[0], "data">,
  >(
    data: Parameters<ModelDelegate["createMany"]>[0] extends {
      data: infer D;
      [x: string]: any;
    }
      ? D
      : any,
    queryOptions?: TOptions
  ): Promise<
    ModelDelegate["createMany"] extends (
      args: { data: any } & TOptions
    ) => infer R
      ? R
      : any
  > {
    const prisma = getPrismaInstance();

    if (Array.isArray(data))
      (data as { [x: string]: any; password?: string }[]).forEach(
        async (curr, i) => {
          if ("password" in curr && this.modelName === "user")
            if (!authService.isPasswordHashed(curr.password!))
              curr.password = await authService.hashPassword(curr?.password!);

          data[i] = handleRelationFieldsInBody(
            data[i] as Record<string, any>,
            {
              ...this.relationFields,
            },
            ["delete", "disconnect", "update"]
          );
        }
      );

    return await (prisma[this.modelName] as ModelDelegate).createMany(
      deepmerge({ data }, (queryOptions as {}) || {}) as {
        data: any;
      } & TOptions
    );
  }

  /**
   * Counts records based on provided filters.
   *
   * @param {Parameters<ModelDelegate["count"]>[0] extends { where?: infer W; [x: string]: any } ? W : any} filters - The filters to apply to the query.
   * @returns {Promise<number>} The count of records matching the filters.
   */
  async count(
    filters: Parameters<ModelDelegate["count"]>[0] extends {
      where?: infer W;
      [x: string]: any;
    }
      ? W
      : any
  ): Promise<number> {
    const prisma = getPrismaInstance();

    return await (prisma[this.modelName] as ModelDelegate).count({
      where: filters,
    });
  }

  /**
   * Finds multiple records based on provided filters.
   *
   * @param {Parameters<ModelDelegate["findMany"]>[0] extends { where?: infer W; [x: string]: any } ? W : any} filters - The filters to apply to the query.
   * @param {TOptions} [queryOptions] - Additional query options to modify the Prisma query.
   * @returns {Promise<ReturnType<ModelDelegate["findMany"]>>} The found data.
   */
  async findMany<
    TOptions extends Omit<Parameters<ModelDelegate["findMany"]>[0], "where">,
  >(
    filters: Parameters<ModelDelegate["findMany"]>[0] extends {
      where?: infer W;
      [x: string]: any;
    }
      ? W
      : any,
    queryOptions?: TOptions
  ): Promise<
    ModelDelegate["findMany"] extends (
      args: { where: any } & TOptions
    ) => infer R
      ? R
      : any
  > {
    const prisma = getPrismaInstance();

    return await (prisma[this.modelName] as ModelDelegate).findMany(
      deepmerge({ where: filters }, (queryOptions as {}) || {}) as {
        where: any;
      } & TOptions
    );
  }

  /**
   * Finds a single record by its ID.
   *
   * @param {string | number} id - The ID of the record to find.
   * @param {TOptions} [queryOptions] - Additional query options to modify the Prisma query.
   * @returns {Promise<ReturnType<ModelDelegate["findUnique"]>>} The found record or null if not found.
   */
  async findById<
    TOptions extends Omit<Parameters<ModelDelegate["findUnique"]>[0], "where">,
  >(
    id: string | number,
    queryOptions?: TOptions
  ): Promise<
    ModelDelegate["findUnique"] extends (
      args: { where: any } & TOptions
    ) => infer R
      ? R
      : any
  > {
    const prisma = getPrismaInstance();

    return await (prisma[this.modelName] as ModelDelegate).findUnique(
      deepmerge(
        {
          where: { id },
        },
        queryOptions || {}
      ) as { where: { id: string | number } } & TOptions
    );
  }

  /**
   * Finds a single record by its parameters.
   *
   * @param {Parameters<ModelDelegate["findFirst"]>[0] extends { where?: infer W; [x: string]: any } ? W : any | Parameters<TModel["findUnique"]>[0] extends { where: infer W; [x: string]: any } ? W : any} filters - The parameters to find the record by.
   * @param {TOptions} [queryOptions] - Additional query options to modify the Prisma query.
   * @returns {Promise<ReturnType<ModelDelegate["findFirst"]> | ReturnType<TModel["findUnique"]>>} The found record or null if not found.
   */
  async findOne<
    TOptions extends
      | Omit<Parameters<ModelDelegate["findFirst"]>[0], "where">
      | Omit<Parameters<ModelDelegate["findUnique"]>[0], "where">,
  >(
    filters: Parameters<ModelDelegate["findFirst"]>[0] extends {
      where?: infer W;
      [x: string]: any;
    }
      ? W
      : any | Parameters<ModelDelegate["findUnique"]>[0] extends {
            where?: infer W;
            [x: string]: any;
          }
        ? W
        : any,
    queryOptions?: TOptions
  ): Promise<
    ModelDelegate["findFirst"] extends (args: { where: any }) => infer R
      ? R
      : ModelDelegate["findUnique"] extends (args: { where: any }) => infer R2
        ? R2
        : any
  > {
    const prisma = getPrismaInstance();

    if (
      Object.keys(filters as Record<string, any>).length === 1 &&
      "id" in (filters as Record<string, any>) &&
      (filters as any).id !== "me"
    )
      return (prisma[this.modelName] as ModelDelegate).findUnique(
        deepmerge(
          {
            where: filters,
          },
          (queryOptions as {}) || {}
        ) as { where: any } & TOptions
      );

    return await (prisma[this.modelName] as ModelDelegate).findFirst(
      deepmerge(
        {
          where: filters,
        },
        (queryOptions as {}) || {}
      ) as { where: any } & TOptions
    );
  }

  /**
   * Updates a single record by its ID.
   *
   * @param {Parameters<ModelDelegate["update"]>[0] extends { where?: infer W; [x: string]: any } ? W : any} filters - The parameters to find the record by.
   * @param {Parameters<ModelDelegate["update"]>[0] extends { data: infer D; [x: string]: any } ? D : any} data - The data to update the record with.
   * @param {TOptions} [queryOptions] - Additional query options to modify the Prisma query.
   * @returns {Promise<ReturnType<ModelDelegate["update"]>>} The updated record or null if not found.
   */
  async updateOne<
    TOptions extends Omit<
      Parameters<ModelDelegate["update"]>[0],
      "where" | "data"
    >,
  >(
    filters: Parameters<ModelDelegate["update"]>[0] extends {
      where?: infer W;
      [x: string]: any;
    }
      ? W
      : any,
    data: Parameters<ModelDelegate["update"]>[0] extends {
      data: infer D;
      [x: string]: any;
    }
      ? D
      : any,
    queryOptions?: TOptions
  ): Promise<
    ModelDelegate["update"] extends (
      args: { where: any; data: any } & TOptions
    ) => infer R
      ? R
      : any
  > {
    const prisma = getPrismaInstance();

    if (kebabCase(this.modelName) === "user" && (data as any)?.password) {
      if (!authService.isPasswordHashed((data as any).password!))
        (data as any).password = await authService.hashPassword(
          (data as any)?.password
        );
    }

    const dataWithRelationFieldsHandled = handleRelationFieldsInBody(
      data as Record<string, any>,
      {
        ...this.relationFields,
      }
    );

    return await (prisma[this.modelName] as ModelDelegate).update(
      deepmerge(
        {
          where: filters,
          data: dataWithRelationFieldsHandled,
        },
        (queryOptions as {}) || {}
      ) as { where: any; data: any } & TOptions
    );
  }

  /**
   * Updates multiple records based on the provided filter and data.
   *
   * @param {Parameters<ModelDelegate["updateMany"]>[0] extends { where?: infer W; [x: string]: any } ? W : any} filters - The filters to identify records to update.
   * @param {Parameters<ModelDelegate["updateMany"]>[0] extends { data: infer D; [x: string]: any } ? D : any} data - The data to update the records with.
   * @param {TOptions} [queryOptions] - Additional query options.
   * @returns {Promise<ReturnType<ModelDelegate["updateMany"]>>} The result of the updateMany operation.
   */
  async updateMany<
    TOptions extends Omit<
      Parameters<ModelDelegate["updateMany"]>[0],
      "where" | "data"
    >,
  >(
    filters: Parameters<ModelDelegate["updateMany"]>[0] extends {
      where?: infer W;
      [x: string]: any;
    }
      ? W
      : any,
    data: Parameters<ModelDelegate["updateMany"]>[0] extends {
      data: infer D;
      [x: string]: any;
    }
      ? D
      : any,
    queryOptions?: TOptions
  ): Promise<
    ModelDelegate["updateMany"] extends (
      args: { where: any; data: any } & TOptions
    ) => infer R
      ? R
      : any
  > {
    const prisma = getPrismaInstance();

    if (Array.isArray(data) && this.modelName === "user")
      (data as { [x: string]: any; password?: string }[]).forEach(
        async (curr, i) => {
          if ("password" in data[i])
            if (!authService.isPasswordHashed(curr.password!))
              (data[i] as any).password = await authService.hashPassword(
                curr.password!
              );
        }
      );

    const firstMerge = deepmerge({ data }, (queryOptions as {}) || {});

    return await (prisma[this.modelName] as ModelDelegate).updateMany(
      deepmerge({ where: filters }, firstMerge) as {
        where: any;
        data: any;
      } & TOptions
    );
  }

  /**
   * Deletes a single record by its ID.
   *
   * @param {Parameters<ModelDelegate["delete"]>[0] extends { where?: infer W; [x: string]: any } ? W : any} filters - The parameters to find the record by.
   * @returns {Promise<ReturnType<ModelDelegate["delete"]>>} The deleted record or null if an error occurs.
   */
  async deleteOne(
    filters: Parameters<ModelDelegate["delete"]>[0] extends {
      where?: infer W;
      [x: string]: any;
    }
      ? W
      : any
  ): Promise<ReturnType<ModelDelegate["delete"]>> {
    const prisma = getPrismaInstance();

    return await (prisma[this.modelName] as ModelDelegate).delete({
      where: filters,
    });
  }

  /**
   * Deletes multiple records based on the provided filter.
   *
   * @param {Parameters<ModelDelegate["deleteMany"]>[0] extends { where?: infer W; [x: string]: any } ? W : Record<string, any>} filters - The filter to identify records to delete.
   * @returns {Promise<ReturnType<ModelDelegate["deleteMany"]>>} The result of the deleteMany operation.
   */
  async deleteMany(
    filters: Parameters<ModelDelegate["deleteMany"]>[0] extends {
      where?: infer W;
      [x: string]: any;
    }
      ? W
      : Record<string, any>
  ): Promise<ReturnType<ModelDelegate["deleteMany"]>> {
    const prisma = getPrismaInstance();

    return await (prisma[this.modelName] as ModelDelegate).deleteMany({
      where: filters,
    });
  }
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
