import { ArkosConfig } from "../../../../../exports";
import getAuthenticationJsonSchemaPaths, {
  getSchemaMode,
} from "../get-authentication-json-schema-paths";
import { localValidatorFileExists } from "../swagger.router.helpers";

jest.mock("../../../../../utils/dynamic-loader", () => ({
  getModuleComponents: jest.fn(),
}));

jest.mock("../swagger.router.helpers", () => ({
  ...jest.requireActual("../swagger.router.helpers"),
  getSchemaRef: jest.fn((model: string) => `#/components/schemas/${model}`),
  localValidatorFileExists: jest.fn(),
}));

jest.mock("fs");

describe("getAuthenticationJsonSchemaPaths", () => {
  const mockConfig: ArkosConfig = {
    swagger: {
      mode: "zod",
      strict: false,
    },
  };
  const mockPaths = {};

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return empty paths when swagger mode is not configured", async () => {
    const config = { ...mockConfig, swagger: undefined };
    const result = getAuthenticationJsonSchemaPaths(config, mockPaths);
    expect(result).toEqual({});
  });

  it("should use prisma mode when no validator file exists", async () => {
    (localValidatorFileExists as jest.Mock).mockReturnValue(false);
    const result = getAuthenticationJsonSchemaPaths(mockConfig, mockPaths);

    expect(
      (result["/api/auth/login"]?.post?.requestBody as any)?.content?.[
        "application/json"
      ].schema
    ).toEqual({ $ref: "#/components/schemas/Login" });
  });

  it("should use custom user properites (different form defaults) when passed in existing paths", async () => {
    (localValidatorFileExists as jest.Mock).mockReturnValue(false);
    const result = getAuthenticationJsonSchemaPaths(mockConfig, {
      "/api/auth/login": {
        post: {
          parameters: [{ name: "usernameField", in: "path" }],
          operationId: "post:/api/auth/login",
          requestBody: {
            content: {
              ["application/json"]: {
                schema: {
                  properties: {
                    name: {
                      type: "string",
                    },
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
    ).toEqual({
      properties: {
        name: {
          type: "string",
        },
      },
    });
    expect(result["/api/auth/login"]?.post?.parameters as any).toEqual([
      { name: "usernameField", in: "path" },
    ]);
    expect(jsonPath?.operationId).not.toBe("post:/api/auth/login");
  });

  it("should use configured mode when validator file exists", async () => {
    (localValidatorFileExists as jest.Mock).mockReturnValue(true);
    const result = getAuthenticationJsonSchemaPaths(mockConfig, mockPaths);

    expect(
      (result["/api/auth/login"]?.post?.requestBody as any)?.content?.[
        "application/json"
      ].schema
    ).toEqual({ $ref: "#/components/schemas/Login" });
  });

  it("should use strict mode when configured", async () => {
    const strictConfig = {
      ...mockConfig,
      swagger: { ...mockConfig.swagger, strict: true },
    };
    const result = getAuthenticationJsonSchemaPaths(
      strictConfig as any,
      mockPaths
    );

    expect(
      (result["/api/auth/login"]?.post?.requestBody as any)?.content?.[
        "application/json"
      ].schema
    ).toEqual({ $ref: "#/components/schemas/Login" });
  });

  it("should include all authentication endpoints", async () => {
    const result = getAuthenticationJsonSchemaPaths(mockConfig, mockPaths);

    expect(result).toHaveProperty("/api/auth/login");
    expect(result).toHaveProperty("/api/auth/logout");
    expect(result).toHaveProperty("/api/auth/signup");
    expect(result).toHaveProperty("/api/auth/update-password");
    expect(result).toHaveProperty("/api/users/me");
  });

  it("should maintain consistent schema references", async () => {
    const result = getAuthenticationJsonSchemaPaths(mockConfig, mockPaths);

    const loginSchema = (result["/api/auth/login"]?.post?.requestBody as any)
      ?.content?.["application/json"].schema;
    const signupSchema = (result["/api/auth/signup"]?.post?.requestBody as any)
      ?.content?.["application/json"].schema;

    expect(loginSchema).toBeDefined();
    expect(signupSchema).toBeDefined();
    expect(loginSchema).not.toEqual(signupSchema);
  });

  it("should properly secure authenticated endpoints", async () => {
    const result = getAuthenticationJsonSchemaPaths(mockConfig, mockPaths);

    expect(result["/api/auth/logout"]?.delete?.security).toEqual([
      { BearerAuth: [] },
    ]);
    expect(result["/api/users/me"]?.get?.security).toEqual([
      { BearerAuth: [] },
    ]);
    expect(result["/api/users/me"]?.patch?.security).toEqual([
      { BearerAuth: [] },
    ]);
  });

  it("should handle missing action keys gracefully", async () => {
    (localValidatorFileExists as jest.Mock).mockImplementation(
      async (action: string) => action !== "invalidAction"
    );

    const result = getAuthenticationJsonSchemaPaths(mockConfig, mockPaths);
    expect(result).toBeDefined();
  });
});

describe("getSchemaMode", () => {
  const mockConfig: ArkosConfig = {
    swagger: {
      mode: "zod",
      strict: false,
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (localValidatorFileExists as jest.Mock).mockReturnValue(false);
  });

  it("should return prisma mode when no swagger config exists", async () => {
    const result = getSchemaMode("login", {});
    expect(result).toBe("prisma");
  });

  it("should return configured mode when strict mode is enabled", async () => {
    const config = {
      ...mockConfig,
      swagger: { ...mockConfig.swagger, strict: true },
    } as ArkosConfig;

    const result = getSchemaMode("login", config);
    expect(result).toBe("zod");
  });

  it("should return prisma mode when validator file does not exist", async () => {
    (localValidatorFileExists as jest.Mock).mockReturnValue(false);
    const result = getSchemaMode("login", mockConfig);
    expect(result).toBe("prisma");
    expect(localValidatorFileExists).toHaveBeenCalledWith(
      "login",
      "auth",
      mockConfig
    );
  });

  it("should return configured mode when validator file exists", async () => {
    (localValidatorFileExists as jest.Mock).mockReturnValue(true);
    const result = getSchemaMode("signup", mockConfig);
    expect(result).toBe("zod");
  });

  it("should handle different action types", async () => {
    (localValidatorFileExists as jest.Mock).mockReturnValue(true);
    const actions = ["login", "signup", "updatePassword"];

    for (const action of actions) {
      const result = getSchemaMode(action, mockConfig);
      expect(result).toBe("zod");
      expect(localValidatorFileExists).toHaveBeenCalledWith(
        action,
        "auth",
        mockConfig
      );
    }
  });

  // it("should handle errors in file existence check", async () => {
  //   try {
  //     (localValidatorFileExists as jest.Mock).mockRejectedValue(
  //       new Error("FS error")
  //     );
  //     const result = getSchemaMode("login", mockConfig);
  //     expect(result).toBe("prisma"); // Falls back to prisma on error
  //   } catch (err) {}
  // });
});
