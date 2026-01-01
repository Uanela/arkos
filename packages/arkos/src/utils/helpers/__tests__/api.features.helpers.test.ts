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
      expect(result).toEqual({ status: "active", name: null });
    });

    it("should parse contains and icontains when using bracket notation", () => {
      const query = {
        ["name[contains]"]: "sheu",
        ["firstName[icontains]"]: "cacil",
      };
      const result = parseQueryParamsWithModifiers(query);
      expect(result).toEqual({
        name: { contains: "sheu", mode: "sensitive" },
        firstName: { contains: "cacil", mode: "insensitive" },
      });
    });

    it("should parse contains and icontains when using bracket notation", () => {
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

    it("should parse contains and icontains when using bracket notation", () => {
      const query = {
        ["name[contains]"]: "sheu",
        ["firstName[icontains]"]: "cacil",
      };
      const result = parseQueryParamsWithModifiers(query);
      expect(result).toEqual({
        name: { contains: "sheu", mode: "sensitive" },
        firstName: { contains: "cacil", mode: "insensitive" },
      });
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

    it("should parse deep nested bracket notation", () => {
      const query = {
        "company[name][icontains]": "tech",
      };
      const result = parseQueryParamsWithModifiers(query);
      expect(result).toEqual({
        company: {
          name: {
            contains: "tech",
            mode: "insensitive",
          },
        },
      });
    });

    it("should parse mixed bracket and double underscore notation", () => {
      const query = {
        "company__name[icontains]": "acme",
      };
      const result = parseQueryParamsWithModifiers(query);
      expect(result).toEqual({
        company: {
          name: {
            contains: "acme",
            mode: "insensitive",
          },
        },
      });
    });

    it("should parse complex mixed notation", () => {
      const query = {
        "company[branches]__location[city][icontains]": "york",
      };
      const result = parseQueryParamsWithModifiers(query);
      expect(result).toEqual({
        company: {
          branches: {
            location: {
              city: {
                contains: "york",
                mode: "insensitive",
              },
            },
          },
        },
      });
    });

    it("should handle orderBy with bracket notation", () => {
      const query = {
        "orderBy[createdAt]": "desc",
      };
      const result = parseQueryParamsWithModifiers(query);
      expect(result).toEqual({
        orderBy: {
          createdAt: "desc",
        },
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

    it("should handle or operator with bracket notation", () => {
      const query = {
        "status[or]": "active,pending",
      };
      const result = parseQueryParamsWithModifiers(query);
      expect(result).toEqual({
        OR: [
          { status: { equals: "active" } },
          { status: { equals: "pending" } },
        ],
      });
    });

    it("should handle or operator with double underscore", () => {
      const query = {
        status__or: "active,pending",
      };
      const result = parseQueryParamsWithModifiers(query);
      expect(result).toEqual({
        OR: [
          { status: { equals: "active" } },
          { status: { equals: "pending" } },
        ],
      });
    });

    it("should handle hasSome with bracket notation and array", () => {
      const query = {
        "departments[hasSome]": ["IT", "HR", "Finance"],
      };
      const result = parseQueryParamsWithModifiers(query);
      expect(result).toEqual({
        departments: {
          hasSome: ["IT", "HR", "Finance"],
        },
      });
    });

    it("should handle hasSome with bracket notation and comma-separated string", () => {
      const query = {
        "departments[hasSome]": "IT,HR,Finance",
      };
      const result = parseQueryParamsWithModifiers(query);
      expect(result).toEqual({
        departments: {
          hasSome: ["IT", "HR", "Finance"],
        },
      });
    });

    it("should handle in operator with bracket notation", () => {
      const query = {
        "id[in]": "1,2,3",
      };
      const result = parseQueryParamsWithModifiers(query);
      expect(result).toEqual({
        id: {
          in: ["1", "2", "3"],
        },
      });
    });

    it("should handle nested field with hasSome using mixed notation", () => {
      const query = {
        "user__roles[hasSome]": ["admin", "editor"],
      };
      const result = parseQueryParamsWithModifiers(query);
      expect(result).toEqual({
        user: {
          roles: {
            hasSome: ["admin", "editor"],
          },
        },
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
