import { resolvePrismaQueryOptions } from "../base.middlewares.helpers";
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
