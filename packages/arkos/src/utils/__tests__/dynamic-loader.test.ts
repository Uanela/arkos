import path from "path";
import * as dynamicLoader from "../dynamic-loader";
import { getUserFileExtension } from "../helpers/fs.helpers";
import { importModule } from "../helpers/global.helpers";
import { pathExists } from "../helpers/dynamic-loader.helpers";
import { applyStrictRoutingRules } from "../helpers/dynamic-loader.helpers";
import { killServerChildProcess } from "../cli/utils/cli.helpers";
import sheu from "../sheu";

export const prismaModelsUniqueFields: Record<string, any[]> = [] as any;

jest.mock("../../modules/debugger/debugger.service");
jest.mock("path");
jest.mock("fs", () => ({
  ...jest.requireActual("fs"),
  promises: {
    access: jest.fn(),
    stat: jest.fn(),
  },
}));
jest.mock("../helpers/global.helpers", () => ({
  importModule: jest.fn(),
}));
jest.mock("../helpers/dynamic-loader.helpers", () => ({
  pathExists: jest.fn(),
  applyStrictRoutingRules: jest.fn(),
}));
jest.mock("../cli/utils/cli.helpers", () => ({
  killServerChildProcess: jest.fn(),
}));
jest.mock("../sheu", () => ({
  error: jest.fn(),
  warn: jest.fn(),
}));

// Mock Error class to prevent actual throws during testing
const originalError = global.Error;
const mockError = jest.fn().mockImplementation((message) => {
  const error = new originalError(message);
  error.name = "MockError";
  return error;
});
global.Error = mockError as any;
jest.mock("../helpers/fs.helpers", () => ({
  getUserFileExtension: jest.fn(() => "js"),
  crd: jest.fn(() => "/project"),
}));
jest.mock("../prisma/prisma-schema-parser", () => ({
  parse: jest.fn(),
  getModelsAsArrayOfStrings: jest.fn(() => ["User", "Post"]),
}));

