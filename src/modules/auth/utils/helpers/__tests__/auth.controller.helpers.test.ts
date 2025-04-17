import { getArkosConfig } from "../../../../../server";
import {
  determineUsernameField,
  toMs,
  createPrismaWhereClause,
  getNestedValue,
} from "../auth.controller.helpers";
import AppError from "../../../../error-handler/utils/app-error";

jest.mock("../../../../../server", () => ({
  getArkosConfig: jest.fn(),
  close: jest.fn(),
}));

jest.mock("fs", () => ({
  default: {
    ...jest.requireActual("fs"),
    readdirSync: jest.fn(() => ["test.prisma"]),
    statSync: jest.fn(() => ({
      isFile: jest.fn(),
    })),
    existsSync: jest.fn(() => false),
    mkdirSync: jest.fn(),
    unlink: jest.fn(),
    access: jest.fn(),
  },
}));

describe("auth controller helpers", () => {
  describe("determineUsernameField", () => {
    it("should use query parameter usernameField when provided", async () => {
      (getArkosConfig as any).mockReturnValueOnce({
        authentication: {
          login: {
            allowedUsernames: ["email"],
          },
        },
      });

      const testReq = {
        query: { usernameField: "email" },
      };

      expect(determineUsernameField(testReq as any)).toBe("email");
    });

    it("should use configuration value when query parameter is not provided", async () => {
      const testReq = { query: {} };

      (getArkosConfig as any).mockReturnValueOnce({
        authentication: {
          login: {
            allowedUsernames: ["phoneNumber"],
          },
        },
      });

      expect(determineUsernameField(testReq as any)).toBe("phoneNumber");
    });

    it("should determine the correct username field to be used when using nested", async () => {
      const testReq = {
        query: {
          usernameField: "profile.phoneNumber",
        },
      };

      (getArkosConfig as any).mockReturnValueOnce({
        authentication: {
          login: {
            allowedUsernames: ["profile.phoneNumber"],
          },
        },
      });

      expect(determineUsernameField(testReq as any)).toBe(
        "profile.phoneNumber"
      );
    });

    it('should default to "username" when neither query nor config specify a field', async () => {
      expect(determineUsernameField({ query: {} } as any)).toBe("username");
    });

    it("should throw an error when usernameField is provided but not a valid", async () => {
      (getArkosConfig as any).mockReturnValueOnce({
        authentication: {
          login: {
            allowedUsernames: ["email"],
          },
        },
      });

      const testReq = {
        query: { usernameField: ["email"] },
      };

      expect(() => determineUsernameField(testReq as any)).toThrow(AppError);
      expect(() => determineUsernameField(testReq as any)).toThrow(
        "Invalid usernameField parameter, it is not allowed!"
      );
    });
  });

  describe("toMs", () => {
    it("Should convert ms measure to ms", () => {
      expect(toMs("1000ms")).toBe(1000);
    });

    it("Should convert s measure to ms", () => {
      expect(toMs("2s")).toBe(2000);
    });

    it("Should convert m measure to ms", () => {
      expect(toMs("1.5m")).toBe(90000);
    });

    it("Should convert h measure to ms", () => {
      expect(toMs("2h")).toBe(7200000);
    });

    it("Should convert d measure to ms", () => {
      expect(toMs("1d")).toBe(86400000);
    });

    it("Should convert w measure to ms", () => {
      expect(toMs("1w")).toBe(604800000);
    });

    it("Should convert y measure to ms", () => {
      expect(toMs("0.5y")).toBe(15778800000);
    });

    it("Should accept number input (in seconds)", () => {
      expect(toMs(60)).toBe(60000);
    });

    it("Should throw on invalid unit", () => {
      expect(() => toMs("10z" as any)).toThrow("Invalid time format: 10z");
    });

    it("Should throw on invalid format", () => {
      expect(() => toMs("banana" as any)).toThrow(
        "Invalid time format: banana"
      );
    });
  });

  describe("createPrismaWhereClause", () => {
    it("should return empty object when path is empty", () => {
      expect(createPrismaWhereClause("", "value")).toEqual({});
    });

    it("should handle single field path", () => {
      expect(createPrismaWhereClause("username", "john")).toEqual({
        username: "john",
      });
    });

    it("should handle nested object path", () => {
      expect(createPrismaWhereClause("profile.nickname", "john")).toEqual({
        profile: {
          nickname: "john",
        },
      });
    });

    it("should handle deeply nested object path", () => {
      expect(
        createPrismaWhereClause("user.profile.settings.theme", "dark")
      ).toEqual({
        user: {
          profile: {
            settings: {
              theme: "dark",
            },
          },
        },
      });
    });

    it("should handle array queries with 'some' operator", () => {
      expect(
        createPrismaWhereClause("phones.some.number", "1234567890")
      ).toEqual({
        phones: {
          some: {
            number: "1234567890",
          },
        },
      });
    });

    it("should handle complex nested paths with 'some' operator", () => {
      expect(
        createPrismaWhereClause("user.contacts.some.address.city", "New York")
      ).toEqual({
        user: {
          contacts: {
            some: {
              address: {
                city: "New York",
              },
            },
          },
        },
      });
    });

    it("should handle multiple 'some' operators in the path", () => {
      expect(
        createPrismaWhereClause(
          "organizations.some.members.some.email",
          "test@example.com"
        )
      ).toEqual({
        organizations: {
          some: {
            members: {
              some: {
                email: "test@example.com",
              },
            },
          },
        },
      });
    });
  });

  describe("getNestedValue", () => {
    it("should return undefined when object is null or undefined", () => {
      expect(getNestedValue(null, "profile.name")).toBeUndefined();
      expect(getNestedValue(undefined, "profile.name")).toBeUndefined();
    });

    it("should return undefined when path is empty", () => {
      const obj = { name: "John" };
      expect(getNestedValue(obj, "")).toBeUndefined();
    });

    it("should get value directly from the object when the path matches the key", () => {
      const obj = { nickname: "John" };
      expect(getNestedValue(obj, "profile.nickname")).toBe("John");
    });

    it("should get value from deep path", () => {
      const obj = { theme: "dark" };
      expect(getNestedValue(obj, "user.profile.settings.theme")).toBe("dark");
    });

    it("should return undefined when property doesn't exist in object", () => {
      const obj = { nickname: "John" };
      expect(getNestedValue(obj, "profile.age")).toBeUndefined();
    });

    it("should skip 'some' in the path as it's a Prisma operator", () => {
      const obj = { email: "test@example.com" };
      expect(getNestedValue(obj, "contacts.some.email")).toBe(
        "test@example.com"
      );
    });

    it("should handle name property with array notation in path", () => {
      const obj = { name: "John" };
      expect(getNestedValue(obj, "users.0.name")).toBe("John");
    });
  });
});
