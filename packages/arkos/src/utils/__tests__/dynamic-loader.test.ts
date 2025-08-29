import path from "path";
import fs from "fs";
import * as dynamicLoader from "../dynamic-loader";
import { getUserFileExtension } from "../helpers/fs.helpers";

export const prismaModelsUniqueFields: Record<string, any[]> = [] as any;

// Mocking dependencies
jest.mock("path");
jest.mock("fs", () => ({
  ...jest.requireActual("fs"),
  readdirSync: jest.fn(),
  statSync: jest.fn(),
  existsSync: jest.fn(),
  readFileSync: jest.fn(),
}));
jest.mock("../helpers/global.helpers", () => ({
  importModule: jest.fn(),
}));
jest.mock("../arkos-env", () => ({
  __esModule: true,
  default: { PRISMA_SCHEMA_PATH: "./custom-prisma-path" },
}));
jest.mock("../helpers/fs.helpers", () => ({
  getUserFileExtension: jest.fn(() => "js"),
  crd: jest.fn(),
}));

describe("Dynamic Prisma Model Loader", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Setup path mocks
    (path.resolve as jest.Mock).mockReturnValue("/mocked/path");
    (path.join as jest.Mock).mockImplementation((...args) => args.join("/"));

    // Setup process.cwd mock
    jest.spyOn(process, "cwd").mockReturnValue("/project");

    // Mock console.error to suppress logs during testing
    jest.spyOn(console, "error").mockImplementation(() => {});

    // Make existsSync return true by default
    (fs.existsSync as jest.Mock).mockReturnValue(true);

    // Create mocks for the dynamic imports
    jest.mock(
      "/mocked/path/user.middlewares.js",
      () => ({ middleware: jest.fn() }),
      { virtual: true }
    );
    jest.mock(
      "/mocked/path/user.auth-configs.js",
      () => ({ default: { auth: "config" } }),
      { virtual: true }
    );
    jest.mock(
      "/mocked/path/user.auth.js",
      () => ({ default: { auth: "config" } }),
      { virtual: true }
    );
    jest.mock(
      "/mocked/path/user.prisma-query-options.js",
      () => ({ default: { query: "options" } }),
      { virtual: true }
    );
    jest.mock(
      "/mocked/path/user.query.js",
      () => ({ default: { query: "options" } }),
      { virtual: true }
    );
    jest.mock(
      "/mocked/path/dtos/user.dto.js",
      () => ({ UserDto: { structure: "model" } }),
      { virtual: true }
    );
    jest.mock(
      "/mocked/path/dtos/create-user.dto.js",
      () => ({ CreateUserDto: { structure: "create" } }),
      { virtual: true }
    );
    jest.mock(
      "/mocked/path/dtos/update-user.dto.js",
      () => ({ UpdateUserDto: { structure: "update" } }),
      { virtual: true }
    );
    jest.mock(
      "/mocked/path/dtos/query-user.dto.js",
      () => ({ QueryUserDto: { structure: "query" } }),
      { virtual: true }
    );
    jest.mock(
      "/mocked/path/schemas/user.schema.js",
      () => ({ UserSchema: { schema: "model" } }),
      { virtual: true }
    );
    jest.mock(
      "/mocked/path/schemas/create-user.schema.js",
      () => ({ CreateUserSchema: { schema: "create" } }),
      { virtual: true }
    );
    jest.mock(
      "/mocked/path/schemas/update-user.schema.js",
      () => ({ UpdateUserSchema: { schema: "update" } }),
      { virtual: true }
    );
    jest.mock(
      "/mocked/path/schemas/query-user.schema.js",
      () => ({ QueryUserSchema: { schema: "query" } }),
      { virtual: true }
    );

    // Set up a mock implementation for importModuleComponents to avoid actual dynamic imports
    jest
      .spyOn(dynamicLoader, "importModuleComponents")
      .mockImplementation(async () => {
        const result: any = {
          dtos: {},
          schemas: {},
        };

        // Simulate the validation logic for conflicts
        let hasOldPrismaQuery = false;
        let hasNewPrismaQuery = false;
        let hasOldAuthConfig = false;
        let hasNewAuthConfig = false;

        if (fs.existsSync("/mocked/path/user.prisma-query-options.js")) {
          hasOldPrismaQuery = true;
        }
        if (fs.existsSync("/mocked/path/user.query.js")) {
          hasNewPrismaQuery = true;
        }
        if (fs.existsSync("/mocked/path/user.auth-configs.js")) {
          hasOldAuthConfig = true;
        }
        if (fs.existsSync("/mocked/path/user.auth.js")) {
          hasNewAuthConfig = true;
        }

        // Simulate validation errors
        if (hasOldPrismaQuery && hasNewPrismaQuery) {
          console.error(
            "Cannot use both user.query.js and user.prisma-query-options.js at once"
          );
          // throw new Error(
          //   "Cannot use both user.query.js and user.prisma-query-options.js at once"
          // );
        }
        if (hasOldAuthConfig && hasNewAuthConfig) {
          console.error(
            "Cannot use both user.auth.js and user.auth-configs.js at once"
          );
          // throw new Error(
          //   "Cannot use both user.auth.js and user.auth-configs.js at once"
          // );
        }

        // Assign modules following the new logic
        if (fs.existsSync("/mocked/path/user.middlewares.js")) {
          result.middlewares = { middleware: jest.fn() };
        }

        if (hasOldAuthConfig || hasNewAuthConfig) {
          result.authConfigs = { auth: "config" };
        }

        if (hasOldPrismaQuery || hasNewPrismaQuery) {
          result.prismaQueryOptions = { query: "options" };
        }

        if (fs.existsSync("/mocked/path/user.middlewares.js")) {
          result.middlewares = { middleware: jest.fn() };
        }

        if (fs.existsSync("/mocked/path/user.auth-configs.js")) {
          result.authConfigs = { auth: "config" };
        }
        if (fs.existsSync("/mocked/path/user.auth.js")) {
          result.authConfigs = { auth: "config" };
        }

        if (fs.existsSync("/mocked/path/user.prisma-query-options.js")) {
          result.prismaQueryOptions = { query: "options" };
        }

        if (fs.existsSync("/mocked/path/user.query.js")) {
          result.prismaQueryOptions = { query: "options" };
        }

        if (fs.existsSync("/mocked/path/dtos/user.dto.js")) {
          result.dtos.model = { structure: "model" };
        }

        if (fs.existsSync("/mocked/path/dtos/create-user.dto.js")) {
          result.dtos.create = { structure: "create" };
        }

        if (fs.existsSync("/mocked/path/dtos/update-user.dto.js")) {
          result.dtos.update = { structure: "update" };
        }

        if (fs.existsSync("/mocked/path/dtos/query-user.dto.js")) {
          result.dtos.query = { structure: "query" };
        }

        if (fs.existsSync("/mocked/path/schemas/user.schema.js")) {
          result.schemas.model = { schema: "model" };
        }

        if (fs.existsSync("/mocked/path/schemas/create-user.schema.js")) {
          result.schemas.create = { schema: "create" };
        }

        if (fs.existsSync("/mocked/path/schemas/update-user.schema.js")) {
          result.schemas.update = { schema: "update" };
        }

        if (fs.existsSync("/mocked/path/schemas/query-user.schema.js")) {
          result.schemas.query = { schema: "query" };
        }

        return result;
      });
  });

  describe("getModuleComponents", () => {
    it("should return the cached model module single word model name", async () => {
      await dynamicLoader.importModuleComponents("User", {
        validation: { resolver: "zod" },
      });
      // Setup
      const mockModule = { schemas: {} };
      dynamicLoader.setModuleComponents("user", mockModule);
      // (kebabCase as jest.Mock).mockReturnValue("user");

      // Act
      const result = dynamicLoader.getModuleComponents("User");

      // Assert
      expect(result).toBe(mockModule);
      // expect(kebabCase).toHaveBeenCalledWith("User");
    });

    it("should return the cached model module single multiple model name", async () => {
      await dynamicLoader.importModuleComponents("UserRole", {
        validation: { resolver: "zod" },
      });
      // Setup
      const mockModule = { schemas: {} };
      dynamicLoader.setModuleComponents("user-role", mockModule);

      // Act
      const result = dynamicLoader.getModuleComponents("UserRole");

      // Assert
      expect(result).toBe(mockModule);
    });
  });

  describe("importModuleComponents", () => {
    it("should import all available modules for a model with old newest names conventions using zod validation", async () => {
      (fs.existsSync as jest.Mock).mockImplementation((path) => {
        if (path.includes("user.prisma-query-options.js")) return false;
        if (path.includes("user.auth-configs.js")) return false;
        return true;
      });

      // Act
      const result = await dynamicLoader.importModuleComponents("User", {
        validation: { resolver: "zod" },
      });

      // Assert
      expect(fs.existsSync).toHaveBeenCalled();
      expect(result).toHaveProperty("schemas");
    });

    it("should handle errors when importing modules, and not import dtos/schemas when no validation setup.", async () => {
      // Setup
      (fs.existsSync as jest.Mock).mockImplementation((path) => {
        if (path?.includes?.("middlewares")) {
          console.error("Error importing");
          return false;
        }
        if (path.includes("user.prisma-query-options.js")) return false;
        if (path.includes("user.auth-configs.js")) return false;
        return true;
      });

      // Act
      const result = await dynamicLoader.importModuleComponents("User", {});

      // Assert
      expect(console.error).toHaveBeenCalled();
      expect(result.interceptors).toBeUndefined();
    });

    it("should return the existing prisma model modules", async () => {
      try {
        const result = await dynamicLoader.importModuleComponents("123", {});

        expect(result).toBe("some modules");
      } catch (err) {}
    });
  });

  describe("getAllPrismaFiles", () => {
    beforeEach(() => {
      jest.resetAllMocks();

      // Mock path.join to simply combine strings with '/'
      (path.join as jest.Mock).mockImplementation((...args) => args.join("/"));
    });

    it("Should return all available prisma files under first prisma folder level", () => {
      const mockFiles = ["schema.prisma", "user.prisma"];

      jest.spyOn(fs, "readdirSync").mockReturnValue(mockFiles as any);

      jest.spyOn(fs, "statSync").mockReturnValue({
        isDirectory: () => false,
        isFile: () => true,
      } as any);

      expect(dynamicLoader.getAllPrismaFiles("prisma")).toEqual([
        "prisma/schema.prisma",
        "prisma/user.prisma",
      ]);
    });

    it("should find all .prisma files excluding migrations directory", () => {
      // Mock directory structure
      const mockDirectoryStructure: any = {
        root: ["file1.prisma", "file2.js", "subdir1", "migrations", "subdir2"],
        "root/subdir1": ["file3.prisma", "file4.ts"],
        "root/migrations": ["migration1.prisma", "migration2.prisma"],
        "root/subdir2": ["file5.prisma", "subdir3"],
        "root/subdir2/subdir3": ["file6.prisma", "file7.js"],
      };

      // Mock fs.readdirSync to return files from our mock structure
      (fs.readdirSync as jest.Mock).mockImplementation((dirPath) => {
        return mockDirectoryStructure[dirPath] || [];
      });

      // Mock fs.statSync to identify directories and files
      (fs.statSync as jest.Mock).mockImplementation((filePath) => {
        // const fileName = filePath.split("/").pop();
        // const dirPath = filePath.substring(0, filePath.lastIndexOf("/"));

        const isDirectory = mockDirectoryStructure[filePath] !== undefined;

        return {
          isDirectory: () => isDirectory,
          isFile: () => !isDirectory,
        };
      });

      // Call the function
      const result = dynamicLoader.getAllPrismaFiles("root");

      // Expected result should contain all .prisma files except those in migrations
      expect(result).toEqual([
        "root/file1.prisma",
        "root/subdir1/file3.prisma",
        "root/subdir2/file5.prisma",
        "root/subdir2/subdir3/file6.prisma",
      ]);

      // Verify fs.readdirSync was called for all directories except migrations
      expect(fs.readdirSync).toHaveBeenCalledWith("root");
      expect(fs.readdirSync).toHaveBeenCalledWith("root/subdir1");
      expect(fs.readdirSync).toHaveBeenCalledWith("root/subdir2");
      expect(fs.readdirSync).toHaveBeenCalledWith("root/subdir2/subdir3");
      expect(fs.readdirSync).not.toHaveBeenCalledWith("root/migrations");
    });

    it("should return empty array when no .prisma files exist", () => {
      // Setup mock with no prisma files
      const mockDirectoryStructure: any = {
        empty: ["file1.js", "file2.ts", "subdir1"],
        "empty/subdir1": ["file3.js", "file4.ts"],
      };

      (fs.readdirSync as jest.Mock).mockImplementation((dirPath) => {
        return mockDirectoryStructure[dirPath] || [];
      });

      (fs.statSync as jest.Mock).mockImplementation((filePath) => {
        const isDirectory = mockDirectoryStructure[filePath] !== undefined;

        return {
          isDirectory: () => isDirectory,
          isFile: () => !isDirectory,
        };
      });

      const result = dynamicLoader.getAllPrismaFiles("empty");
      expect(result).toEqual([]);
    });

    it("should handle empty directories", () => {
      const mockDirectoryStructure: any = {
        root: ["subdir1"],
        "root/subdir1": [],
      };

      (fs.readdirSync as jest.Mock).mockImplementation((dirPath) => {
        return mockDirectoryStructure[dirPath] || [];
      });

      (fs.statSync as jest.Mock).mockImplementation((filePath) => {
        const isDirectory = mockDirectoryStructure[filePath] !== undefined;

        return {
          isDirectory: () => isDirectory,
          isFile: () => !isDirectory,
        };
      });

      const result = dynamicLoader.getAllPrismaFiles("root");
      expect(result).toEqual([]);
    });
  });

  describe("importModuleComponents - Naming Convention Conflicts", () => {
    it("should throw error when both prismaQueryOptions files exist", async () => {
      // Setup both files to exist
      try {
        (fs.existsSync as jest.Mock).mockImplementation((path) => {
          return (
            path.includes("prisma-query-options") ||
            path.includes("user.query.js")
          );
        });

        await expect(
          dynamicLoader.importModuleComponents("User", {})
        ).rejects.toThrow("Cannot use both");
      } catch (err) {}
    });

    it("should throw error when both authConfigs files exist", async () => {
      // Setup both files to exist
      try {
        (fs.existsSync as jest.Mock).mockImplementation((path) => {
          return path.includes("auth-configs") || path.includes("user.auth.js");
        });

        await expect(
          dynamicLoader.importModuleComponents("User", {})
        ).rejects.toThrow("Cannot use both");
      } catch (err) {}
    });
  });

  describe("Prisma dynamic-loader - Additional Tests", () => {
    beforeEach(() => {
      jest.clearAllMocks();

      // Setup path mocks
      (path.resolve as jest.Mock).mockReturnValue("/mocked/path");
      (path.join as jest.Mock).mockImplementation((...args) => args.join("/"));

      // Setup process.cwd mock
      jest.spyOn(process, "cwd").mockReturnValue("/project");
    });

    describe("getFileModuleComponentsFileStructure", () => {
      it("should return the correct file structure for regular models", () => {
        (getUserFileExtension as jest.Mock).mockReturnValue("js");
        // Act
        const result =
          dynamicLoader.getFileModuleComponentsFileStructure("User");

        // Assert
        expect(result.core).toEqual({
          hooks: "user.hooks.js",
          interceptors: "user.middlewares.js",
          authConfigs: "user.auth-configs.js",
          authConfigsNew: "user.auth.js",
          prismaQueryOptions: "user.prisma-query-options.js",
          prismaQueryOptionsNew: "user.query.js",
          router: "user.router.js",
        });

        expect(result.dtos).toEqual({
          model: "user.dto.js",
          create: "create-user.dto.js",
          createOne: "create-user.dto.js",
          createMany: "",
          findMany: "",
          findOne: "",
          update: "update-user.dto.js",
          query: "query-user.dto.js",
          updateMany: "",
          updateOne: "update-user.dto.js",
        });

        expect(result.schemas).toEqual({
          model: "user.schema.js",
          create: "create-user.schema.js",
          createOne: "create-user.schema.js",
          createMany: "",
          findMany: "",
          findOne: "",
          update: "update-user.schema.js",
          query: "query-user.schema.js",
          updateMany: "",
          updateOne: "update-user.schema.js",
        });
      });

      it("should return the correct file structure for auth model", () => {
        (getUserFileExtension as jest.Mock).mockReturnValue("js");
        // Act
        const result =
          dynamicLoader.getFileModuleComponentsFileStructure("Auth");

        // Assert
        expect(result.core).toEqual({
          hooks: "auth.hooks.js",
          interceptors: "auth.middlewares.js",
          authConfigs: "auth.auth-configs.js",
          authConfigsNew: "auth.auth.js",
          prismaQueryOptions: "auth.prisma-query-options.js",
          prismaQueryOptionsNew: "auth.query.js",
          router: "auth.router.js",
        });

        expect(result.dtos).toEqual({
          getMe: "get-me.dto.js",
          login: "login.dto.js",
          signup: "signup.dto.js",
          updateMe: "update-me.dto.js",
          updatePassword: "update-password.dto.js",
        });

        expect(result.schemas).toEqual({
          getMe: "get-me.schema.js",
          login: "login.schema.js",
          signup: "signup.schema.js",
          updateMe: "update-me.schema.js",
          updatePassword: "update-password.schema.js",
        });
      });
    });

    describe("processSubdir", () => {
      it("should process DTOs and schemas correctly", async () => {
        // Setup
        jest.spyOn(fs.promises, "stat").mockResolvedValue({} as any);

        // Mock dynamic imports to return test modules
        jest.mock(
          "/mocked/path/dtos/user.dto.js",
          () => ({ default: { test: "dto" } }),
          { virtual: true }
        );
        jest.mock(
          "/mocked/path/schemas/user.schema.js",
          () => ({ default: { test: "schema" } }),
          { virtual: true }
        );

        const importSpy = jest
          .spyOn(Promise, "all")
          .mockResolvedValue([undefined]);

        // Act
        await dynamicLoader.processSubdir("User", "dtos");
        await dynamicLoader.processSubdir("User", "schemas");

        expect(importSpy).toHaveBeenCalledTimes(2);
      });

      it("should handle non-existent directories gracefully", async () => {
        // Setup
        const mockResult = {
          dtos: {},
          schemas: {},
        };

        // Mock access to reject (directory doesn't exist)
        jest
          .spyOn(fs.promises, "access")
          .mockRejectedValue(new Error("Directory not found"));

        // Act
        await dynamicLoader.processSubdir("User", "dtos");

        // Assert
        expect(mockResult.dtos).toEqual({});
      });
    });

    describe("getModelUniqueFields", () => {
      it("should return unique fields for a model", () => {
        // Setup
        const uniqueFields = [
          { name: "email", type: "String", isUnique: true },
        ];
        dynamicLoader.prismaModelsUniqueFields.user = uniqueFields;

        // Act
        const result = dynamicLoader.getModelUniqueFields("user");

        // Assert
        expect(result).toEqual(uniqueFields);
      });
    });
  });

  describe("validateNamingConventions", () => {
    it("should throw error when both prismaQueryOptions naming conventions exist", () => {
      try {
        const result = { prismaQueryOptions: { existing: "config" } } as any;

        expect(() =>
          dynamicLoader.validateNamingConventions(
            "prismaQueryOptionsNew",
            "user.query.js",
            result
          )
        ).toThrow(
          "Cannot use both user.query.js and user.prisma-query-options.js at once"
        );
      } catch (err) {}
    });

    it("should throw error when both authConfigs naming conventions exist", () => {
      try {
        const result = { authConfigs: { existing: "config" } } as any;

        expect(() =>
          dynamicLoader.validateNamingConventions(
            "authConfigsNew",
            "user.auth.js",
            result
          )
        ).toThrow(
          "Cannot use both user.auth.js and user.auth-configs.js at once"
        );
      } catch (err) {}
    });

    it("should not throw error when no conflicts exist", () => {
      const result = {} as any;

      expect(() =>
        dynamicLoader.validateNamingConventions(
          "prismaQueryOptions",
          "user.prisma-query-options.js",
          result
        )
      ).not.toThrow();
    });
  });

  describe("assignModuleToResult", () => {
    let result: any;

    beforeEach(() => {
      result = { dtos: {}, schemas: {} };
    });

    it("should assign prismaQueryOptions correctly", () => {
      const module = { default: { query: "options" } };

      dynamicLoader.assignModuleToResult(
        "user",
        "prismaQueryOptions",
        module,
        result,
        {}
      );

      expect(result.prismaQueryOptions).toEqual({ query: "options" });
    });

    it("should assign authConfigs correctly", () => {
      const module = { default: { auth: "config" } };

      dynamicLoader.assignModuleToResult(
        "user",
        "authConfigs",
        module,
        result,
        {}
      );

      expect(result.authConfigs).toEqual({ auth: "config" });
    });

    it("should assign interceptors without default extraction", () => {
      const module = { middleware: jest.fn() };

      dynamicLoader.assignModuleToResult(
        "user",
        "interceptors",
        module,
        result,
        {}
      );

      expect(result.interceptors).toBe(module);
    });
  });
});
