import { parseQueryParamsWithModifiers } from "../api.features.helpers";
import prismaSchemaParser from "../../prisma/prisma-schema-parser";

jest.mock("../../prisma/prisma-schema-parser", () => {
  return {
    parse: jest.fn(),
    config: { datasourceProvider: "postgresql" },
  };
});

describe("parseQueryParamsWithModifiers", () => {
  describe("Basic functionality", () => {
    it("should handle simple field equality", () => {
      const query = { status: "active" };
      const result = parseQueryParamsWithModifiers(query);
      expect(result).toEqual({ status: "active" });
    });

    it("should ignore fields with null or undefined values", () => {
      const query = { status: "active", name: null, age: undefined };
      const result = parseQueryParamsWithModifiers(query);
      expect(result).toEqual({ status: "active", name: null });
    });

    it("should handle nested objects that Express already parsed", () => {
      const query = {
        name: {
          contains: "test",
          mode: "insensitive",
        },
      };
      const result = parseQueryParamsWithModifiers(query);
      expect(result).toEqual(query);
    });

    it("should handle deeply nested objects", () => {
      const query = {
        user: {
          profile: {
            name: {
              contains: "john",
              mode: "sensitive",
            },
          },
        },
      };
      const result = parseQueryParamsWithModifiers(query);
      expect(result).toEqual(query);
    });

    it("Should handle falsy values (false, null, undefined)", () => {
      const query = { createdAt__not: null };
      const result = parseQueryParamsWithModifiers(query);
      expect(result).toEqual({ createdAt: { not: null } });
    });

    it("should preserve arrays for hasSome operator", () => {
      const query = {
        deparments__hasSome: ["IT", "HR"],
      };
      const result = parseQueryParamsWithModifiers(query);
      expect(result).toEqual({
        deparments: {
          hasSome: ["IT", "HR"],
        },
      });
    });

    it("should preserve full array for hasSome with multiple values", () => {
      const query = {
        company__abbreviations__hasSome: ["SuperM7", "Su Loja"],
      };
      const result = parseQueryParamsWithModifiers(query);
      expect(result).toEqual({
        company: {
          abbreviations: {
            hasSome: ["SuperM7", "Su Loja"],
          },
        },
      });
    });

    it("should preserve arrays for in operator", () => {
      const query = {
        status__in: ["active", "pending", "completed"],
      };
      const result = parseQueryParamsWithModifiers(query);
      expect(result).toEqual({
        status: {
          in: ["active", "pending", "completed"],
        },
      });
    });

    it("should preserve arrays for hasEvery operator", () => {
      const query = {
        tags__hasEvery: ["important", "urgent"],
      };
      const result = parseQueryParamsWithModifiers(query);
      expect(result).toEqual({
        tags: {
          hasEvery: ["important", "urgent"],
        },
      });
    });

    it("should handle zero as valid value", () => {
      const query = {
        count: 0,
      };
      const result = parseQueryParamsWithModifiers(query);
      expect(result).toEqual({
        count: 0,
      });
    });

    it("should handle empty string as valid value", () => {
      const query = {
        description__equals: "",
      };
      const result = parseQueryParamsWithModifiers(query);
      expect(result).toEqual({
        description: {
          equals: "",
        },
      });
    });

    it("should handle false boolean value", () => {
      const query = {
        isActive: false,
      };
      const result = parseQueryParamsWithModifiers(query);
      expect(result).toEqual({
        isActive: false,
      });
    });

    it("should handle orderBy with double underscore", () => {
      const query = {
        orderBy__updatedAt: "asc",
      };
      const result = parseQueryParamsWithModifiers(query);
      expect(result).toEqual({
        orderBy: {
          updatedAt: "asc",
        },
      });
    });

    it("should handle or operator with double underscore", () => {
      const query = {
        status__or: "active,pending",
      };
      const result = parseQueryParamsWithModifiers(query);
      expect(result).toEqual({
        OR: [{ status: "active" }, { status: "pending" }],
      });
    });
  });

  describe("Comparison operators", () => {
    it("should handle equals operator", () => {
      const query = { name__equals: "john" };
      const result = parseQueryParamsWithModifiers(query);
      expect(result).toEqual({ name: { equals: "john" } });
    });

    it("should handle not equals operator", () => {
      const query = { name__not__equals: "john" };
      const result = parseQueryParamsWithModifiers(query);
      expect(result).toEqual({ name: { not: { equals: "john" } } });
    });

    it("should handle greater than operator", () => {
      const query = { age__gt: "25" };
      const result = parseQueryParamsWithModifiers(query);
      expect(result).toEqual({ age: { gt: 25 } });
    });

    it("should handle less than operator", () => {
      const query = { age__lt: "25" };
      const result = parseQueryParamsWithModifiers(query);
      expect(result).toEqual({ age: { lt: 25 } });
    });

    it("should handle greater than or equal operator", () => {
      const query = { age__gte: "25" };
      const result = parseQueryParamsWithModifiers(query);
      expect(result).toEqual({ age: { gte: 25 } });
    });

    it("should handle less than or equal operator", () => {
      const query = { age__lte: "25" };
      const result = parseQueryParamsWithModifiers(query);
      expect(result).toEqual({ age: { lte: 25 } });
    });
  });

  describe("Text search operators", () => {
    it("should handle case-sensitive contains", () => {
      const query = { name__contains: "john" };
      const result = parseQueryParamsWithModifiers(query);
      expect(result).toEqual({ name: { contains: "john", mode: "sensitive" } });
    });

    it("should handle case-insensitive contains", () => {
      const query = { name__icontains: "john" };
      const result = parseQueryParamsWithModifiers(query);
      expect(result).toEqual({
        name: { contains: "john", mode: "insensitive" },
      });
    });

    it("should omit mode for non-mongodb/postgresql providers with contains", () => {
      const originalProvider = prismaSchemaParser.config.datasourceProvider;
      prismaSchemaParser.config.datasourceProvider = "mysql";

      const query = { name__contains: "john" };
      const result = parseQueryParamsWithModifiers(query);
      expect(result).toEqual({ name: { contains: "john" } });

      prismaSchemaParser.config.datasourceProvider = originalProvider;
    });

    it("should omit mode for non-mongodb/postgresql providers with icontains", () => {
      const originalProvider = prismaSchemaParser.config.datasourceProvider;
      prismaSchemaParser.config.datasourceProvider = "sqlite";

      const query = { name__icontains: "john" };
      const result = parseQueryParamsWithModifiers(query);
      expect(result).toEqual({ name: { contains: "john" } });

      prismaSchemaParser.config.datasourceProvider = originalProvider;
    });

    it("should include mode for mongodb provider", () => {
      const originalProvider = prismaSchemaParser.config.datasourceProvider;
      prismaSchemaParser.config.datasourceProvider = "mongodb";

      const query = { name__icontains: "john" };
      const result = parseQueryParamsWithModifiers(query);
      expect(result).toEqual({
        name: { contains: "john", mode: "insensitive" },
      });

      prismaSchemaParser.config.datasourceProvider = originalProvider;
    });

    it("should include mode for postgresql provider", () => {
      const query = { name__contains: "test" };
      const result = parseQueryParamsWithModifiers(query);
      expect(result).toEqual({
        name: { contains: "test", mode: "sensitive" },
      });
    });
  });

  describe("Collection operators", () => {
    it("should handle in operator with comma-separated values", () => {
      const query = { status__in: "active,pending,completed" };
      const result = parseQueryParamsWithModifiers(query);
      expect(result).toEqual({
        status: { in: ["active", "pending", "completed"] },
      });
    });

    it("should handle notIn operator with comma-separated values", () => {
      const query = { status__notIn: "deleted,archived" };
      const result = parseQueryParamsWithModifiers(query);
      expect(result).toEqual({ status: { notIn: ["deleted", "archived"] } });
    });

    it("should handle or operator with comma-separated values", () => {
      const query = { status__or: "active,pending" };
      const result = parseQueryParamsWithModifiers(query);
      expect(result).toEqual({
        OR: [{ status: "active" }, { status: "pending" }],
      });
    });
  });

  describe("Null/Empty operators", () => {
    it("should handle isNull operator with true value", () => {
      const query = { description__isNull: "true" };
      const result = parseQueryParamsWithModifiers(query);
      expect(result).toEqual({ description: { equals: null } });
    });

    it("should handle isNull operator with false value", () => {
      const query = { description__isNull: "false" };
      const result = parseQueryParamsWithModifiers(query);
      expect(result).toEqual({ description: { equals: undefined } });
    });

    it("should handle isEmpty operator with true value", () => {
      const query = { description__isEmpty: "true" };
      const result = parseQueryParamsWithModifiers(query);
      expect(result).toEqual({ description: { equals: "" } });
    });

    it("should handle isEmpty operator with false value", () => {
      const query = { description__isEmpty: "false" };
      const result = parseQueryParamsWithModifiers(query);
      expect(result).toEqual({ description: { equals: undefined } });
    });
  });

  describe("Ordering", () => {
    it("should handle orderBy with ascending direction", () => {
      const query = { orderBy__createdAt: "asc" };
      const result = parseQueryParamsWithModifiers(query);
      expect(result).toEqual({ orderBy: { createdAt: "asc" } });
    });

    it("should handle orderBy with descending direction", () => {
      const query = { orderBy__createdAt: "desc" };
      const result = parseQueryParamsWithModifiers(query);
      expect(result).toEqual({ orderBy: { createdAt: "desc" } });
    });

    it("should handle multiple orderBy fields", () => {
      const query = { orderBy__createdAt: "desc", orderBy__name: "asc" };
      const result = parseQueryParamsWithModifiers(query);
      expect(result).toEqual({ orderBy: { createdAt: "desc", name: "asc" } });
    });
  });

  describe("Type conversion", () => {
    it("should convert date fields to Date objects", () => {
      const query = { createdAt__gt: "2024-01-01" };
      const result = parseQueryParamsWithModifiers(query);
      expect(result.createdAt.gt).toBeInstanceOf(Date);
      expect(
        result.createdAt.gt.toISOString().startsWith("2024-01-01")
      ).toBeTruthy();
    });

    it("should convert boolean fields to boolean values", () => {
      const query = { isActive: true, isDeleted: false };
      const result = parseQueryParamsWithModifiers(query);
      expect(result).toEqual({ isActive: true, isDeleted: false });
    });

    it("should convert numeric fields to numbers", () => {
      const query = { age: 25, price__gt: 100 };
      const result = parseQueryParamsWithModifiers(query);
      expect(result).toEqual({ age: 25, price: { gt: 100 } });
    });
  });

  describe("Custom field configuration", () => {
    it("should use custom field configuration for type conversion", () => {
      const query = {
        customDate: "2024-01-01",
        customFlag: "true",
        customNumber: "42",
      };
      const customConfig = {
        dateFields: ["customDate"],
        booleanFields: ["customFlag"],
        numericFields: ["customNumber"],
      };

      const result = parseQueryParamsWithModifiers(query, customConfig);

      expect(result.customDate).toBeInstanceOf(Date);
      expect(result.customFlag).toBe(true);
      expect(result.customNumber).toBe(42);
    });
  });

  describe("Complex queries", () => {
    it("should handle complex combined queries", () => {
      const query = {
        name__not__equals: "john",
        email__contains: "example.com",
        age__gt: "25",
        status__in: "active,pending",
        createdAt__gt: "2024-01-01",
        isActive: "true",
        orderBy__createdAt: "desc",
      };

      const result = parseQueryParamsWithModifiers(query);

      expect(result).toMatchObject({
        name: { not: { equals: "john" } },
        email: { contains: "example.com", mode: "sensitive" },
        age: { gt: 25 },
        status: { in: ["active", "pending"] },
        isActive: true,
        orderBy: { createdAt: "desc" },
      });

      expect(result.createdAt.gt).toBeInstanceOf(Date);
    });

    it("should handle array input values", () => {
      const query = { name__contains: ["john"] };
      const result = parseQueryParamsWithModifiers(query);
      expect(result).toEqual({ name: { contains: "john", mode: "sensitive" } });
    });

    it("should handle nested field and deepmerge", () => {
      const query = {
        user__roles__some__role__icontains: "Admin",
        user__roles__none__role__icontains: "Applicant",
        createdAt__gte: "2023-05-01T17:04:00.000Z",
        createdAt__lte: "2023-05-02T22:44:09.000Z",
      };
      const result = parseQueryParamsWithModifiers(query);
      expect(result).toEqual({
        user: {
          roles: {
            some: {
              role: {
                contains: "Admin",
                mode: "insensitive",
              },
            },
            none: {
              role: {
                contains: "Applicant",
                mode: "insensitive",
              },
            },
          },
        },
        createdAt: {
          gte: new Date("2023-05-01T17:04:00.000Z"),
          lte: new Date("2023-05-02T22:44:09.000Z"),
        },
      });
    });

    it("should handle mixed nested objects and double underscore syntax", () => {
      const query = {
        user: {
          email: {
            contains: "example",
          },
        },
        status__in: "active,pending",
        createdAt__gte: "2024-01-01",
      };
      const result = parseQueryParamsWithModifiers(query);
      expect(result).toEqual({
        user: {
          email: {
            contains: "example",
            mode: "sensitive",
          },
        },
        status: {
          in: ["active", "pending"],
        },
        createdAt: {
          gte: new Date("2024-01-01"),
        },
      });
    });

    it("should handle double underscore with nested object value", () => {
      const query = {
        profile__name: {
          contains: "john",
          mode: "insensitive",
        },
        status__in: "active,pending",
      };
      const result = parseQueryParamsWithModifiers(query);
      expect(result).toEqual({
        profile: {
          name: {
            contains: "john",
            mode: "insensitive",
          },
        },
        status: {
          in: ["active", "pending"],
        },
      });
    });

    it("should handle nested object with double underscore inside", () => {
      const query = {
        user: {
          profile__name__icontains: "test",
        },
        age__gt: "25",
      };
      const result = parseQueryParamsWithModifiers(query);
      expect(result).toEqual({
        user: {
          profile: {
            name: {
              contains: "test",
              mode: "insensitive",
            },
          },
        },
        age: {
          gt: 25,
        },
      });
    });

    it("should handle deeply mixed syntax throughout query", () => {
      const query = {
        company__name: {
          contains: "tech",
        },
        user: {
          roles__some__name__icontains: "admin",
        },
        status__or: "active,pending",
        createdAt__gte: "2024-01-01",
      };
      const result = parseQueryParamsWithModifiers(query);
      expect(result).toEqual({
        company: {
          name: {
            contains: "tech",
            mode: "sensitive",
          },
        },
        user: {
          roles: {
            some: {
              name: {
                contains: "admin",
                mode: "insensitive",
              },
            },
          },
        },
        OR: [{ status: "active" }, { status: "pending" }],
        createdAt: {
          gte: new Date("2024-01-01"),
        },
      });
    });
  });
});
