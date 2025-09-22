import { Request } from "express";
import deepmerge from "../helpers/deepmerge.helper";
import { parseQueryParamsWithModifiers } from "../helpers/api.features.helpers";
import AppError from "../../modules/error-handler/utils/app-error";
import { getPrismaInstance } from "../helpers/prisma.helpers";
import { ArkosRequest } from "../../types";
import debuggerService from "../../modules/debugger/debugger.service";

type ModelName = string;

export default class APIFeatures {
  req?: ArkosRequest;
  searchParams: any;
  searchParamsWithModifiers: any;
  filters: Record<string, any> = {};
  reqFiltersSearchParam: any = {};
  modelName?: ModelName;
  excludedFields = [
    "page",
    "filters",
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
    "select",
    "omit",
  ];

  constructor(req?: Request, modelName?: ModelName) {
    if (req) {
      const { filters = "{}", ...restOfQuery } = req.query;
      this.req = req;

      let parsedFilters = {};
      try {
        parsedFilters = JSON.parse(filters as string);
      } catch (error) {
        throw new AppError("Invalid req.query.filters JSON format", 400);
      }

      this.searchParams = deepmerge(
        parseQueryParamsWithModifiers(restOfQuery),
        parseQueryParamsWithModifiers(parsedFilters)
      );

      debuggerService.handleTransformedQueryLog(this.searchParams);
    }

    if (modelName) this.modelName = modelName;
    this.filters = { ...this.filters };
  }

  filter() {
    if (!this.req)
      throw new Error(
        "Trying to use APIFeatures.filter() without passing request on class constructor or APIFeatures.setup() method."
      );

    const searchableFields: Record<string, any>[] = [];
    const queryObj = { ...this.searchParams };

    this.excludedFields.forEach((el) => delete queryObj[el]);

    const topLevelOR = queryObj.OR;
    const topLevelAND = queryObj.AND;
    delete queryObj.OR;
    delete queryObj.AND;

    const whereObj = { ...this.req.params, ...queryObj };
    const whereLogicalOperatorFilters = Object.keys(whereObj).map((key) => ({
      [key]: whereObj[key],
    }));

    let whereOptions: any = {};

    if (whereLogicalOperatorFilters.length > 0) {
      whereOptions = {
        [(this.req.query?.filterMode as string) ?? "OR"]:
          whereLogicalOperatorFilters,
      };
    }

    if (topLevelOR) {
      if (whereOptions.OR) {
        whereOptions.OR = [...whereOptions.OR, ...topLevelOR];
      } else {
        whereOptions.OR = topLevelOR;
      }
    }

    if (topLevelAND) {
      if (whereOptions.AND) {
        whereOptions.AND = [...whereOptions.AND, ...topLevelAND];
      } else {
        whereOptions.AND = topLevelAND;
      }
    }

    if (!!this.searchParams.search) {
      const prisma = getPrismaInstance();

      if (!this.modelName)
        throw new Error("Model name is required for search functionality");

      if (!prisma[this.modelName] || !prisma[this.modelName].fields)
        throw new Error(`Model '${this.modelName}' not found or has no fields`);

      Object.keys((prisma as any)[this.modelName].fields).forEach((key) => {
        const field = ((prisma as any)[this.modelName!].fields as any)[key];
        if (
          field?.typeName === "String" &&
          key !== "id" &&
          key !== "password" &&
          !field.isList &&
          !key?.includes?.("Id") &&
          !key?.includes?.("ID")
        ) {
          searchableFields.push({
            [`${key}`]: {
              contains: this.searchParams.search,
              mode: "insensitive",
            },
          });
        }
      });

      if (searchableFields.length > 0) {
        whereOptions = deepmerge(
          {
            OR: searchableFields,
          },
          whereOptions
        );
      }
    }

    const firstMerge = deepmerge(
      {
        where: whereOptions,
      },
      this.req.prismaQueryOptions || {}
    );

    this.filters = deepmerge(firstMerge, this.filters);
    this.searchParams = deepmerge(
      this.searchParams || {},
      this.req.prismaQueryOptions || {}
    );

    return this;
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
    let finalSelect: Record<string, any> = {};
    let finalInclude: Record<string, any> = {};
    let finalOmit: Record<string, any> = {};

    if (this.searchParams?.fields) {
      const fields = this.searchParams.fields.split(",");

      const regularFields = fields.filter(
        (field: string) => !field.startsWith("+") && !field.startsWith("-")
      );
      const includeFields = fields
        .filter((field: string) => field.startsWith("+"))
        .map((field: string) => field.substring(1));
      const excludeFields = fields
        .filter((field: string) => field.startsWith("-"))
        .map((field: string) => field.substring(1));

      if (regularFields.length > 0) {
        finalSelect = regularFields.reduce(
          (acc: Record<string, any>, field: string) => {
            acc[field] = true;
            return acc;
          },
          {} as Record<string, any>
        );
      }

      includeFields.forEach((field: string) => {
        finalInclude[field] = true;
      });

      excludeFields.forEach((field: string) => {
        finalOmit[field] = true;
      });
    }

    if (this.searchParams.include || this.filters.include)
      finalInclude = deepmerge(
        finalInclude,
        deepmerge(this.filters?.include || {}, this.searchParams?.include || {})
      );

    if (this.searchParams.select || this.filters.include)
      finalSelect = deepmerge(
        finalSelect,
        deepmerge(this.filters?.select || {}, this.searchParams?.select || {})
      );

    if (this.searchParams.omit || this.filters.omit)
      finalOmit = deepmerge(
        finalOmit,
        deepmerge(this.filters?.omit || {}, this.searchParams?.omit || {})
      );

    if (
      Object.keys(finalSelect).length > 0 &&
      Object.keys(finalInclude).length > 0
    ) {
      finalSelect = deepmerge(finalSelect, finalInclude);
      finalInclude = {};
      delete this.filters.include;
      delete this.searchParams.include;
    }

    this._validateNoPasswordExposure(finalSelect, finalInclude, finalOmit);

    // ALWAYS protect password field in finalOmit
    if (finalOmit.password === false)
      throw new AppError("Cannot disable password omission protection", 400);

    if (this.modelName?.toLowerCase?.() === "user") finalOmit.password = true;

    if (Object.keys(finalSelect).length > 0) this.filters.select = finalSelect;

    if (Object.keys(finalInclude).length > 0)
      this.filters.include = finalInclude;

    if (Object.keys(finalOmit).length > 0) this.filters.omit = finalOmit;

    if (this.searchParams?.addFields || this.searchParams?.removeFields) {
      throw new AppError(
        "The addFields and removeFields parameters are deprecated.",
        400
      );
    }

    return this;
  }

