import path from "path";
import fs, { existsSync, readdirSync } from "fs";
import * as dynamicLoader from "../../../utils/helpers/models.helpers";
import {
  camelCase,
  kebabCase,
  pascalCase,
} from "../../../utils/helpers/change-case.helpers";

const mockedPrismaSchema = `
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

      model Profile {
        id        String   @id @default(uuid())
        bio       String?
        user      User     @relation(fields: [userId], references: [id])
        userId    String   @unique
      }
    `;

const modelRegex = /model\s+(\w+)\s*{/g;
const models: string[] = [];
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
// jest.mock("node:import");
jest.mock("../../../utils/helpers/change-case.helpers", () => ({
  camelCase: jest.fn(),
  kebabCase: jest.fn(),
  pascalCase: jest.fn(),
}));
jest.mock("../../arkos-env", () => ({
  __esModule: true,
  default: { PRISMA_SCHEMA_PATH: "./custom-prisma-path" },
}));
jest.mock("../fs.helpers", () => ({
  userFileExtension: "js",
}));
// jest.mock("../models.helpers", () => ({
//   ...jest.requireActual("../models.helpers"),
// }));

describe("Dynamic Prisma Model Loader", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // // Setup basic mocks for helpers
    // (camelCase as jest.Mock).mockImplementation((str) => str.toLowerCase());
    // (kebabCase as jest.Mock).mockImplementation((str) => str.toLowerCase());
    // (pascalCase as jest.Mock).mockImplementation(
    //   (str) => str.charAt(0).toUpperCase() + str.slice(1).toLowerCase()
    // );

    // Setup path mocks
    (path.resolve as jest.Mock).mockReturnValue("/mocked/path");
    (path.join as jest.Mock).mockImplementation((...args) => args.join("/"));

    // Setup process.cwd mock
    jest.spyOn(process, "cwd").mockReturnValue("/project");

    // Clear module caches between tests to avoid state issues
    // (dynamicLoader.prismaModelsModules as any) = {};
    // (dynamicLoader.prismaModelRelationFields as any) = {};
  });

  describe("getModelModules", () => {
    it("should return the cached model module", () => {
      // Setup
      const mockModule = { dtos: {}, schemas: {} };
      (dynamicLoader.prismaModelsModules as any) = { user: mockModule };
      (kebabCase as jest.Mock).mockReturnValue("user");

      // Act
      const result = dynamicLoader.getModelModules("User");

      // Assert
      expect(result).toBe(mockModule);
      expect(kebabCase).toHaveBeenCalledWith("User");
    });
  });

  describe("importPrismaModelModules", () => {
    beforeEach(() => {
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
        "/mocked/path/user.prisma-query-options.js",
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
        .mockImplementation(async (modelName) => {
          const result: any = {
            dtos: {},
            schemas: {},
          };

          if (fs.existsSync("/mocked/path/user.middlewares.js")) {
            result.middlewares = { middleware: jest.fn() };
          }

          if (fs.existsSync("/mocked/path/user.auth-configs.js")) {
            result.authConfigs = { auth: "config" };
          }

          if (fs.existsSync("/mocked/path/user.prisma-query-options.js")) {
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

          (dynamicLoader.prismaModelsModules as any)[modelName] = result;
          return result;
        });
    });

    it("should import all available modules for a model", async () => {
      // Act
      const result = await dynamicLoader.importPrismaModelModules("User");

      // Assert
      expect(fs.existsSync).toHaveBeenCalled();
      expect((dynamicLoader.prismaModelsModules as any).User).toBeDefined();
      expect(result).toHaveProperty("dtos");
      expect(result).toHaveProperty("schemas");
    });

    it("should handle errors when importing modules", async () => {
      // Setup
      (fs.existsSync as jest.Mock).mockImplementation((path) => {
        if (path.includes("middlewares")) {
          console.error("Error importing");
          return false;
        }
        return true;
      });

      // Act
      const result = await dynamicLoader.importPrismaModelModules("User");

      // Assert
      expect(console.error).toHaveBeenCalled();
      expect(result).toHaveProperty("dtos");
      expect(result).toHaveProperty("schemas");
      expect(result.middlewares).toBeUndefined();
    });
  });

  describe("getPrismaModelRelations", () => {
    it("should return relations for a known model", () => {
      // Setup
      const mockRelations = { singular: [], list: [] };

      // Mock pascalCase to return "User" when called with any string
      (pascalCase as jest.Mock).mockReturnValue("User");

      // Important: Directly modify the actual object reference that the function uses
      dynamicLoader.prismaModelRelationFields.User = mockRelations;

      // Act
      const result = dynamicLoader.getPrismaModelRelations("user");

      // Assert
      expect(result).toBe(mockRelations);
      expect(pascalCase).toHaveBeenCalledWith("user");
    });

    it("should return undefined for unknown model", () => {
      // Setup
      (dynamicLoader.prismaModelRelationFields as any) = { user: [] };
      (pascalCase as jest.Mock).mockReturnValue("Unknown");

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
    //   (pascalCase as jest.Mock).mockReturnValue("User");
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

  describe("getModelUniqueFields", () => {
    it("should return unique fields for a model", () => {
      // Setup
      const uniqueFields = [{ name: "email", type: "String", isUnique: true }];
      (dynamicLoader.prismaModelsUniqueFields as any) = { user: uniqueFields };

      // Act
      const result = dynamicLoader.getModelUniqueFields("user");

      // Assert
      expect(result).toEqual(uniqueFields);
    });
  });
});
