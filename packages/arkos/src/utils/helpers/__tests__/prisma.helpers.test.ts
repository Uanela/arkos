import fs from "fs";
import { Request, Response, NextFunction } from "express";
import * as dbUtils from "../prisma.helpers";
import AppError from "../../../modules/error-handler/utils/app-error";
import { getUserFileExtension } from "../fs.helpers";
import { importModule } from "../global.helpers";

// Mock external dependencies
jest.mock("fs");
jest.mock("../fs.helpers");
jest.mock("../global.helpers");
jest.mock("../../../modules/error-handler/utils/catch-async", () => {
  return (fn: Function) => fn;
});

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

    it("should use prisma field if default is not available", async () => {
      // Set up mock for file existence check
      (fs.existsSync as jest.Mock).mockReturnValue(true);

      // Set up mock for dynamic import without default export
      (importModule as jest.Mock).mockResolvedValue({
        prisma: mockPrismaModule.prisma,
      });

      // Call function under test
      const result = await dbUtils.loadPrismaModule();

      // Assert expected behavior
      expect(result).toBe(mockPrismaModule.prisma);
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
      // Set up mocks
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (importModule as jest.Mock).mockResolvedValue({
        default: mockPrismaModule.default,
      });

      // Load prisma instance
      await dbUtils.loadPrismaModule();

      // Call function under test
      const result = dbUtils.getPrismaInstance();

      // Assert expected behavior
      expect(result).toBe(mockPrismaModule.default);
    });
  });

  describe("checkDatabaseConnection", () => {
    it("should call next() when database connection succeeds", async () => {
      // Set up mocks
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (importModule as jest.Mock).mockResolvedValue({
        default: mockPrismaModule.default,
      });

      // Create mock Express objects
      const req = {} as Request;
      const res = {} as Response;
      const next = jest.fn() as NextFunction;

      // Call function under test
      await dbUtils.checkDatabaseConnection(req, res, next);

      // Assert expected behavior
      expect(mockPrismaModule.default.$connect).toHaveBeenCalled();
      expect(next).toHaveBeenCalledWith();
      expect(next).not.toHaveBeenCalledWith(expect.any(AppError));
    });

    it("should call next with AppError when connection fails", async () => {
      // Set up error message
      const errorMessage = "Connection failed";

      // Set up mocks
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (importModule as jest.Mock).mockResolvedValue({
        default: {
          $connect: jest.fn().mockRejectedValue(new Error(errorMessage)),
        },
      });

      // Create mock Express objects
      const req = {} as Request;
      const res = {} as Response;
      const next = jest.fn() as NextFunction;

      // Mock console.error to prevent test output noise
      jest.spyOn(console, "error").mockImplementation();

      // Call function under test
      await dbUtils.checkDatabaseConnection(req, res, next);

      // Assert expected behavior
      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          message: errorMessage,
          statusCode: 503,
        })
      );
    });
  });
});
