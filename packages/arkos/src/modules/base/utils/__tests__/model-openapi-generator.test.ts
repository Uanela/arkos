import { prismaSchemaParser } from "../../../../exports/prisma";
import { isAuthenticationEnabled } from "../../../../utils/helpers/arkos-config.helpers";
import prismaJsonSchemaGenerator from "../../../../utils/prisma/prisma-json-schema-generator";
import modelOpenAPIGenerator from "../model-openapi-generator";

jest.mock("../../../../utils/prisma/prisma-json-schema-generator");
jest.mock("../../../../exports/prisma", () => ({
  prismaSchemaParser: { models: [] },
}));
jest.mock("../../../../utils/helpers/arkos-config.helpers");

describe("ModelOpenAPIGenerator", () => {
  const mockUserProfileModel = {
    name: "UserProfile",
    mapName: "user-profiles",
    fields: [],
  };
  const mockUserModel = {
    name: "User",
    mapName: "users",
    fields: [
      {
        name: "id",
        type: "Int",
        isId: true,
        isOptional: false,
        isArray: false,
        foreignKeyField: "",
        defaultValue: undefined,
        isUnique: false,
        attributes: [],
      },
      {
        name: "email",
        type: "String",
        isId: false,
        isOptional: false,
        isArray: false,
        foreignKeyField: "",
        defaultValue: undefined,
        isUnique: true,
        attributes: [],
      },
    ],
  };

  const mockCreateSchema = {
    type: "object",
    properties: { email: { type: "string" } },
    required: ["email"],
  };
  const mockUpdateSchema = {
    type: "object",
    properties: { email: { type: "string" } },
    required: [],
  };
  const mockResponseSchema = {
    type: "object",
    properties: { id: { type: "number" }, email: { type: "string" } },
    required: ["id", "email"],
  };
  const mockQueryFiltersSchema = [
    {
      name: "page",
      in: "query",
      description: "Page number (starts from 1)",
      schema: { type: "integer", minimum: 1 },
    },
    {
      name: "limit",
      in: "query",
      description: "Number of items per page",
      schema: { type: "integer", minimum: 1, maximum: 100 },
    },
    {
      name: "sort",
      in: "query",
      description: "Sort field (prefix with '-' for descending order)",
      schema: { type: "string" },
    },
    {
      name: "fields",
      in: "query",
      description: "Comma-separated list of fields to include in response",
      schema: { type: "string" },
    },
  ];

  const mockPrismaSchemaParser = prismaSchemaParser as any;
  const mockIsAuthenticationEnabled = isAuthenticationEnabled as jest.Mock;
  const mockGenerator = prismaJsonSchemaGenerator as jest.Mocked<
    typeof prismaJsonSchemaGenerator
  >;

  beforeEach(() => {
    jest.clearAllMocks();
    mockPrismaSchemaParser.models = [mockUserModel, mockUserProfileModel];
    mockIsAuthenticationEnabled.mockReturnValue(false);
    mockGenerator.generateCreateSchema.mockReturnValue(mockCreateSchema as any);
    mockGenerator.generateUpdateSchema.mockReturnValue(mockUpdateSchema as any);
    mockGenerator.generateQueryFilterParameters.mockReturnValue(
      mockQueryFiltersSchema
    );
    mockGenerator.generateResponseSchema.mockReturnValue(
      mockResponseSchema as any
    );
  });

  describe("getModel", () => {
    it("should get model regardless of passed param casing", () => {
      const withKebab = (modelOpenAPIGenerator as any).getModel("user-profile");
      const withCamel = (modelOpenAPIGenerator as any).getModel("userProfile");
      const withPascal = (modelOpenAPIGenerator as any).getModel("UserProfile");

      expect(withKebab).toBe(mockUserProfileModel);
      expect(withCamel).toBe(mockUserProfileModel);
      expect(withPascal).toBe(mockUserProfileModel);
    });
  });

  describe("getOpenApiConfig — createOne", () => {
    it("should return correct tags, summary, description and operationId", () => {
      const result = modelOpenAPIGenerator.getOpenApiConfig(
        {},
        "createOne",
        "user"
      );

      expect(result.tags).toContain("Users");
      expect(result.summary).toBe("Create a new user");
      expect(result.description).toBe(
        "Creates a new user record in the system"
      );
      expect(result.operationId).toBe("createUser");
    });

    it("should set default BearerAuth security", () => {
      const result = modelOpenAPIGenerator.getOpenApiConfig(
        {},
        "createOne",
        "user"
      );

      expect(result.security).toEqual([{ BearerAuth: [] }]);
    });

    it("should include requestBody with create schema", () => {
      const result = modelOpenAPIGenerator.getOpenApiConfig(
        {},
        "createOne",
        "user"
      );

      expect(result.requestBody).toBeDefined();
      expect(
        (result.requestBody as any).content["application/json"].schema
      ).toEqual(mockCreateSchema);
      expect(mockGenerator.generateCreateSchema).toHaveBeenCalledWith(
        mockUserModel
      );
    });

    it("should omit requestBody when body validation is configured", () => {
      const result = modelOpenAPIGenerator.getOpenApiConfig(
        { validation: { body: true } } as any,
        "createOne",
        "user"
      );

      expect(result.requestBody).toBeUndefined();
    });

    it("should include 201 and 400 responses", () => {
      const result = modelOpenAPIGenerator.getOpenApiConfig(
        {},
        "createOne",
        "user"
      );

      expect(result.responses).toHaveProperty("201");
      expect(result.responses).toHaveProperty("400");
    });

    it("should include 201 response with response schema", () => {
      const result = modelOpenAPIGenerator.getOpenApiConfig(
        {},
        "createOne",
        "user"
      );

      expect(
        (result.responses as any)["201"].content["application/json"].schema
      ).toEqual(mockResponseSchema);
      expect(mockGenerator.generateResponseSchema).toHaveBeenCalled();
    });

    it("should include auth error responses when authentication is enabled", () => {
      mockIsAuthenticationEnabled.mockReturnValue(true);

      const result = modelOpenAPIGenerator.getOpenApiConfig(
        {},
        "createOne",
        "user"
      );

      expect(result.responses).toHaveProperty("401");
      expect(result.responses).toHaveProperty("403");
    });

    it("should not include auth error responses when authentication is disabled", () => {
      mockIsAuthenticationEnabled.mockReturnValue(false);

      const result = modelOpenAPIGenerator.getOpenApiConfig(
        {},
        "createOne",
        "user"
      );

      expect(result.responses).not.toHaveProperty("401");
      expect(result.responses).not.toHaveProperty("403");
    });

    it("should merge with existingOpenApi overrides", () => {
      const existingOpenApi = {
        summary: "Custom summary",
        operationId: "customOp",
        security: [{ ApiKey: [] }],
      };

      const result = modelOpenAPIGenerator.getOpenApiConfig(
        { experimental: { openapi: existingOpenApi } } as any,
        "createOne",
        "user"
      );

      expect(result.summary).toBe("Custom summary");
      expect(result.operationId).toBe("customOp");
      expect(result.security).toEqual([{ ApiKey: [] }]);
    });

    it("should preserve existing 201 response if provided", () => {
      const custom201 = { description: "Custom 201" };
      const existingOpenApi = { responses: { "201": custom201 } };

      const result = modelOpenAPIGenerator.getOpenApiConfig(
        { experimental: { openapi: existingOpenApi } } as any,
        "createOne",
        "user"
      );

      expect((result.responses as any)["201"]).toEqual(custom201);
    });

    it("should filter out 'Defaults' tag", () => {
      const existingOpenApi = { tags: ["Defaults", "Extra"] };

      const result = modelOpenAPIGenerator.getOpenApiConfig(
        { experimental: { openapi: existingOpenApi } } as any,
        "createOne",
        "user"
      );

      expect(result.tags).not.toContain("Defaults");
    });

    it("should handle kebab-case model names", () => {
      mockPrismaSchemaParser.models = [{ ...mockUserModel, name: "BlogPost" }];

      const result = modelOpenAPIGenerator.getOpenApiConfig(
        {},
        "createOne",
        "blog-post"
      );

      expect(result.summary).toBe("Create a new blog post");
      expect(result.operationId).toBe("createBlogPost");
    });

    it("should pass prismaQueryOptions resolved for findOne to the 201 response schema", () => {
      const prismaQueryOptions = { createOne: { include: { profile: true } } };

      modelOpenAPIGenerator.getOpenApiConfig(
        {},
        "createOne",
        "user",
        prismaQueryOptions as any
      );

      expect(mockGenerator.generateResponseSchema).toHaveBeenCalledWith(
        mockUserModel,
        expect.objectContaining({ include: { profile: true } })
      );
    });
  });

  describe("getOpenApiConfig — findMany", () => {
    it("should return correct summary, description and operationId", () => {
      const result = modelOpenAPIGenerator.getOpenApiConfig(
        {},
        "findMany",
        "user"
      );

      expect(result.summary).toBe("Get users");
      expect(result.description).toContain("paginated list");
      expect(result.operationId).toBe("findUsers");
    });

    it("should include standard query parameters: filters, sort, page, limit, fields", () => {
      const result = modelOpenAPIGenerator.getOpenApiConfig(
        {},
        "findMany",
        "user"
      );
      const paramNames = (result.parameters as any[]).map((p) => p.name);

      expect(paramNames).toContain("sort");
      expect(paramNames).toContain("page");
      expect(paramNames).toContain("limit");
      expect(paramNames).toContain("fields");
    });

    it("should not duplicate parameters already in existingOpenApi", () => {
      const existingOpenApi = {
        parameters: [
          { name: "filters", in: "query", schema: { type: "string" } },
        ],
      };

      const result = modelOpenAPIGenerator.getOpenApiConfig(
        { experimental: { openapi: existingOpenApi } } as any,
        "findMany",
        "user"
      );

      const filtersParams = (result.parameters as any[]).filter(
        (p) => p.name === "filters"
      );
      expect(filtersParams).toHaveLength(1);
    });

    it("should include 200 response with array data schema", () => {
      const result = modelOpenAPIGenerator.getOpenApiConfig(
        {},
        "findMany",
        "user"
      );

      const responseSchema = (result.responses as any)["200"].content[
        "application/json"
      ].schema;
      expect(responseSchema.type).toBe("object");
      expect(responseSchema.properties).toHaveProperty("total");
      expect(responseSchema.properties).toHaveProperty("results");
      expect(responseSchema.properties.data.type).toBe("array");
      expect(responseSchema.properties.data.items).toEqual(mockResponseSchema);
    });

    it("should call generateResponseSchema with findMany resolved options", () => {
      const prismaQueryOptions = { findMany: { select: { id: true } } };

      modelOpenAPIGenerator.getOpenApiConfig(
        {},
        "findMany",
        "user",
        prismaQueryOptions as any
      );

      expect(mockGenerator.generateResponseSchema).toHaveBeenCalledWith(
        mockUserModel,
        expect.objectContaining({ select: { id: true } })
      );
    });

    it("should include auth errors when enabled", () => {
      mockIsAuthenticationEnabled.mockReturnValue(true);

      const result = modelOpenAPIGenerator.getOpenApiConfig(
        {},
        "findMany",
        "user"
      );

      expect(result.responses).toHaveProperty("401");
      expect(result.responses).toHaveProperty("403");
    });
  });

  describe("getOpenApiConfig — createMany", () => {
    it("should return correct summary, description and operationId", () => {
      const result = modelOpenAPIGenerator.getOpenApiConfig(
        {},
        "createMany",
        "user"
      );

      expect(result.summary).toBe("Create multiple users");
      expect(result.description).toContain("batch operation");
      expect(result.operationId).toBe("createManyUser");
    });

    it("should include requestBody as array of create schema", () => {
      const result = modelOpenAPIGenerator.getOpenApiConfig(
        {},
        "createMany",
        "user"
      );

      const schema = (result.requestBody as any).content["application/json"]
        .schema;
      expect(schema.type).toBe("array");
      expect(schema.items).toEqual(mockCreateSchema);
    });

    it("should omit requestBody when body validation is configured", () => {
      const result = modelOpenAPIGenerator.getOpenApiConfig(
        { validation: { body: true } } as any,
        "createMany",
        "user"
      );

      expect(result.requestBody).toBeUndefined();
    });

    it("should include 201 response with count schema", () => {
      const result = modelOpenAPIGenerator.getOpenApiConfig(
        {},
        "createMany",
        "user"
      );

      const schema = (result.responses as any)["201"].content[
        "application/json"
      ].schema;
      expect(schema.properties).toHaveProperty("count");
      expect(schema.properties.count.type).toBe("integer");
    });

    it("should include 400 response", () => {
      const result = modelOpenAPIGenerator.getOpenApiConfig(
        {},
        "createMany",
        "user"
      );

      expect(result.responses).toHaveProperty("400");
    });
  });

  describe("getOpenApiConfig — updateMany", () => {
    it("should return correct summary, description and operationId", () => {
      const result = modelOpenAPIGenerator.getOpenApiConfig(
        {},
        "updateMany",
        "user"
      );

      expect(result.summary).toBe("Update multiple users");
      expect(result.description).toContain("filter criteria");
      expect(result.operationId).toBe("updateManyUser");
    });

    it("should include required filters query parameter", () => {
      mockGenerator.generateQueryFilterParameters.mockReturnValueOnce([
        {
          name: "email[icontains]",
          in: "query",
          schema: { type: "string" },
        },
      ]);
      const result = modelOpenAPIGenerator.getOpenApiConfig(
        {},
        "updateMany",
        "user"
      );

      const filtersParam = (result.parameters as any[]).find(
        (p) => p.name === "email[icontains]"
      );
      expect(filtersParam).toBeDefined();
      expect(filtersParam.required).not.toBe(true);
    });

    it("should include requestBody with update schema", () => {
      const result = modelOpenAPIGenerator.getOpenApiConfig(
        {},
        "updateMany",
        "user"
      );

      const schema = (result.requestBody as any).content["application/json"]
        .schema;
      expect(schema).toEqual(mockUpdateSchema);
      expect(mockGenerator.generateUpdateSchema).toHaveBeenCalledWith(
        mockUserModel
      );
    });

    it("should omit requestBody when body validation is configured", () => {
      const result = modelOpenAPIGenerator.getOpenApiConfig(
        { validation: { body: true } } as any,
        "updateMany",
        "user"
      );

      expect(result.requestBody).toBeUndefined();
    });

    it("should include 200 response with count schema", () => {
      const result = modelOpenAPIGenerator.getOpenApiConfig(
        {},
        "updateMany",
        "user"
      );

      const schema = (result.responses as any)["200"].content[
        "application/json"
      ].schema;
      expect(schema.properties).toHaveProperty("count");
      expect(schema.properties.count.type).toBe("integer");
    });

    it("should not duplicate filters param when already in existingOpenApi", () => {
      const existingOpenApi = {
        parameters: [
          {
            name: "filters",
            in: "query",
            required: true,
            schema: { type: "string" },
          },
        ],
      };

      const result = modelOpenAPIGenerator.getOpenApiConfig(
        { experimental: { openapi: existingOpenApi } } as any,
        "updateMany",
        "user"
      );

      const filtersParams = (result.parameters as any[]).filter(
        (p) => p.name === "filters"
      );
      expect(filtersParams).toHaveLength(1);
    });
  });

  describe("getOpenApiConfig — deleteMany", () => {
    it("should return correct summary, description and operationId", () => {
      const result = modelOpenAPIGenerator.getOpenApiConfig(
        {},
        "deleteMany",
        "user"
      );

      expect(result.summary).toBe("Delete multiple users");
      expect(result.description).toContain("filter criteria");
      expect(result.operationId).toBe("deleteManyUser");
    });

    it("should include required filters query parameter", () => {
      mockGenerator.generateQueryFilterParameters.mockReturnValueOnce([
        {
          name: "email[icontains]",
          in: "query",
          schema: { type: "string" },
        },
      ]);
      const result = modelOpenAPIGenerator.getOpenApiConfig(
        {},
        "deleteMany",
        "user"
      );

      const filtersParam = (result.parameters as any[]).find(
        (p) => p.name === "email[icontains]"
      );
      expect(filtersParam).toBeDefined();
      expect(filtersParam.required).not.toBe(true);
    });

    it("should include 200 response with count schema", () => {
      const result = modelOpenAPIGenerator.getOpenApiConfig(
        {},
        "deleteMany",
        "user"
      );

      const schema = (result.responses as any)["200"].content[
        "application/json"
      ].schema;
      expect(schema.properties).toHaveProperty("count");
      expect(schema.properties.count.type).toBe("integer");
    });

    it("should include 400 response for missing filters", () => {
      const result = modelOpenAPIGenerator.getOpenApiConfig(
        {},
        "deleteMany",
        "user"
      );

      expect(result.responses).toHaveProperty("400");
    });

    it("should include auth errors when enabled", () => {
      mockIsAuthenticationEnabled.mockReturnValue(true);

      const result = modelOpenAPIGenerator.getOpenApiConfig(
        {},
        "deleteMany",
        "user"
      );

      expect(result.responses).toHaveProperty("401");
      expect(result.responses).toHaveProperty("403");
    });
  });

  describe("getOpenApiConfig — findOne", () => {
    it("should return correct summary, description and operationId", () => {
      const result = modelOpenAPIGenerator.getOpenApiConfig(
        {},
        "findOne",
        "user"
      );

      expect(result.summary).toBe("Get user by ID");
      expect(result.description).toContain("unique identifier");
      expect(result.operationId).toBe("findUserById");
    });

    it("should include id path parameter", () => {
      const result = modelOpenAPIGenerator.getOpenApiConfig(
        {},
        "findOne",
        "user"
      );

      const idParam = (result.parameters as any[]).find((p) => p.name === "id");
      expect(idParam).toBeDefined();
      expect(idParam.in).toBe("path");
      expect(idParam.required).toBe(true);
    });

    it("should include 200 response with response schema", () => {
      const result = modelOpenAPIGenerator.getOpenApiConfig(
        {},
        "findOne",
        "user"
      );

      const schema = (result.responses as any)["200"].content[
        "application/json"
      ].schema;
      expect(schema).toEqual(mockResponseSchema);
    });

    it("should include 404 response", () => {
      const result = modelOpenAPIGenerator.getOpenApiConfig(
        {},
        "findOne",
        "user"
      );

      expect(result.responses).toHaveProperty("404");
      expect((result.responses as any)["404"].description).toContain(
        "not found"
      );
    });

    it("should not duplicate id param when already in existingOpenApi", () => {
      const existingOpenApi = {
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "integer" },
          },
        ],
      };

      const result = modelOpenAPIGenerator.getOpenApiConfig(
        { experimental: { openapi: existingOpenApi } } as any,
        "findOne",
        "user"
      );

      const idParams = (result.parameters as any[]).filter(
        (p) => p.name === "id" && p.in === "path"
      );
      expect(idParams).toHaveLength(1);
    });

    it("should call generateResponseSchema with findOne resolved options", () => {
      const prismaQueryOptions = { findOne: { include: { profile: true } } };

      modelOpenAPIGenerator.getOpenApiConfig(
        {},
        "findOne",
        "user",
        prismaQueryOptions as any
      );

      expect(mockGenerator.generateResponseSchema).toHaveBeenCalledWith(
        mockUserModel,
        expect.objectContaining({ include: { profile: true } })
      );
    });
  });

  describe("getOpenApiConfig — updateOne", () => {
    it("should return correct summary, description and operationId", () => {
      const result = modelOpenAPIGenerator.getOpenApiConfig(
        {},
        "updateOne",
        "user"
      );

      expect(result.summary).toBe("Update user by ID");
      expect(result.description).toContain("unique identifier");
      expect(result.operationId).toBe("updateUser");
    });

    it("should include id path parameter", () => {
      const result = modelOpenAPIGenerator.getOpenApiConfig(
        {},
        "updateOne",
        "user"
      );

      const idParam = (result.parameters as any[]).find((p) => p.name === "id");
      expect(idParam).toBeDefined();
      expect(idParam.in).toBe("path");
      expect(idParam.required).toBe(true);
    });

    it("should include requestBody with update schema", () => {
      const result = modelOpenAPIGenerator.getOpenApiConfig(
        {},
        "updateOne",
        "user"
      );

      const schema = (result.requestBody as any).content["application/json"]
        .schema;
      expect(schema).toEqual(mockUpdateSchema);
      expect(mockGenerator.generateUpdateSchema).toHaveBeenCalledWith(
        mockUserModel
      );
    });

    it("should omit requestBody when body validation is configured", () => {
      const result = modelOpenAPIGenerator.getOpenApiConfig(
        { validation: { body: true } } as any,
        "updateOne",
        "user"
      );

      expect(result.requestBody).toBeUndefined();
    });

    it("should include 200, 400 and 404 responses", () => {
      const result = modelOpenAPIGenerator.getOpenApiConfig(
        {},
        "updateOne",
        "user"
      );

      expect(result.responses).toHaveProperty("200");
      expect(result.responses).toHaveProperty("400");
      expect(result.responses).toHaveProperty("404");
    });

    it("should include 200 response with response schema", () => {
      const result = modelOpenAPIGenerator.getOpenApiConfig(
        {},
        "updateOne",
        "user"
      );

      const schema = (result.responses as any)["200"].content[
        "application/json"
      ].schema;
      expect(schema).toEqual(mockResponseSchema);
    });

    it("should call generateResponseSchema with findOne resolved options for the 200 response", () => {
      const prismaQueryOptions = {
        updateOne: { select: { id: true, email: true } },
      };

      modelOpenAPIGenerator.getOpenApiConfig(
        {},
        "updateOne",
        "user",
        prismaQueryOptions as any
      );

      expect(mockGenerator.generateResponseSchema).toHaveBeenCalledWith(
        mockUserModel,
        expect.objectContaining({ select: { id: true, email: true } })
      );
    });
  });

  describe("getOpenApiConfig — deleteOne", () => {
    it("should return correct summary, description and operationId", () => {
      const result = modelOpenAPIGenerator.getOpenApiConfig(
        {},
        "deleteOne",
        "user"
      );

      expect(result.summary).toBe("Delete user by ID");
      expect(result.description).toContain("Permanently deletes");
      expect(result.operationId).toBe("deleteUser");
    });

    it("should include id path parameter", () => {
      const result = modelOpenAPIGenerator.getOpenApiConfig(
        {},
        "deleteOne",
        "user"
      );

      const idParam = (result.parameters as any[]).find((p) => p.name === "id");
      expect(idParam).toBeDefined();
      expect(idParam.in).toBe("path");
      expect(idParam.required).toBe(true);
    });

    it("should include 204 and 404 responses", () => {
      const result = modelOpenAPIGenerator.getOpenApiConfig(
        {},
        "deleteOne",
        "user"
      );

      expect(result.responses).toHaveProperty("204");
      expect(result.responses).toHaveProperty("404");
    });

    it("should not include a requestBody", () => {
      const result = modelOpenAPIGenerator.getOpenApiConfig(
        {},
        "deleteOne",
        "user"
      );

      expect(result.requestBody).toBeUndefined();
    });

    it("should include auth errors when enabled", () => {
      mockIsAuthenticationEnabled.mockReturnValue(true);

      const result = modelOpenAPIGenerator.getOpenApiConfig(
        {},
        "deleteOne",
        "user"
      );

      expect(result.responses).toHaveProperty("401");
      expect(result.responses).toHaveProperty("403");
    });

    it("should preserve existing 204 response if provided", () => {
      const custom204 = { description: "Custom deleted" };
      const existingOpenApi = { responses: { "204": custom204 } };

      const result = modelOpenAPIGenerator.getOpenApiConfig(
        { experimental: { openapi: existingOpenApi } } as any,
        "deleteOne",
        "user"
      );

      expect((result.responses as any)["204"]).toEqual(custom204);
    });
  });

  describe("getOpenApiConfig — default/unknown endpoint", () => {
    it("should return empty object for unknown endpoint", () => {
      const result = modelOpenAPIGenerator.getOpenApiConfig(
        {},
        "unknownEndpoint" as any,
        "user"
      );

      expect(result).toEqual({});
    });
  });

  describe("resolvePrismaQueryOptions", () => {
    it("should return empty object when prismaQueryOptions is undefined", () => {
      modelOpenAPIGenerator.getOpenApiConfig({}, "findOne", "user", undefined);

      expect(mockGenerator.generateResponseSchema).toHaveBeenCalledWith(
        mockUserModel,
        {}
      );
    });

    it("should merge global options with action-specific options", () => {
      const prismaQueryOptions = {
        global: { select: { id: true } },
        findOne: { include: { profile: true } },
      };

      modelOpenAPIGenerator.getOpenApiConfig(
        {},
        "findOne",
        "user",
        prismaQueryOptions as any
      );

      expect(mockGenerator.generateResponseSchema).toHaveBeenCalledWith(
        mockUserModel,
        expect.objectContaining({
          select: { id: true },
          include: { profile: true },
        })
      );
    });

    it("should handle deprecated queryOptions key", () => {
      const prismaQueryOptions = { queryOptions: { select: { id: true } } };

      modelOpenAPIGenerator.getOpenApiConfig(
        {},
        "findOne",
        "user",
        prismaQueryOptions as any
      );

      expect(mockGenerator.generateResponseSchema).toHaveBeenCalledWith(
        mockUserModel,
        expect.objectContaining({ select: { id: true } })
      );
    });

    it("should apply find general options when action is findOne", () => {
      const prismaQueryOptions = { find: { select: { email: true } } };

      modelOpenAPIGenerator.getOpenApiConfig(
        {},
        "findOne",
        "user",
        prismaQueryOptions as any
      );

      expect(mockGenerator.generateResponseSchema).toHaveBeenCalledWith(
        mockUserModel,
        expect.objectContaining({ select: { email: true } })
      );
    });

    it("should apply find general options when action is findMany", () => {
      const prismaQueryOptions = { find: { select: { email: true } } };

      modelOpenAPIGenerator.getOpenApiConfig(
        {},
        "findMany",
        "user",
        prismaQueryOptions as any
      );

      expect(mockGenerator.generateResponseSchema).toHaveBeenCalledWith(
        mockUserModel,
        expect.objectContaining({ select: { email: true } })
      );
    });

    it("should apply create general options when action is createOne", () => {
      const prismaQueryOptions = { create: { include: { profile: true } } };

      modelOpenAPIGenerator.getOpenApiConfig(
        {},
        "createOne",
        "user",
        prismaQueryOptions as any
      );

      expect(mockGenerator.generateResponseSchema).toHaveBeenCalledWith(
        mockUserModel,
        expect.objectContaining({ include: { profile: true } })
      );
    });

    it("should apply save general options when action is createOne", () => {
      const prismaQueryOptions = { save: { include: { profile: true } } };

      modelOpenAPIGenerator.getOpenApiConfig(
        {},
        "createOne",
        "user",
        prismaQueryOptions as any
      );

      expect(mockGenerator.generateResponseSchema).toHaveBeenCalledWith(
        mockUserModel,
        expect.objectContaining({ include: { profile: true } })
      );
    });

    it("should apply saveOne general options when action is updateOne", () => {
      const prismaQueryOptions = { saveOne: { select: { id: true } } };

      modelOpenAPIGenerator.getOpenApiConfig(
        {},
        "updateOne",
        "user",
        prismaQueryOptions as any
      );

      expect(mockGenerator.generateResponseSchema).toHaveBeenCalledWith(
        mockUserModel,
        expect.objectContaining({ select: { id: true } })
      );
    });

    it("should apply saveMany general options when action is updateMany (response schema not generated for updateMany)", () => {
      const prismaQueryOptions = { saveMany: { select: { id: true } } };

      modelOpenAPIGenerator.getOpenApiConfig(
        {},
        "updateMany",
        "user",
        prismaQueryOptions as any
      );

      expect(mockGenerator.generateUpdateSchema).toHaveBeenCalledWith(
        mockUserModel
      );
    });
  });
});
