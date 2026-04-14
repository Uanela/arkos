import { prismaSchemaParser } from "../../../../exports/prisma";
import { getArkosConfig } from "../../../../utils/helpers/arkos-config.helpers";
import { getModuleComponents } from "../../../../utils/dynamic-loader";
import prismaJsonSchemaGenerator from "../../../../utils/prisma/prisma-json-schema-generator";
import authPrismaJsonSchemaGenerator from "../auth-prisma-json-schema-generator";

jest.mock("../../../../utils/helpers/arkos-config.helpers", () => ({
  getArkosConfig: jest.fn(),
}));
jest.mock("../../../../utils/prisma/prisma-json-schema-generator");
jest.mock("../../../../exports/prisma", () => ({
  prismaSchemaParser: {
    models: [],
  },
}));
jest.mock("../../../../utils/helpers/arkos-config.helpers");
jest.mock("../../../../utils/dynamic-loader");

describe("AuthPrismaJsonSchemaGenerator", () => {
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
        attributes: ["@id", "@default(autoincrement())"],
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
        attributes: ["@unique"],
      },
      {
        name: "name",
        type: "String",
        isId: false,
        isOptional: true,
        isArray: false,
        foreignKeyField: "",
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
        foreignKeyField: "",
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
        foreignKeyField: "",
        defaultValue: "USER",
        isUnique: false,
        attributes: ["@default(USER)"],
      },
      {
        name: "isActive",
        type: "Boolean",
        isId: false,
        isOptional: false,
        isArray: false,
        foreignKeyField: "",
        defaultValue: true,
        isUnique: false,
        attributes: [],
      },
      {
        name: "isStaff",
        type: "Boolean",
        isId: false,
        isOptional: true,
        isArray: false,
        foreignKeyField: "",
        defaultValue: false,
        isUnique: false,
        attributes: [],
      },
      {
        name: "isSuperUser",
        type: "Boolean",
        isId: false,
        isOptional: true,
        isArray: false,
        foreignKeyField: "",
        defaultValue: false,
        isUnique: false,
        attributes: [],
      },
      {
        name: "passwordChangedAt",
        type: "DateTime",
        isId: false,
        isOptional: true,
        isArray: false,
        foreignKeyField: "",
        defaultValue: undefined,
        isUnique: false,
        attributes: [],
      },
      {
        name: "lastLoginAt",
        type: "DateTime",
        isId: false,
        isOptional: true,
        isArray: false,
        foreignKeyField: "",
        defaultValue: undefined,
        isUnique: false,
        attributes: [],
      },
      {
        name: "deletedSelfAccountAt",
        type: "DateTime",
        isId: false,
        isOptional: true,
        isArray: false,
        foreignKeyField: "",
        defaultValue: undefined,
        isUnique: false,
        attributes: [],
      },
    ],
  };

  const mockGetModuleComponents = getModuleComponents as jest.Mock;
  const mockGetArkosConfig = getArkosConfig as jest.Mock;
  const mockPrismaSchemaParser = prismaSchemaParser as any;
  const mockPrismaJsonSchemaGenerator =
    prismaJsonSchemaGenerator as jest.Mocked<typeof prismaJsonSchemaGenerator>;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup the parser to return the user model
    mockPrismaSchemaParser.models = [mockUserModel];

    // Default module components mock
    mockGetModuleComponents.mockReturnValue({
      prismaQueryOptions: {},
    });

    // Default arkos config
    mockGetArkosConfig.mockReturnValue({
      authentication: {
        login: {
          allowedUsernames: ["email", "username"],
        },
      },
    });

    // Default schema generator mocks
    mockPrismaJsonSchemaGenerator.generateResponseSchema.mockReturnValue({
      type: "object",
      properties: {
        id: { type: "number" },
        email: { type: "string" },
        name: { type: "string" },
        role: { type: "string" },
        isActive: { type: "boolean" },
      },
      required: ["id", "email"],
    });

    mockPrismaJsonSchemaGenerator.generateUpdateSchema.mockReturnValue({
      type: "object",
      properties: {
        email: { type: "string" },
        name: { type: "string" },
        password: { type: "string" },
        role: { type: "string" },
        isActive: { type: "boolean" },
        isStaff: { type: "boolean" },
        isSuperUser: { type: "boolean" },
        passwordChangedAt: { type: "string", format: "date-time" },
        deletedSelfAccountAt: { type: "string", format: "date-time" },
        lastLoginAt: { type: "string", format: "date-time" },
      },
      required: [],
    });

    mockPrismaJsonSchemaGenerator.generateCreateSchema.mockReturnValue({
      type: "object",
      properties: {
        email: { type: "string" },
        name: { type: "string" },
        password: { type: "string" },
        role: { type: "string" },
        isActive: { type: "boolean" },
        isStaff: { type: "boolean" },
        isSuperUser: { type: "boolean" },
        passwordChangedAt: { type: "string", format: "date-time" },
        deletedSelfAccountAt: { type: "string", format: "date-time" },
        lastLoginAt: { type: "string", format: "date-time" },
      },
      required: ["email", "password"],
    });

    // Reset the cached user model by re-requiring the module
    // The singleton instance caches `userModel`, so we clear it via the private field trick
    (authPrismaJsonSchemaGenerator as any).userModel = undefined;
  });

  // ---------------------------------------------------------------------------
  // generateGetMeResponse
  // ---------------------------------------------------------------------------
  describe("generateGetMeResponse", () => {
    it("should call generateResponseSchema with the User model and getMe prisma args", () => {
      const mockGetMeArgs = { select: { id: true, email: true } };
      mockGetModuleComponents.mockReturnValue({
        prismaQueryOptions: { getMe: mockGetMeArgs },
      });

      const result = authPrismaJsonSchemaGenerator.generateGetMeResponse();

      expect(
        mockPrismaJsonSchemaGenerator.generateResponseSchema
      ).toHaveBeenCalledWith(mockUserModel, mockGetMeArgs);
      expect(result).toBeDefined();
      expect(result.type).toBe("object");
    });

    it("should use empty object for prisma args when getMe is not configured", () => {
      mockGetModuleComponents.mockReturnValue({
        prismaQueryOptions: {},
      });

      authPrismaJsonSchemaGenerator.generateGetMeResponse();

      expect(
        mockPrismaJsonSchemaGenerator.generateResponseSchema
      ).toHaveBeenCalledWith(mockUserModel, {});
    });

    it("should use empty object for prisma args when getModuleComponents returns null", () => {
      mockGetModuleComponents.mockReturnValue(null);

      authPrismaJsonSchemaGenerator.generateGetMeResponse();

      expect(
        mockPrismaJsonSchemaGenerator.generateResponseSchema
      ).toHaveBeenCalledWith(mockUserModel, {});
    });

    it("should find the user model case-insensitively", () => {
      mockPrismaSchemaParser.models = [{ ...mockUserModel, name: "USER" }];
      (authPrismaJsonSchemaGenerator as any).userModel = undefined;

      authPrismaJsonSchemaGenerator.generateGetMeResponse();

      expect(
        mockPrismaJsonSchemaGenerator.generateResponseSchema
      ).toHaveBeenCalledWith(expect.objectContaining({ name: "USER" }), {});
    });
  });

  // ---------------------------------------------------------------------------
  // generateUpdatePasswordSchema
  // ---------------------------------------------------------------------------
  describe("generateUpdatePasswordSchema", () => {
    it("should return a schema with currentPassword and newPassword", () => {
      const schema =
        authPrismaJsonSchemaGenerator.generateUpdatePasswordSchema();

      expect(schema.type).toBe("object");
      expect(schema.properties).toHaveProperty("currentPassword");
      expect(schema.properties).toHaveProperty("newPassword");
    });

    it("should require both currentPassword and newPassword", () => {
      const schema =
        authPrismaJsonSchemaGenerator.generateUpdatePasswordSchema();

      expect(schema.required).toContain("currentPassword");
      expect(schema.required).toContain("newPassword");
      expect(schema.required).toHaveLength(2);
    });

    it("should enforce minLength of 8 on newPassword", () => {
      const schema =
        authPrismaJsonSchemaGenerator.generateUpdatePasswordSchema();

      expect((schema.properties as any).newPassword.minLength).toBe(8);
    });

    it("should type both fields as string", () => {
      const schema =
        authPrismaJsonSchemaGenerator.generateUpdatePasswordSchema();

      expect((schema.properties as any).currentPassword.type).toBe("string");
      expect((schema.properties as any).newPassword.type).toBe("string");
    });

    it("should not call any prisma generator methods", () => {
      authPrismaJsonSchemaGenerator.generateUpdatePasswordSchema();

      expect(
        mockPrismaJsonSchemaGenerator.generateResponseSchema
      ).not.toHaveBeenCalled();
      expect(
        mockPrismaJsonSchemaGenerator.generateUpdateSchema
      ).not.toHaveBeenCalled();
      expect(
        mockPrismaJsonSchemaGenerator.generateCreateSchema
      ).not.toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // generateUpdateMeSchema
  // ---------------------------------------------------------------------------
  describe("generateUpdateMeSchema", () => {
    it("should call generateUpdateSchema with the User model", () => {
      authPrismaJsonSchemaGenerator.generateUpdateMeSchema();

      expect(
        mockPrismaJsonSchemaGenerator.generateUpdateSchema
      ).toHaveBeenCalledWith(mockUserModel);
    });

    it("should remove sensitive fields: password", () => {
      const schema = authPrismaJsonSchemaGenerator.generateUpdateMeSchema();

      expect(schema.properties).not.toHaveProperty("password");
    });

    it("should remove sensitive fields: role", () => {
      const schema = authPrismaJsonSchemaGenerator.generateUpdateMeSchema();

      expect(schema.properties).not.toHaveProperty("role");
    });

    it("should remove sensitive fields: isActive", () => {
      const schema = authPrismaJsonSchemaGenerator.generateUpdateMeSchema();

      expect(schema.properties).not.toHaveProperty("isActive");
    });

    it("should remove sensitive fields: isStaff", () => {
      const schema = authPrismaJsonSchemaGenerator.generateUpdateMeSchema();

      expect(schema.properties).not.toHaveProperty("isStaff");
    });

    it("should remove sensitive fields: isSuperUser", () => {
      const schema = authPrismaJsonSchemaGenerator.generateUpdateMeSchema();

      expect(schema.properties).not.toHaveProperty("isSuperUser");
    });

    it("should remove sensitive fields: passwordChangedAt", () => {
      const schema = authPrismaJsonSchemaGenerator.generateUpdateMeSchema();

      expect(schema.properties).not.toHaveProperty("passwordChangedAt");
    });

    it("should remove sensitive fields: deletedSelfAccountAt", () => {
      const schema = authPrismaJsonSchemaGenerator.generateUpdateMeSchema();

      expect(schema.properties).not.toHaveProperty("deletedSelfAccountAt");
    });

    it("should remove sensitive fields: lastLoginAt", () => {
      const schema = authPrismaJsonSchemaGenerator.generateUpdateMeSchema();

      expect(schema.properties).not.toHaveProperty("lastLoginAt");
    });

    it("should remove sensitive fields: roles (plural)", () => {
      mockPrismaJsonSchemaGenerator.generateUpdateSchema.mockReturnValue({
        type: "object",
        properties: {
          email: { type: "string" },
          roles: { type: "array", items: { type: "string" } },
        },
        required: [],
      });

      const schema = authPrismaJsonSchemaGenerator.generateUpdateMeSchema();

      expect(schema.properties).not.toHaveProperty("roles");
    });

    it("should keep safe fields like email and name", () => {
      const schema = authPrismaJsonSchemaGenerator.generateUpdateMeSchema();

      expect(schema.properties).toHaveProperty("email");
      expect(schema.properties).toHaveProperty("name");
    });

    it("should handle schemas with no properties gracefully", () => {
      mockPrismaJsonSchemaGenerator.generateUpdateSchema.mockReturnValue({
        type: "object",
        properties: undefined,
        required: [],
      });

      expect(() =>
        authPrismaJsonSchemaGenerator.generateUpdateMeSchema()
      ).not.toThrow();
    });
  });

  // ---------------------------------------------------------------------------
  // generateSignupSchema
  // ---------------------------------------------------------------------------
  describe("generateSignupSchema", () => {
    it("should call generateCreateSchema with the User model", () => {
      authPrismaJsonSchemaGenerator.generateSignupSchema();

      expect(
        mockPrismaJsonSchemaGenerator.generateCreateSchema
      ).toHaveBeenCalledWith(mockUserModel);
    });

    it("should remove restricted fields: role", () => {
      const schema = authPrismaJsonSchemaGenerator.generateSignupSchema();

      expect(schema.properties).not.toHaveProperty("role");
    });

    it("should remove restricted fields: roles", () => {
      mockPrismaJsonSchemaGenerator.generateCreateSchema.mockReturnValue({
        type: "object",
        properties: {
          email: { type: "string" },
          password: { type: "string" },
          roles: { type: "array", items: { type: "string" } },
        },
        required: ["email", "password"],
      });

      const schema = authPrismaJsonSchemaGenerator.generateSignupSchema();

      expect(schema.properties).not.toHaveProperty("roles");
    });

    it("should remove restricted fields: isActive", () => {
      const schema = authPrismaJsonSchemaGenerator.generateSignupSchema();

      expect(schema.properties).not.toHaveProperty("isActive");
    });

    it("should remove restricted fields: isStaff", () => {
      const schema = authPrismaJsonSchemaGenerator.generateSignupSchema();

      expect(schema.properties).not.toHaveProperty("isStaff");
    });

    it("should remove restricted fields: isSuperUser", () => {
      const schema = authPrismaJsonSchemaGenerator.generateSignupSchema();

      expect(schema.properties).not.toHaveProperty("isSuperUser");
    });

    it("should remove restricted fields: passwordChangedAt", () => {
      const schema = authPrismaJsonSchemaGenerator.generateSignupSchema();

      expect(schema.properties).not.toHaveProperty("passwordChangedAt");
    });

    it("should remove restricted fields: deletedSelfAccountAt", () => {
      const schema = authPrismaJsonSchemaGenerator.generateSignupSchema();

      expect(schema.properties).not.toHaveProperty("deletedSelfAccountAt");
    });

    it("should remove restricted fields: lastLoginAt", () => {
      const schema = authPrismaJsonSchemaGenerator.generateSignupSchema();

      expect(schema.properties).not.toHaveProperty("lastLoginAt");
    });

    it("should keep public-safe fields like email, name, and password", () => {
      const schema = authPrismaJsonSchemaGenerator.generateSignupSchema();

      expect(schema.properties).toHaveProperty("email");
      expect(schema.properties).toHaveProperty("password");
      expect(schema.properties).toHaveProperty("name");
    });

    it("should handle schemas with no properties gracefully", () => {
      mockPrismaJsonSchemaGenerator.generateCreateSchema.mockReturnValue({
        type: "object",
        properties: undefined,
        required: [],
      });

      expect(() =>
        authPrismaJsonSchemaGenerator.generateSignupSchema()
      ).not.toThrow();
    });
  });

  // ---------------------------------------------------------------------------
  // generateLoginSchema
  // ---------------------------------------------------------------------------
  describe("generateLoginSchema", () => {
    it("should include password as a property", () => {
      const schema = authPrismaJsonSchemaGenerator.generateLoginSchema();

      expect(schema.properties).toHaveProperty("password");
    });

    it("should require password", () => {
      const schema = authPrismaJsonSchemaGenerator.generateLoginSchema();

      expect(schema.required).toContain("password");
    });

    it("should enforce minLength of 8 on password", () => {
      const schema = authPrismaJsonSchemaGenerator.generateLoginSchema();

      expect((schema.properties as any).password.minLength).toBe(8);
    });

    it("should include username properties from allowedUsernames config", () => {
      mockGetArkosConfig.mockReturnValue({
        authentication: {
          login: {
            allowedUsernames: ["email", "username"],
          },
        },
      });

      const schema = authPrismaJsonSchemaGenerator.generateLoginSchema();

      expect(schema.properties).toHaveProperty("email");
      expect(schema.properties).toHaveProperty("username");
    });

    it("should handle nested username fields (e.g. profile.username) by using the last segment", () => {
      mockGetArkosConfig.mockReturnValue({
        authentication: {
          login: {
            allowedUsernames: ["profile.username", "email"],
          },
        },
      });

      const schema = authPrismaJsonSchemaGenerator.generateLoginSchema();

      expect(schema.properties).toHaveProperty("username");
      expect(schema.properties).toHaveProperty("email");
    });

    it("should produce anyOf requiring at least one username field", () => {
      mockGetArkosConfig.mockReturnValue({
        authentication: {
          login: {
            allowedUsernames: ["email", "username"],
          },
        },
      });

      const schema = authPrismaJsonSchemaGenerator.generateLoginSchema();

      expect(schema.anyOf).toBeDefined();
      expect(schema.anyOf).toHaveLength(2);
      expect(schema.anyOf).toContainEqual({ required: ["email"] });
      expect(schema.anyOf).toContainEqual({ required: ["username"] });
    });

    it("should handle nested fields in anyOf using the last segment", () => {
      mockGetArkosConfig.mockReturnValue({
        authentication: {
          login: {
            allowedUsernames: ["profile.username"],
          },
        },
      });

      const schema = authPrismaJsonSchemaGenerator.generateLoginSchema();

      expect(schema.anyOf).toContainEqual({ required: ["username"] });
    });

    it("should default to username when allowedUsernames is not configured", () => {
      mockGetArkosConfig.mockReturnValue({});

      const schema = authPrismaJsonSchemaGenerator.generateLoginSchema();

      expect(schema.properties).toHaveProperty("username");
    });

    it("should default to username when authentication config is missing", () => {
      mockGetArkosConfig.mockReturnValue(null);

      const schema = authPrismaJsonSchemaGenerator.generateLoginSchema();

      expect(schema.properties).toHaveProperty("username");
    });

    it("should have no anyOf when allowedUsernames is empty", () => {
      mockGetArkosConfig.mockReturnValue({
        authentication: {
          login: {
            allowedUsernames: [],
          },
        },
      });

      const schema = authPrismaJsonSchemaGenerator.generateLoginSchema();

      expect(schema.anyOf).toBeUndefined();
    });

    it("should set description on each username property", () => {
      mockGetArkosConfig.mockReturnValue({
        authentication: {
          login: {
            allowedUsernames: ["email"],
          },
        },
      });

      const schema = authPrismaJsonSchemaGenerator.generateLoginSchema();

      expect((schema.properties as any).email.description).toContain("email");
    });

    it("should return type object", () => {
      const schema = authPrismaJsonSchemaGenerator.generateLoginSchema();

      expect(schema.type).toBe("object");
    });
  });

  // ---------------------------------------------------------------------------
  // User model caching (private getUserModel)
  // ---------------------------------------------------------------------------
  describe("user model caching", () => {
    it("should only look up the user model once across multiple calls", () => {
      (authPrismaJsonSchemaGenerator as any).userModel = undefined;

      authPrismaJsonSchemaGenerator.generateGetMeResponse();
      authPrismaJsonSchemaGenerator.generateGetMeResponse();

      // The model lookup reads from prismaSchemaParser.models.find —
      // confirm generateResponseSchema was called with the same model object both times.
      const calls =
        mockPrismaJsonSchemaGenerator.generateResponseSchema.mock.calls;
      expect(calls[0][0]).toBe(calls[1][0]);
    });
  });
});
