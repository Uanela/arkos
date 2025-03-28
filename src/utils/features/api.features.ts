import { Request } from "express";
import deepmerge from "../helpers/deepmerge.helper";
import { parseQueryParamsWithModifiers } from "../helpers/api.features.helpers";
import AppError from "../../modules/error-handler/utils/app-error";
import { getPrismaInstance } from "../helpers/prisma.helpers";

type ModelName = string;

export default class APIFeatures {
  req: Request;
  searchParams: any; // The query string parameters from the request
  searchParamsWithModifiers: any; // The query string parameters from the request
  filters: any = {};
  modelName: ModelName;
  relationFields: Record<string, boolean>;
  excludedFields = [
    "page",
    "sort",
    "limit",
    "fields",
    "addFields",
    "removeFields",
    "search",
    "include",
    "filterMode",
    "where",
    "prismaQueryOptions",
    "ignoredFields",
  ];

  constructor(
    req: Request,
    modelName: ModelName,
    relationFields?: Record<string, boolean>
  ) {
    this.req = req;
    this.modelName = modelName;
    this.searchParams = parseQueryParamsWithModifiers(req.query);
    this.filters = { ...this.filters };

    if (relationFields) this.filters.iclude = relationFields;
    this.relationFields = relationFields || {};
  }

  filter() {
    const searchableFields: Record<string, any>[] = [];

    const queryObj = { ...this.searchParams };

    this.excludedFields.forEach((el) => delete queryObj[el]);

    let queryStr = JSON.stringify(queryObj);
    queryStr = queryStr.replace(/\b(gte|gt|lte|lt)\b/g, (match) => `${match}`);

    const whereObj = { ...this.req.params, ...queryObj };
    const whereLogicalOperatorFilters = Object.keys(whereObj).map((key) => ({
      [key]: whereObj[key],
    }));

    let whereOptions =
      whereLogicalOperatorFilters.length > 0
        ? {
            [(this.req.query?.filterMode as string) ?? "OR"]:
              whereLogicalOperatorFilters,
          }
        : {};

    if (!!this.searchParams.search) {
      const prisma = getPrismaInstance();

      Object.keys((prisma as any)[this.modelName].fields).forEach((key) => {
        const field = ((prisma as any)[this.modelName].fields as any)[key];
        if (
          field.typeName === "String" &&
          key !== "id" &&
          !field.isList &&
          !field.name.includes("Id") &&
          !field.name.includes("ID")
        ) {
          searchableFields.push({
            [`${key}`]: {
              contains: this.searchParams.search,
              mode: "insensitive",
            },
          });
        }
      });

      whereOptions = deepmerge(whereOptions, {
        OR: searchableFields,
      });
    }

    const parsedQueryOptions =
      typeof this.req.query?.prismaQueryOptions === "string"
        ? JSON.parse(this.req.query?.prismaQueryOptions)
        : {};

    this.filters = deepmerge(
      {
        where: whereOptions,
      },
      parsedQueryOptions,
      this.filters
    );
    return this;
  }

  search() {
    if (this.searchParams?.search) {
      this.filters = deepmerge(this.filters, {
        where: {
          OR: [],
        },
      });
    }
  }

  sort() {
    if (this.searchParams.sort) {
      const sortBy = this.searchParams?.sort
        ?.split(",")
        ?.map((field: string) => ({
          [field.startsWith("-") ? field.substring(1) : field]:
            field.startsWith("-") ? "desc" : "asc",
        }));
      this.filters = deepmerge(this.filters, { orderBy: sortBy });
    }

    return this;
  }

  limitFields() {
    if (
      this.searchParams?.fields &&
      !this.searchParams?.addFields &&
      !this.searchParams?.removeFields
    ) {
      const fieldsToSelect = this.searchParams.fields
        .split(",")
        .filter(
          (field: string) => !field.startsWith("+") && !field.startsWith("-")
        );

      this.filters = {
        ...this.filters,
        select: fieldsToSelect.reduce((acc: any, field: string) => {
          acc[field] = true;
          return acc;
        }, {}),
      };
      this.filters.select = { ...this.filters.select, ...this.filters.include };
      delete this.filters.include;
    } else if (
      this.searchParams?.fields &&
      (this.searchParams?.addFields || this.searchParams?.removeFields)
    )
      throw new AppError(
        "Cannot use fields in the same query with addFields or removeFields.",
        400
      );

    if (this.searchParams?.addFields && !this.searchParams?.fields) {
      const fieldsToAdd = this.searchParams.addFields
        .split(",")
        .filter((field: string) => field.startsWith("+"));

      this.filters = {
        ...this.filters,
        select: {
          ...this.filters.include,
          ...fieldsToAdd.reduce((acc: any, field: string) => {
            acc[field.replace("+", "")] = true;
            return acc;
          }, {}),
        },
      };
    } else if (this.searchParams?.fields && this.searchParams?.addFields)
      throw new AppError(
        "Cannot use addFields in the same query with fields.",
        400
      );

    if (this.searchParams?.removeFields && !this.searchParams?.fields) {
      const fieldsToRemove = this.searchParams.removeFields
        .split(",")
        .filter((field: string) => field.startsWith("-"));

      this.filters = {
        ...this.filters,
        select: {
          ...this.filters.include,
          ...fieldsToRemove.reduce((acc: any, field: string) => {
            acc[field.replace("-", "")] = false;
            return acc;
          }, {}),
        },
      };
    } else if (this.searchParams?.removeFields && this.searchParams?.addFields)
      throw new AppError(
        "Cannot use removeFields in the same query with fields.",
        400
      );

    return this;
  }

  paginate() {
    const page = parseInt(this.searchParams.page, 10) || 1;
    const limit = parseInt(this.searchParams.limit, 10) || 30;
    const skip = (page - 1) * limit;

    this.filters = {
      ...this.filters,
      skip,
      take: limit,
    };
    return this;
  }

  async exec() {
    const prisma = getPrismaInstance();
    return await (prisma as any)[this.modelName].findMany(this.filters);
  }
}
