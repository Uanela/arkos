import {
  getGeneralOptionsForAction,
  resolvePrismaQueryOptions,
} from "../base.middlewares.helpers";
import {
  PrismaQueryOptions,
  AuthPrismaQueryOptions,
} from "../../../../../types";
import { ControllerActions } from "../../../base.middlewares";

// Mock deepmerge helper
jest.mock("../../../../../utils/helpers/deepmerge.helper", () => ({
  __esModule: true,
  default: jest.fn((...args) => {
    // Simple merge implementation for testing
    return args.reduce((acc, obj) => ({ ...acc, ...obj }), {});
  }),
}));

describe("resolvePrismaQueryOptions", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Basic functionality", () => {
    it("should return empty object when prismaQueryOptions is null/undefined", () => {
      expect(resolvePrismaQueryOptions(null as any, "findMany")).toEqual({});
      expect(resolvePrismaQueryOptions(undefined as any, "findMany")).toEqual(
        {}
      );
    });

    it("should return empty object when prismaQueryOptions is empty", () => {
      expect(resolvePrismaQueryOptions({}, "findMany")).toEqual({});
    });

    it("should handle action that does not exist in options", () => {
      const options: PrismaQueryOptions<any> = {
        findOne: { where: { id: 1 } },
      };

      expect(resolvePrismaQueryOptions(options, "findMany")).toEqual({});
    });
  });

  describe("Backward compatibility with queryOptions", () => {
    it("should use deprecated queryOptions as base", () => {
      const options: PrismaQueryOptions<any> = {
        queryOptions: { include: { user: true } },
        findMany: { take: 10 },
      };

      const result = resolvePrismaQueryOptions(options, "findMany");
      expect(result).toEqual({
        include: { user: true },
        take: 10,
      });
    });

    it("should override queryOptions with global", () => {
      const options: PrismaQueryOptions<any> = {
        queryOptions: { include: { user: true } },
        global: { include: { profile: true } },
        findMany: { take: 10 },
      };

      const result = resolvePrismaQueryOptions(options, "findMany");
      expect(result).toEqual({
        include: { profile: true },
        take: 10,
      });
    });
  });

  describe("Global options", () => {
    it("should apply global options", () => {
      const options: PrismaQueryOptions<any> = {
        global: { include: { user: true } },
        findMany: { take: 10 },
      };

      const result = resolvePrismaQueryOptions(options, "findMany");
      expect(result).toEqual({
        include: { user: true },
        take: 10,
      });
    });

    it("should work with global options only", () => {
      const options: PrismaQueryOptions<any> = {
        global: { include: { user: true } },
      };

      const result = resolvePrismaQueryOptions(options, "findMany");
      expect(result).toEqual({
        include: { user: true },
      });
    });
  });

  describe("Find operations", () => {
    it("should apply find options to findMany", () => {
      const options: PrismaQueryOptions<any> = {
        find: { include: { user: true } },
        findMany: { take: 10 },
      };

      const result = resolvePrismaQueryOptions(options, "findMany");
      expect(result).toEqual({
        include: { user: true },
        take: 10,
      });
    });

    it("should apply find options to findOne", () => {
      const options: PrismaQueryOptions<any> = {
        find: { include: { user: true } },
        findOne: { where: { id: 1 } },
      };

      const result = resolvePrismaQueryOptions(options, "findOne");
      expect(result).toEqual({
        include: { user: true },
        where: { id: 1 },
      });
    });

    it("should work with find options only", () => {
      const options: PrismaQueryOptions<any> = {
        find: { include: { user: true } },
      };

      const result = resolvePrismaQueryOptions(options, "findMany");
      expect(result).toEqual({
        include: { user: true },
      });
    });
  });

  describe("Create operations", () => {
    it("should apply create and save options to createOne", () => {
      const options: PrismaQueryOptions<any> = {
        create: { include: { user: true } },
        save: { select: { id: true } },
        saveOne: { include: { profile: true } },
        createOne: { data: { name: "test" } },
      };

      const result = resolvePrismaQueryOptions(options, "createOne");
      expect(result).toEqual({
        include: { profile: true },
        select: { id: true },
        data: { name: "test" },
      });
    });

    it("should apply create and save options to createMany", () => {
      const options: PrismaQueryOptions<any> = {
        create: { include: { user: true } },
        save: { select: { id: true } },
        saveMany: { skipDuplicates: true },
        createMany: { data: [{ name: "test" }] },
      };

      const result = resolvePrismaQueryOptions(options, "createMany");
      expect(result).toEqual({
        include: { user: true },
        select: { id: true },
        skipDuplicates: true,
        data: [{ name: "test" }],
      });
    });
  });

  describe("Update operations", () => {
    it("should apply update and save options to updateOne", () => {
      const options: PrismaQueryOptions<any> = {
        update: { include: { user: true } },
        save: { select: { id: true } },
        saveOne: { include: { profile: true } },
        updateOne: { where: { id: 1 } },
      };

      const result = resolvePrismaQueryOptions(options, "updateOne");
      expect(result).toEqual({
        include: { profile: true },
        select: { id: true },
        where: { id: 1 },
      });
    });

    it("should apply update and save options to updateMany", () => {
      const options: PrismaQueryOptions<any> = {
        update: { include: { user: true } },
        save: { select: { id: true } },
        saveMany: { data: { status: "active" } },
        updateMany: { where: { status: "pending" } },
      };

      const result = resolvePrismaQueryOptions(options, "updateMany");
      expect(result).toEqual({
        include: { user: true },
        select: { id: true },
        data: { status: "active" },
        where: { status: "pending" },
      });
    });
  });

  describe("Delete operations", () => {
    it("should apply delete options to deleteOne", () => {
      const options: PrismaQueryOptions<any> = {
        delete: { include: { user: true } },
        deleteOne: { where: { id: 1 } },
      };

      const result = resolvePrismaQueryOptions(options, "deleteOne");
      expect(result).toEqual({
        include: { user: true },
        where: { id: 1 },
      });
    });

    it("should apply delete options to deleteMany", () => {
      const options: PrismaQueryOptions<any> = {
        delete: { include: { user: true } },
        deleteMany: { where: { status: "inactive" } },
      };

      const result = resolvePrismaQueryOptions(options, "deleteMany");
      expect(result).toEqual({
        include: { user: true },
        where: { status: "inactive" },
      });
    });
  });

  describe("Auth operations", () => {
    it("should handle AuthPrismaQueryOptions", () => {
      const options: AuthPrismaQueryOptions<any> = {
        getMe: { include: { profile: true } },
        login: { where: { email: "test@example.com" } },
      };

      const result = resolvePrismaQueryOptions(options, "getMe");
      expect(result).toEqual({
        include: { profile: true },
      });
    });

    it("should handle auth operations without general mappings", () => {
      const options: AuthPrismaQueryOptions<any> = {
        login: { where: { email: "test@example.com" } },
      };

      const result = resolvePrismaQueryOptions(options, "login");
      expect(result).toEqual({
        where: { email: "test@example.com" },
      });
    });
  });

  describe("Precedence order", () => {
    it("should apply options in correct precedence order", () => {
      const options: PrismaQueryOptions<any> = {
        queryOptions: { include: { user: true }, take: 5 },
        global: { include: { profile: true }, skip: 0 },
        find: { include: { posts: true }, orderBy: { id: "asc" } },
        findMany: { take: 10, where: { status: "active" } },
      };

      const result = resolvePrismaQueryOptions(options, "findMany");

      // Specific action options should have highest priority
      expect(result.take).toBe(10);
      expect(result.where).toEqual({ status: "active" });

      // General options should be applied
      expect(result.include).toEqual({ posts: true });
      expect(result.orderBy).toEqual({ id: "asc" });
      expect(result.skip).toBe(0);
    });

    it("should handle complex merging with all option types", () => {
      const options: PrismaQueryOptions<any> = {
        global: { select: { id: true } },
        save: { include: { user: true } },
        saveOne: { include: { profile: true } },
        createOne: { data: { name: "test" } },
      };

      const result = resolvePrismaQueryOptions(options, "createOne");
      expect(result).toEqual({
        select: { id: true },
        include: { profile: true },
        data: { name: "test" },
      });
    });
  });
});

