import authOpenAPIGenerator from "../auth-openapi-generator";
import authPrismaJsonSchemaGenerator from "../auth-prisma-json-schema-generator";
import { getArkosConfig } from "../../../../utils/helpers/arkos-config.helpers";

jest.mock("../auth-prisma-json-schema-generator", () => ({
  __esModule: true,
  default: {
    generateLoginSchema: jest.fn(),
    generateSignupSchema: jest.fn(),
    generateUpdatePasswordSchema: jest.fn(),
    generateUpdateMeSchema: jest.fn(),
    generateGetMeResponse: jest.fn(),
  },
}));

jest.mock("../../../../utils/helpers/arkos-config.helpers", () => ({
  getArkosConfig: jest.fn(),
}));

const mockAuthPrismaJsonSchemaGenerator =
  authPrismaJsonSchemaGenerator as jest.Mocked<
    typeof authPrismaJsonSchemaGenerator
  >;
const mockGetArkosConfig = getArkosConfig as jest.Mock;

const mockLoginSchema = {
  type: "object",
  properties: { email: { type: "string" } },
};
const mockSignupSchema = {
  type: "object",
  properties: { email: { type: "string" }, password: { type: "string" } },
};
const mockUpdatePasswordSchema = {
  type: "object",
  properties: {
    currentPassword: { type: "string" },
    newPassword: { type: "string" },
  },
};
const mockUpdateMeSchema = {
  type: "object",
  properties: { name: { type: "string" } },
};
const mockGetMeResponse = {
  type: "object",
  properties: { id: { type: "number" }, email: { type: "string" } },
};

