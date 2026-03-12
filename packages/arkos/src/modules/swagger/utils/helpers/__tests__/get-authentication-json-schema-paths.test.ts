import getAuthenticationJsonSchemaPaths, {
  getInputSchemaMode,
} from "../get-authentication-json-schema-paths";
import { getArkosConfig } from "../../../../../server";
import loadableRegistry from "../../../../../components/arkos-loadable-registry";

jest.mock("../../../../../utils/dynamic-loader");
jest.mock("../../../../../server");
jest.mock("fs");

// Use real routeHookReader + real loadableRegistry for integration accuracy
// getSchemaRef is kept real too — it's pure and has its own tests

describe("getAuthenticationJsonSchemaPaths", () => {
  const mockPaths = {};

  beforeEach(() => {
    jest.clearAllMocks();
    (loadableRegistry as any).items = new Map();
    (getArkosConfig as jest.Mock).mockReturnValue({
      validation: { resolver: "prisma" },
      swagger: { strict: false },
    });
  });

  it("should include all authentication endpoints by default", () => {
    const result = getAuthenticationJsonSchemaPaths(mockPaths);

    expect(result).toHaveProperty("/api/auth/login");
    expect(result).toHaveProperty("/api/auth/logout");
    expect(result).toHaveProperty("/api/auth/signup");
    expect(result).toHaveProperty("/api/auth/update-password");
    expect(result).toHaveProperty("/api/users/me");
    expect(result).toHaveProperty("/api/auth-actions");
    expect(result).toHaveProperty("/api/auth-actions/{resourceName}");
  });

  it("should use prisma schema ref when no validator is configured", () => {
    const result = getAuthenticationJsonSchemaPaths(mockPaths);

    expect(
      (result["/api/auth/login"]?.post?.requestBody as any)?.content?.[
        "application/json"
      ].schema
    ).toEqual({ $ref: "#/components/schemas/LoginSchema" });
  });

  it("should use custom user properties (different from defaults) when passed in existing paths", () => {
    const result = getAuthenticationJsonSchemaPaths({
      "/api/auth/login": {
        post: {
          parameters: [{ name: "usernameField", in: "path" }],
          operationId: "post:/api/auth/login",
          requestBody: {
            content: {
              ["application/json"]: {
                schema: {
                  properties: {
                    name: { type: "string" },
                  },
                },
              },
            },
          },
        },
      },
    } as any);

    const jsonPath = result["/api/auth/login"]?.post;

    expect(
      (jsonPath?.requestBody as any)?.content?.["application/json"].schema
    ).toEqual({ properties: { name: { type: "string" } } });
    expect(jsonPath?.parameters as any).toEqual([
      { name: "usernameField", in: "path" },
    ]);
    expect(jsonPath?.operationId).not.toBe("post:/api/auth/login");
  });

  it("should properly secure authenticated endpoints", () => {
    const result = getAuthenticationJsonSchemaPaths(mockPaths);

    expect(result["/api/auth/logout"]?.delete?.security).toEqual([
      { BearerAuth: [] },
    ]);
    expect(result["/api/users/me"]?.get?.security).toEqual([
      { BearerAuth: [] },
    ]);
    expect(result["/api/users/me"]?.patch?.security).toEqual([
      { BearerAuth: [] },
    ]);
    expect(result["/api/auth/update-password"]?.post?.security).toEqual([
      { BearerAuth: [] },
    ]);
  });

  it("should maintain consistent but distinct schema references for login and signup", () => {
    const result = getAuthenticationJsonSchemaPaths(mockPaths);

    const loginSchema = (result["/api/auth/login"]?.post?.requestBody as any)
      ?.content?.["application/json"].schema;
    const signupSchema = (result["/api/auth/signup"]?.post?.requestBody as any)
      ?.content?.["application/json"].schema;

    expect(loginSchema).toBeDefined();
    expect(signupSchema).toBeDefined();
    expect(loginSchema).not.toEqual(signupSchema);
  });

  it("should skip a disabled endpoint when routeHookReader marks it disabled", () => {
    loadableRegistry.register({
      __type: "ArkosRouteHook",
      moduleName: "auth",
      _store: {
        login: { disabled: true },
      },
    } as any);

    const result = getAuthenticationJsonSchemaPaths(mockPaths);

    expect(result).not.toHaveProperty("/api/auth/login");
    // other endpoints still present
    expect(result).toHaveProperty("/api/auth/signup");
    expect(result).toHaveProperty("/api/auth/logout");
  });

  it("should include all endpoints when none are disabled", () => {
    loadableRegistry.register({
      __type: "ArkosRouteHook",
      moduleName: "auth",
      _store: {
        login: { disabled: false },
        logout: { disabled: false },
      },
    } as any);

    const result = getAuthenticationJsonSchemaPaths(mockPaths);

    expect(result).toHaveProperty("/api/auth/login");
    expect(result).toHaveProperty("/api/auth/logout");
  });

  it("should include findOneAuthAction path with resourceName parameter", () => {
    const result = getAuthenticationJsonSchemaPaths(mockPaths);

    const params = result["/api/auth-actions/{resourceName}"]?.get
      ?.parameters as any[];
    expect(params).toBeDefined();
    expect(params.some((p: any) => p.name === "resourceName")).toBe(true);
  });

  it("should not duplicate resourceName parameter when already in existing paths", () => {
    const result = getAuthenticationJsonSchemaPaths({
      "/api/auth-actions/{resourceName}": {
        get: {
          parameters: [
            {
              name: "resourceName",
              in: "path",
              required: true,
              schema: { type: "string" },
            },
          ],
        },
      },
    } as any);

    const params = result["/api/auth-actions/{resourceName}"]?.get
      ?.parameters as any[];
    const resourceNameParams = params.filter(
      (p: any) => p.name === "resourceName"
    );
    expect(resourceNameParams).toHaveLength(1);
  });
});