  private _validateNoPasswordExposure(
    select: Record<string, any>,
    include: Record<string, any>,
    omit: Record<string, any>
  ) {
    const checkForPassword = (
      obj: Record<string, any>,
      path: string[] = []
    ) => {
      for (const [key, value] of Object.entries(obj)) {
        const currentPath = [...path, key];

        if (
          key === "password" &&
          (this.modelName?.toLowerCase() === "user" ||
            currentPath.at(-3)?.toLowerCase?.() === "user")
        ) {
          if (value === false)
            throw new AppError(
              "Cannot disable password omission protection",
              400,
              { ...obj },
              "CannotExposeUserPassword"
            );

          if (value === true && !omit?.["password"])
            throw new AppError(
              "User password exposure detected",
              403,
              {},
              "UserPasswordExposureDetected"
            );
        }

        if (
          typeof value === "object" &&
          value !== null &&
          !Array.isArray(value)
        ) {
          checkForPassword(value, currentPath);
        }
      }
    };

    checkForPassword(select);
    checkForPassword(include);
    checkForPassword(omit);
  }

  paginate(): APIFeatures {
    const paginationOptions = (() => {
      if (this.searchParams.limit === "all") return {};

      const page = parseInt(this.searchParams.page, 10) || 1;
      const limit = parseInt(this.searchParams.limit, 10) || 30;
      const skip = (page - 1) * limit;

      return { skip, take: limit };
    })();

    this.filters = {
      ...this.filters,
      ...paginationOptions,
    };
    return this;
  }
}
