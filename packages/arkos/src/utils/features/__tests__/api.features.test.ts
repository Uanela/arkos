import APIFeatures from "../api.features";
import AppError from "../../../modules/error-handler/utils/app-error";
import { getPrismaInstance } from "../../helpers/prisma.helpers";
import prismaSchemaParser from "../../prisma/prisma-schema-parser";
import { pascalCase } from "../change-case.features";

jest.mock("fs");
jest.mock("../../helpers/prisma.helpers");
jest.mock("../../helpers/deepmerge.helper", () => ({
  __esModule: true,
  default: (obj1: object, obj2: object, obj3?: object) => ({
    ...obj1,
    ...obj2,
    ...obj3,
  }),
}));
jest.mock("../../helpers/api.features.helpers", () => ({
  parseQueryParamsWithModifiers: jest.fn((query) => query),
}));
jest.mock("../../prisma/prisma-schema-parser", () => ({
  parse: jest.fn(),
  getModelsAsArrayOfStrings: jest.fn(() => []),
}));
jest.mock("../change-case.features", () => ({
  pascalCase: jest.fn((str) => str.toUpperCase()),
}));

describe("APIFeatures", () => {
  let req: any;
  let prismaInstanceMock: any;

  beforeEach(() => {
    jest.clearAllMocks();

    req = {
      query: {},
      params: {},
    } as any;

    prismaInstanceMock = {
      user: {
        findMany: jest.fn().mockResolvedValue([]),
        fields: {
          id: { typeName: "String", isList: false },
          name: { typeName: "String", isList: false },
          email: { typeName: "String", isList: false },
          password: { typeName: "String", isList: false },
          userId: { typeName: "String", isList: false },
          createdAt: { typeName: "DateTime", isList: false },
        },
      },
      post: {
        fields: {
          id: { typeName: "String", isList: false },
          title: { typeName: "String", isList: false },
          content: { typeName: "String", isList: false },
          authorId: { typeName: "String", isList: false },
        },
      },
    };
    (getPrismaInstance as jest.Mock).mockReturnValue(prismaInstanceMock);

    (prismaSchemaParser.models as any) = [
      {
        name: "user",
        fields: [
          { name: "id", type: "String" },
          { name: "name", type: "String" },
          { name: "email", type: "String" },
          { name: "password", type: "String" },
        ],
      },
      {
        name: "post",
        fields: [
          { name: "id", type: "String" },
          { name: "title", type: "String" },
          { name: "content", type: "String" },
        ],
      },
    ];

    (pascalCase as jest.Mock).mockImplementation((str) => str);
  });

  describe("filter", () => {
    test("should handle top-level OR operators correctly", () => {
      req.query = {
        name: "John",
        OR: [{ age: 30 }, { email: "test@test.com" }],
      };
      const apiFeatures = new APIFeatures(req, "user");

      apiFeatures.filter();

      expect(apiFeatures.filters.where).toEqual({
        OR: [{ name: "John" }, { age: 30 }, { email: "test@test.com" }],
      });
    });

    test("should handle top-level AND operators correctly", () => {
      req.query = {
        name: "John",
        AND: [{ age: 30 }, { email: "test@test.com" }],
      };
      const apiFeatures = new APIFeatures(req, "user");

      apiFeatures.filter();

      expect(apiFeatures.filters.where).toEqual({
        OR: [{ name: "John" }],
        AND: [{ age: 30 }, { email: "test@test.com" }],
      });
    });

    test("should handle mixed top-level operators with filterMode", () => {
      req.query = {
        name: "John",
        age: 30,
        OR: [{ email: "test@test.com" }],
        AND: [{ status: "active" }],
        filterMode: "AND",
      };
      const apiFeatures = new APIFeatures(req, "user");

      apiFeatures.filter();

      expect(apiFeatures.filters.where).toEqual({
        AND: [{ name: "John" }, { age: 30 }, { status: "active" }],
        OR: [{ email: "test@test.com" }],
      });
    });

    test("should filter based on query parameters", () => {
      req.query = { name: "John", age: 30 };
      const apiFeatures = new APIFeatures(req, "user");

      apiFeatures.filter();

      expect(apiFeatures.filters).toEqual({
        where: {
          OR: [{ name: "John" }, { age: 30 }],
        },
      });
    });

    test("should handle search parameter", () => {
      req.query = { search: "test" };
      const apiFeatures = new APIFeatures(req, "user");

      apiFeatures.filter();

      expect(apiFeatures.filters.where.OR).toEqual([
        { name: { contains: "test", mode: "insensitive" } },
        { email: { contains: "test", mode: "insensitive" } },
      ]);
    });

    test("should exclude specified fields from filtering", () => {
      req.query = { name: "John", page: 2, limit: 10, fields: "name,email" };
      const apiFeatures = new APIFeatures(req, "user");

      apiFeatures.filter();

      expect(apiFeatures.filters).toEqual({
        where: {
          OR: [{ name: "John" }],
        },
      });
    });

    test("should use filterMode parameter when provided", () => {
      req.query = { name: "John", age: 30, filterMode: "AND" };
      const apiFeatures = new APIFeatures(req, "user");

      apiFeatures.filter();

      expect(apiFeatures.filters).toEqual({
        where: {
          AND: [{ name: "John" }, { age: 30 }],
        },
      });
    });
  });

  describe("limitFields", () => {
    test("should handle regular fields selection", () => {
      req.query = { fields: "name,email" };
      const apiFeatures = new APIFeatures(req, "user");

      apiFeatures.limitFields();

      expect(apiFeatures.filters).toEqual({
        select: {
          name: true,
          email: true,
        },
        omit: {
          password: true,
        },
      });
    });

    test("should handle native include syntax", () => {
      req.query = { include: { posts: true } };
      const apiFeatures = new APIFeatures(req, "user");

      apiFeatures.limitFields();

      expect(apiFeatures.filters).toEqual({
        include: {
          posts: true,
        },
        omit: {
          password: true,
        },
      });
    });

    test("should handle native select syntax", () => {
      req.query = { select: { name: true, email: true } };
      const apiFeatures = new APIFeatures(req, "user");

      apiFeatures.limitFields();

      expect(apiFeatures.filters).toEqual({
        select: {
          name: true,
          email: true,
        },
        omit: {
          password: true,
        },
      });
    });

    test("should handle native omit syntax", () => {
      req.query = { omit: { password: true } };
      const apiFeatures = new APIFeatures(req, "user");

      apiFeatures.limitFields();

      expect(apiFeatures.filters).toEqual({
        omit: {
          password: true,
        },
      });
    });

    test("should merge legacy fields with native syntax", () => {
      req.query = {
        fields: "name,email",
        include: { posts: true },
        select: { createdAt: true },
      };
      const apiFeatures = new APIFeatures(req, "user");

      apiFeatures.limitFields();

      expect(apiFeatures.filters).toEqual({
        select: {
          name: true,
          email: true,
          createdAt: true,
          posts: true,
        },
        omit: {
          password: true,
        },
      });
    });

    // test("should throw error when trying to expose user password via select", () => {
    //   req.query = { select: { password: true } };
    //   const apiFeatures = new APIFeatures(req, "user");

    //   expect(() => apiFeatures.limitFields()).toThrow(AppError);
    //   expect(() => apiFeatures.limitFields()).toThrow(
    //     "User password exposure detected"
    //   );
    // });

    // test("should not throw error when passing user password to false via select", () => {
    //   req.query = { select: { password: false } };
    //   const apiFeatures = new APIFeatures(req, "user");

    //   expect(() => apiFeatures.limitFields()).not.toThrow(AppError);
    //   expect(() => apiFeatures.limitFields()).not.toThrow(
    //     "User password exposure detected"
    //   );
    // });

    // test("should throw error when trying to expose user password via include", () => {
    //   req.query = { include: { user: { select: { password: true } } } };
    //   const apiFeatures = new APIFeatures(req, "post");

    //   expect(() => apiFeatures.limitFields()).toThrow(AppError);
    //   expect(() => apiFeatures.limitFields()).toThrow(
    //     "User password exposure detected"
    //   );
    // });

    // test("should throw error when trying to disable password omission", () => {
    //   req.query = { omit: { password: false } };
    //   const apiFeatures = new APIFeatures(req, "user");

    //   expect(() => apiFeatures.limitFields()).toThrow(AppError);
    //   expect(() => apiFeatures.limitFields()).toThrow(
    //     "Cannot disable password omission protection"
    //   );
    // });

    test("should not protect password for non-user models", () => {
      req.query = { select: { password: true } };
      const apiFeatures = new APIFeatures(req, "post");

      apiFeatures.limitFields();

      expect(apiFeatures.filters.select).toEqual({
        password: true,
      });
    });

    // test("should handle nested user password exposure", () => {
    //   req.query = {
    //     include: {
    //       author: {
    //         include: {
    //           user: {
    //             select: { password: true },
    //           },
    //         },
    //       },
    //     },
    //   };
    //   const apiFeatures = new APIFeatures(req, "post");

    //   expect(() => apiFeatures.limitFields()).toThrow(AppError);
    //   expect(() => apiFeatures.limitFields()).toThrow(
    //     "User password exposure detected"
    //   );
    // });
  });

  describe("sort", () => {
    test("should add orderBy with ascending sort", () => {
      req.query = { sort: "name" };
      const apiFeatures = new APIFeatures(req, "user");

      apiFeatures.sort();

      expect(apiFeatures.filters).toEqual({
        orderBy: [{ name: "asc" }],
      });
    });

    test("should add orderBy with descending sort", () => {
      req.query = { sort: "-createdAt" };
      const apiFeatures = new APIFeatures(req, "user");

      apiFeatures.sort();

      expect(apiFeatures.filters).toEqual({
        orderBy: [{ createdAt: "desc" }],
      });
    });

    test("should handle multiple sort fields", () => {
      req.query = { sort: "name,-createdAt" };
      const apiFeatures = new APIFeatures(req, "user");

      apiFeatures.sort();

      expect(apiFeatures.filters).toEqual({
        orderBy: [{ name: "asc" }, { createdAt: "desc" }],
      });
    });
  });

  describe("paginate", () => {
    test("should add pagination with default values", () => {
      req.query = {};
      const apiFeatures = new APIFeatures(req, "user");

      apiFeatures.paginate();

      expect(apiFeatures.filters).toEqual({
        skip: 0,
        take: 30,
      });
    });

    test("should add pagination with custom values", () => {
      req.query = { page: "3", limit: "15" };
      const apiFeatures = new APIFeatures(req, "user");

      apiFeatures.paginate();

      expect(apiFeatures.filters).toEqual({
        skip: 30,
        take: 15,
      });
    });
  });

  describe("method chaining", () => {
    test("should support method chaining with new features", () => {
      req.query = {
        fields: "name,email",
        include: { posts: true },
        sort: "-createdAt",
        page: "2",
        limit: "10",
        email: "arkos@the-beast.com",
      };

      const apiFeatures = new APIFeatures(req, "user");
      const result = apiFeatures.filter().limitFields().sort().paginate();

      expect(result).toBe(apiFeatures);
      expect(apiFeatures.filters).toEqual({
        where: { OR: [{ email: "arkos@the-beast.com" }] },
        select: { name: true, email: true, posts: true },
        omit: { password: true },
        orderBy: [{ createdAt: "desc" }],
        skip: 10,
        take: 10,
      });
    });
  });

  describe("edge cases", () => {
    test("should merge include and select into a single selct even though with query merged from req.prismaQueryOptions", () => {
      req.prismaQueryOptions = {
        include: {
          posts: true,
          banners: true,
        },
      };
      req.query = {
        select: {
          id: true,
          name: true,
        },
      };
      const apiFeatures = new APIFeatures(req, "user");

      apiFeatures.filter().limitFields().sort().paginate();

      expect(apiFeatures.filters).toEqual({
        where: {},
        omit: { password: true },
        select: {
          id: true,
          name: true,
          posts: true,
          banners: true,
        },
        skip: 0,
        take: 30,
      });
    });

    test("should handle empty query", () => {
      req.query = {};
      const apiFeatures = new APIFeatures(req, "user");

      apiFeatures.filter().limitFields().sort().paginate();

      expect(apiFeatures.filters).toEqual({
        where: {},
        omit: { password: true },
        skip: 0,
        take: 30,
      });
    });

    test("should handle invalid filters JSON", () => {
      req.query = { filters: "invalid-json" };

      expect(() => new APIFeatures(req, "user")).toThrow(AppError);
      expect(() => new APIFeatures(req, "user")).toThrow(
        "Invalid req.query.filters JSON format"
      );
    });

    test("should handle missing model name for search", () => {
      req.query = { search: "test" };
      const apiFeatures = new APIFeatures(req);

      expect(() => apiFeatures.filter()).toThrow(
        "Model name is required for search functionality"
      );
    });

    test("should handle non-existent model for search", () => {
      req.query = { search: "test" };
      const apiFeatures = new APIFeatures(req, "nonexistent");

      expect(() => apiFeatures.filter()).toThrow(
        "Model 'nonexistent' not found or has no fields"
      );
    });
  });
});