describe("Dynamic Prisma Model Loader", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Reset Error mock
    mockError.mockClear();
    mockError.mockImplementation((message) => {
      const error = new originalError(message);
      error.name = "MockError";
      // console.info(error);
      if (message === "Path check failed") return error;
      return {};
    });

    // Setup path mocks
    (path.resolve as jest.Mock).mockReturnValue("/mocked/path");
    (path.join as jest.Mock).mockImplementation((...args) => args.join("/"));

    // Mock console methods
    jest.spyOn(console, "error").mockImplementation(() => {});
    jest.spyOn(process, "exit").mockImplementation(() => undefined as never);

    // Default pathExists to true
    (pathExists as jest.Mock).mockResolvedValue(true);

    // Default applyStrictRoutingRules mock
    (applyStrictRoutingRules as jest.Mock).mockImplementation(
      (_, _1, config) => config
    );

    // Clear any cached modules
    dynamicLoader.setModuleComponents("User", null as any);
    dynamicLoader.setModuleComponents("Auth", null as any);
  });

  afterAll(() => {
    // Restore original Error class
    global.Error = originalError;
  });

  describe("setModuleComponents and getModuleComponents", () => {
    it("should store and retrieve module components correctly", () => {
      const mockModule = { hooks: {}, dtos: {} };

      dynamicLoader.setModuleComponents("User", mockModule);
      const result = dynamicLoader.getModuleComponents("User");

      expect(result).toBe(mockModule);
    });

    it("should handle pascal case conversion", () => {
      const mockModule = { hooks: {}, dtos: {} };

      dynamicLoader.setModuleComponents("user-profile", mockModule);
      const result = dynamicLoader.getModuleComponents("UserProfile");

      expect(result).toBe(mockModule);
    });

    it("should return undefined for non-existent modules", () => {
      const result = dynamicLoader.getModuleComponents("NonExistent");
      expect(result).toBeUndefined();
    });
  });

  describe("getFileModuleComponentsFileStructure", () => {
    it("should return correct structure for regular models with TypeScript", () => {
      (getUserFileExtension as jest.Mock).mockReturnValue("ts");

      const result = dynamicLoader.getFileModuleComponentsFileStructure("User");

      expect(result.core).toEqual({
        hooks: "user.hooks.ts",
        interceptors: "user.middlewares.ts",
        authConfigs: "user.auth-configs.ts",
        authConfigsNew: "user.auth.ts",
        prismaQueryOptions: "user.prisma-query-options.ts",
        prismaQueryOptionsNew: "user.query.ts",
        router: "user.router.ts",
      });
    });

    it("should return correct structure for auth module", () => {
      (getUserFileExtension as jest.Mock).mockReturnValue("js");
      const result = dynamicLoader.getFileModuleComponentsFileStructure("Auth");

      expect(result.dtos).toEqual({
        login: "login.dto.js",
        signup: "signup.dto.js",
        getMe: "get-me.dto.js",
        updateMe: "update-me.dto.js",
        updatePassword: "update-password.dto.js",
      });
    });

    it("should handle multi-word model names", () => {
      const result =
        dynamicLoader.getFileModuleComponentsFileStructure("UserProfile");

      expect(result.core.hooks).toBe("user-profile.hooks.js");
      expect(result.dtos.create).toBe("create-user-profile.dto.js");
    });

    it("should handle case-insensitive auth detection", () => {
      const result1 =
        dynamicLoader.getFileModuleComponentsFileStructure("auth");
      const result2 =
        dynamicLoader.getFileModuleComponentsFileStructure("AUTH");

      expect(result1.dtos).toHaveProperty("login");
      expect(result2.dtos).toHaveProperty("login");
    });
  });

  describe("processSubdir", () => {
    it("should return empty object when subdirectory doesn't exist", async () => {
      (pathExists as jest.Mock).mockResolvedValue(false);

      const result = await dynamicLoader.processSubdir("User", "dtos");

      expect(result).toEqual({});
    });

    it("should process files correctly when they exist and return correctly if it is a valida class for dto usage", async () => {
      (pathExists as jest.Mock).mockImplementation((filePath) => {
        return filePath.includes("user.dto.js") || filePath.includes("dtos");
      });
      class UserDto {}

      (importModule as jest.Mock).mockResolvedValue({
        default: UserDto,
      });

      const result = await dynamicLoader.processSubdir("User", "dtos");

      expect(importModule).toHaveBeenCalled();
      expect(result.model).toEqual(UserDto);
    });

    it("should process files correctly when they exist and return nothing when module exists but no dto class exported as default", async () => {
      (pathExists as jest.Mock).mockImplementation((filePath) => {
        return filePath.includes("user.dto.js") || filePath.includes("dtos");
      });
      (importModule as jest.Mock).mockResolvedValue(undefined);

      const result = await dynamicLoader.processSubdir("User", "dtos");

      expect(importModule).toHaveBeenCalled();
      expect(result.model).toEqual(undefined);
    });

    it("should skip empty filenames and non-existent files", async () => {
      (pathExists as jest.Mock).mockImplementation((filePath) => {
        if (filePath.includes("dtos")) return true;
        return !filePath.includes("createMany"); // createMany has empty filename
      });

      await dynamicLoader.processSubdir("User", "dtos");

      // Should not try to import files with empty names
      expect(importModule).not.toHaveBeenCalledWith(
        expect.stringContaining("createMany")
      );
    });

    it("should handle import errors gracefully and kill process", async () => {
      (pathExists as jest.Mock).mockResolvedValue(true);
      (importModule as jest.Mock).mockRejectedValue(new Error("Import failed"));

      await dynamicLoader.processSubdir("User", "dtos");

      expect(sheu.error).toHaveBeenCalledWith("Failed to import user.dto.js: ");
      expect(killServerChildProcess).toHaveBeenCalled();
      expect(process.exit).toHaveBeenCalledWith(1);
    });

    it("should handle import errors when file doesn't exist after error", async () => {
      (pathExists as jest.Mock)
        .mockResolvedValueOnce(true) // subdir exists
        .mockResolvedValue(false) // file exists initially
        .mockResolvedValueOnce(false); // file doesn't exist after error

      (importModule as jest.Mock).mockRejectedValue(new Error("Import failed"));

      const result = await dynamicLoader.processSubdir("User", "dtos");

      expect(result).toEqual({});
      expect(killServerChildProcess).not.toHaveBeenCalled();
    });

    it("should handle general errors in processing", async () => {
      try {
        (pathExists as jest.Mock).mockRejectedValue(
          new Error("File system error")
        );

        const consoleSpy = jest.spyOn(console, "error");

        const result = await dynamicLoader.processSubdir("User", "dtos");

        expect(consoleSpy).toHaveBeenCalled();
        expect(result).toEqual({});
      } catch {}
    });
  });

  describe("validateNamingConventions", () => {
    it("should warn about deprecated prismaQueryOptions", () => {
      const result = {};

      dynamicLoader.validateNamingConventions(
        "prismaQueryOptions",
        "user.prisma-query-options.js",
        result
      );

      expect(sheu.warn).toHaveBeenCalledWith(
        "Found user.prisma-query-options.js which will be deprecated from 1.4.0-beta, consider switching to user.query.js."
      );
    });

    it("should warn about deprecated authConfigs", () => {
      const result = {};

      dynamicLoader.validateNamingConventions(
        "authConfigs",
        "user.auth-configs.js",
        result
      );

      expect(sheu.warn).toHaveBeenCalledWith(
        "Found user.auth-configs.js which will be deprecated from 1.4.0-beta, consider switching to user.auth.js."
      );
    });

    it("should throw error when conflicting prismaQueryOptions exist", () => {
      const result = { prismaQueryOptions: {} };

      try {
        dynamicLoader.validateNamingConventions(
          "prismaQueryOptions",
          "user.prisma-query-options.ts",
          result
        );
      } catch (error) {
        expect(mockError).toHaveBeenCalledWith(
          "\n Cannot use both user.prisma-query-options.ts and user.query.ts at once, please choose only one name convention. \n"
        );
      }
      expect(killServerChildProcess).toHaveBeenCalled();
    });

    it("should throw error when conflicting authConfigs exist", () => {
      const result = { authConfigs: {} };

      try {
        dynamicLoader.validateNamingConventions(
          "authConfigs",
          "user.auth-configs.ts",
          result
        );
      } catch (error) {
        expect(mockError).toHaveBeenCalledWith(
          "\n Cannot use both user.auth-configs.ts and user.auth.ts at once, please choose only one name convention. \n"
        );
      }
      expect(killServerChildProcess).toHaveBeenCalled();
    });

    it("should throw error when new naming conflicts with old prismaQueryOptions", () => {
      const result = { prismaQueryOptions: {} };

      try {
        dynamicLoader.validateNamingConventions(
          "prismaQueryOptionsNew",
          "user.query.ts",
          result
        );
      } catch (error) {
        expect(mockError).toHaveBeenCalledWith(
          "\n Cannot use both user.query.ts and user.prisma-query-options.ts at once, please choose only one name convention. \n"
        );
      }
      expect(killServerChildProcess).toHaveBeenCalled();
    });

    it("should throw error when new naming conflicts with old authConfigs", () => {
      const result = { authConfigs: {} };

      try {
        dynamicLoader.validateNamingConventions(
          "authConfigsNew",
          "user.auth.ts",
          result
        );
      } catch (error) {
        expect(mockError).toHaveBeenCalledWith(
          "\n Cannot use both user.auth.ts and user.auth-configs.ts at once, please choose only one name convention. \n"
        );
      }
      expect(killServerChildProcess).toHaveBeenCalled();
    });
  });

  describe("assignModuleToResult", () => {
    let result: any;
    const arkosConfig = { routers: { strict: true } };

    beforeEach(() => {
      result = { dtos: {}, schemas: {} };
    });

    it("should assign prismaQueryOptions from default export", () => {
      const module = { default: { query: "options" } };

      dynamicLoader.assignModuleToResult(
        "User",
        "prismaQueryOptions",
        module,
        result,
        arkosConfig
      );

      expect(result.prismaQueryOptions).toEqual({ query: "options" });
    });

    it("should assign prismaQueryOptions from direct export", () => {
      const module = { query: "options" };

      dynamicLoader.assignModuleToResult(
        "User",
        "prismaQueryOptions",
        module,
        result,
        arkosConfig
      );

      expect(result.prismaQueryOptions).toEqual({ query: "options" });
    });

    it("should assign prismaQueryOptionsNew", () => {
      const module = { default: { query: "options" } };

      dynamicLoader.assignModuleToResult(
        "User",
        "prismaQueryOptionsNew",
        module,
        result,
        arkosConfig
      );

      expect(result.prismaQueryOptions).toEqual({ query: "options" });
    });

    it("should assign authConfigs", () => {
      const module = { default: { auth: "config" } };

      dynamicLoader.assignModuleToResult(
        "User",
        "authConfigs",
        module,
        result,
        arkosConfig
      );

      expect(result.authConfigs).toEqual({ auth: "config" });
    });

    it("should assign authConfigsNew", () => {
      const module = { default: { auth: "config" } };

      dynamicLoader.assignModuleToResult(
        "User",
        "authConfigsNew",
        module,
        result,
        arkosConfig
      );

      expect(result.authConfigs).toEqual({ auth: "config" });
    });

    it("should assign interceptors without default extraction", () => {
      const module = { middleware: jest.fn() };

      dynamicLoader.assignModuleToResult(
        "User",
        "interceptors",
        module,
        result,
        arkosConfig
      );

      expect(result.interceptors).toBe(module);
    });

    it("should assign router with strict routing rules applied", () => {
      const module = { routes: [], config: { path: "/users" } };
      (applyStrictRoutingRules as jest.Mock).mockReturnValue({
        path: "/users",
        strict: true,
      });

      dynamicLoader.assignModuleToResult(
        "User",
        "router",
        module,
        result,
        arkosConfig
      );

      expect(result.router).toEqual({
        routes: [],
        config: { path: "/users", strict: true },
      });
      expect(applyStrictRoutingRules).toHaveBeenCalledWith(
        "User",
        arkosConfig,
        { path: "/users" }
      );
    });

    it("should assign router with empty config when none provided", () => {
      const module = { routes: [] };

      dynamicLoader.assignModuleToResult(
        "User",
        "router",
        module,
        result,
        arkosConfig
      );

      expect(applyStrictRoutingRules).toHaveBeenCalledWith(
        "User",
        arkosConfig,
        {}
      );
    });

    it("should assign other modules with default extraction", () => {
      const module = { default: { hooks: [] } };

      dynamicLoader.assignModuleToResult(
        "User",
        "hooks",
        module,
        result,
        arkosConfig
      );

      expect(result.hooks).toEqual({ hooks: [] });
    });

    it("should assign other modules without default when not available", () => {
      const module = { hooks: [] };

      dynamicLoader.assignModuleToResult(
        "User",
        "hooks",
        module,
        result,
        arkosConfig
      );

      expect(result.hooks).toEqual({ hooks: [] });
    });
  });

  describe("importModuleComponents", () => {
    const baseArkosConfig = { validation: { resolver: "zod" as const } };

    it("should return early when no module directory exists and not using strict routing", async () => {
      const arkosConfig = { validation: { resolver: "zod" as const } };

      const result = await dynamicLoader.importModuleComponents(
        "User",
        arkosConfig,
        false
      );

      expect(result).toEqual({ dtos: {}, schemas: {} });
    });

    it("should return cached module components", async () => {
      const cachedModule = { dtos: {}, schemas: {}, hooks: {} };
      dynamicLoader.setModuleComponents("User", cachedModule);

      const result = await dynamicLoader.importModuleComponents(
        "User",
        baseArkosConfig,
        true
      );

      expect(result).toBe(cachedModule);
    });

    it("should process modules with zod validation", async () => {
      (pathExists as jest.Mock).mockResolvedValue(true);
      (importModule as jest.Mock).mockResolvedValue({
        default: { test: "data" },
      });

      const result = await dynamicLoader.importModuleComponents(
        "User",
        baseArkosConfig,
        true
      );

      expect(result).toHaveProperty("schemas");
    });

    it("should process modules with dto validation", async () => {
      const arkosConfig = { validation: { resolver: "zod" as const } };
      (pathExists as jest.Mock).mockResolvedValue(true);
      (importModule as jest.Mock).mockResolvedValue({
        default: { test: "data" },
      });

      const result = await dynamicLoader.importModuleComponents(
        "User",
        arkosConfig,
        true
      );

      expect(result).toHaveProperty("dtos");
    });

    it("should handle router with strict routing when file doesn't exist", async () => {
      const arkosConfig = {
        routers: { strict: true },
        validation: { resolver: "zod" as const },
      };
      (pathExists as jest.Mock).mockImplementation((filePath) => {
        return !filePath.includes("router");
      });
      (importModule as jest.Mock).mockResolvedValue({});

      const result = await dynamicLoader.importModuleComponents(
        "User",
        arkosConfig,
        true
      );

      expect(result.router).toBeDefined();
    });

    it("should skip router when not using strict routing and file doesn't exist", async () => {
      const arkosConfig = { validation: { resolver: "zod" as const } };
      (pathExists as jest.Mock).mockImplementation((filePath) => {
        return !filePath.includes("router");
      });

      const result = await dynamicLoader.importModuleComponents(
        "User",
        arkosConfig,
        true
      );

      expect(result.router).toBeUndefined();
    });

    it("should handle import errors and exit process", async () => {
      (pathExists as jest.Mock).mockResolvedValue(true);
      (importModule as jest.Mock).mockRejectedValue(new Error("Import failed"));

      await dynamicLoader.importModuleComponents("User", baseArkosConfig, true);

      expect(sheu.error).toHaveBeenCalled();
      expect(killServerChildProcess).toHaveBeenCalled();
    });

    it("should handle validation naming conflicts and rethrow", async () => {
      (pathExists as jest.Mock).mockResolvedValue(true);
      (importModule as jest.Mock).mockResolvedValue({ default: {} });

      expect(
        await dynamicLoader.importModuleComponents(
          "User",
          baseArkosConfig,
          true
        )
      );

      expect(mockError).toHaveBeenCalledWith(
        expect.stringContaining("Cannot use both")
      );
    });

    it("should handle general errors and kill process", async () => {
      (pathExists as jest.Mock).mockResolvedValue(true);
      (importModule as jest.Mock).mockImplementation(() => {
        throw new Error("General error");
      });

      await dynamicLoader.importModuleComponents("User", baseArkosConfig, true);

      expect(killServerChildProcess).toHaveBeenCalled();
    });

    it("should cache processed modules", async () => {
      (pathExists as jest.Mock).mockResolvedValue(true);
      (importModule as jest.Mock).mockResolvedValue({
        default: { test: "data" },
      });

      await dynamicLoader.importModuleComponents("User", baseArkosConfig, true);

      // Second call should return cached version
      const cachedResult = dynamicLoader.getModuleComponents("User");
      expect(cachedResult).toBeDefined();
    });
  });

  describe("edge cases and error handling", () => {
    it("should handle empty module structure gracefully", async () => {
      const arkosConfig = {};
      (pathExists as jest.Mock).mockResolvedValue(false);

      const result = await dynamicLoader.importModuleComponents(
        "User",
        arkosConfig,
        false
      );

      expect(result).toEqual({ dtos: {}, schemas: {} });
    });

    it("should handle invalid file extensions", () => {
      (getUserFileExtension as jest.Mock).mockReturnValue("invalid");

      const result = dynamicLoader.getFileModuleComponentsFileStructure("User");

      expect(result.core.hooks).toBe("user.hooks.invalid");
    });

    it("should handle special characters in model names", () => {
      (getUserFileExtension as jest.Mock).mockReturnValue("js");

      const result =
        dynamicLoader.getFileModuleComponentsFileStructure("User_Profile");

      expect(result.core.hooks).toBe("user-profile.hooks.js");
    });
  });

  describe("appModules", () => {
    it("should contain expected modules", () => {
      expect(dynamicLoader.appModules).toContain("auth");
      expect(dynamicLoader.appModules).toContain("file-upload");
      expect(dynamicLoader.appModules).toContain("User");
      expect(dynamicLoader.appModules).toContain("Post");
    });

    it("should not contain duplicates", () => {
      const unique = new Set(dynamicLoader.appModules);
      expect(unique.size).toBe(dynamicLoader.appModules.length);
    });
  });
});
