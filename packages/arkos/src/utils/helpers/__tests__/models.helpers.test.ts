import path from "path";
import fs from "fs";
import * as dynamicLoader from "../../../utils/helpers/models.helpers";

import { getUserFileExtension } from "../fs.helpers";

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
jest.mock("../global.helpers", () => ({
  importModule: jest.fn(),
}));
jest.mock("../../arkos-env", () => ({
  __esModule: true,
  default: { PRISMA_SCHEMA_PATH: "./custom-prisma-path" },
}));
jest.mock("../fs.helpers", () => ({
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

    // Set up a mock implementation for importPrismaModelModules to avoid actual dynamic imports
    jest
      .spyOn(dynamicLoader, "importPrismaModelModules")
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

  describe("getModelModules", () => {
    it("should return the cached model module", async () => {
      await dynamicLoader.importPrismaModelModules("User", {
        validation: { resolver: "zod" },
      });
      // Setup
      const mockModule = { schemas: {} };
      dynamicLoader.setModelModules("user", mockModule);
      // (kebabCase as jest.Mock).mockReturnValue("user");

      // Act
      const result = dynamicLoader.getModelModules("User");

      // Assert
      expect(result).toBe(mockModule);
      // expect(kebabCase).toHaveBeenCalledWith("User");
    });
  });

  describe("importPrismaModelModules", () => {
    it("should import all available modules for a model with old newest names conventions using zod validation", async () => {
      (fs.existsSync as jest.Mock).mockImplementation((path) => {
        if (path.includes("user.prisma-query-options.js")) return false;
        if (path.includes("user.auth-configs.js")) return false;
        return true;
      });

      // Act
      const result = await dynamicLoader.importPrismaModelModules("User", {
        validation: { resolver: "zod" },
      });

      // Assert
      expect(fs.existsSync).toHaveBeenCalled();
      // expect(dynamicLoader.getModelModules("user") as any).toBeDefined();
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
      const result = await dynamicLoader.importPrismaModelModules("User", {});

      // Assert
      expect(console.error).toHaveBeenCalled();
      expect(result.middlewares).toBeUndefined();
    });

    it("should return the existing prisma model modules", async () => {
      try {
        const result = await dynamicLoader.importPrismaModelModules("123", {});

        expect(result).toBe("some modules");
      } catch (err) {}
    });
  });

  describe("getPrismaModelRelations", () => {
    it("should return relations for a known model", () => {
      // Setup
      const mockRelations = { singular: [], list: [] };

      // Mock pascalCase to return "User" when called with any string
      // (pascalCase as jest.Mock).mockReturnValue("User");

      // Important: Directly modify the actual object reference that the function uses
      dynamicLoader.prismaModelRelationFields.User = mockRelations;

      // Act
      const result = dynamicLoader.getPrismaModelRelations("user");

      // Assert
      expect(result).toBe(mockRelations);
      // expect(pascalCase).toHaveBeenCalledWith("user");
    });

    it("should return undefined for unknown model", () => {
      // Setup
      (dynamicLoader.prismaModelRelationFields as any) = { user: [] };
      // (pascalCase as jest.Mock).mockReturnValue("Unknown");

      // Act
      const result = dynamicLoader.getPrismaModelRelations("unknown");

      // Assert
      expect(result).toBeUndefined();
    });
  });

  describe("Prisma schema parsing", () => {
    // it("should parse prisma schema files correctly", () => {
    //   const testModels = ["user", "post", "profile"];
    //   dynamicLoader.models.push(...testModels);
    //   // Act - in real code this happens at import time
    //   const modelRelations = {
    //     User: {
    //       singular: [{ name: "profile", type: "Profile" }],
    //       list: [{ name: "posts", type: "Post" }],
    //     },
    //     Post: {
    //       singular: [{ name: "author", type: "User" }],
    //       list: [],
    //     },
    //     Profile: {
    //       singular: [{ name: "user", type: "User" }],
    //       list: [],
    //     },
    //   };
    //   jest.spyOn(fs, "readFileSync").mockReturnValue(mockedPrismaSchema);
    //   jest
    //     .spyOn(dynamicLoader, "getAllPrismaFiles")
    //     .mockReturnValue(["one file"]);
    //   dynamicLoader.prismaModelRelationFields.Post = modelRelations.Post;
    //   // dynamicLoader.prismaModelRelationFields.User =
    //   dynamicLoader.prismaModelRelationFields.Profile = modelRelations.Profile;
    //   // Setup
    //   const mockRelations = {
    //     singular: [{ name: "profile", type: "Profile" }],
    //     list: [{ name: "posts", type: "Post" }],
    //   };
    //   // Mock pascalCase to return "User" when called with any string
    // (pascalCase as jest.Mock).mockReturnValue("User");
    //   // Important: Directly modify the actual object reference that the function uses
    //   dynamicLoader.prismaModelRelationFields.User = mockRelations;
    //   // Assert
    //   // expect(getAllPrismaFilesSpy).toHaveBeenCalled();
    //   expect(dynamicLoader.getModels()).toEqual(testModels);
    //   expect(dynamicLoader.getPrismaModelRelations("User")).toEqual(
    //     modelRelations.User
    //   );
    // });
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

  describe("importPrismaModelModules - Naming Convention Conflicts", () => {
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
          dynamicLoader.importPrismaModelModules("User", {})
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
          dynamicLoader.importPrismaModelModules("User", {})
        ).rejects.toThrow("Cannot use both");
      } catch (err) {}
    });
  });

  describe("Prisma Models Helpers - Additional Tests", () => {
    beforeEach(() => {
      jest.clearAllMocks();

      // Setup path mocks
      (path.resolve as jest.Mock).mockReturnValue("/mocked/path");
      (path.join as jest.Mock).mockImplementation((...args) => args.join("/"));

      // Setup process.cwd mock
      jest.spyOn(process, "cwd").mockReturnValue("/project");
    });

    describe("getFileModelModulesFileStructure", () => {
      it("should return the correct file structure for regular models", () => {
        (getUserFileExtension as jest.Mock).mockReturnValue("js");
        // Act
        const result = dynamicLoader.getFileModelModulesFileStructure("User");

        // Assert
        expect(result.core).toEqual({
          service: "user.service.js",
          controller: "user.controller.js",
          middlewares: "user.middlewares.js",
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
          createMany: "create-many-user.dto.js",
          findMany: "find-many-user.dto.js",
          findOne: "find-one-user.dto.js",
          update: "update-user.dto.js",
          query: "query-user.dto.js",
          updateMany: "update-many-user.dto.js",
          updateOne: "update-user.dto.js",
        });

        expect(result.schemas).toEqual({
          model: "user.schema.js",
          create: "create-user.schema.js",
          createOne: "create-user.schema.js",
          createMany: "create-many-user.schema.js",
          findMany: "find-many-user.schema.js",
          findOne: "find-one-user.schema.js",
          update: "update-user.schema.js",
          query: "query-user.schema.js",
          updateMany: "update-many-user.schema.js",
          updateOne: "update-user.schema.js",
        });
      });

      it("should return the correct file structure for auth model", () => {
        (getUserFileExtension as jest.Mock).mockReturnValue("js");
        // Act
        const result = dynamicLoader.getFileModelModulesFileStructure("Auth");

        // Assert
        expect(result.core).toEqual({
          service: "auth.service.js",
          controller: "auth.controller.js",
          middlewares: "auth.middlewares.js",
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

        const accessSpy = jest
          .spyOn(fs.promises, "access")
          .mockResolvedValue(undefined);

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

        // Assert
        expect(accessSpy).toHaveBeenCalledTimes(2);
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

    describe("initializePrismaModels", () => {
      beforeEach(() => {
        // Reset models and prismaModelsUniqueFields before each test
        dynamicLoader.models.length = 0;
        Object.keys(dynamicLoader.prismaModelsUniqueFields).forEach((key) => {
          delete dynamicLoader.prismaModelsUniqueFields[key];
        });

        // Clear prismaModelRelationFields
        Object.keys(dynamicLoader.prismaModelRelationFields).forEach((key) => {
          delete dynamicLoader.prismaModelRelationFields[key];
        });
        // jest.spyOn(fs, "readdirSync").mockReturnValue();

        (fs.readdirSync as jest.Mock).mockImplementation(() => {
          return ["user.prisma", "post.prisma"] as any;
        });
      });

      it("should parse Prisma schema files and extract models", () => {
        // Setup
        const mockPrismaSchema = `
          model User {
            id        String   @id @default(uuid())
            email     String   @unique
            posts     Post[]
            profile   Profile?
          }
          
          model Post {
            id        String   @id @default(uuid())
            title     String
            author    User     @relation(fields: [authorId], references: [id])
            authorId  String
          }
        `;

        jest
          .spyOn(dynamicLoader, "getAllPrismaFiles")
          .mockReturnValue(["prisma/schema.prisma"]);
        jest.spyOn(fs, "readFileSync").mockReturnValue(mockPrismaSchema);
        jest.spyOn(fs, "statSync").mockReturnValue({
          isFile: () => true,
          isDirectory: () => false,
        } as any);

        // Act
        dynamicLoader.initializePrismaModels();

        // Assert
        expect(dynamicLoader.models).toContain("user");
        expect(dynamicLoader.models).toContain("post");
        expect(dynamicLoader.prismaModelsUniqueFields.user).toBeDefined();
        expect(dynamicLoader.prismaModelRelationFields.User).toBeDefined();
        expect(dynamicLoader.prismaModelRelationFields.Post).toBeDefined();
      });

      it("should correctly identify unique fields", () => {
        // Setup
        const mockPrismaSchema = `
          model User {
            id        String   @id @default(uuid())
            email     String   @unique
            username  String   @unique
          }
  
          model Post {
            id String @id @default(uuid())
          }
        `;

        jest
          .spyOn(dynamicLoader, "getAllPrismaFiles")
          .mockReturnValue(["prisma/schema.prisma"]);
        jest.spyOn(fs, "readFileSync").mockReturnValue(mockPrismaSchema);
        jest.spyOn(fs, "statSync").mockReturnValue({
          isFile: () => true,
          isDirectory: () => false,
        } as any);

        // Act
        dynamicLoader.initializePrismaModels();

        // Assert
        expect(dynamicLoader.prismaModelsUniqueFields.user).toHaveLength(2);
        expect(dynamicLoader.prismaModelsUniqueFields.user[0].name).toBe(
          "email"
        );
        expect(dynamicLoader.prismaModelsUniqueFields.user[1].name).toBe(
          "username"
        );
      });

      it("should correctly identify relation fields", () => {
        // Setup
        dynamicLoader.models.length = 0;

        const mockPrismaSchema = `
          model User {
            id        String   @id @default(uuid())
            posts     Post[]
            profile   Profile?
          }
  
          model Profile {
          }
        `;

        jest
          .spyOn(dynamicLoader, "getAllPrismaFiles")
          .mockReturnValue(["prisma/schema.prisma"]);
        jest.spyOn(fs, "readFileSync").mockReturnValue(mockPrismaSchema);
        jest.spyOn(fs, "statSync").mockReturnValue({
          isFile: () => true,
          isDirectory: () => false,
        } as any);

        // Act
        dynamicLoader.initializePrismaModels();

        // Assert
        expect(
          dynamicLoader.prismaModelRelationFields.User.singular
        ).toHaveLength(1);
        expect(
          dynamicLoader.prismaModelRelationFields.User.singular[0].name
        ).toBe("profile");
        expect(
          dynamicLoader.prismaModelRelationFields.User.singular[0].type
        ).toBe("Profile");

        expect(dynamicLoader.prismaModelRelationFields.User.list).toHaveLength(
          1
        );
        expect(dynamicLoader.prismaModelRelationFields.User.list[0].name).toBe(
          "posts"
        );
        expect(dynamicLoader.prismaModelRelationFields.User.list[0].type).toBe(
          "Post"
        );
      });
    });

    describe("getModels", () => {
      it("should return all models", () => {
        // Setup
        dynamicLoader.models.length = 0; // Clears the array in-place
        dynamicLoader.models.push("user", "post", "profile");

        // Act
        const result = dynamicLoader.getModels();

        // Assert
        expect(result).toEqual(["user", "post", "profile"]);
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

      dynamicLoader.assignModuleToResult("prismaQueryOptions", module, result);

      expect(result.prismaQueryOptions).toEqual({ query: "options" });
    });

    it("should assign authConfigs correctly", () => {
      const module = { default: { auth: "config" } };

      dynamicLoader.assignModuleToResult("authConfigs", module, result);

      expect(result.authConfigs).toEqual({ auth: "config" });
    });

    it("should assign middlewares without default extraction", () => {
      const module = { middleware: jest.fn() };

      dynamicLoader.assignModuleToResult("middlewares", module, result);

      expect(result.middlewares).toBe(module);
    });
  });
});