describe("getInputSchemaMode", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (loadableRegistry as any).items = new Map();
  });

  it("should return prisma mode when no resolver is configured", () => {
    (getArkosConfig as jest.Mock).mockReturnValue({
      swagger: { strict: false },
    });

    const result = getInputSchemaMode("auth", "login");
    expect(result).toBe("prisma");
  });

  it("should return configured resolver mode when strict mode is enabled", () => {
    (getArkosConfig as jest.Mock).mockReturnValue({
      validation: { resolver: "zod" },
      swagger: { strict: true },
    });

    const result = getInputSchemaMode("auth", "login");
    expect(result).toBe("zod");
  });

  it("should return prisma mode when no route validation body is configured", () => {
    (getArkosConfig as jest.Mock).mockReturnValue({
      validation: { resolver: "zod" },
      swagger: { strict: false },
    });
    // no hook registered — routeHookReader returns null routeConfig

    const result = getInputSchemaMode("auth", "login");
    expect(result).toBe("prisma");
  });

  it("should return configured resolver mode when route validation body exists", () => {
    (getArkosConfig as jest.Mock).mockReturnValue({
      validation: { resolver: "zod" },
      swagger: { strict: false },
    });

    loadableRegistry.register({
      __type: "ArkosRouteHook",
      moduleName: "auth",
      _store: {
        login: {
          validation: { body: "loginSchema" },
        },
      },
    } as any);

    const result = getInputSchemaMode("auth", "login");
    expect(result).toBe("zod");
  });

  it("should return prisma mode when route validation is explicitly false", () => {
    (getArkosConfig as jest.Mock).mockReturnValue({
      validation: { resolver: "zod" },
      swagger: { strict: false },
    });

    loadableRegistry.register({
      __type: "ArkosRouteHook",
      moduleName: "auth",
      _store: {
        login: {
          validation: false,
        },
      },
    } as any);

    const result = getInputSchemaMode("auth", "login");
    expect(result).toBe("prisma");
  });

  it("should handle different operations correctly", () => {
    (getArkosConfig as jest.Mock).mockReturnValue({
      validation: { resolver: "class-validator" },
      swagger: { strict: false },
    });

    loadableRegistry.register({
      __type: "ArkosRouteHook",
      moduleName: "auth",
      _store: {
        signup: { validation: { body: "SignupDto" } },
        updatePassword: { validation: { body: "UpdatePasswordDto" } },
      },
    } as any);

    expect(getInputSchemaMode("auth", "signup")).toBe("class-validator");
    expect(getInputSchemaMode("auth", "updatePassword")).toBe(
      "class-validator"
    );
    expect(getInputSchemaMode("auth", "login")).toBe("prisma"); // no validator
  });
});
