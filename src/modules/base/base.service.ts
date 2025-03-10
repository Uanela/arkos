import { camelCase, pascalCase } from "change-case-all";
import {
  getPrismaModelRelations,
  models,
  RelationFields,
} from "../../utils/helpers/models.helpers";
import deepmerge from "deepmerge";
// import { prisma } from "../../../../../src/utils/prisma";
import AppError from "../error-handler/utils/app-error";
import pluralize from "pluralize";
import { handleRelationFieldsInBody } from "./utils/base.helpers";
import { initConfigs } from "../../app";

const baseServices: Record<string, BaseService> = {};

export class BaseService {
  modelName: string;
  relationFields: RelationFields;
  singularRelationFieldToInclude: Record<string, boolean>;
  listRelationFieldToInclude: Record<string, boolean>;
  // private static instance: Singleton
  prisma: any;

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
    this.prisma = initConfigs.prisma;
  }

  async createOne(
    body: Record<string, any>,
    queryOptions?: string
  ): Promise<any> {
    const bodyWithRelationFieldsHandled = handleRelationFieldsInBody(
      body,
      {
        ...this.relationFields,
      },
      ["delete", "disconnect", "update"]
    );

    return await this.prisma[this.modelName].create(
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
  async createMany(
    body: Record<string, any>[]
  ): Promise<{ total: number; data: any }> {
    if (!Array.isArray(body) || body.length === 0) {
      throw new AppError(
        "Invalid or empty data array provided for creation.",
        400
      );
    }

    const data = await this.prisma[this.modelName].createMany({
      data: body,
    });

    const total = await this.prisma[this.modelName].count();
    return { total, data };
  }
  async findMany(
    filters: Record<string, any>
  ): Promise<{ total: number; data: any }> {
    const data = await this.prisma[this.modelName].findMany(
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

    const total = await this.prisma[this.modelName].count({
      where: filters.where,
    });

    return { total, data };
  }

  async findOne(
    params: Record<string, any>,
    queryOptions?: string
  ): Promise<any> {
    const data = await this.prisma[this.modelName].findUnique(
      deepmerge(
        {
          where: { ...params, id: String(params.id) },
          ...(JSON.parse(queryOptions || "{}").hasOwnProperty("select")
            ? {
                select: {
                  ...this.singularRelationFieldToInclude,
                  ...this.singularRelationFieldToInclude,
                },
              }
            : {
                include: {
                  ...this.singularRelationFieldToInclude,
                  ...this.singularRelationFieldToInclude,
                },
              }),
        },
        JSON.parse(queryOptions || "{}")
      )
    );

    if (!data) {
      throw new AppError(
        `${pascalCase(String(this.modelName))} with ID ${params.id} not found`,
        404
      );
    }

    return data;
  }

  async updateOne(
    params: Record<string, any>,
    body: Record<string, any>,
    queryOptions?: string
  ): Promise<any> {
    const bodyWithRelationFieldsHandled = handleRelationFieldsInBody(body, {
      ...this.relationFields,
    });

    const data = await this.prisma[this.modelName].update(
      deepmerge(
        {
          where: { ...params, id: String(params.id) },
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
        `${pascalCase(String(this.modelName))} with ID ${params.id} not found`,
        404
      );
    }

    return data;
  }

  async updateMany(
    filter: Record<string, any>,
    body: Record<string, any>
  ): Promise<{ total: number; data: any }> {
    if (!filter || typeof filter !== "object") {
      throw new AppError("Invalid filter provided for udpate many.", 400);
    }

    const data = await this.prisma[this.modelName].updateMany({
      ...filter,
      data: body,
    });

    if (!data || data.count === 0) {
      throw new AppError(
        `${pluralize(pascalCase(String(this.modelName)))} not found`,
        404
      );
    }

    const total = await this.prisma[this.modelName].count();
    return { total, data };
  }

  async deleteOne(params: Record<string, any>): Promise<any> {
    return await this.prisma[this.modelName].delete({
      where: {
        ...params,
        id: String(params.id),
      },
    });
  }

  async deleteMany(
    filter: Record<string, any>
  ): Promise<{ total: number; data: any }> {
    if (!filter || typeof filter !== "object") {
      throw new AppError("Invalid filter provided for deletion.", 400);
    }

    const data = await this.prisma[this.modelName].deleteMany(filter);

    if (!data || data.count === 0) {
      throw new AppError(`No records found to delete`, 404);
    }

    const total = await this.prisma[this.modelName].count();
    return { total, data };
  }
}

models.forEach((model) => {
  baseServices[`${camelCase(model)}`] = new BaseService(model);
});

export default baseServices;
