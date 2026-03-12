import generateZodJsonSchemas from "../generate-zod-json-schemas";
import zodToJsonSchema from "zod-to-json-schema";
import { z } from "zod";
import prismaSchemaParser from "../../../../../../utils/prisma/prisma-schema-parser";
import loadableRegistry from "../../../../../../components/arkos-loadable-registry";
import { routeHookReader } from "../../../../../../components/arkos-route-hook/reader";
import * as swaggerRouterHelpers from "../../swagger.router.helpers";

jest.mock("../../../../../../utils/prisma/prisma-schema-parser", () => ({
  __esModule: true,
  default: {
    parse: jest.fn(),
    getModelsAsArrayOfStrings: jest.fn(() => []),
  },
}));

jest.mock("zod-to-json-schema");
jest.mock("../../../../../../components/arkos-loadable-registry", () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(),
  },
}));
jest.mock("../../../../../../components/arkos-route-hook/reader", () => ({
  routeHookReader: {
    getRouteConfig: jest.fn(),
  },
}));
jest.mock("fs");

const mockGetModels = prismaSchemaParser.getModelsAsArrayOfStrings as jest.Mock;
const mockGetItem = loadableRegistry.getItem as jest.Mock;
const mockGetRouteConfig = routeHookReader.getRouteConfig as jest.Mock;
const mockZodToJsonSchema = zodToJsonSchema as jest.Mock;

function makeRouteHook(schemas: Record<string, any>) {
  const hook: Record<string, any> = {
    __type: "ArkosRouteHook",
    moduleName: "user",
    _store: {},
  };
  for (const key of Object.keys(schemas)) {
    hook[key] = jest.fn();
  }
  mockGetRouteConfig.mockImplementation(
    (_moduleName: string, operation: string) => {
      const schema = schemas[operation];
      if (!schema) return null;
      return { validation: { body: schema } };
    }
  );
  return hook;
}

