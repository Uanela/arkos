import { PrismaJsonSchemaGenerator } from "../prisma-json-schema-generator";
import { ArkosConfig, RouterConfig } from "../../../exports";
import { PrismaQueryOptions } from "../../../types";
import deepmerge from "../../helpers/deepmerge.helper";
import { getModuleComponents } from "../../dynamic-loader";
import prismaSchemaParser from "../prisma-schema-parser";
import { localValidatorFileExists } from "../../../modules/swagger/utils/helpers/swagger.router.helpers";

// Mock all dependencies
jest.mock("../../helpers/deepmerge.helper");
jest.mock("../../dynamic-loader");
jest.mock("../../../modules/swagger/utils/helpers/swagger.router.helpers");
jest.mock("fs");

describe("PrismaJsonSchemaGenerator", () => {
  let generator: PrismaJsonSchemaGenerator;

  // Mock data
  const mockSchema = {
    models: [
      {
        name: "User",
        mapName: "users",
        fields: [
          {
            name: "id",
            type: "Int",
            isId: true,
            isOptional: false,
            isArray: false,
            connectionField: "",
            defaultValue: undefined,
            isUnique: false,
            attributes: ["@id", "@default(autoincrement())"],
          },
          {
            name: "email",
            type: "String",
            isId: false,
            isOptional: false,
            isArray: false,
            connectionField: "",
            defaultValue: undefined,
            isUnique: true,
            attributes: ["@unique"],
          },
          {
            name: "name",
            type: "String",
            isId: false,
            isOptional: true,
            isArray: false,
            connectionField: "",
            defaultValue: undefined,
            isUnique: false,
            attributes: [],
          },
          {
            name: "password",
            type: "String",
            isId: false,
            isOptional: false,
            isArray: false,
            connectionField: "",
            defaultValue: undefined,
            isUnique: false,
            attributes: [],
          },
          {
            name: "role",
            type: "UserRole",
            isId: false,
            isOptional: false,
            isArray: false,
            connectionField: "",
            defaultValue: "USER",
            isUnique: false,
            attributes: ["@default(USER)"],
          },
          {
            name: "profileId",
            type: "Int",
            isId: false,
            isOptional: true,
            isArray: false,
            connectionField: "",
            defaultValue: undefined,
            isUnique: false,
            attributes: [],
          },
          {
            name: "profile",
            type: "Profile",
            isId: false,
            isOptional: true,
            isArray: false,
            connectionField: "profileId",
            defaultValue: undefined,
            isUnique: false,
            attributes: ["@relation(fields: [profileId], references: [id])"],
          },
          {
            name: "posts",
            type: "Post",
            isId: false,
            isOptional: false,
            isArray: true,
            connectionField: "",
            defaultValue: undefined,
            isUnique: false,
            attributes: [],
          },
          {
            name: "createdAt",
            type: "DateTime",
            isId: false,
            isOptional: false,
            isArray: false,
            connectionField: "",
            defaultValue: undefined,
            isUnique: false,
            attributes: ["@default(now())"],
          },
        ],
      },
      {
        name: "Profile",
        mapName: undefined,
        fields: [
          {
            name: "id",
            type: "Int",
            isId: true,
            isOptional: false,
            isArray: false,
            connectionField: "",
            defaultValue: undefined,
            isUnique: false,
            attributes: ["@id"],
          },
          {
            name: "bio",
            type: "String",
            isId: false,
            isOptional: true,
            isArray: false,
            connectionField: "",
            defaultValue: undefined,
            isUnique: false,
            attributes: [],
          },
        ],
      },
      {
        name: "Post",
        mapName: undefined,
        fields: [
          {
            name: "id",
            type: "Int",
            isId: true,
            isOptional: false,
            isArray: false,
            connectionField: "",
            defaultValue: undefined,
            isUnique: false,
            attributes: ["@id"],
          },
          {
            name: "title",
            type: "String",
            isId: false,
            isOptional: false,
            isArray: false,
            connectionField: "",
            defaultValue: undefined,
            isUnique: false,
            attributes: [],
          },
          {
            name: "authorId",
            type: "Int",
            isId: false,
            isOptional: false,
            isArray: false,
            connectionField: "",
            defaultValue: undefined,
            isUnique: false,
            attributes: [],
          },
          {
            name: "author",
            type: "User",
            isId: false,
            isOptional: false,
            isArray: false,
            connectionField: "authorId",
            defaultValue: undefined,
            isUnique: false,
            attributes: ["@relation(fields: [authorId], references: [id])"],
          },
        ],
      },
    ],
    enums: [
      {
        name: "UserRole",
        values: ["ADMIN", "USER", "MODERATOR"],
      },
    ],
  };

  const mockArkosConfig: ArkosConfig = {
    authentication: {
      mode: "static",
      login: {
        allowedUsernames: ["email", "username"],
      },
    },
    swagger: {
      strict: false,
      mode: "prisma",
    },
    validation: {
      resolver: "zod",
    },
  };

  // Mock functions
  const mockgetModuleComponents = getModuleComponents as jest.Mock;
  const mockLocalValidatorFileExists = localValidatorFileExists as jest.Mock;
  const mockDeepmerge = deepmerge as unknown as jest.Mock;
  const mockPrismaSchemaParser = prismaSchemaParser as any;

  beforeEach(() => {
    generator = new PrismaJsonSchemaGenerator();

    // Reset all mocks
    jest.clearAllMocks();

    // Setup default mock returns
    mockPrismaSchemaParser.parse = jest.fn().mockReturnValue(mockSchema);
    mockgetModuleComponents.mockReturnValue({
      router: { config: {} },
      prismaQueryOptions: {},
    });
    mockLocalValidatorFileExists.mockResolvedValue(false);
    mockDeepmerge.mockImplementation((a, b) => ({ ...a, ...b }));
  });

  describe("generateModelSchemas", () => {
    it("should generate schemas for a regular model", async () => {
      const config = {
        modelName: "User",
        arkosConfig: mockArkosConfig,
        schemasToGenerate: ["createOne", "updateOne", "findOne"] as const,
      };

      (generator as any).schema = {
        models: [{ name: "User", fields: [] }],
        enums: [],
      };

      const result = await generator.generateModelSchemas(config as any);

      expect(result).toHaveProperty("CreateUserModelSchema");
      expect(result).toHaveProperty("UpdateUserModelSchema");
      expect(result).toHaveProperty("FindOneUserModelSchema");
    });

    it("should generate auth schemas for auth models", async () => {
      const config = {
        modelName: "auth",
        arkosConfig: mockArkosConfig,
        schemasToGenerate: ["login", "signup", "getMe"] as const,
      };

      const result = await generator.generateModelSchemas(config as any);

      expect(result).toHaveProperty("LoginSchema");
      expect(result).toHaveProperty("SignupSchema");
      expect(result).toHaveProperty("GetMeSchema");
    });

    it("should return empty object when swagger is strict and mode is not prisma", async () => {
      const config = {
        modelName: "User",
        arkosConfig: {
          ...mockArkosConfig,
          swagger: { strict: true, mode: "manual" as const },
        },
        schemasToGenerate: ["createOne"] as const,
      };

      const result = await generator.generateModelSchemas(config as any);

      expect(result).toEqual({});
    });

    it("should return empty object when router is disabled", async () => {
      mockgetModuleComponents.mockReturnValue({
        router: { config: { disable: true } },
        prismaQueryOptions: {},
      });

      const config = {
        modelName: "User",
        arkosConfig: mockArkosConfig,
        schemasToGenerate: ["createOne"] as const,
      };

      const result = await generator.generateModelSchemas(config as any);

      expect(result).toEqual({});
    });

    it("should skip schema generation when local validator exists", async () => {
      mockLocalValidatorFileExists.mockResolvedValue(true);

      const config = {
        modelName: "User",
        arkosConfig: mockArkosConfig,
        schemasToGenerate: ["createOne"] as const,
      };

      const result = await generator.generateModelSchemas(config as any);

      expect(result).not.toHaveProperty("CreateUserModelSchema");
    });
  });

  describe("generateCreateSchema", () => {
    it("should generate create schema excluding ID and auto fields", () => {
      const userModel = mockSchema.models.find((m) => m.name === "User")!;
      const schema = (generator as any).generateCreateSchema(userModel, {});

      expect(schema.type).toBe("object");
      expect(schema.properties).toHaveProperty("email");
      expect(schema.properties).toHaveProperty("name");
      expect(schema.properties).toHaveProperty("password");
      expect(schema.properties).toHaveProperty("role");
      expect(schema.properties).not.toHaveProperty("id");
      expect(schema.properties).not.toHaveProperty("createdAt");
      expect(schema.properties).not.toHaveProperty("posts"); // Array relation
    });

    it("should include connection fields for single relations", () => {
      const userModel = mockSchema.models.find((m) => m.name === "User")!;
      const schema = (generator as any).generateCreateSchema(userModel, {});

      expect(schema.properties).toHaveProperty("profileId");
      expect(schema.properties.profileId.type).toBe("number");
    });

    it("should mark required fields correctly", () => {
      const userModel = mockSchema.models.find((m) => m.name === "User")!;
      const schema = (generator as any).generateCreateSchema(userModel, {});

      expect(schema.required).toContain("email");
      expect(schema.required).toContain("password");
      expect(schema.required).not.toContain("name"); // Optional
      expect(schema.required).not.toContain("role"); // Has default
    });

    it("should handle auth model restrictions", () => {
      const authModel = {
        ...mockSchema.models.find((m) => m.name === "User")!,
        name: "auth",
      };
      const schema = (generator as any).generateCreateSchema(authModel, {});

      expect(schema.properties).not.toHaveProperty("role");
      expect(schema.properties).not.toHaveProperty("isActive");
    });
  });

  describe("generateUpdateSchema", () => {
    it("should generate update schema with all fields optional", () => {
      const userModel = mockSchema.models.find((m) => m.name === "User")!;
      const schema = (generator as any).generateUpdateSchema(userModel, {});

      expect(schema.type).toBe("object");
      expect(schema.required).toEqual([]); // All optional
      expect(schema.properties).toHaveProperty("email");
      expect(schema.properties).toHaveProperty("name");
      expect(schema.properties).not.toHaveProperty("id");
      expect(schema.properties).not.toHaveProperty("createdAt");
    });
  });

  describe("generateResponseSchema", () => {
    it("should generate response schema with all fields", () => {
      const userModel = mockSchema.models.find((m) => m.name === "User")!;
      const schema = (generator as any).generateResponseSchema(
        userModel,
        {},
        "findOne"
      );

      expect(schema.type).toBe("object");
      expect(schema.properties).toHaveProperty("id");
      expect(schema.properties).toHaveProperty("email");
      expect(schema.properties).toHaveProperty("name");
      expect(schema.properties).not.toHaveProperty("password"); // Excluded
    });

    it("should respect select options", () => {
      const userModel = mockSchema.models.find((m) => m.name === "User")!;
      const options = { select: { id: true, email: true } };
      const schema = (generator as any).generateResponseSchema(
        userModel,
        options,
        "findOne"
      );

      expect(schema.properties).toHaveProperty("id");
      expect(schema.properties).toHaveProperty("email");
      expect(schema.properties).not.toHaveProperty("name");
    });

    it("should include relations when specified in include", () => {
      const userModel = mockSchema.models.find((m) => m.name === "User")!;
      const options = { include: { profile: true } };
      const schema = (generator as any).generateResponseSchema(
        userModel,
        options,
        "findOne"
      );

      expect(schema.properties).toHaveProperty("profile");
      expect(schema.properties.profile.type).toBe("object");
    });

    it("should handle array relations", () => {
      const userModel = mockSchema.models.find((m) => m.name === "User")!;
      const options = { include: { posts: true } };
      const schema = (generator as any).generateResponseSchema(
        userModel,
        options,
        "findOne"
      );

      expect(schema.properties).toHaveProperty("posts");
      expect(schema.properties.posts.type).toBe("array");
      expect(schema.properties.posts.items).toBeDefined();
    });
  });

  describe("auth schema generation", () => {
    describe("generateLoginSchema", () => {
      it("should generate login schema with password and username fields", () => {
        const schema = (generator as any).generateLoginSchema(mockArkosConfig);

        expect(schema.type).toBe("object");
        expect(schema.properties).toHaveProperty("password");
        expect(schema.properties).toHaveProperty("email");
        expect(schema.properties).toHaveProperty("username");
        expect(schema.required).toContain("password");
      });

      it("should handle nested username fields", () => {
        const config = {
          ...mockArkosConfig,
          authentication: {
            login: {
              allowedUsernames: ["profile.username", "email"],
            },
          },
        };
        const schema = (generator as any).generateLoginSchema(config as any);

        expect(schema.properties).toHaveProperty("username");
        expect(schema.properties).toHaveProperty("email");
      });
    });

    describe("generateSignupSchema", () => {
      it("should generate signup schema excluding restricted fields", () => {
        const userModel = mockSchema.models.find((m) => m.name === "User")!;
        const schema = (generator as any).generateSignupSchema(userModel, {});

        expect(schema.properties).toHaveProperty("email");
        expect(schema.properties).toHaveProperty("password");
        expect(schema.properties).not.toHaveProperty("role");
        expect(schema.properties).not.toHaveProperty("isActive");
      });
    });

    describe("generateUpdateMeSchema", () => {
      it("should generate updateMe schema excluding sensitive fields", () => {
        const userModel = mockSchema.models.find((m) => m.name === "User")!;
        const schema = (generator as any).generateUpdateMeSchema(userModel, {});

        expect(schema.properties).toHaveProperty("email");
        expect(schema.properties).toHaveProperty("name");
        expect(schema.properties).not.toHaveProperty("password");
        expect(schema.properties).not.toHaveProperty("role");
        expect(schema.properties).not.toHaveProperty("isActive");
      });
    });

    describe("generateUpdatePasswordSchema", () => {
      it("should generate password update schema", () => {
        const userModel = mockSchema.models.find((m) => m.name === "User")!;
        const schema = (generator as any).generateUpdatePasswordSchema(
          userModel,
          {}
        );

        expect(schema.type).toBe("object");
        expect(schema.properties).toHaveProperty("currentPassword");
        expect(schema.properties).toHaveProperty("newPassword");
        expect(schema.properties.newPassword.minLength).toBe(8);
        expect(schema.required).toEqual(["currentPassword", "newPassword"]);
      });
    });
  });

  describe("utility methods", () => {
    describe("convertFieldToJsonSchema", () => {
      it("should convert basic field types", () => {
        const stringField = {
          name: "email",
          type: "String",
          isOptional: false,
          isArray: false,
          connectionField: "",
          defaultValue: undefined,
          isId: false,
          isUnique: true,
          attributes: [],
        };

        const property = (generator as any).convertFieldToJsonSchema(
          stringField
        );

        expect(property.type).toBe("string");
      });

      it("should handle array fields", () => {
        const arrayField = {
          name: "tags",
          type: "String",
          isOptional: false,
          isArray: true,
          connectionField: "",
          defaultValue: undefined,
          isId: false,
          isUnique: false,
          attributes: [],
        };

        const property = (generator as any).convertFieldToJsonSchema(
          arrayField
        );

        expect(property.type).toBe("array");
        expect(property.items.type).toBe("string");
      });

      it("should handle enum fields", () => {
        const enumField = {
          name: "role",
          type: "UserRole",
          isOptional: false,
          isArray: false,
          connectionField: "",
          defaultValue: "USER",
          isId: false,
          isUnique: false,
          attributes: [],
        };

        const property = (generator as any).convertFieldToJsonSchema(enumField);

        expect(property.type).toBe("string");
        expect(property.enum).toEqual(["ADMIN", "USER", "MODERATOR"]);
        expect(property.default).toBe("USER");
      });

      it("should handle DateTime fields", () => {
        const dateTimeField = {
          name: "createdAt",
          type: "DateTime",
          isOptional: false,
          isArray: false,
          connectionField: "",
          defaultValue: undefined,
          isId: false,
          isUnique: false,
          attributes: [],
        };

        const property = (generator as any).convertFieldToJsonSchema(
          dateTimeField
        );

        expect(property.type).toBe("string");
        expect(property.format).toBe("date-time");
      });
    });

    describe("mapPrismaTypeToJsonSchema", () => {
      it("should map Prisma types to JSON schema types", () => {
        expect((generator as any).mapPrismaTypeToJsonSchema("String")).toBe(
          "string"
        );
        expect((generator as any).mapPrismaTypeToJsonSchema("Int")).toBe(
          "number"
        );
        expect((generator as any).mapPrismaTypeToJsonSchema("Float")).toBe(
          "number"
        );
        expect((generator as any).mapPrismaTypeToJsonSchema("Boolean")).toBe(
          "boolean"
        );
        expect((generator as any).mapPrismaTypeToJsonSchema("DateTime")).toBe(
          "string"
        );
        expect((generator as any).mapPrismaTypeToJsonSchema("Json")).toBe(
          "object"
        );
        expect((generator as any).mapPrismaTypeToJsonSchema("UserRole")).toBe(
          "string"
        ); // Enum
        expect((generator as any).mapPrismaTypeToJsonSchema("User")).toBe(
          "object"
        ); // Model
        expect((generator as any).mapPrismaTypeToJsonSchema("Unknown")).toBe(
          "string"
        ); // Fallback
      });
    });

    describe("isModelRelation", () => {
      it("should identify model relations correctly", () => {
        expect((generator as any).isModelRelation("User")).toBe(true);
        expect((generator as any).isModelRelation("Profile")).toBe(true);
        expect((generator as any).isModelRelation("String")).toBe(false);
        expect((generator as any).isModelRelation("UserRole")).toBe(false);
      });
    });

    describe("isEnum", () => {
      it("should identify enums correctly", () => {
        expect((generator as any).isEnum("UserRole")).toBe(true);
        expect((generator as any).isEnum("String")).toBe(false);
        expect((generator as any).isEnum("User")).toBe(false);
      });
    });

    describe("isEndpointDisabled", () => {
      it("should check endpoint disable status correctly", () => {
        const routerConfig1: RouterConfig = { disable: true };
        expect(
          (generator as any).isEndpointDisabled("createOne", routerConfig1)
        ).toBe(true);

        const routerConfig2: RouterConfig = {
          disable: { createOne: true, findOne: false },
        };
        expect(
          (generator as any).isEndpointDisabled("createOne", routerConfig2)
        ).toBe(true);
        expect(
          (generator as any).isEndpointDisabled("findOne", routerConfig2)
        ).toBe(false);

        expect(
          (generator as any).isEndpointDisabled("createOne", undefined)
        ).toBe(false);
      });
    });

    describe("resolvePrismaQueryOptions", () => {
      it("should merge query options correctly", () => {
        const queryOptions: PrismaQueryOptions<any> = {
          global: { select: { id: true } },
          find: { select: { email: true } },
          findOne: { include: { profile: true } },
        };

        const result = (generator as any).resolvePrismaQueryOptions(
          queryOptions,
          "findOne"
        );

        expect(mockDeepmerge).toHaveBeenCalled();
        expect(result).toBeDefined();
      });

      it("should handle deprecated queryOptions", () => {
        const queryOptions = {
          queryOptions: { select: { id: true } },
        };

        const result = (generator as any).resolvePrismaQueryOptions(
          queryOptions,
          "findOne"
        );

        expect(result).toBeDefined();
      });
    });

    describe("getGeneralOptionsForAction", () => {
      it("should map actions to general options", () => {
        const options = {
          find: { select: { id: true } },
          create: { include: { profile: true } },
        };

        const findResult = (generator as any).getGeneralOptionsForAction(
          options,
          "findOne"
        );
        expect(findResult).toEqual({ select: { id: true } });

        const createResult = (generator as any).getGeneralOptionsForAction(
          options,
          "createOne"
        );
        expect(createResult).toEqual({ include: { profile: true } });

        const noMatchResult = (generator as any).getGeneralOptionsForAction(
          options,
          "updateOne"
        );
        expect(noMatchResult).toBeNull();
      });
    });
  });

  describe("complex scenarios", () => {
    it("should handle createMany schema generation with proper references", async () => {
      const config = {
        modelName: "User",
        arkosConfig: mockArkosConfig,
        schemasToGenerate: ["createOne", "createMany"] as const,
      };

      const result = await generator.generateModelSchemas(config as any);

      expect(result).toHaveProperty("CreateUserModelSchema");
      expect(result).toHaveProperty("CreateManyUserModelSchema");
      expect(result.CreateManyUserModelSchema.type).toBe("array");
      expect((result.CreateManyUserModelSchema.items as any)?.$ref).toContain(
        "CreateUserModelSchema"
      );
    });

    it("should handle updateMany schema generation", async () => {
      const config = {
        modelName: "User",
        arkosConfig: mockArkosConfig,
        schemasToGenerate: ["updateOne", "updateMany"] as const,
      };

      const result = await generator.generateModelSchemas(config as any);

      expect(result).toHaveProperty("UpdateManyUserModelSchema");
      expect(result.UpdateManyUserModelSchema.type).toBe("object");
      expect(result.UpdateManyUserModelSchema.properties).toHaveProperty(
        "data"
      );
      expect(result.UpdateManyUserModelSchema.properties).toHaveProperty(
        "where"
      );
    });

    it("should handle findMany schema generation", async () => {
      const config = {
        modelName: "User",
        arkosConfig: mockArkosConfig,
        schemasToGenerate: ["findMany"] as const,
      };

      const result = await generator.generateModelSchemas(config as any);

      expect(result).toHaveProperty("FindManyUserModelSchema");
      expect(result.FindManyUserModelSchema.type).toBe("array");
      expect(result.FindManyUserModelSchema.items).toBeDefined();
    });

    it("should handle nested relation schemas correctly", () => {
      const profileModel = mockSchema.models.find((m) => m.name === "Profile")!;
      const includeOptions = { select: { id: true, bio: true } };

      const schema = (generator as any).generateNestedRelationSchema(
        profileModel,
        includeOptions
      );

      expect(schema.type).toBe("object");
      expect(schema.properties).toHaveProperty("id");
      expect(schema.properties).toHaveProperty("bio");
    });
  });

  describe("edge cases", () => {
    it("should handle model not found gracefully", async () => {
      const config = {
        modelName: "NonExistentModel",
        arkosConfig: mockArkosConfig,
        schemasToGenerate: ["createOne"] as const,
      };

      const result = await generator.generateModelSchemas(config as any);

      expect(result).toEqual({});
    });

    it("should handle auth module without authentication config", async () => {
      const config = {
        modelName: "auth",
        arkosConfig: { ...mockArkosConfig, authentication: undefined },
        schemasToGenerate: ["login"] as const,
      };

      const result = await generator.generateModelSchemas(config as any);

      expect(result).toEqual({});
    });

    it("should handle empty schema gracefully", () => {
      mockPrismaSchemaParser.parse.mockReturnValue({ models: [], enums: [] });

      const userModel = mockSchema.models.find((m) => m.name === "User")!;
      const schema = (generator as any).generateCreateSchema(userModel, {});

      expect(schema).toBeDefined();
    });
  });
});
