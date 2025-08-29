import { generatePrismaJsonSchemas } from "../generate-prisma-json-schemas";
import prismaSchemaParser from "../../../../../../utils/prisma/prisma-schema-parser";
import { ArkosConfig } from "../../../../../../exports";
import PrismaJsonSchemaGenerator from "../../../../../../utils/prisma/prisma-json-schema-generator";

// Mock the dependencies
jest.mock("../../../../../../utils/dynamic-loader");
jest.mock("../../../../../../utils/prisma/prisma-json-schema-generator");
jest.mock("fs");

const mockGetModels = jest.spyOn(
  prismaSchemaParser,
  "getModelsAsArrayOfStrings"
);
const mockPrismaJsonSchemaGenerator =
  PrismaJsonSchemaGenerator as jest.Mocked<
    typeof PrismaJsonSchemaGenerator
  >;

describe("generatePrismaJsonSchemas", () => {
  let arkosConfig: ArkosConfig;
  const originalConsoleError = console.error;
  let mockConsoleError: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    arkosConfig = {
      swagger: {
        mode: "prisma",
        strict: false,
      },
    };

    mockConsoleError = jest.fn();
    console.error = mockConsoleError;
  });

  afterEach(() => {
    console.error = originalConsoleError;
  });

  describe("Edge Case: Empty models list", () => {
    it("should handle empty models list and only process auth", async () => {
      mockGetModels.mockReturnValue([]);
      mockPrismaJsonSchemaGenerator.generateModelSchemas.mockResolvedValue(
        {
          AuthLoginSchema: {
            type: "object",
            properties: {
              email: { type: "string" },
              password: { type: "string" },
            },
          },
        }
      );

      const result = await generatePrismaJsonSchemas(arkosConfig);

      expect(mockGetModels).toHaveBeenCalledTimes(1);
      expect(
        mockPrismaJsonSchemaGenerator.generateModelSchemas
      ).toHaveBeenCalledTimes(1);
      expect(
        mockPrismaJsonSchemaGenerator.generateModelSchemas
      ).toHaveBeenCalledWith({
        modelName: "auth",
        arkosConfig,
      });
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

    it("should return empty object when no models and auth returns empty", async () => {
      mockGetModels.mockReturnValue([]);
      mockPrismaJsonSchemaGenerator.generateModelSchemas.mockResolvedValue(
        {}
      );

      const result = await generatePrismaJsonSchemas(arkosConfig);

      expect(result).toEqual({});
    });
  });

  describe("Edge Case: Single model scenarios", () => {
    it("should handle single model with multiple schemas", async () => {
      mockGetModels.mockReturnValue(["User"]);
      mockPrismaJsonSchemaGenerator.generateModelSchemas.mockImplementation(
        async ({ modelName }): Promise<any> => {
          if (modelName === "User") {
            return {
              CreateUserModelSchema: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  email: { type: "string" },
                },
              },
              UpdateUserModelSchema: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  email: { type: "string" },
                },
              },
            };
          }
          if (modelName === "auth") {
            return {};
          }
          return {};
        }
      );

      const result = await generatePrismaJsonSchemas(arkosConfig);

      expect(
        mockPrismaJsonSchemaGenerator.generateModelSchemas
      ).toHaveBeenCalledTimes(2);
      expect(result).toEqual({
        CreateUserModelSchema: {
          type: "object",
          properties: { name: { type: "string" }, email: { type: "string" } },
        },
        UpdateUserModelSchema: {
          type: "object",
          properties: { name: { type: "string" }, email: { type: "string" } },
        },
      });
    });

    it("should handle model returning null/undefined schemas", async () => {
      mockGetModels.mockReturnValue(["User"]);
      mockPrismaJsonSchemaGenerator.generateModelSchemas.mockImplementation(
        async ({ modelName }) => {
          if (modelName === "User") {
            return null as any;
          }
          if (modelName === "auth") {
            return undefined as any;
          }
          return {};
        }
      );

      const result = await generatePrismaJsonSchemas(arkosConfig);

      expect(result).toEqual({});
    });
  });

  describe("Edge Case: Multiple models with mixed results", () => {
    it("should handle multiple models with various schema results", async () => {
      mockGetModels.mockReturnValue(["User", "Post", "Comment"]);
      mockPrismaJsonSchemaGenerator.generateModelSchemas.mockImplementation(
        async ({ modelName }): Promise<any> => {
          switch (modelName) {
            case "User":
              return {
                CreateUserModelSchema: {
                  type: "object",
                  properties: { name: { type: "string" } },
                },
                UpdateUserModelSchema: {
                  type: "object",
                  properties: { name: { type: "string" } },
                },
              };
            case "Post":
              return {
                PostCreateSchema: {
                  type: "object",
                  properties: { title: { type: "string" } },
                },
              };
            case "Comment":
              return {}; // Empty schemas
            case "auth":
              return {
                AuthLoginSchema: {
                  type: "object",
                  properties: { email: { type: "string" } },
                },
              };
            default:
              return {};
          }
        }
      );

      const result = await generatePrismaJsonSchemas(arkosConfig);

      expect(
        mockPrismaJsonSchemaGenerator.generateModelSchemas
      ).toHaveBeenCalledTimes(4);
      expect(Object.keys(result)).toHaveLength(4);
      expect(result.CreateUserModelSchema).toBeDefined();
      expect(result.UpdateUserModelSchema).toBeDefined();
      expect(result.PostCreateSchema).toBeDefined();
      expect(result.AuthLoginSchema).toBeDefined();
    });

    it("should properly merge schemas with overlapping property names", async () => {
      mockGetModels.mockReturnValue(["User", "Post"]);
      mockPrismaJsonSchemaGenerator.generateModelSchemas.mockImplementation(
        async ({ modelName }): Promise<any> => {
          switch (modelName) {
            case "User":
              return {
                CreateSchema: {
                  type: "object",
                  properties: { name: { type: "string" } },
                },
                UpdateSchema: {
                  type: "object",
                  properties: { name: { type: "string" } },
                },
              };
            case "Post":
              return {
                CreateSchema: {
                  type: "object",
                  properties: { title: { type: "string" } },
                }, // Same key name
                DeleteSchema: {
                  type: "object",
                  properties: { id: { type: "string" } },
                },
              };
            case "auth":
              return {};
            default:
              return {};
          }
        }
      );

      const result = await generatePrismaJsonSchemas(arkosConfig);

      // Later schemas should overwrite earlier ones with same keys
      expect(result.CreateSchema).toEqual({
        type: "object",
        properties: { title: { type: "string" } },
      });
      expect(result.UpdateSchema).toBeDefined();
      expect(result.DeleteSchema).toBeDefined();
    });
  });

  describe("Edge Case: Error handling scenarios", () => {
    it("should handle single model throwing an error", async () => {
      mockGetModels.mockReturnValue(["User"]);
      mockPrismaJsonSchemaGenerator.generateModelSchemas.mockImplementation(
        async ({ modelName }): Promise<any> => {
          if (modelName === "User") {
            throw new Error("Failed to generate User schemas");
          }
          if (modelName === "auth") {
            return { AuthLoginSchema: { type: "object" } };
          }
          return {};
        }
      );

      await expect(generatePrismaJsonSchemas(arkosConfig)).rejects.toThrow(
        "Failed to generate User schemas"
      );
      expect(mockConsoleError).toHaveBeenCalledWith(expect.any(Error));
    });

    it("should handle multiple models with one throwing error", async () => {
      mockGetModels.mockReturnValue(["User", "Post"]);
      mockPrismaJsonSchemaGenerator.generateModelSchemas.mockImplementation(
        async ({ modelName }): Promise<any> => {
          if (modelName === "User") {
            return { CreateUserModelSchema: { type: "object" } };
          }
          if (modelName === "Post") {
            throw new Error("Post schema generation failed");
          }
          if (modelName === "auth") {
            return {};
          }
          return {};
        }
      );

      await expect(generatePrismaJsonSchemas(arkosConfig)).rejects.toThrow(
        "Post schema generation failed"
      );
      expect(mockConsoleError).toHaveBeenCalledWith(expect.any(Error));
    });

    it("should handle auth model throwing error", async () => {
      mockGetModels.mockReturnValue(["User"]);
      mockPrismaJsonSchemaGenerator.generateModelSchemas.mockImplementation(
        async ({ modelName }): Promise<any> => {
          if (modelName === "User") {
            return { CreateUserModelSchema: { type: "object" } };
          }
          if (modelName === "auth") {
            throw new Error("Auth schema generation failed");
          }
          return {};
        }
      );

      await expect(generatePrismaJsonSchemas(arkosConfig)).rejects.toThrow(
        "Auth schema generation failed"
      );
      expect(mockConsoleError).toHaveBeenCalledWith(expect.any(Error));
    });

    it("should handle Promise.all rejection properly", async () => {
      mockGetModels.mockReturnValue(["User", "Post"]);
      mockPrismaJsonSchemaGenerator.generateModelSchemas.mockImplementation(
        async ({ modelName }) => {
          // Simulate multiple async operations with one failing
          if (modelName === "User") {
            return new Promise((resolve) =>
              setTimeout(() => resolve({ UserSchema: { type: "object" } }), 10)
            );
          }
          if (modelName === "Post") {
            return new Promise((_, reject) =>
              setTimeout(() => reject(new Error("Async error")), 5)
            );
          }
          if (modelName === "auth") {
            return {};
          }
          return {};
        }
      );

      await expect(generatePrismaJsonSchemas(arkosConfig)).rejects.toThrow(
        "Async error"
      );
      expect(mockConsoleError).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe("Edge Case: ArkosConfig variations", () => {
    it("should handle minimal arkosConfig", async () => {
      const minimalConfig: ArkosConfig = {};
      mockGetModels.mockReturnValue(["User"]);
      mockPrismaJsonSchemaGenerator.generateModelSchemas.mockResolvedValue(
        {
          CreateUserModelSchema: { type: "object" },
        }
      );

      const result = await generatePrismaJsonSchemas(minimalConfig);

      expect(
        mockPrismaJsonSchemaGenerator.generateModelSchemas
      ).toHaveBeenCalledWith({
        modelName: "User",
        arkosConfig: minimalConfig,
      });
      expect(result).toEqual({ CreateUserModelSchema: { type: "object" } });
    });

    it("should handle complex arkosConfig", async () => {
      const complexConfig: ArkosConfig = {
        swagger: {
          mode: "zod",
          strict: true,
        },
        authentication: {
          mode: "static",
        },
      };

      mockGetModels.mockReturnValue(["User"]);
      mockPrismaJsonSchemaGenerator.generateModelSchemas.mockResolvedValue(
        {
          CreateUserModelSchema: { type: "object" },
        }
      );

      await generatePrismaJsonSchemas(complexConfig);

      expect(
        mockPrismaJsonSchemaGenerator.generateModelSchemas
      ).toHaveBeenCalledWith({
        modelName: "User",
        arkosConfig: complexConfig,
      });
    });
  });

  describe("Edge Case: Auth model special handling", () => {
    it("should always include auth model even when not in getModels result", async () => {
      mockGetModels.mockReturnValue(["User", "Post"]);

      const mockCalls: string[] = [];
      mockPrismaJsonSchemaGenerator.generateModelSchemas.mockImplementation(
        async ({ modelName }) => {
          mockCalls.push(modelName);
          return { [`${modelName}Schema`]: { type: "object" } };
        }
      );

      await generatePrismaJsonSchemas(arkosConfig);

      expect(mockCalls).toContain("auth");
      expect(mockCalls).toContain("User");
      expect(mockCalls).toContain("Post");
      expect(mockCalls).toHaveLength(3);
    });

    it("should not duplicate auth model if it's already in getModels result", async () => {
      mockGetModels.mockReturnValue(["User", "Post"]);

      const mockCalls: string[] = [];
      mockPrismaJsonSchemaGenerator.generateModelSchemas.mockImplementation(
        async ({ modelName }) => {
          mockCalls.push(modelName);
          return { [`${modelName}Schema`]: { type: "object" } };
        }
      );

      await generatePrismaJsonSchemas(arkosConfig);

      // Should have auth only once
      const authCalls = mockCalls.filter((call) => call === "auth");
      expect(authCalls).toHaveLength(1);
      expect(mockCalls).toHaveLength(3); // User, auth, Post
    });
  });

  describe("Edge Case: Large datasets and performance", () => {
    it("should handle many models efficiently with Promise.all", async () => {
      const manyModels = Array.from({ length: 50 }, (_, i) => `Model${i}`);
      mockGetModels.mockReturnValue(manyModels);

      const startTime = Date.now();
      mockPrismaJsonSchemaGenerator.generateModelSchemas.mockImplementation(
        async ({ modelName }) => {
          // Simulate some async work
          await new Promise((resolve) => setTimeout(resolve, 1));
          return { [`${modelName}Schema`]: { type: "object" } };
        }
      );

      const result = await generatePrismaJsonSchemas(arkosConfig);

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should complete in reasonable time (parallel processing)
      expect(duration).toBeLessThan(1000); // Less than 1 second
      expect(Object.keys(result)).toHaveLength(51); // 50 models + auth
      expect(
        mockPrismaJsonSchemaGenerator.generateModelSchemas
      ).toHaveBeenCalledTimes(51);
    });
  });

  describe("Edge Case: Schema merging edge cases", () => {
    it("should handle schemas with nested objects and arrays", async () => {
      mockGetModels.mockReturnValue(["User"]);
      mockPrismaJsonSchemaGenerator.generateModelSchemas.mockImplementation(
        async ({ modelName }: any): Promise<any> => {
          if (modelName === "User") {
            return {
              CreateUserModelSchema: {
                type: "object",
                properties: {
                  profile: {
                    type: "object",
                    properties: {
                      bio: { type: "string" },
                      tags: {
                        type: "array",
                        items: { type: "string" },
                      },
                    },
                  },
                },
              },
            };
          }
          if (modelName === "auth") {
            return {
              AuthComplexSchema: {
                type: "object",
                properties: {
                  permissions: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        resource: { type: "string" },
                        actions: {
                          type: "array",
                          items: { type: "string" },
                        },
                      },
                    },
                  },
                },
              },
            };
          }
          return {};
        }
      );

      const result = await generatePrismaJsonSchemas(arkosConfig);

      expect(result.CreateUserModelSchema.properties?.profile.type).toBe(
        "object"
      );
      expect(
        result.CreateUserModelSchema.properties?.profile.properties?.tags.type
      ).toBe("array");
      expect(result.AuthComplexSchema.properties?.permissions.type).toBe(
        "array"
      );
    });

    it("should handle empty and null schema values in merge", async () => {
      mockGetModels.mockReturnValue(["User", "Post"]);
      mockPrismaJsonSchemaGenerator.generateModelSchemas.mockImplementation(
        async ({ modelName }) => {
          switch (modelName) {
            case "User":
              return {
                ValidSchema: { type: "object" },
                NullSchema: null,
                UndefinedSchema: undefined,
              } as any;
            case "Post":
              return {
                AnotherValidSchema: { type: "object" },
              };
            case "auth":
              return {};
            default:
              return {};
          }
        }
      );

      const result = await generatePrismaJsonSchemas(arkosConfig);

      expect(result.ValidSchema).toBeDefined();
      expect(result.AnotherValidSchema).toBeDefined();
      expect(result.NullSchema).toBeNull();
      expect(result.UndefinedSchema).toBeUndefined();
    });
  });

  describe("Integration scenarios", () => {
    it("should handle a realistic multi-model scenario", async () => {
      mockGetModels.mockReturnValue(["User", "Post", "Comment"]);
      mockPrismaJsonSchemaGenerator.generateModelSchemas.mockImplementation(
        async ({ modelName }) => {
          const baseSchemas = {
            [`Create${modelName}ModelSchema`]: {
              type: "object",
              properties: {
                [`${modelName.toLowerCase()}Id`]: { type: "string" },
              },
              required: [`${modelName.toLowerCase()}Id`],
            },
            [`${modelName}UpdateSchema`]: {
              type: "object",
              properties: {
                [`${modelName.toLowerCase()}Id`]: { type: "string" },
              },
            },
            [`${modelName}FindManySchema`]: {
              type: "object",
              properties: {
                page: { type: "integer", minimum: 1 },
                limit: { type: "integer", minimum: 1, maximum: 100 },
              },
            },
          };

          if (modelName === "auth") {
            return {
              AuthLoginSchema: {
                type: "object",
                properties: {
                  email: { type: "string", format: "email" },
                  password: { type: "string", minLength: 8 },
                },
                required: ["email", "password"],
              },
              AuthRegisterSchema: {
                type: "object",
                properties: {
                  email: { type: "string", format: "email" },
                  password: { type: "string", minLength: 8 },
                  confirmPassword: { type: "string", minLength: 8 },
                },
                required: ["email", "password", "confirmPassword"],
              },
            };
          }

          return baseSchemas;
        }
      );

      const result = await generatePrismaJsonSchemas(arkosConfig);

      // Should have 3 models × 3 schemas each + 2 auth schemas = 11 total
      expect(Object.keys(result)).toHaveLength(11);

      // Verify specific schemas exist
      expect(result.CreateUserModelSchema).toBeDefined();
      expect(result.PostUpdateSchema).toBeDefined();
      expect(result.CommentFindManySchema).toBeDefined();
      expect(result.AuthLoginSchema).toBeDefined();
      expect(result.AuthRegisterSchema).toBeDefined();

      // Verify schema structure
      expect(result.AuthLoginSchema.required).toEqual(["email", "password"]);
      expect(result.UserFindManySchema.properties?.limit.maximum).toBe(100);
    });
  });
});