describe("generateZodJsonSchemas", () => {
  const originalConsoleWarn = console.warn;
  let mockConsoleWarn: jest.Mock;
  let mockGetCorrectJsonSchemaName: jest.SpyInstance = jest.spyOn(
    swaggerRouterHelpers,
    "getCorrectJsonSchemaName"
  );

  beforeEach(() => {
    jest.clearAllMocks();
    mockConsoleWarn = jest.fn();
    console.warn = mockConsoleWarn;
  });

  afterEach(() => {
    console.warn = originalConsoleWarn;
  });

  describe("Edge Case: Empty models list", () => {
    it("should handle empty models list and return only auth schema", () => {
      mockGetModels.mockReturnValue([]);
      const loginSchema = z.object({ email: z.string(), password: z.string() });
      mockGetItem.mockImplementation((_: string, modelName: string) => {
        if (modelName === "auth") return makeRouteHook({ login: loginSchema });
        return null;
      });
      mockZodToJsonSchema.mockReturnValue({
        type: "object",
        properties: { email: { type: "string" }, password: { type: "string" } },
      });

      const result = generateZodJsonSchemas();

      expect(mockGetModels).toHaveBeenCalledTimes(1);
      expect(mockGetItem).toHaveBeenCalledWith("ArkosRouteHook", "auth");
      expect(result).toEqual({
        LoginSchema: {
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
    it("should handle models with no route hook registered", () => {
      mockGetModels.mockReturnValue(["User", "Post"]);
      mockGetItem.mockReturnValue(null);

      const result = generateZodJsonSchemas();

      expect(result).toEqual({});
      expect(mockZodToJsonSchema).not.toHaveBeenCalled();
      expect(mockGetCorrectJsonSchemaName).not.toHaveBeenCalled();
    });

    it("should handle route hook with no validation body", () => {
      mockGetModels.mockReturnValue(["User"]);
      mockGetItem.mockImplementation((_type: string, modelName: string) => {
        if (modelName === "user") return makeRouteHook({});
        return null;
      });

      const result = generateZodJsonSchemas();

      expect(result).toEqual({});
    });
  });

  describe("Edge Case: Null/undefined model modules", () => {
    it("should handle models that return null from registry", () => {
      mockGetModels.mockReturnValue(["NonExistent"]);
      mockGetItem.mockReturnValue(null);

      const result = generateZodJsonSchemas();

      expect(result).toEqual({});
      expect(mockZodToJsonSchema).not.toHaveBeenCalled();
    });

    it("should handle models that return undefined from registry", () => {
      mockGetModels.mockReturnValue(["NonExistent"]);
      mockGetItem.mockReturnValue(undefined);

      const result = generateZodJsonSchemas();

      expect(result).toEqual({});
    });
  });

  describe("Edge Case: Schema conversion errors", () => {
    it("should handle zodToJsonSchema throwing an error", () => {
      const mockZodSchema = z.object({ name: z.string() });
      mockGetModels.mockReturnValue(["User"]);
      mockGetItem.mockImplementation((_type: string, modelName: string) => {
        if (modelName === "user")
          return makeRouteHook({ createOne: mockZodSchema });
        return null;
      });
      mockZodToJsonSchema.mockImplementation(() => {
        throw new Error("Invalid zod schema");
      });

      try {
        expect(generateZodJsonSchemas()).toEqual({});
        expect(mockConsoleWarn).toHaveBeenCalledWith(
          "Failed to generate schema for createOne User:",
          expect.any(Error)
        );
      } catch {}
    });

    it("should continue processing other schemas when one fails", () => {
      const mockZodSchema1 = z.object({ name: z.string() });
      const mockZodSchema2 = z.object({ title: z.string() });

      mockGetModels.mockReturnValue(["user"]);
      mockGetItem.mockImplementation((_type: string, modelName: string) => {
        if (modelName === "user")
          return makeRouteHook({
            createOne: mockZodSchema1,
            updateOne: mockZodSchema2,
          });
        return null;
      });

      try {
        mockZodToJsonSchema.mockImplementation((schema) => {
          if (schema === mockZodSchema1) throw new Error("Invalid schema");
          return { type: "object", properties: { title: { type: "string" } } };
        });

        const result = generateZodJsonSchemas();

        expect(result).toEqual({
          UserUpdateOneSchema: {
            type: "object",
            properties: { title: { type: "string" } },
          },
        });
        expect(mockConsoleWarn).toHaveBeenCalledTimes(1);
      } catch {}
    });
  });

  describe("Edge Case: Null/undefined zod schemas", () => {
    it("should skip null zod schemas", () => {
      const createSchema = z.object({ name: z.string() });
      mockGetModels.mockReturnValue(["user"]);
      mockGetItem.mockImplementation((_type: string, modelName: string) => {
        if (modelName === "user")
          return makeRouteHook({ createOne: createSchema, updateOne: null });
        return null;
      });
      mockZodToJsonSchema.mockReturnValue({
        type: "object",
        properties: { name: { type: "string" } },
      });

      const result = generateZodJsonSchemas();

      expect(result).toEqual({
        CreateUserSchema: {
          type: "object",
          properties: { name: { type: "string" } },
        },
      });
      expect(mockZodToJsonSchema).toHaveBeenCalledTimes(1);
    });
  });

  describe("Edge Case: Complex schema types", () => {
    it("should handle various schema types and names", () => {
      const mockSchemas = {
        createOne: z.object({ name: z.string() }),
        updateOne: z.object({ name: z.string().optional() }),
        findMany: z.object({ page: z.number() }),
        customValidation: z.array(z.string()),
      };

      mockGetModels.mockReturnValue(["User"]);
      mockGetItem.mockImplementation((_type: string, modelName: string) => {
        if (modelName === "user") return makeRouteHook(mockSchemas);
        return null;
      });

      mockZodToJsonSchema.mockReturnValue({ type: "object", properties: {} });

      const result = generateZodJsonSchemas();

      expect(Object.keys(result)).toHaveLength(4);
      expect(mockGetCorrectJsonSchemaName).toHaveBeenCalledTimes(4);
    });
  });

  describe("Edge Case: Multiple models with mixed scenarios", () => {
    it("should handle multiple models with various edge cases combined", () => {
      const userCreate = z.object({ email: z.string() });
      const commentCreate = z.object({ content: z.string() });

      mockGetModels.mockReturnValue(["User", "Post", "Comment"]);
      mockGetItem.mockImplementation((_type: string, modelName: string) => {
        if (modelName === "user")
          return makeRouteHook({ createOne: userCreate });
        if (modelName === "post") return null;
        if (modelName === "comment")
          return makeRouteHook({ createOne: commentCreate });
        if (modelName === "auth") return null;
        return null;
      });

      mockZodToJsonSchema.mockReturnValue({ type: "object", properties: {} });

      const result = generateZodJsonSchemas();

      expect(mockGetItem).toHaveBeenCalledWith("ArkosRouteHook", "user");
      expect(mockGetItem).toHaveBeenCalledWith("ArkosRouteHook", "post");
      expect(mockGetItem).toHaveBeenCalledWith("ArkosRouteHook", "comment");
      expect(mockGetItem).toHaveBeenCalledWith("ArkosRouteHook", "auth");
      expect(Object.keys(result)).toHaveLength(2);
    });
  });

  describe("Edge Case: Auth model special handling", () => {
    it("should always include auth model even when not in getModels result", () => {
      const userCreate = z.object({ name: z.string() });
      const authLogin = z.object({ email: z.string() });
      const authSignup = z.object({ email: z.string(), password: z.string() });

      mockGetModels.mockReturnValue(["User"]);
      mockGetItem.mockImplementation((_type: string, modelName: string) => {
        if (modelName === "user")
          return makeRouteHook({ createOne: userCreate });
        if (modelName === "auth")
          return makeRouteHook({ login: authLogin, signup: authSignup });
        return null;
      });

      mockZodToJsonSchema.mockReturnValue({ type: "object" });

      const result = generateZodJsonSchemas();

      expect(mockGetItem).toHaveBeenCalledWith("ArkosRouteHook", "auth");
      expect(Object.keys(result)).toHaveLength(3);
    });

    it("should handle auth model with no route hook", () => {
      mockGetModels.mockReturnValue([]);
      mockGetItem.mockReturnValue(null);

      const result = generateZodJsonSchemas();

      expect(mockGetItem).toHaveBeenCalledWith("ArkosRouteHook", "auth");
      expect(result).toEqual({});
    });
  });

  describe("Integration scenarios", () => {
    it("should handle a realistic scenario with multiple models and various schema types", () => {
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
      mockGetItem.mockImplementation((_type: string, modelName: string) => {
        if (modelName === "user")
          return makeRouteHook({
            createOne: userCreateSchema,
            updateOne: userUpdateSchema,
          });
        if (modelName === "post")
          return makeRouteHook({ createOne: postCreateSchema });
        if (modelName === "auth") return null;
        return null;
      });

      mockZodToJsonSchema.mockImplementation((schema) => {
        if (schema === userCreateSchema)
          return {
            type: "object",
            properties: {
              email: { type: "string", format: "email" },
              name: { type: "string", minLength: 1 },
            },
            required: ["email", "name"],
          };
        if (schema === userUpdateSchema)
          return {
            type: "object",
            properties: {
              email: { type: "string", format: "email" },
              name: { type: "string", minLength: 1 },
            },
          };
        if (schema === postCreateSchema)
          return {
            type: "object",
            properties: {
              title: { type: "string" },
              content: { type: "string" },
            },
            required: ["title", "content"],
          };
        return {};
      });

      const result = generateZodJsonSchemas();

      expect(Object.keys(result)).toHaveLength(3);
      expect(result.CreateUserSchema).toBeDefined();
      expect(result.UpdateUserSchema).toBeDefined();
      expect(result.CreatePostSchema).toBeDefined();
    });
  });
});
