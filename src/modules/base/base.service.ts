import {
  camelCase,
  kebabCase,
  pascalCase,
} from "../../utils/helpers/change-case.helpers";
import {
  getModelModules,
  getModels,
  getPrismaModelRelations,
  RelationFields,
} from "../../utils/helpers/models.helpers";
import deepmerge from "../../utils/helpers/deepmerge.helper";
import AppError from "../error-handler/utils/app-error";
import pluralize from "pluralize";
import { handleRelationFieldsInBody } from "./utils/helpers/base.helpers";
import { getPrismaInstance } from "../../utils/helpers/prisma.helpers";
import validateDto from "../../utils/validate-dto";
import { getInitConfigs } from "../../server";
import authService from "../auth/auth.service";

/**
 * Base service class for handling CRUD operations on a specific model.
 */
export class BaseService {
  modelName: string;
  relationFields: RelationFields;
  singularRelationFieldToInclude: Record<string, boolean>;
  listRelationFieldToInclude: Record<string, boolean>;
  prisma: any;

  /**
   * Creates an instance of BaseService.
   *
   * @param {string} modelName - The name of the model to perform operations on.
   */
  constructor(modelName: string) {
    this.modelName = camelCase(modelName);
    this.relationFields = getPrismaModelRelations(pascalCase(modelName))!;
    this.singularRelationFieldToInclude = this.relationFields?.singular?.reduce(
      (acc: Record<string, boolean>, curr) => {
        acc[curr.name] = true;
        return acc;
      },
      {}
    );
    this.listRelationFieldToInclude = this.relationFields?.list?.reduce(
      (acc: Record<string, boolean>, curr) => {
        acc[curr.name] = true;
        return acc;
      },
      {}
    );
  }

  /**
   * Creates a single record in the database.
   *
   * @param {Record<string, any>} body - The data to create the record with.
   * @param {string} [queryOptions] - Additional query options to modify the Prisma query.
   * @returns {Promise<any>} The created record.
   */
  async createOne(
    body: Record<string, any>,
    queryOptions: string = "{}"
  ): Promise<any> {
    if (kebabCase(this.modelName) === "user" && body.password) {
      body.password = await authService.hashPassword(body.password);
    }

    const prisma = getPrismaInstance();

    const bodyWithRelationFieldsHandled = handleRelationFieldsInBody(
      body,
      {
        ...this.relationFields,
      },
      ["delete", "disconnect", "update"]
    );

    return await prisma[this.modelName].create(
      deepmerge(
        {
          data: bodyWithRelationFieldsHandled,
          include: {
            ...this.singularRelationFieldToInclude,
            ...this.singularRelationFieldToInclude,
          },
        },
        JSON.parse(queryOptions || "{}")
      )
    );
  }

  /**
   * Creates multiple records in the database.
   *
   * @param {Record<string, any>[]} body - An array of data to create records with.
   * @returns {Promise<{ total: number; data: any }>} The result containing the total count and the created data.
   * @throws {AppError} Throws an error if the data array is invalid or empty.
   */
  async createMany(
    body: Record<string, any>[]
  ): Promise<{ total: number; data: any }> {
    const modelModules = getModelModules(kebabCase(this.modelName));
    if (modelModules.dtos.create && getInitConfigs()?.validation) {
      body = await validateDto(modelModules.dtos.create, body);
    }

    const prisma = getPrismaInstance();

    if (!Array.isArray(body) || body.length === 0) {
      throw new AppError(
        "Invalid or empty data array provided for creation.",
        400
      );
    }

    const data = await prisma[this.modelName].createMany({
      data: body,
    });

    const total = await prisma[this.modelName].count();
    return { total, data };
  }

  /**
   * Finds multiple records based on provided filters.
   *
   * @param {Record<string, any>} filters - The filters to apply to the query.
   * @returns {Promise<{ total: number; data: any }>} The result containing the total count and the found data.
   */
  async findMany(
    filters: Record<string, any>
  ): Promise<{ total: number; data: any }> {
    const modelModules = getModelModules(kebabCase(this.modelName));
    // if (modelModules.dtos.query && getInitConfigs()?.validation !== false) {
    //   filters = await validateDto(modelModules.dtos.query, filters);
    // }

    const prisma = getPrismaInstance();

    const data = await prisma[this.modelName].findMany(
      "select" in filters
        ? deepmerge(
            { ...filters },
            {
              select: this.singularRelationFieldToInclude,
            }
          )
        : deepmerge(
            { ...filters },
            {
              include: this.singularRelationFieldToInclude,
            }
          )
    );

    const total = await prisma[this.modelName].count({
      where: filters.where,
    });

    return { total, data };
  }

  /**
   * Finds a single record by its parameters.
   *
   * @param {Record<string, any>} filters - The parameters to find the record by.
   * @param {string} [queryOptions] - Additional query options to modify the Prisma query.
   * @returns {Promise<any>} The found record.
   * @throws {AppError} Throws an error if the record is not found.
   */
  async findOne(
    filters: Record<string, any>,
    // queryOptions: string = JSON.stringify(
    //   getModelModules(kebabCase(this.modelName)).prismaQueryOptions || {}
    // )
    queryOptions: string = "{}"
  ): Promise<any> {
    const modelModules = getModelModules(kebabCase(this.modelName));
    // if (modelModules.dtos.create && getInitConfigs()?.validation !== false) {
    //   filters = await validateDto(modelModules.dtos.create, filters);
    // }

    const prisma = getPrismaInstance();

    const data = await prisma[this.modelName].findUnique(
      deepmerge(
        {
          where: { ...filters, id: String(filters.id) },
          ...(JSON.parse(queryOptions || "{}").hasOwnProperty("select")
            ? {
                select: {
                  ...this.singularRelationFieldToInclude,
                  ...this.listRelationFieldToInclude,
                },
              }
            : {
                include: {
                  ...this.singularRelationFieldToInclude,
                  ...this.listRelationFieldToInclude,
                },
              }),
        },
        JSON.parse(queryOptions || "{}")
      )
    );

    if (!data) {
      throw new AppError(
        `${pascalCase(String(this.modelName))} with ID ${filters.id} not found`,
        404
      );
    }

    return data;
  }