describe("AuthOpenAPIGenerator", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetArkosConfig.mockReturnValue({});
    mockAuthPrismaJsonSchemaGenerator.generateLoginSchema.mockReturnValue(
      mockLoginSchema as any
    );
    mockAuthPrismaJsonSchemaGenerator.generateSignupSchema.mockReturnValue(
      mockSignupSchema as any
    );
    mockAuthPrismaJsonSchemaGenerator.generateUpdatePasswordSchema.mockReturnValue(
      mockUpdatePasswordSchema as any
    );
    mockAuthPrismaJsonSchemaGenerator.generateUpdateMeSchema.mockReturnValue(
      mockUpdateMeSchema as any
    );
    mockAuthPrismaJsonSchemaGenerator.generateGetMeResponse.mockReturnValue(
      mockGetMeResponse as any
    );
  });

  describe("login", () => {
    it("should return correct summary, description and operationId", () => {
      const result = authOpenAPIGenerator.getOpenApiConfig({}, "login");

      expect(result.summary).toBe("Login to the system");
      expect(result.description).toBe(
        "Authenticates a user and returns an access token"
      );
      expect(result.operationId).toBe("login");
    });

    it("should include Authentication tag and filter out Defaults", () => {
      const result = authOpenAPIGenerator.getOpenApiConfig(
        { experimental: { openapi: { tags: ["Defaults", "Extra"] } } } as any,
        "login"
      );

      expect(result.tags).toContain("Authentication");
      expect(result.tags).toContain("Extra");
      expect(result.tags).not.toContain("Defaults");
    });

    it("should include requestBody with login schema by default", () => {
      const result = authOpenAPIGenerator.getOpenApiConfig({}, "login");

      expect(result.requestBody).toBeDefined();
      expect(
        (result.requestBody as any).content["application/json"].schema
      ).toEqual(mockLoginSchema);
      expect(
        mockAuthPrismaJsonSchemaGenerator.generateLoginSchema
      ).toHaveBeenCalled();
    });

    it("should omit requestBody when body validation is configured", () => {
      const result = authOpenAPIGenerator.getOpenApiConfig(
        { validation: { body: true } } as any,
        "login"
      );

      expect(result.requestBody).toBeUndefined();
      expect(
        mockAuthPrismaJsonSchemaGenerator.generateLoginSchema
      ).not.toHaveBeenCalled();
    });

    it("should include 200, 400 and 401 responses", () => {
      const result = authOpenAPIGenerator.getOpenApiConfig({}, "login");

      expect(result.responses).toHaveProperty("200");
      expect(result.responses).toHaveProperty("400");
      expect(result.responses).toHaveProperty("401");
    });

    it("should include accessToken in 200 response schema", () => {
      const result = authOpenAPIGenerator.getOpenApiConfig({}, "login");

      const schema = (result.responses as any)["200"].content[
        "application/json"
      ].schema;
      expect(schema.properties).toHaveProperty("accessToken");
    });

    it("should use existingOpenApi overrides for summary and operationId", () => {
      const result = authOpenAPIGenerator.getOpenApiConfig(
        {
          experimental: {
            openapi: { summary: "Custom login", operationId: "customLogin" },
          },
        } as any,
        "login"
      );

      expect(result.summary).toBe("Custom login");
      expect(result.operationId).toBe("customLogin");
    });

    it("should preserve existing 200 response if provided", () => {
      const custom200 = { description: "Custom success" };
      const result = authOpenAPIGenerator.getOpenApiConfig(
        {
          experimental: { openapi: { responses: { "200": custom200 } } },
        } as any,
        "login"
      );

      expect((result.responses as any)["200"]).toEqual(custom200);
    });
  });

  describe("logout", () => {
    it("should return correct summary, description and operationId", () => {
      const result = authOpenAPIGenerator.getOpenApiConfig({}, "logout");

      expect(result.summary).toBe("Logout from the system");
      expect(result.description).toBe(
        "Invalidates the current user's JWT token"
      );
      expect(result.operationId).toBe("logout");
    });

    it("should include BearerAuth security", () => {
      const result = authOpenAPIGenerator.getOpenApiConfig({}, "logout");

      expect(result.security).toEqual([{ BearerAuth: [] }]);
    });

    it("should include 204 and 401 responses", () => {
      const result = authOpenAPIGenerator.getOpenApiConfig({}, "logout");

      expect(result.responses).toHaveProperty("204");
      expect(result.responses).toHaveProperty("401");
    });

    it("should not have a requestBody", () => {
      const result = authOpenAPIGenerator.getOpenApiConfig({}, "logout");

      expect(result.requestBody).toBeUndefined();
    });

    it("should use existing security override", () => {
      const result = authOpenAPIGenerator.getOpenApiConfig(
        { experimental: { openapi: { security: [{ ApiKey: [] }] } } } as any,
        "logout"
      );

      expect(result.security).toEqual([{ ApiKey: [] }]);
    });
  });

  describe("signup", () => {
    it("should return correct summary, description and operationId", () => {
      const result = authOpenAPIGenerator.getOpenApiConfig({}, "signup");

      expect(result.summary).toBe("Register a new user");
      expect(result.description).toBe("Creates a new user account");
      expect(result.operationId).toBe("signup");
    });

    it("should include requestBody with signup schema by default", () => {
      const result = authOpenAPIGenerator.getOpenApiConfig({}, "signup");

      expect(result.requestBody).toBeDefined();
      expect(
        (result.requestBody as any).content["application/json"].schema
      ).toEqual(mockSignupSchema);
      expect(
        mockAuthPrismaJsonSchemaGenerator.generateSignupSchema
      ).toHaveBeenCalled();
    });

    it("should omit requestBody when body validation is configured", () => {
      const result = authOpenAPIGenerator.getOpenApiConfig(
        { validation: { body: true } } as any,
        "signup"
      );

      expect(result.requestBody).toBeUndefined();
    });

    it("should include 201, 400 and 409 responses", () => {
      const result = authOpenAPIGenerator.getOpenApiConfig({}, "signup");

      expect(result.responses).toHaveProperty("201");
      expect(result.responses).toHaveProperty("400");
      expect(result.responses).toHaveProperty("409");
    });

    it("should include getMeResponse schema in 201 response", () => {
      const result = authOpenAPIGenerator.getOpenApiConfig({}, "signup");

      const schema = (result.responses as any)["201"].content[
        "application/json"
      ].schema;
      expect(schema).toEqual(mockGetMeResponse);
      expect(
        mockAuthPrismaJsonSchemaGenerator.generateGetMeResponse
      ).toHaveBeenCalled();
    });

    it("should preserve existing 201 response if provided", () => {
      const custom201 = { description: "Custom created" };
      const result = authOpenAPIGenerator.getOpenApiConfig(
        {
          experimental: { openapi: { responses: { "201": custom201 } } },
        } as any,
        "signup"
      );

      expect((result.responses as any)["201"]).toEqual(custom201);
    });
  });

  describe("updatePassword", () => {
    it("should return correct summary, description and operationId", () => {
      const result = authOpenAPIGenerator.getOpenApiConfig(
        {},
        "updatePassword"
      );

      expect(result.summary).toBe("Update user password");
      expect(result.description).toBe(
        "Changes the password for the authenticated user"
      );
      expect(result.operationId).toBe("updatePassword");
    });

    it("should include BearerAuth security", () => {
      const result = authOpenAPIGenerator.getOpenApiConfig(
        {},
        "updatePassword"
      );

      expect(result.security).toEqual([{ BearerAuth: [] }]);
    });

    it("should include requestBody with updatePassword schema by default", () => {
      const result = authOpenAPIGenerator.getOpenApiConfig(
        {},
        "updatePassword"
      );

      expect(result.requestBody).toBeDefined();
      expect(
        (result.requestBody as any).content["application/json"].schema
      ).toEqual(mockUpdatePasswordSchema);
      expect(
        mockAuthPrismaJsonSchemaGenerator.generateUpdatePasswordSchema
      ).toHaveBeenCalled();
    });

    it("should omit requestBody when body validation is configured", () => {
      const result = authOpenAPIGenerator.getOpenApiConfig(
        { validation: { body: true } } as any,
        "updatePassword"
      );

      expect(result.requestBody).toBeUndefined();
    });

    it("should include 200, 400 and 401 responses", () => {
      const result = authOpenAPIGenerator.getOpenApiConfig(
        {},
        "updatePassword"
      );

      expect(result.responses).toHaveProperty("200");
      expect(result.responses).toHaveProperty("400");
      expect(result.responses).toHaveProperty("401");
    });

    it("should include status and message in 200 response schema", () => {
      const result = authOpenAPIGenerator.getOpenApiConfig(
        {},
        "updatePassword"
      );

      const schema = (result.responses as any)["200"].content[
        "application/json"
      ].schema;
      expect(schema.properties).toHaveProperty("status");
      expect(schema.properties).toHaveProperty("message");
    });
  });

  describe("getMe", () => {
    it("should return correct summary, description and operationId", () => {
      const result = authOpenAPIGenerator.getOpenApiConfig({}, "getMe");

      expect(result.summary).toBe("Get current user information");
      expect(result.description).toBe(
        "Retrieves information about the currently authenticated user"
      );
      expect(result.operationId).toBe("getMe");
    });

    it("should include BearerAuth security", () => {
      const result = authOpenAPIGenerator.getOpenApiConfig({}, "getMe");

      expect(result.security).toEqual([{ BearerAuth: [] }]);
    });

    it("should include 200 and 401 responses", () => {
      const result = authOpenAPIGenerator.getOpenApiConfig({}, "getMe");

      expect(result.responses).toHaveProperty("200");
      expect(result.responses).toHaveProperty("401");
    });

    it("should include getMeResponse schema in 200 response", () => {
      const result = authOpenAPIGenerator.getOpenApiConfig({}, "getMe");

      const schema = (result.responses as any)["200"].content[
        "application/json"
      ].schema;
      expect(schema).toEqual(mockGetMeResponse);
      expect(
        mockAuthPrismaJsonSchemaGenerator.generateGetMeResponse
      ).toHaveBeenCalled();
    });

    it("should not have a requestBody", () => {
      const result = authOpenAPIGenerator.getOpenApiConfig({}, "getMe");

      expect(result.requestBody).toBeUndefined();
    });
  });

  describe("updateMe", () => {
    it("should return correct summary, description and operationId", () => {
      const result = authOpenAPIGenerator.getOpenApiConfig({}, "updateMe");

      expect(result.summary).toBe("Update current user information");
      expect(result.description).toBe(
        "Updates information for the currently authenticated user"
      );
      expect(result.operationId).toBe("updateMe");
    });

    it("should include BearerAuth security", () => {
      const result = authOpenAPIGenerator.getOpenApiConfig({}, "updateMe");

      expect(result.security).toEqual([{ BearerAuth: [] }]);
    });

    it("should include requestBody with updateMe schema by default", () => {
      const result = authOpenAPIGenerator.getOpenApiConfig({}, "updateMe");

      expect(result.requestBody).toBeDefined();
      expect(
        (result.requestBody as any).content["application/json"].schema
      ).toEqual(mockUpdateMeSchema);
      expect(
        mockAuthPrismaJsonSchemaGenerator.generateUpdateMeSchema
      ).toHaveBeenCalled();
    });

    it("should omit requestBody when body validation is configured", () => {
      const result = authOpenAPIGenerator.getOpenApiConfig(
        { validation: { body: true } } as any,
        "updateMe"
      );

      expect(result.requestBody).toBeUndefined();
    });

    it("should include 200, 400 and 401 responses", () => {
      const result = authOpenAPIGenerator.getOpenApiConfig({}, "updateMe");

      expect(result.responses).toHaveProperty("200");
      expect(result.responses).toHaveProperty("400");
      expect(result.responses).toHaveProperty("401");
    });

    it("should include getMeResponse schema in 200 response", () => {
      const result = authOpenAPIGenerator.getOpenApiConfig({}, "updateMe");

      const schema = (result.responses as any)["200"].content[
        "application/json"
      ].schema;
      expect(schema).toEqual(mockGetMeResponse);
    });
  });

  describe("deleteMe", () => {
    it("should return correct summary, description and operationId", () => {
      const result = authOpenAPIGenerator.getOpenApiConfig({}, "deleteMe");

      expect(result.summary).toBe("Delete current user account");
      expect(result.description).toBe(
        "Marks the current user's account as deleted"
      );
      expect(result.operationId).toBe("deleteMe");
    });

    it("should include BearerAuth security", () => {
      const result = authOpenAPIGenerator.getOpenApiConfig({}, "deleteMe");

      expect(result.security).toEqual([{ BearerAuth: [] }]);
    });

    it("should include 200 and 401 responses", () => {
      const result = authOpenAPIGenerator.getOpenApiConfig({}, "deleteMe");

      expect(result.responses).toHaveProperty("200");
      expect(result.responses).toHaveProperty("401");
    });

    it("should include message in 200 response schema", () => {
      const result = authOpenAPIGenerator.getOpenApiConfig({}, "deleteMe");

      const schema = (result.responses as any)["200"].content[
        "application/json"
      ].schema;
      expect(schema.properties).toHaveProperty("message");
    });

    it("should not have a requestBody", () => {
      const result = authOpenAPIGenerator.getOpenApiConfig({}, "deleteMe");

      expect(result.requestBody).toBeUndefined();
    });
  });

  describe("findManyAuthAction", () => {
    it("should return correct summary, description and operationId", () => {
      const result = authOpenAPIGenerator.getOpenApiConfig(
        {},
        "findManyAuthAction"
      );

      expect(result.summary).toBe("Get all authentication actions");
      expect(result.description).toBe(
        "Retrieves a list of all available authentication actions and permissions"
      );
      expect(result.operationId).toBe("findManyAuthAction");
    });

    it("should include BearerAuth security", () => {
      const result = authOpenAPIGenerator.getOpenApiConfig(
        {},
        "findManyAuthAction"
      );

      expect(result.security).toEqual([{ BearerAuth: [] }]);
    });

    it("should include 200, 401 and 403 responses", () => {
      const result = authOpenAPIGenerator.getOpenApiConfig(
        {},
        "findManyAuthAction"
      );

      expect(result.responses).toHaveProperty("200");
      expect(result.responses).toHaveProperty("401");
      expect(result.responses).toHaveProperty("403");
    });

    it("should include action and resource in schema properties", () => {
      const result = authOpenAPIGenerator.getOpenApiConfig(
        {},
        "findManyAuthAction"
      );

      const schema = (result.responses as any)["200"].content[
        "application/json"
      ].schema;
      expect(schema.properties).toHaveProperty("action");
      expect(schema.properties).toHaveProperty("resource");
    });

    it("should include roles in schema when mode is not dynamic", () => {
      mockGetArkosConfig.mockReturnValue({
        authentication: { mode: "static" },
      });

      const result = authOpenAPIGenerator.getOpenApiConfig(
        {},
        "findManyAuthAction"
      );

      const schema = (result.responses as any)["200"].content[
        "application/json"
      ].schema;
      expect(schema.properties).toHaveProperty("roles");
    });

    it("should not include roles in schema when mode is dynamic", () => {
      mockGetArkosConfig.mockReturnValue({
        authentication: { mode: "dynamic" },
      });

      const result = authOpenAPIGenerator.getOpenApiConfig(
        {},
        "findManyAuthAction"
      );

      const schema = (result.responses as any)["200"].content[
        "application/json"
      ].schema;
      expect(schema.properties).not.toHaveProperty("roles");
    });
  });

  describe("findOneAuthAction", () => {
    it("should return correct summary, description and operationId", () => {
      const result = authOpenAPIGenerator.getOpenApiConfig(
        {},
        "findOneAuthAction"
      );

      expect(result.summary).toBe("Get authentication actions by resource");
      expect(result.description).toBe(
        "Retrieves all authentication actions for a specific resource"
      );
      expect(result.operationId).toBe("findOneAuthAction");
    });

    it("should include BearerAuth security", () => {
      const result = authOpenAPIGenerator.getOpenApiConfig(
        {},
        "findOneAuthAction"
      );

      expect(result.security).toEqual([{ BearerAuth: [] }]);
    });

    it("should include resourceName path parameter", () => {
      const result = authOpenAPIGenerator.getOpenApiConfig(
        {},
        "findOneAuthAction"
      );

      const param = (result.parameters as any[]).find(
        (p) => p.name === "resourceName"
      );
      expect(param).toBeDefined();
      expect(param.in).toBe("path");
      expect(param.required).toBe(true);
    });

    it("should not duplicate resourceName param when already in existingOpenApi", () => {
      const existingOpenApi = {
        parameters: [
          {
            name: "resourceName",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
      };

      const result = authOpenAPIGenerator.getOpenApiConfig(
        { experimental: { openapi: existingOpenApi } } as any,
        "findOneAuthAction"
      );

      const params = (result.parameters as any[]).filter(
        (p) => p.name === "resourceName"
      );
      expect(params).toHaveLength(1);
    });

    it("should include 200, 401, 403 and 404 responses", () => {
      const result = authOpenAPIGenerator.getOpenApiConfig(
        {},
        "findOneAuthAction"
      );

      expect(result.responses).toHaveProperty("200");
      expect(result.responses).toHaveProperty("401");
      expect(result.responses).toHaveProperty("403");
      expect(result.responses).toHaveProperty("404");
    });

    it("should include roles when mode is not dynamic", () => {
      mockGetArkosConfig.mockReturnValue({
        authentication: { mode: "static" },
      });

      const result = authOpenAPIGenerator.getOpenApiConfig(
        {},
        "findOneAuthAction"
      );

      const schema = (result.responses as any)["200"].content[
        "application/json"
      ].schema;
      expect(schema.properties).toHaveProperty("roles");
    });

    it("should not include roles when mode is dynamic", () => {
      mockGetArkosConfig.mockReturnValue({
        authentication: { mode: "dynamic" },
      });

      const result = authOpenAPIGenerator.getOpenApiConfig(
        {},
        "findOneAuthAction"
      );

      const schema = (result.responses as any)["200"].content[
        "application/json"
      ].schema;
      expect(schema.properties).not.toHaveProperty("roles");
    });
  });

  describe("default/unknown endpoint", () => {
    it("should return empty object for unknown endpoint", () => {
      const result = authOpenAPIGenerator.getOpenApiConfig(
        {},
        "unknownEndpoint" as any
      );

      expect(result).toEqual({});
    });
  });

  describe("tags behavior", () => {
    it("should always include Authentication tag", () => {
      const endpoints = [
        "login",
        "logout",
        "signup",
        "updatePassword",
        "getMe",
        "updateMe",
        "deleteMe",
      ];

      for (const endpoint of endpoints) {
        const result = authOpenAPIGenerator.getOpenApiConfig(
          {},
          endpoint as any
        );
        expect(result.tags).toContain("Authentication");
      }
    });

    it("should filter Defaults tag across all endpoints", () => {
      const endpoints = [
        "login",
        "logout",
        "signup",
        "updatePassword",
        "getMe",
        "updateMe",
        "deleteMe",
      ];

      for (const endpoint of endpoints) {
        const result = authOpenAPIGenerator.getOpenApiConfig(
          { experimental: { openapi: { tags: ["Defaults"] } } } as any,
          endpoint as any
        );
        expect(result.tags).not.toContain("Defaults");
      }
    });
  });

  describe("endpointRouterConfig defaults", () => {
    it("should handle undefined endpointRouterConfig gracefully", () => {
      expect(() =>
        authOpenAPIGenerator.getOpenApiConfig(undefined as any, "login")
      ).not.toThrow();
    });
  });
});
