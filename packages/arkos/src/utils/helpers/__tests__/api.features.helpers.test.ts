import { parseQueryParamsWithModifiers } from "../api.features.helpers";

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
      expect(result).toEqual({ status: "active" });
    });

    it("Should not convert objects to string", () => {
      const query = {
        name: {
          contains: "test",
          mode: "insensitive",
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
        OR: [
          { status: { equals: "active" } },
          { status: { equals: "pending" } },
        ],
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
  });
});
