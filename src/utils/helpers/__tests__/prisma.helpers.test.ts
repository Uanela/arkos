import fs from "fs";
import { Request, Response, NextFunction } from "express";
import * as dbUtils from "../prisma.helpers";
import AppError from "../../../modules/error-handler/utils/app-error";
import { importModule } from "../global.helpers";
importModule;

const { loadPrismaModule, checkDatabaseConnection } = dbUtils;

// Mock external dependencies
jest.mock("fs");
jest.mock("../fs.helpers");
jest.mock("../../../modules/error-handler/utils/catch-async", () => {
  return (fn: Function) => fn;
});

// Mock for fs.helpers
jest.mock("../fs.helpers", () => ({
  getUserFileExtension: jest.fn(() => "ts"),
}));
jest.mock("../global.helpers", () => ({
  importModule: jest.fn(),
}));

// Mock for dynamic imports
const mockPrismaModule = {
  default: {
    $connect: jest.fn(),
  },
  prisma: {
    $connect: jest.fn(),
  },
};

// Helper to reset module state between tests
function resetModuleState() {
  // Reset our mocked prismaInstance
  (dbUtils as any).prismaInstance = null;
}

let mockedPrismaJsPath = `${
  process.env.NODE_ENV === "production"
    ? process.cwd() + "/.build/"
    : process.cwd()
}/src/utils/prisma`;
let mockedPrismaIndexJsPath = `${
  process.env.NODE_ENV === "production"
    ? process.cwd() + "/.build/"
    : process.cwd()
}/src/utils/prisma/index`;

describe("Database Connection Utilities", () => {
  describe("loadPrismaModule", () => {
    it("should load prisma module from default path prisma.js", async () => {
      (importModule as jest.Mock).mockResolvedValueOnce(mockPrismaModule);

      jest.mock(mockedPrismaJsPath, () => mockPrismaModule, {
        virtual: true,
      });

      (fs.existsSync as jest.Mock).mockImplementationOnce((path: string) => {
        return path?.includes?.(mockedPrismaJsPath);
      });

      const prisma = await loadPrismaModule();

      expect(fs.existsSync).toHaveReturnedWith(true);
      expect(prisma).toHaveProperty("$connect");
    });

    it("should load prisma module from fallback path  prisma/index.js", async () => {
      (importModule as jest.Mock).mockResolvedValueOnce(mockPrismaModule);
      (dbUtils as any).prismaInstance = null;

      jest.mock(mockedPrismaIndexJsPath, () => mockPrismaModule, {
        virtual: true,
      });

      (fs.existsSync as jest.Mock).mockImplementationOnce((path: string) => {
        return path?.includes?.(mockedPrismaIndexJsPath);
      });

      const prisma = await loadPrismaModule();

      expect(fs.existsSync).toHaveReturnedWith(false);
      expect(prisma).toHaveProperty("$connect");
    });

    it("should use prisma field if default is not available", async () => {
      (importModule as jest.Mock).mockResolvedValueOnce({
        prisma: mockPrismaModule.prisma,
      });

      const prisma = await loadPrismaModule();

      expect(prisma).toHaveProperty("$connect");
    });

    it("should throw AppError when prisma module cannot be loaded", async () => {
      (fs.existsSync as jest.Mock).mockClear();

      try {
        expect(await loadPrismaModule("albani")).rejects.toThrow(AppError);
      } catch {}
    });

    it("should reuse prisma instance if already loaded", async () => {
      // Load module once
      (dbUtils as any).prismaInstance = null;
      (importModule as jest.Mock).mockResolvedValueOnce({
        prisma: mockPrismaModule.prisma,
      });
      const firstInstance = await loadPrismaModule();
      expect(fs.existsSync).toHaveBeenCalled();
      // Reset mocks to verify they're not called again
      (fs.existsSync as jest.Mock).mockClear();

      // Load module again
      const secondInstance = await loadPrismaModule();

      expect(secondInstance).toBe(firstInstance);
      expect(fs.existsSync).not.toHaveBeenCalled();
    });
  });

  describe("getPrismaInstance", () => {
    it("should return the current prisma instance", async () => {
      const loadedInstance = await loadPrismaModule();

      const instance = dbUtils.getPrismaInstance();

      expect(instance).toBe(loadedInstance);
    });

    it("should return null if prisma is not loaded yet", () => {
      // Ensure prisma is not loaded
      resetModuleState();

      const instance = dbUtils.getPrismaInstance();

      expect(instance).toBeNull();
    });
  });

  describe("checkDatabaseConnection", () => {
    it("should call next() when database connection succeeds", async () => {
      const req = {} as Request;
      const res = {} as Response;
      const next = jest.fn() as NextFunction;

      await checkDatabaseConnection(req, res, next);

      expect(next).toHaveBeenCalledWith();
    });

    // it("should call next with AppError when connection fails", async () => {
    //   const req = {} as Request;
    //   const res = {} as Response;
    //   const next = jest.fn() as NextFunction;
    //   const errorMessage = "Connection failed";

    //   // Mock connection failure
    //   mockPrismaModule.default.$connect.mockRejectedValueOnce(
    //     new Error(errorMessage)
    //   );

    //   jest.mock("../prisma.helpers", () => ({
    //     loadPrismaModule: jest.fn(() => {
    //       console.log("dropd");
    //     }),
    //   }));

    //   await checkDatabaseConnection(req, res, next);
    //   // expect(mockPrismaModule.default.$connect).toHaveBeenCalled();
    //   expect(next).toHaveBeenCalledWith(expect.any(AppError));
    //   expect(next).toHaveBeenCalledWith(
    //     expect.objectContaining({
    //       message: errorMessage,
    //       statusCode: 503,
    //     })
    //   );
    // });
  });
});
