import generateZodJsonSchemas from "../generate-zod-json-schemas";
import * as modelsHelpers from "../../../../../../utils/helpers/dynamic-loader";
import * as swaggerRouterHelpers from "../../swagger.router.helpers";
import zodToJsonSchema from "zod-to-json-schema";
import { z } from "zod";

// Mock the dependencies
jest.mock("../../../../../../utils/helpers/dynamic-loader");
jest.mock("../../swagger.router.helpers");
jest.mock("zod-to-json-schema");
jest.mock("fs");

const mockGetModels = modelsHelpers.getModels as jest.Mock;
const mockgetModuleComponents = modelsHelpers.getModuleComponents as jest.Mock;
const mockGetCorrectJsonSchemaName =
  swaggerRouterHelpers.getCorrectJsonSchemaName as jest.Mock;
const mockZodToJsonSchema = zodToJsonSchema as jest.Mock;

describe("generateZodJsonSchemas", () => {
  // Mock console.warn to test error handling
  const originalConsoleWarn = console.warn;
  let mockConsoleWarn: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockConsoleWarn = jest.fn();
    console.warn = mockConsoleWarn;
  });

  afterEach(() => {
    console.warn = originalConsoleWarn;
  });

  describe("Edge Case: Empty models list", () => {
    it("should handle empty models list and return only auth schema", async () => {
      mockGetModels.mockReturnValue([]);
      mockgetModuleComponents.mockImplementation((modelName: string) => {
        if (modelName === "auth") {
          return {
            schemas: {
              login: z.object({ email: z.string(), password: z.string() }),
            },
          };
        }
        return null;
      });
      mockGetCorrectJsonSchemaName.mockReturnValue("AuthLoginSchema");
      mockZodToJsonSchema.mockReturnValue({
        type: "object",
        properties: {
          email: { type: "string" },
          password: { type: "string" },
        },
      });

      const result = await generateZodJsonSchemas();

      expect(mockGetModels).toHaveBeenCalledTimes(1);
      expect(mockgetModuleComponents).toHaveBeenCalledWith("auth");
      expect(result).toEqual({
        AuthLoginSchema: {
          type: "object",
          properties: {
            email: { type: "string" },
            password: { type: "string" },
          },
        },
      });
    });
  });

  describe("Edge Case: Models with no schemas", () => {
    it("should handle models with undefined schemas property", async () => {
      mockGetModels.mockReturnValue(["User", "Post"]);
      mockgetModuleComponents.mockImplementation((modelName: string) => {
        if (modelName === "User") return { schemas: undefined };
        if (modelName === "Post") return {};
        if (modelName === "auth") return null;
        return null;
      });

      const result = await generateZodJsonSchemas();

      expect(result).toEqual({});
      expect(mockZodToJsonSchema).not.toHaveBeenCalled();
      expect(mockGetCorrectJsonSchemaName).not.toHaveBeenCalled();
    });

    it("should handle models with null schemas property", async () => {
      mockGetModels.mockReturnValue(["User"]);
      mockgetModuleComponents.mockImplementation((modelName: string) => {
        if (modelName === "User") return { schemas: null };
        if (modelName === "auth") return null;
        return null;
      });

      const result = await generateZodJsonSchemas();

      expect(result).toEqual({});
    });

    it("should handle models with empty schemas object", async () => {
      mockGetModels.mockReturnValue(["User"]);
      mockgetModuleComponents.mockImplementation((modelName: string) => {
        if (modelName === "User") return { schemas: {} };
        if (modelName === "auth") return null;
        return null;
      });

      const result = await generateZodJsonSchemas();

      expect(result).toEqual({});
    });
  });

  describe("Edge Case: Null/undefined model modules", () => {
    it("should handle models that return null from getModuleComponents", async () => {
      mockGetModels.mockReturnValue(["NonExistent"]);
      mockgetModuleComponents.mockReturnValue(null);

      const result = await generateZodJsonSchemas();

      expect(result).toEqual({});
      expect(mockZodToJsonSchema).not.toHaveBeenCalled();
    });

    it("should handle models that return undefined from getModuleComponents", async () => {
      mockGetModels.mockReturnValue(["NonExistent"]);
      mockgetModuleComponents.mockReturnValue(undefined);

      const result = await generateZodJsonSchemas();

      expect(result).toEqual({});
    });
  });

  describe("Edge Case: Schema conversion errors", () => {
    it("should handle zodToJsonSchema throwing an error", async () => {
      const mockZodSchema = z.object({ name: z.string() });
      mockGetModels.mockReturnValue(["User"]);
      mockgetModuleComponents.mockImplementation((modelName: string) => {
        if (modelName === "User") {
          return {
            schemas: {
              create: mockZodSchema,
            },
          };
        }
        if (modelName === "auth") return null;
        return null;
      });
      mockGetCorrectJsonSchemaName.mockReturnValue("UserCreateSchema");
      mockZodToJsonSchema.mockImplementation(() => {
        throw new Error("Invalid zod schema");
      });

      const result = await generateZodJsonSchemas();

      expect(result).toEqual({});
      expect(mockConsoleWarn).toHaveBeenCalledWith(
        "Failed to generate schema for create User:",
        expect.any(Error)
      );
    });

    it("should continue processing other schemas when one fails", async () => {
      const mockZodSchema1 = z.object({ name: z.string() });
      const mockZodSchema2 = z.object({ title: z.string() });

      mockGetModels.mockReturnValue(["User"]);
      mockgetModuleComponents.mockImplementation((modelName: string) => {
        if (modelName === "User") {
          return {
            schemas: {
              create: mockZodSchema1,
              update: mockZodSchema2,
            },
          };
        }
        if (modelName === "auth") return null;
        return null;
      });

      mockGetCorrectJsonSchemaName.mockImplementation((schemaType: string) => {
        return `User${schemaType.charAt(0).toUpperCase() + schemaType.slice(1)}Schema`;
      });

      mockZodToJsonSchema.mockImplementation((schema) => {
        if (schema === mockZodSchema1) {
          throw new Error("Invalid schema");
        }
        return { type: "object", properties: { title: { type: "string" } } };
      });

      const result = await generateZodJsonSchemas();

      expect(result).toEqual({
        UserUpdateSchema: {
          type: "object",
          properties: { title: { type: "string" } },
        },
      });
      expect(mockConsoleWarn).toHaveBeenCalledTimes(1);
    });
  });

  describe("Edge Case: Null/undefined zod schemas", () => {
    it("should skip null zod schemas", async () => {
      mockGetModels.mockReturnValue(["User"]);
      mockgetModuleComponents.mockImplementation((modelName: string) => {
        if (modelName === "User") {
          return {
            schemas: {
              create: z.object({ name: z.string() }),
              update: null,
              delete: undefined,
            },
          };
        }
        if (modelName === "auth") return null;
        return null;
      });
      mockGetCorrectJsonSchemaName.mockReturnValue("UserCreateSchema");
      mockZodToJsonSchema.mockReturnValue({
        type: "object",
        properties: { name: { type: "string" } },
      });

      const result = await generateZodJsonSchemas();

      expect(result).toEqual({
        UserCreateSchema: {
          type: "object",
          properties: { name: { type: "string" } },
        },
      });
      expect(mockZodToJsonSchema).toHaveBeenCalledTimes(1);
      expect(mockGetCorrectJsonSchemaName).toHaveBeenCalledTimes(1);
    });
  });

  describe("Edge Case: Complex schema types", () => {
    it("should handle various schema types and names", async () => {
      const mockSchemas = {
        create: z.object({ name: z.string() }),
        update: z.object({ name: z.string().optional() }),
        findMany: z.object({ page: z.number() }),
        customValidation: z.array(z.string()),
      };

      mockGetModels.mockReturnValue(["User"]);
      mockgetModuleComponents.mockImplementation((modelName: string) => {
        if (modelName === "User") {
          return { schemas: mockSchemas };
        }
        if (modelName === "auth") return null;
        return null;
      });

      mockGetCorrectJsonSchemaName.mockImplementation(
        (schemaType: string, modelName: string) => {
          return `${modelName}${schemaType.charAt(0).toUpperCase() + schemaType.slice(1)}Schema`;
        }
      );

      mockZodToJsonSchema.mockImplementation((schema) => {
        if (schema === mockSchemas.create) {
          return { type: "object", properties: { name: { type: "string" } } };
        }
        if (schema === mockSchemas.update) {
          return { type: "object", properties: { name: { type: "string" } } };
        }
        if (schema === mockSchemas.findMany) {
          return { type: "object", properties: { page: { type: "number" } } };
        }
        if (schema === mockSchemas.customValidation) {
          return { type: "array", items: { type: "string" } };
        }
        return {};
      });

      const result = await generateZodJsonSchemas();

      expect(Object.keys(result)).toHaveLength(4);
      expect(result.UserCreateSchema).toBeDefined();
      expect(result.UserUpdateSchema).toBeDefined();
      expect(result.UserFindManySchema).toBeDefined();
      expect(result.UserCustomValidationSchema).toBeDefined();
      expect(mockGetCorrectJsonSchemaName).toHaveBeenCalledTimes(4);
    });
  });

  describe("Edge Case: Multiple models with mixed scenarios", () => {
    it("should handle multiple models with various edge cases combined", async () => {
      mockGetModels.mockReturnValue(["User", "Post", "Comment"]);
      mockgetModuleComponents.mockImplementation((modelName: string) => {
        switch (modelName) {
          case "User":
            return {
              schemas: {
                create: z.object({ email: z.string() }),
                update: null, // null schema
              },
            };
          case "Post":
            return null; // null model modules
          case "Comment":
            return {
              schemas: {
                create: z.object({ content: z.string() }),
              },
            };
          case "auth":
            return {
              schemas: {
                login: z.object({ email: z.string(), password: z.string() }),
              },
            };
          default:
            return null;
        }
      });

      mockGetCorrectJsonSchemaName.mockImplementation(
        (schemaType: string, modelName: string) => {
          return `${modelName}${schemaType.charAt(0).toUpperCase() + schemaType.slice(1)}Schema`;
        }
      );

      mockZodToJsonSchema.mockImplementation((schema) => {
        const schemaMap = new Map();
        schemaMap.set("User-create", {
          type: "object",
          properties: { email: { type: "string" } },
        });
        schemaMap.set("Comment-create", {
          type: "object",
          properties: { content: { type: "string" } },
        });
        schemaMap.set("auth-login", {
          type: "object",
          properties: {
            email: { type: "string" },
            password: { type: "string" },
          },
        });

        // Simplified mapping - in real scenario you'd match the actual zod schema objects
        return { type: "object", properties: {} };
      });

      const result = await generateZodJsonSchemas();

      expect(mockgetModuleComponents).toHaveBeenCalledWith("User");
      expect(mockgetModuleComponents).toHaveBeenCalledWith("Post");
      expect(mockgetModuleComponents).toHaveBeenCalledWith("Comment");
      expect(mockgetModuleComponents).toHaveBeenCalledWith("auth");

      // Should only have schemas from User, Comment, and auth (Post returns null)
      expect(Object.keys(result)).toHaveLength(3);
    });
  });

  describe("Edge Case: Auth model special handling", () => {
    it("should always include auth model even when not in getModels result", async () => {
      mockGetModels.mockReturnValue(["User"]);
      mockgetModuleComponents.mockImplementation((modelName: string) => {
        if (modelName === "User") {
          return { schemas: { create: z.object({ name: z.string() }) } };
        }
        if (modelName === "auth") {
          return {
            schemas: {
              login: z.object({ email: z.string() }),
              register: z.object({ email: z.string(), password: z.string() }),
            },
          };
        }
        return null;
      });

      mockGetCorrectJsonSchemaName.mockImplementation(
        (schemaType: string, modelName: string) => {
          return `${modelName}${schemaType.charAt(0).toUpperCase() + schemaType.slice(1)}Schema`;
        }
      );

      mockZodToJsonSchema.mockReturnValue({ type: "object" });

      const result = await generateZodJsonSchemas();

      expect(mockgetModuleComponents).toHaveBeenCalledWith("auth");
      expect(Object.keys(result)).toHaveLength(3); // User create + auth login + auth register
    });

    it("should handle auth model returning no schemas", async () => {
      mockGetModels.mockReturnValue([]);
      mockgetModuleComponents.mockImplementation((modelName: string) => {
        if (modelName === "auth") return null;
        return null;
      });

      const result = await generateZodJsonSchemas();

      expect(mockgetModuleComponents).toHaveBeenCalledWith("auth");
      expect(result).toEqual({});
    });
  });

  describe("Edge Case: Schema name generation", () => {
    it("should handle special characters and edge cases in schema names", async () => {
      mockGetModels.mockReturnValue(["WeirdModel"]);
      mockgetModuleComponents.mockImplementation((modelName: string) => {
        if (modelName === "WeirdModel") {
          return {
            schemas: {
              "create-special": z.object({ name: z.string() }),
              "update.dotted": z.object({ name: z.string() }),
              "123numeric": z.object({ name: z.string() }),
            },
          };
        }
        if (modelName === "auth") return null;
        return null;
      });

      mockGetCorrectJsonSchemaName.mockImplementation(
        (schemaType: string, modelName: string) => {
          return `${modelName}_${schemaType}_Schema`;
        }
      );

      mockZodToJsonSchema.mockReturnValue({ type: "object" });

      const result = await generateZodJsonSchemas();

      expect(mockGetCorrectJsonSchemaName).toHaveBeenCalledWith(
        "create-special",
        "WeirdModel",
        "Schema"
      );
      expect(mockGetCorrectJsonSchemaName).toHaveBeenCalledWith(
        "update.dotted",
        "WeirdModel",
        "Schema"
      );
      expect(mockGetCorrectJsonSchemaName).toHaveBeenCalledWith(
        "123numeric",
        "WeirdModel",
        "Schema"
      );
      expect(Object.keys(result)).toHaveLength(3);
    });
  });

  describe("Integration scenarios", () => {
    it("should handle a realistic scenario with multiple models and various schema types", async () => {
      const userCreateSchema = z.object({
        email: z.string().email(),
        name: z.string().min(1),
      });
      const userUpdateSchema = z.object({
        email: z.string().email().optional(),
        name: z.string().min(1).optional(),
      });
      const postCreateSchema = z.object({
        title: z.string(),
        content: z.string(),
      });

      mockGetModels.mockReturnValue(["User", "Post"]);
      mockgetModuleComponents.mockImplementation((modelName: string) => {
        switch (modelName) {
          case "User":
            return {
              schemas: {
                create: userCreateSchema,
                update: userUpdateSchema,
              },
            };
          case "Post":
            return {
              schemas: {
                create: postCreateSchema,
              },
            };
          case "auth":
            return null;
          default:
            return null;
        }
      });

      mockGetCorrectJsonSchemaName.mockImplementation(
        (schemaType: string, modelName: string) => {
          return `${modelName}${schemaType.charAt(0).toUpperCase() + schemaType.slice(1)}Schema`;
        }
      );

      mockZodToJsonSchema.mockImplementation((schema) => {
        if (schema === userCreateSchema) {
          return {
            type: "object",
            properties: {
              email: { type: "string", format: "email" },
              name: { type: "string", minLength: 1 },
            },
            required: ["email", "name"],
          };
        }
        if (schema === userUpdateSchema) {
          return {
            type: "object",
            properties: {
              email: { type: "string", format: "email" },
              name: { type: "string", minLength: 1 },
            },
          };
        }
        if (schema === postCreateSchema) {
          return {
            type: "object",
            properties: {
              title: { type: "string" },
              content: { type: "string" },
            },
            required: ["title", "content"],
          };
        }
        return {};
      });

      const result = await generateZodJsonSchemas();

      expect(Object.keys(result)).toHaveLength(3);
      expect(result.UserCreateSchema).toEqual({
        type: "object",
        properties: {
          email: { type: "string", format: "email" },
          name: { type: "string", minLength: 1 },
        },
        required: ["email", "name"],
      });
      expect(result.UserUpdateSchema).toBeDefined();
      expect(result.PostCreateSchema).toBeDefined();
    });
  });
});
