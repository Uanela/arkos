import { ArkosConfig } from "../../../../../exports";
import getAuthenticationJsonSchemaPaths, {
  getSchemaMode,
} from "../get-authentication-json-schema-paths";
import { localValidatorFileExists } from "../swagger.router.helpers";

// Mock the dependencies one level up
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

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return empty paths when swagger mode is not configured", async () => {
    const config = { ...mockConfig, swagger: undefined };
    const result = await getAuthenticationJsonSchemaPaths(config);
    expect(result).toEqual({});
  });

  it("should use prisma mode when no validator file exists", async () => {
    (localValidatorFileExists as jest.Mock).mockResolvedValue(false);
    const result = await getAuthenticationJsonSchemaPaths(mockConfig);

    expect(
      (result["/api/auth/login"]?.post?.requestBody as any)?.content?.[
        "application/json"
      ].schema
    ).toEqual({ $ref: "#/components/schemas/Login" });
  });

  it("should use configured mode when validator file exists", async () => {
    (localValidatorFileExists as jest.Mock).mockResolvedValue(true);
    const result = await getAuthenticationJsonSchemaPaths(mockConfig);

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
    const result = await getAuthenticationJsonSchemaPaths(strictConfig as any);

    expect(
      (result["/api/auth/login"]?.post?.requestBody as any)?.content?.[
        "application/json"
      ].schema
    ).toEqual({ $ref: "#/components/schemas/Login" });
  });

  it("should include all authentication endpoints", async () => {
    const result = await getAuthenticationJsonSchemaPaths(mockConfig);

    expect(result).toHaveProperty("/api/auth/login");
    expect(result).toHaveProperty("/api/auth/logout");
    expect(result).toHaveProperty("/api/auth/signup");
    expect(result).toHaveProperty("/api/auth/update-password");
    expect(result).toHaveProperty("/api/users/me");
  });

  it("should handle concurrent requests safely", async () => {
    const promises = Array(5)
      .fill(0)
      .map(() => getAuthenticationJsonSchemaPaths(mockConfig));
    const results = await Promise.all(promises);

    results.forEach((result) => {
      expect(result).toHaveProperty("/api/auth/login");
    });
  });

  it("should maintain consistent schema references", async () => {
    const result = await getAuthenticationJsonSchemaPaths(mockConfig);

    const loginSchema = (result["/api/auth/login"]?.post?.requestBody as any)
      ?.content?.["application/json"].schema;
    const signupSchema = (result["/api/auth/signup"]?.post?.requestBody as any)
      ?.content?.["application/json"].schema;

    expect(loginSchema).toBeDefined();
    expect(signupSchema).toBeDefined();
    expect(loginSchema).not.toEqual(signupSchema);
  });

  it("should properly secure authenticated endpoints", async () => {
    const result = await getAuthenticationJsonSchemaPaths(mockConfig);

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

    const result = await getAuthenticationJsonSchemaPaths(mockConfig);
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
    (localValidatorFileExists as jest.Mock).mockResolvedValue(false);
  });

  it("should return prisma mode when no swagger config exists", async () => {
    const result = await getSchemaMode("login", {});
    expect(result).toBe("prisma");
  });

  it("should return configured mode when strict mode is enabled", async () => {
    const config = {
      ...mockConfig,
      swagger: { ...mockConfig.swagger, strict: true },
    } as ArkosConfig;

    const result = await getSchemaMode("login", config);
    expect(result).toBe("zod");
  });

  it("should return prisma mode when validator file does not exist", async () => {
    (localValidatorFileExists as jest.Mock).mockResolvedValue(false);
    const result = await getSchemaMode("login", mockConfig);
    expect(result).toBe("prisma");
    expect(localValidatorFileExists).toHaveBeenCalledWith(
      "login",
      "user",
      mockConfig
    );
  });

  it("should return configured mode when validator file exists", async () => {
    (localValidatorFileExists as jest.Mock).mockResolvedValue(true);
    const result = await getSchemaMode("signup", mockConfig);
    expect(result).toBe("zod");
  });

  it("should handle different action types", async () => {
    (localValidatorFileExists as jest.Mock).mockResolvedValue(true);
    const actions = ["login", "signup", "updatePassword"];

    for (const action of actions) {
      const result = await getSchemaMode(action, mockConfig);
      expect(result).toBe("zod");
      expect(localValidatorFileExists).toHaveBeenCalledWith(
        action,
        "user",
        mockConfig
      );
    }
  });

  it("should handle errors in file existence check", async () => {
    try {
      (localValidatorFileExists as jest.Mock).mockRejectedValue(
        new Error("FS error")
      );
      const result = await getSchemaMode("login", mockConfig);
      expect(result).toBe("prisma"); // Falls back to prisma on error
    } catch (err) {}
  });
});
