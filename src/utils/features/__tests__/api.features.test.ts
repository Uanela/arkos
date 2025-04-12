import APIFeatures from "../api.features";
import AppError from "../../../modules/error-handler/utils/app-error";
import { getPrismaInstance } from "../../helpers/prisma.helpers";

// Mock dependencies
jest.mock("../../helpers/prisma.helpers");
jest.mock("../../helpers/deepmerge.helper", () => ({
  __esModule: true,
  default: (obj1: object, obj2: object, obj3: object) => ({
    ...obj1,
    ...obj2,
    ...obj3,
  }),
}));
jest.mock("../../helpers/api.features.helpers", () => ({
  parseQueryParamsWithModifiers: jest.fn((query) => query),
}));

describe("APIFeatures", () => {
  let req: any;
  let prismaInstanceMock: any;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Setup request mock
    req = {
      query: {},
      params: {},
    } as any;

    // Setup Prisma mock
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
    };
    (getPrismaInstance as jest.Mock).mockReturnValue(prismaInstanceMock);
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
      });
    });

    test("should handle fields with + prefix for inclusion", () => {
      req.query = { fields: "+name,+email" };
      const apiFeatures = new APIFeatures(req, "user");

      apiFeatures.limitFields();

      expect(apiFeatures.filters).toEqual({
        select: {
          name: true,
          email: true,
        },
      });
    });

    test("should handle fields with - prefix for exclusion", () => {
      req.query = { fields: "-password,-createdAt" };
      const apiFeatures = new APIFeatures(req, "user");

      apiFeatures.limitFields();

      expect(apiFeatures.filters).toEqual({
        select: {
          password: false,
          createdAt: false,
        },
      });
    });

    test("should handle mixed regular, + and - prefixed fields", () => {
      req.query = { fields: "name,email,-password,+createdAt" };
      const apiFeatures = new APIFeatures(req, "user");

      apiFeatures.limitFields();

      expect(apiFeatures.filters).toEqual({
        select: {
          name: true,
          email: true,
        },
      });
    });

    test("should use regular fields as base selection when present", () => {
      req.query = { fields: "id,name,+email,-password" };
      const apiFeatures = new APIFeatures(req, "user");

      apiFeatures.limitFields();

      expect(apiFeatures.filters).toEqual({
        select: {
          id: true,
          name: true,
        },
      });
    });

    test("should merge selection with relationFields when present", () => {
      req.query = { fields: "name,email" };
      const relationFields = { posts: true };
      const apiFeatures = new APIFeatures(req, "user", relationFields);
      apiFeatures.filters.include = relationFields;

      apiFeatures.limitFields();

      expect(apiFeatures.filters.select).toEqual({
        name: true,
        email: true,
      });
      expect(apiFeatures.filters.include).toBeUndefined();
    });

    test("should throw error if deprecated addFields is used", () => {
      req.query = { addFields: "+name" };
      const apiFeatures = new APIFeatures(req, "user");

      expect(() => {
        apiFeatures.limitFields();
      }).toThrow(AppError);
      expect(() => {
        apiFeatures.limitFields();
      }).toThrow("The addFields and removeFields parameters are deprecated");
    });

    test("should throw error if deprecated removeFields is used", () => {
      req.query = { removeFields: "-password" };
      const apiFeatures = new APIFeatures(req, "user");

      expect(() => {
        apiFeatures.limitFields();
      }).toThrow(AppError);
      expect(() => {
        apiFeatures.limitFields();
      }).toThrow("The addFields and removeFields parameters are deprecated");
    });
  });

  describe("filter", () => {
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

  describe("exec", () => {
    test("should call prisma findMany with filters", async () => {
      const apiFeatures = new APIFeatures(req, "user");
      apiFeatures.filters = { where: { name: "John" } };

      await apiFeatures.exec();

      expect(prismaInstanceMock.user.findMany).toHaveBeenCalledWith({
        where: { name: "John" },
      });
    });
  });

  describe("method chaining", () => {
    test("should support method chaining", () => {
      req.query = {
        fields: "name,email",
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
        select: { name: true, email: true },
        orderBy: [{ createdAt: "desc" }],
        skip: 10,
        take: 10,
      });
    });
  });
});
