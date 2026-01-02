import fs from "fs";
import * as dbUtils from "../prisma.helpers";
import AppError from "../../../modules/error-handler/utils/app-error";
import { getUserFileExtension } from "../fs.helpers";
import { importModule } from "../global.helpers";
import { getArkosConfig } from "../arkos-config.helpers";
import sheu from "../../sheu";
import prismaSchemaParser from "../../prisma/prisma-schema-parser";

// Mock external dependencies
jest.mock("../arkos-config.helpers", () => ({
  getArkosConfig: jest.fn(),
}));
jest.mock("../../sheu", () => ({
  debug: jest.fn(),
}));
jest.mock("fs");
jest.mock("../fs.helpers");
jest.mock("../global.helpers");
jest.mock("../../../modules/error-handler/utils/catch-async", () => {
  return (fn: Function) => fn;
});
jest.mock("../../prisma/prisma-schema-parser", () => ({
  models: [{ name: "User" }],
  getModelsAsArrayOfStrings: jest.fn().mockReturnValue(["User", "Post"]),
}));

// Set up mock values
const mockedCwd = "/mock/project";
const mockFileExtension = "ts";
const mockPrismaBasePath = `${mockedCwd}/src/utils/prisma`;
const mockPrismaJsPath = `${mockPrismaBasePath}.${mockFileExtension}`;
const mockPrismaIndexJsPath = `${mockPrismaBasePath}/index.${mockFileExtension}`;

// Mock Prisma module
const mockPrismaModule = {
  default: {
    $connect: jest.fn().mockResolvedValue(undefined),
    $disconnect: jest.fn().mockResolvedValue(undefined),
  },
  prisma: {
    $connect: jest.fn().mockResolvedValue(undefined),
    $disconnect: jest.fn().mockResolvedValue(undefined),
  },
};

jest.spyOn(require("../fs.helpers"), "crd").mockReturnValue(mockedCwd);