  /**
   * Updates a single record by its ID.
   *
   * @param {Record<string, any>} filters - The parameters to find the record by.
   * @param {Record<string, any>} body - The data to update the record with.
   * @param {string} [queryOptions] - Additional query options to modify the Prisma query.
   * @returns {Promise<any>} The updated record.
   * @throws {AppError} Throws an error if the record is not found.
   */
  async updateOne(
    filters: Record<string, any>,
    body: Record<string, any>,
    // queryOptions: string = JSON.stringify(
    //   getModelModules(kebabCase(this.modelName)).prismaQueryOptions || {}
    // )
    queryOptions: string = "{}"
  ): Promise<any> {
    const modelModules = getModelModules(kebabCase(this.modelName));
    if (modelModules.dtos.update && getInitConfigs()?.validation) {
      body = await validateDto(modelModules.dtos.update, body);
    }

    const prisma = getPrismaInstance();

    if (kebabCase(this.modelName) === "user" && body.password) {
      body.password = await authService.hashPassword(body.password);
    }

    const bodyWithRelationFieldsHandled = handleRelationFieldsInBody(body, {
      ...this.relationFields,
    });

    const data = await prisma[this.modelName].update(
      deepmerge(
        {
          where: { ...filters, id: String(filters.id) },
          data: bodyWithRelationFieldsHandled,
          include: {
            ...this.singularRelationFieldToInclude,
            ...this.singularRelationFieldToInclude,
          },
        },
        JSON.parse(queryOptions || "{}")
      )
    );

    if (!data) {
      throw new AppError(
        `${pascalCase(String(this.modelName))} with ID ${filters.id} not found`,
        404
      );
    }

    return data;
  }

  /**
   * Updates multiple records based on the provided filter and data.
   *
   * @param {Record<string, any>} filters - The filters to identify records to update.
   * @param {Record<string, any>} body - The data to update the records with.
   * @returns {Promise<{ total: number; data: any }>} The result containing the total count and the updated data.
   * @throws {AppError} Throws an error if no records match the filters.
   */
  async updateMany(
    filters: Record<string, any>,
    body: Record<string, any>
  ): Promise<{ total: number; data: any }> {
    const modelModules = getModelModules(kebabCase(this.modelName));
    // if (modelModules.dtos.create && getInitConfigs()?.validation !== false) {
    //   body = await validateDto(modelModules.dtos.create, body);
    // }

    const prisma = getPrismaInstance();

    if (!filters || typeof filters !== "object") {
      throw new AppError("Invalid filters provided for udpate many.", 400);
    }

    const data = await prisma[this.modelName].updateMany({
      ...filters,
      data: body,
    });

    if (!data || data.count === 0) {
      throw new AppError(
        `${pluralize(pascalCase(String(this.modelName)))} not found`,
        404
      );
    }

    const total = await prisma[this.modelName].count();
    return { total, data };
  }

  /**
   * Deletes a single record by its ID.
   *
   * @param {Record<string, any>} params - The parameters to find the record by.
   * @returns {Promise<any>} The deleted record.
   */
  async deleteOne(params: Record<string, any>): Promise<any> {
    const modelModules = getModelModules(kebabCase(this.modelName));
    // if (modelModules.dtos.create && getInitConfigs()?.validation !== false) {
    //   body = await validateDto(modelModules.dtos.create, body);
    // }

    const prisma = getPrismaInstance();

    return await prisma[this.modelName].delete({
      where: {
        ...params,
        id: String(params.id),
      },
    });
  }

  /**
   * Deletes multiple records based on the provided filter.
   *
   * @param {Record<string, any>} filter - The filter to identify records to delete.
   * @returns {Promise<{ total: number; data: any }>} The result containing the total count and the deleted data.
   * @throws {AppError} Throws an error if no records match the filter.
   */
  async deleteMany(
    filters: Record<string, any>
  ): Promise<{ total: number; data: any }> {
    const modelModules = getModelModules(kebabCase(this.modelName));
    // if (modelModules.dtos.create && getInitConfigs()?.validation !== false) {
    //   body = await validateDto(modelModules.dtos.create, body);
    // }

    const prisma = getPrismaInstance();

    if (!filters || typeof filters !== "object") {
      throw new AppError("Invalid filters provided for deletion.", 400);
    }

    const data = await prisma[this.modelName].deleteMany(filters);

    if (!data || data.count === 0) {
      throw new AppError(`No records found to delete`, 404);
    }

    const total = await prisma[this.modelName].count();
    return { total, data };
  }
}

/**
 * Generates a set of base service instances for all available models.
 *
 * @returns {Record<string, BaseService>} A dictionary of base service instances, keyed by model name.
 */
export function getBaseServices(): Record<string, BaseService> {
  const models = getModels();
  const baseServices: Record<string, BaseService> = {};
  models.forEach((model) => {
    baseServices[`${camelCase(model)}`] = new BaseService(model);
  });
  return baseServices;
}
