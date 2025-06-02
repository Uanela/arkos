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
 * by model-specific service classes.
 *
 * @class BaseService
 *
 * @usage
 *
 * **Example:** creating a simple service
 *
 * ```ts
 * import prisma from 'your-prisma-path'
 *
 * const userService = new BaseService<typeof prisma.user>("user")
 * ```
 *
 * @see {@link https://www.arkosjs.com/docs/api-reference/the-base-service-class}
 *
 */
export class BaseService<TModel extends Record<string, any>> {
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
   * @param {Parameters<TModel["create"]>[0] extends { data: infer D; [x: string]: any } ? D : any} data - The data to create the record with.
   * @param {Omit<Parameters<TModel["create"]>[0], "data">} [queryOptions] - Additional query options to modify the Prisma query.
   * @returns {Promise<ReturnType<TModel["create"]>>} The created record.
   */
  async createOne(
    data: Parameters<TModel["create"]>[0] extends {
      data: infer D;
      [x: string]: any;
    }
      ? D
      : any,
    queryOptions?: Omit<Parameters<TModel["create"]>[0], "data">
  ): Promise<ReturnType<TModel["create"]>> {
    if (kebabCase(this.modelName) === "user" && (data as any).password) {
      (data as any).password = await authService.hashPassword(
        (data as any).password
      );
    }

    const prisma = getPrismaInstance();

    const dataWithRelationFieldsHandled = handleRelationFieldsInBody(
      data as Record<string, any>,
      {
        ...this.relationFields,
      },
      ["delete", "disconnect", "update"]
    );

    return await prisma[this.modelName].create(
      deepmerge(
        {
          data: dataWithRelationFieldsHandled,
        },
        (queryOptions as {}) || {}
      )
    );
  }

  /**
   * Creates multiple records in the database.
   *
   * @param {Parameters<TModel["createMany"]>[0] extends { data: infer D; [x: string]: any } ? D : any} data - An array of data to create records with.
   * @param {Omit<Parameters<TModel["createMany"]>[0], "data">} [queryOptions] - Additional query options to modify the Prisma query.
   * @returns {Promise<ReturnType<TModel["createMany"]>>} The result of the createMany operation.
   */
  async createMany(
    data: Parameters<TModel["createMany"]>[0] extends {
      data: infer D;
      [x: string]: any;
    }
      ? D
      : any,
    queryOptions?: Omit<Parameters<TModel["createMany"]>[0], "data">
  ): Promise<ReturnType<TModel["createMany"]>> {
    const prisma = getPrismaInstance();

    if (Array.isArray(data))
      (data as any[]).forEach(async (_, i) => {
        if ("password" in data[i] && this.modelName === "user")
          (data[i] as any).password = await authService.hashPassword(
            (data as any)?.password
          );

        data[i] = handleRelationFieldsInBody(
          data as Record<string, any>,
          {
            ...this.relationFields,
          },
          ["delete", "disconnect", "update"]
        );
      });

    return await prisma[this.modelName].createMany(
      deepmerge({ data }, (queryOptions as {}) || {})
    );
  }

  /**
   * Counts records based on provided filters.
   *
   * @param {Parameters<TModel["count"]>[0] extends { where: infer W; [x: string]: any } ? W : any} filters - The filters to apply to the query.
   * @returns {Promise<number>} The count of records matching the filters.
   */
  async count(
    filters: Parameters<TModel["count"]>[0] extends {
      where: infer W;
      [x: string]: any;
    }
      ? W
      : any
  ): Promise<number> {
    const prisma = getPrismaInstance();

    return await prisma[this.modelName].count({
      where: filters,
    });
  }

  /**
   * Finds multiple records based on provided filters.
   *
   * @param {Parameters<TModel["findMany"]>[0] extends { where: infer W; [x: string]: any } ? W : any} filters - The filters to apply to the query.
   * @param {Omit<Parameters<TModel["findMany"]>[0], "where">} [queryOptions] - Additional query options to modify the Prisma query.
   * @returns {Promise<ReturnType<TModel["findMany"]>>} The found data.
   */
  async findMany(
    filters: Parameters<TModel["findMany"]>[0] extends {
      where: infer W;
      [x: string]: any;
    }
      ? W
      : any,
    queryOptions?: Omit<Parameters<TModel["findMany"]>[0], "where">
  ): Promise<ReturnType<TModel["findMany"]>> {
    const prisma = getPrismaInstance();

    return await prisma[this.modelName].findMany(
      deepmerge({ where: filters }, (queryOptions as {}) || {})
    );
  }

  /**
   * Finds a single record by its parameters.
   *
   * @param {Parameters<TModel["findFirst"]>[0] extends { where: infer W; [x: string]: any } ? W : any | Parameters<TModel["findUnique"]>[0] extends { where: infer W; [x: string]: any } ? W : any} filters - The parameters to find the record by.
   * @param {Omit<Parameters<TModel["findFirst"]>[0], "where"> | Omit<Parameters<TModel["findUnique"]>[0], "where">} [queryOptions] - Additional query options to modify the Prisma query.
   * @returns {Promise<ReturnType<TModel["findFirst"]> | ReturnType<TModel["findUnique"]>>} The found record or null if not found.
   */
  async findOne(
    filters: Parameters<TModel["findFirst"]>[0] extends {
      where: infer W;
      [x: string]: any;
    }
      ? W
      : any | Parameters<TModel["findUnique"]>[0] extends {
          where: infer W;
          [x: string]: any;
        }
      ? W
      : any,
    queryOptions?:
      | Omit<Parameters<TModel["findFirst"]>[0], "where">
      | Omit<Parameters<TModel["findUnique"]>[0], "where">
  ): Promise<
    ReturnType<TModel["findFirst"]> | ReturnType<TModel["findUnique"]>
  > {
    const prisma = getPrismaInstance();

    if (
      Object.keys(filters as Record<string, any>).length === 1 &&
      "id" in (filters as Record<string, any>) &&
      (filters as any).id !== "me"
    )
      return prisma[this.modelName].findUnique(
        deepmerge(
          {
            where: filters,
          },
          (queryOptions as {}) || {}
        )
      );

    return await prisma[this.modelName].findFirst(
      deepmerge(
        {
          where: filters,
        },
        (queryOptions as {}) || {}
      )
    );
  }

  /**
   * Updates a single record by its ID.
   *
   * @param {Parameters<TModel["update"]>[0] extends { where: infer W; [x: string]: any } ? W : any} filters - The parameters to find the record by.
   * @param {Parameters<TModel["update"]>[0] extends { data: infer D; [x: string]: any } ? D : any} data - The data to update the record with.
   * @param {Omit<Parameters<TModel["update"]>[0], "where" | "data">} [queryOptions] - Additional query options to modify the Prisma query.
   * @returns {Promise<ReturnType<TModel["update"]>>} The updated record or null if not found.
   */
  async updateOne(
    filters: Parameters<TModel["update"]>[0] extends {
      where: infer W;
      [x: string]: any;
    }
      ? W
      : any,
    data: Parameters<TModel["update"]>[0] extends {
      data: infer D;
      [x: string]: any;
    }
      ? D
      : any,
    queryOptions?: Omit<Parameters<TModel["update"]>[0], "where" | "data">
  ): Promise<ReturnType<TModel["update"]>> {
    const prisma = getPrismaInstance();

    if (kebabCase(this.modelName) === "user" && (data as any)?.password) {
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

    return await prisma[this.modelName].update(
      deepmerge(
        {
          where: filters,
          data: dataWithRelationFieldsHandled,
        },
        (queryOptions as {}) || {}
      )
    );
  }

  /**
   * Updates multiple records based on the provided filter and data.
   *
   * @param {Parameters<TModel["updateMany"]>[0] extends { where: infer W; [x: string]: any } ? W : any} filters - The filters to identify records to update.
   * @param {Parameters<TModel["updateMany"]>[0] extends { data: infer D; [x: string]: any } ? D : any} data - The data to update the records with.
   * @param {Omit<Parameters<TModel["updateMany"]>[0], "where" | "data">} [queryOptions] - Additional query options.
   * @returns {Promise<ReturnType<TModel["updateMany"]>>} The result of the updateMany operation.
   */
  async updateMany(
    filters: Parameters<TModel["updateMany"]>[0] extends {
      where: infer W;
      [x: string]: any;
    }
      ? W
      : any,
    data: Parameters<TModel["updateMany"]>[0] extends {
      data: infer D;
      [x: string]: any;
    }
      ? D
      : any,
    queryOptions?: Omit<Parameters<TModel["updateMany"]>[0], "where" | "data">
  ): Promise<ReturnType<TModel["updateMany"]>> {
    const prisma = getPrismaInstance();

    if (Array.isArray(data) && this.modelName === "user")
      (data as any[]).forEach(async (_, i) => {
        if ("password" in data[i])
          (data[i] as any).password = await authService.hashPassword(
            (data as any)?.password
          );
      });

    const firstMerge = deepmerge({ data }, (queryOptions as {}) || {});

    return await prisma[this.modelName].updateMany(
      deepmerge({ where: filters }, firstMerge)
    );
  }

  /**
   * Deletes a single record by its ID.
   *
   * @param {Parameters<TModel["delete"]>[0] extends { where: infer W; [x: string]: any } ? W : any} filters - The parameters to find the record by.
   * @returns {Promise<ReturnType<TModel["delete"]>>} The deleted record or null if an error occurs.
   */
  async deleteOne(
    filters: Parameters<TModel["delete"]>[0] extends {
      where: infer W;
      [x: string]: any;
    }
      ? W
      : any
  ): Promise<ReturnType<TModel["delete"]>> {
    const prisma = getPrismaInstance();

    return await prisma[this.modelName].delete({
      where: filters,
    });
  }

  /**
   * Deletes multiple records based on the provided filter.
   *
   * @param {Parameters<TModel["deleteMany"]>[0] extends { where: infer W; [x: string]: any } ? W : Record<string, any>} filters - The filter to identify records to delete.
   * @returns {Promise<ReturnType<TModel["deleteMany"]>>} The result of the deleteMany operation.
   */
  async deleteMany(
    filters: Parameters<TModel["deleteMany"]>[0] extends {
      where: infer W;
      [x: string]: any;
    }
      ? W
      : Record<string, any>
  ): Promise<ReturnType<TModel["deleteMany"]>> {
    const prisma = getPrismaInstance();

    return await prisma[this.modelName].deleteMany({ where: filters });
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