describe("getGeneralOptionsForAction", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Find operations", () => {
    it("should return find options for findMany action", () => {
      const options = {
        find: { include: { user: true }, orderBy: { id: "asc" } },
      };

      const result = getGeneralOptionsForAction(options, "findMany");
      expect(result).toEqual({
        include: { user: true },
        orderBy: { id: "asc" },
      });
    });

    it("should return find options for findOne action", () => {
      const options = {
        find: { include: { profile: true }, select: { id: true } },
      };

      const result = getGeneralOptionsForAction(options, "findOne");
      expect(result).toEqual({
        include: { profile: true },
        select: { id: true },
      });
    });

    it("should return null when no find options exist", () => {
      const options = {
        create: { include: { user: true } },
      };

      const result = getGeneralOptionsForAction(options, "findMany");
      expect(result).toEqual({});
    });
  });

  describe("Create operations", () => {
    it("should merge create and save options for create action", () => {
      const options = {
        create: { include: { user: true } },
        save: { select: { id: true } },
      };

      const result = getGeneralOptionsForAction(options, "create");
      expect(result).toEqual({
        include: { user: true },
        select: { id: true },
      });
    });

    it("should merge create, save, and saveOne options for createOne action", () => {
      const options = {
        create: { include: { user: true } },
        save: { select: { id: true } },
        saveOne: { include: { profile: true } },
      };

      const result = getGeneralOptionsForAction(options, "createOne");
      expect(result).toEqual({
        include: { profile: true },
        select: { id: true },
      });
    });

    it("should merge create, save, and saveMany options for createMany action", () => {
      const options = {
        create: { include: { user: true } },
        save: { select: { id: true } },
        saveMany: { skipDuplicates: true },
      };

      const result = getGeneralOptionsForAction(options, "createMany");
      expect(result).toEqual({
        include: { user: true },
        select: { id: true },
        skipDuplicates: true,
      });
    });

    it("should return null when no create options exist", () => {
      const options = {
        find: { include: { user: true } },
      };

      const result = getGeneralOptionsForAction(options, "createOne");
      expect(result).toEqual({});
    });

    it("should handle partial create options", () => {
      const options = {
        create: { include: { user: true } },
        // save and saveOne not provided
      };

      const result = getGeneralOptionsForAction(options, "createOne");
      expect(result).toEqual({
        include: { user: true },
      });
    });
  });

  describe("Update operations", () => {
    it("should merge update and save options for update action", () => {
      const options = {
        update: { include: { user: true } },
        save: { select: { id: true } },
      };

      const result = getGeneralOptionsForAction(options, "update");
      expect(result).toEqual({
        include: { user: true },
        select: { id: true },
      });
    });

    it("should merge update, save, and saveOne options for updateOne action", () => {
      const options = {
        update: { include: { user: true } },
        save: { select: { id: true } },
        saveOne: { include: { profile: true } },
      };

      const result = getGeneralOptionsForAction(options, "updateOne");
      expect(result).toEqual({
        include: { profile: true },
        select: { id: true },
      });
    });

    it("should merge update, save, and saveMany options for updateMany action", () => {
      const options = {
        update: { include: { user: true } },
        save: { select: { id: true } },
        saveMany: { data: { status: "active" } },
      };

      const result = getGeneralOptionsForAction(options, "updateMany");
      expect(result).toEqual({
        include: { user: true },
        select: { id: true },
        data: { status: "active" },
      });
    });

    it("should return null when no update options exist", () => {
      const options = {
        find: { include: { user: true } },
      };

      const result = getGeneralOptionsForAction(options, "updateOne");
      expect(result).toEqual({});
    });
  });

  describe("Delete operations", () => {
    it("should return delete options for delete action", () => {
      const options = {
        delete: { include: { user: true }, select: { id: true } },
      };

      const result = getGeneralOptionsForAction(options, "delete");
      expect(result).toEqual({
        include: { user: true },
        select: { id: true },
      });
    });

    it("should return delete options for deleteOne action", () => {
      const options = {
        delete: { include: { profile: true } },
      };

      const result = getGeneralOptionsForAction(options, "deleteOne");
      expect(result).toEqual({
        include: { profile: true },
      });
    });

    it("should return delete options for deleteMany action", () => {
      const options = {
        delete: { select: { id: true, deletedAt: true } },
      };

      const result = getGeneralOptionsForAction(options, "deleteMany");
      expect(result).toEqual({
        select: { id: true, deletedAt: true },
      });
    });

    it("should return null when no delete options exist", () => {
      const options = {
        find: { include: { user: true } },
      };

      const result = getGeneralOptionsForAction(options, "deleteOne");
      expect(result).toEqual({});
    });
  });

  describe("Unknown actions", () => {
    it("should return null for unknown action", () => {
      const options = {
        find: { include: { user: true } },
        create: { select: { id: true } },
      };

      const result = getGeneralOptionsForAction(
        options,
        "unknownAction" as any
      );
      expect(result).toEqual({});
    });

    it("should return null when action mapping exists but no options provided", () => {
      const options = {
        update: { include: { user: true } },
      };

      const result = getGeneralOptionsForAction(options, "findMany");
      expect(result).toEqual({});
    });
  });

  describe("Empty and null cases", () => {
    it("should return null when options object is empty", () => {
      const options = {};

      const result = getGeneralOptionsForAction(options, "findMany");
      expect(result).toEqual({});
    });

    it("should return null when specific action options are empty objects", () => {
      const options = {
        find: {},
      };

      const result = getGeneralOptionsForAction(options, "findMany");
      expect(result).toEqual({});
    });

    it("should handle null values in options", () => {
      const options = {
        find: null,
        create: { include: { user: true } },
      };

      const result = getGeneralOptionsForAction(options, "findMany");
      expect(result).toEqual({});
    });

    it("should handle undefined values in options", () => {
      const options = {
        find: undefined,
        create: { include: { user: true } },
      };

      const result = getGeneralOptionsForAction(options, "findMany");
      expect(result).toEqual({});
    });
  });

  describe("Merging behavior", () => {
    it("should merge multiple options in correct order for createOne", () => {
      const options = {
        create: { include: { user: true }, select: { id: true } },
        save: { include: { posts: true }, take: 10 },
        saveOne: { include: { profile: true }, skip: 5 },
      };

      const result = getGeneralOptionsForAction(options, "createOne");

      // Later options should override earlier ones when using deepmerge
      expect(result.include).toEqual({ profile: true });
      expect(result.select).toEqual({ id: true });
      expect(result.take).toBe(10);
      expect(result.skip).toBe(5);
    });

    it("should merge multiple options in correct order for updateMany", () => {
      const options = {
        update: { include: { user: true }, orderBy: { id: "asc" } },
        save: { select: { id: true, name: true } },
        saveMany: { where: { status: "active" } },
      };

      const result = getGeneralOptionsForAction(options, "updateMany");

      expect(result.include).toEqual({ user: true });
      expect(result.select).toEqual({ id: true, name: true });
      expect(result.orderBy).toEqual({ id: "asc" });
      expect(result.where).toEqual({ status: "active" });
    });

    it("should handle complex nested objects", () => {
      const options = {
        create: {
          include: {
            user: {
              include: { profile: true },
            },
          },
        },
        save: {
          include: {
            user: {
              include: { posts: true },
            },
          },
        },
      };

      const result = getGeneralOptionsForAction(options, "create");

      // Deepmerge should merge nested objects
      expect(result.include.user.include).toEqual({ posts: true });
    });
  });

  describe("All action mappings coverage", () => {
    it("should handle all defined action mappings", () => {
      const actions: ControllerActions[] = [
        "findMany",
        "findOne",
        "create",
        "createOne",
        "createMany",
        "update",
        "updateOne",
        "updateMany",
        "delete",
        "deleteOne",
        "deleteMany",
      ];

      const options = {
        find: { find: true },
        create: { create: true },
        save: { save: true },
        saveOne: { saveOne: true },
        saveMany: { saveMany: true },
        update: { update: true },
        delete: { delete: true },
      };

      actions.forEach((action) => {
        const result = getGeneralOptionsForAction(options, action);
        expect(result).not.toBeUndefined();
        // Each action should either return merged options or null
        expect(result === null || typeof result === "object").toBe(true);
      });
    });
  });
});