describe("prisma.helpers", () => {
  // Set up mocks before each test
  beforeEach(() => {
    // Reset module state
    (dbUtils as any).prismaInstance = null;

    // Reset all mocks
    jest.clearAllMocks();

    // Set up mocks for filesystem helpers
    (getUserFileExtension as jest.Mock).mockReturnValue(mockFileExtension);

    // Mock process.cwd to return a consistent path
    jest.spyOn(process, "cwd").mockReturnValue(mockedCwd);
  });

  describe("loadPrismaModule", () => {
    it("should load prisma module from main path (prisma.ts)", async () => {
      // Set up mock for file existence check
      (fs.existsSync as jest.Mock).mockImplementation(
        (path: string) => path === mockPrismaJsPath
      );

      jest.spyOn(process, "cwd").mockReturnValue(mockedCwd);
      // Set up mock for dynamic import
      (importModule as jest.Mock).mockResolvedValue({
        default: mockPrismaModule.default,
      });

      // Call function under test
      const result = await dbUtils.loadPrismaModule();

      // Assert expected behavior
      expect(fs.existsSync).toHaveBeenCalledWith(mockPrismaJsPath);
      expect(importModule).toHaveBeenCalledWith(mockPrismaJsPath, {
        fixExtension: false,
      });
      expect(result).toBe(mockPrismaModule.default);
    });

    it("should load prisma module from fallback path (prisma/index.ts)", async () => {
      // Mock file existence to fail for main path but succeed for fallback
      (fs.existsSync as jest.Mock).mockImplementation((path: string) => {
        return path === mockPrismaIndexJsPath;
      });

      // Set up mock for dynamic import
      (importModule as jest.Mock).mockResolvedValue({
        default: mockPrismaModule.default,
      });

      // Call function under test
      const result = await dbUtils.loadPrismaModule();

      // Assert expected behavior
      expect(fs.existsSync).toHaveBeenCalledWith(mockPrismaJsPath);
      expect(fs.existsSync).toHaveBeenCalledWith(mockPrismaIndexJsPath);
      expect(importModule).toHaveBeenCalledWith(mockPrismaIndexJsPath, {
        fixExtension: false,
      });
      expect(result).toBe(mockPrismaModule.default);
    });

    it("should throw AppError when prisma module cannot be loaded", async () => {
      // Set up mocks for file existence
      (fs.existsSync as jest.Mock).mockReturnValue(true);

      // Mock import to return object without prisma
      (importModule as jest.Mock).mockResolvedValue({});

      // Assert that the function throws an AppError
      await expect(dbUtils.loadPrismaModule()).rejects.toThrow(AppError);
      await expect(dbUtils.loadPrismaModule()).rejects.toThrow(
        "Could not initialize Prisma module."
      );
    });

    it("should throw original error when import fails", async () => {
      // Set up mocks for file existence
      (fs.existsSync as jest.Mock).mockReturnValue(true);

      // Mock import to fail
      const mockError = new Error("Import failed");
      (importModule as jest.Mock).mockRejectedValue(mockError);

      // Assert that the function throws the original error
      await expect(dbUtils.loadPrismaModule()).rejects.toBe(mockError);
    });

    it("should reuse prisma instance if already loaded", async () => {
      // Set up mocks
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (importModule as jest.Mock).mockResolvedValue({
        default: mockPrismaModule.default,
      });

      // Load first instance
      const firstInstance = await dbUtils.loadPrismaModule();

      // Reset mocks to verify they're not called again
      jest.clearAllMocks();

      // Load second instance
      const secondInstance = await dbUtils.loadPrismaModule();

      // Verify both instances are the same and no additional imports occurred
      expect(secondInstance).toBe(firstInstance);
      expect(importModule).not.toHaveBeenCalled();
      expect(fs.existsSync).not.toHaveBeenCalled();
    });
  });

  describe("getPrismaInstance", () => {
    it("should return null if prisma is not loaded yet", () => {
      // Ensure prisma is not loaded
      (dbUtils as any).prismaInstance = null;

      // Call function under test
      const result = dbUtils.getPrismaInstance();

      // Assert expected behavior
      expect(result).toBeNull();
    });

    it("should return the loaded prisma instance", async () => {
      const mockProxy = mockPrismaModule.default;
      const originalProxy = Proxy;
      (global as any).Proxy = jest.fn().mockReturnValue(mockProxy);

      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (importModule as jest.Mock).mockResolvedValue({
        default: mockPrismaModule.default,
      });

      await dbUtils.loadPrismaModule();

      const result = dbUtils.getPrismaInstance();

      expect(result).toBe(mockPrismaModule.default);

      (global as any).Proxy = originalProxy;
    });
  });

  describe("handlePrismaGet", () => {
    let mockTarget: any;
    let mockReceiver: any;
    let mockConfig: any;

    beforeEach(() => {
      mockTarget = {
        user: {
          findMany: jest.fn().mockResolvedValue([]),
          findUnique: jest.fn().mockResolvedValue({}),
          create: jest.fn().mockResolvedValue({}),
        },
        post: {
          findMany: jest.fn().mockResolvedValue([]),
        },
        $connect: jest.fn(),
      };

      mockReceiver = {};

      mockConfig = {
        debugging: {
          requests: {
            level: 3,
          },
        },
      };

      (getArkosConfig as jest.Mock).mockReturnValue(mockConfig);
      (sheu.debug as jest.Mock).mockClear();

      // (global as any).prismaSchemaParser =prismaSchemaParser;
      // (global as any).getArkosConfig = jest.fn().mockReturnValue(mockConfig);
      // (global as any).sheu = sheu;
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    it("should return original property for non-model properties", () => {
      const result = dbUtils.handlePrismaGet(
        mockTarget,
        "$connect",
        mockReceiver
      );

      expect(result).toBe(mockTarget.$connect);
      expect(prismaSchemaParser.getModelsAsArrayOfStrings).toHaveBeenCalled();
    });

    it("should return proxied model for valid model names", () => {
      const result = dbUtils.handlePrismaGet(mockTarget, "user", mockReceiver);

      expect(result).not.toBe(mockTarget.user);
      expect(prismaSchemaParser.getModelsAsArrayOfStrings).toHaveBeenCalled();
    });

    it("should handle case-insensitive model name matching", () => {
      const result = dbUtils.handlePrismaGet(mockTarget, "USER", mockReceiver);

      expect(result).not.toBe(mockTarget.user);
      expect(prismaSchemaParser.getModelsAsArrayOfStrings).toHaveBeenCalled();
    });

    it("should log query args when debug level is 3 or higher", async () => {
      const proxiedModel = dbUtils.handlePrismaGet(
        mockTarget,
        "user",
        mockReceiver
      );
      const queryArgs = { where: { id: 1 } };

      await proxiedModel.findMany(queryArgs);

      expect(sheu.debug).toHaveBeenCalledWith(
        `Final Prisma Args\n${JSON.stringify(queryArgs, null, 2)}`,
        { timestamp: true }
      );
      expect(mockTarget.user.findMany).toHaveBeenCalledWith(queryArgs);
    });

    it("should log empty args when query args are empty object", async () => {
      const proxiedModel = dbUtils.handlePrismaGet(
        mockTarget,
        "user",
        mockReceiver
      );

      await proxiedModel.findMany({});

      expect(sheu.debug).toHaveBeenCalledWith("Final Prisma Args - Empty", {
        timestamp: true,
      });
      expect(mockTarget.user.findMany).toHaveBeenCalledWith({});
    });

    it("should log empty args when no args are passed", async () => {
      const proxiedModel = dbUtils.handlePrismaGet(
        mockTarget,
        "user",
        mockReceiver
      );

      await proxiedModel.findMany();

      expect(sheu.debug).toHaveBeenCalledWith("Final Prisma Args - Empty", {
        timestamp: true,
      });
      expect(mockTarget.user.findMany).toHaveBeenCalled();
    });

    it("should not log when debug level is less than 3", async () => {
      mockConfig.debugging.requests.level = 2;
      const proxiedModel = dbUtils.handlePrismaGet(
        mockTarget,
        "user",
        mockReceiver
      );
      const queryArgs = { where: { id: 1 } };

      await proxiedModel.findMany(queryArgs);

      expect(sheu.debug).not.toHaveBeenCalled();
      expect(mockTarget.user.findMany).toHaveBeenCalledWith(queryArgs);
    });

    it("should default to debug level 0 when config is missing", async () => {
      (getArkosConfig as jest.Mock).mockReturnValue({});
      const proxiedModel = dbUtils.handlePrismaGet(
        mockTarget,
        "user",
        mockReceiver
      );
      const queryArgs = { where: { id: 1 } };

      await proxiedModel.findMany(queryArgs);

      expect(sheu.debug).not.toHaveBeenCalled();
      expect(mockTarget.user.findMany).toHaveBeenCalledWith(queryArgs);
    });

    it("should call original method with all arguments", async () => {
      const proxiedModel = dbUtils.handlePrismaGet(
        mockTarget,
        "user",
        mockReceiver
      );
      const arg1 = { where: { id: 1 } };
      const arg2 = { include: { posts: true } };

      await proxiedModel.findUnique(arg1, arg2);

      expect(mockTarget.user.findUnique).toHaveBeenCalledWith(arg1, arg2);
    });

    it("should return the result from original method", async () => {
      const expectedResult = [{ id: 1, name: "Test" }];
      mockTarget.user.findMany.mockResolvedValue(expectedResult);
      const proxiedModel = dbUtils.handlePrismaGet(
        mockTarget,
        "user",
        mockReceiver
      );

      const result = await proxiedModel.findMany({ where: { id: 1 } });

      expect(result).toBe(expectedResult);
    });

    it("should preserve method context when calling original method", async () => {
      const proxiedModel = dbUtils.handlePrismaGet(
        mockTarget,
        "user",
        mockReceiver
      );

      await proxiedModel.findMany();

      expect(mockTarget.user.findMany.mock.instances[0]).toBe(mockTarget.user);
    });

    it("should return non-function properties unchanged", () => {
      mockTarget.user.someProperty = "test value";
      const proxiedModel = dbUtils.handlePrismaGet(
        mockTarget,
        "user",
        mockReceiver
      );

      const result = proxiedModel.someProperty;

      expect(result).toBe("test value");
    });

    it("should handle multiple different models", async () => {
      const proxiedUser = dbUtils.handlePrismaGet(
        mockTarget,
        "user",
        mockReceiver
      );
      const proxiedPost = dbUtils.handlePrismaGet(
        mockTarget,
        "post",
        mockReceiver
      );

      await proxiedUser.findMany({ where: { id: 1 } });
      await proxiedPost.findMany({ where: { title: "Test" } });

      expect(mockTarget.user.findMany).toHaveBeenCalledWith({
        where: { id: 1 },
      });
      expect(mockTarget.post.findMany).toHaveBeenCalledWith({
        where: { title: "Test" },
      });
      expect(sheu.debug).toHaveBeenCalledTimes(2);
    });

    it("should handle complex nested query args", async () => {
      const complexArgs = {
        where: {
          AND: [{ id: { gt: 1 } }, { name: { contains: "test" } }],
        },
        include: {
          posts: {
            where: { published: true },
          },
        },
        orderBy: { createdAt: "desc" },
      };

      const proxiedModel = dbUtils.handlePrismaGet(
        mockTarget,
        "user",
        mockReceiver
      );
      await proxiedModel.findMany(complexArgs);

      expect(sheu.debug).toHaveBeenCalledWith(
        `Final Prisma Args\n${JSON.stringify(complexArgs, null, 2)}`,
        { timestamp: true }
      );
      expect(mockTarget.user.findMany).toHaveBeenCalledWith(complexArgs);
    });
  });
});
