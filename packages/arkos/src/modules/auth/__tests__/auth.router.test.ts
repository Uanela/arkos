import { authControllerFactory } from "../auth.controller";
import rateLimit from "express-rate-limit";
import { getModuleComponents } from "../../../utils/dynamic-loader";
import {
  sendResponse,
  addPrismaQueryOptionsToRequest,
} from "../../base/base.middlewares";
import deepmerge from "../../../utils/helpers/deepmerge.helper";
import { getArkosConfig } from "../../../server";
import catchAsync from "../../error-handler/utils/catch-async";
import ArkosRouter from "../../../utils/arkos-router";
import { getAuthRouter } from "../auth.router";
import { isEndpointDisabled } from "../../base/utils/helpers/base.router.helpers";
import authOpenAPIGenerator from "../utils/auth-openapi-generator";
import routerValidator from "../../base/utils/router-validator";

jest.mock("../../error-handler/utils/catch-async");
jest.mock("fs");
jest.mock("../../../utils/arkos-router", () => {
  const mockRouter = {
    get: jest.fn().mockReturnThis(),
    post: jest.fn().mockReturnThis(),
    patch: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    use: jest.fn().mockReturnThis(),
  };
  return {
    __esModule: true,
    default: jest.fn(() => mockRouter),
  };
});
jest.mock("express", () => {
  const mockRouter = {
    get: jest.fn().mockReturnThis(),
    post: jest.fn().mockReturnThis(),
    patch: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    use: jest.fn().mockReturnThis(),
  };
  const mockExpress: any = jest.fn(() => ({
    use: jest.fn().mockReturnThis(),
    listen: jest.fn().mockReturnThis(),
  }));
  mockExpress.Router = jest.fn(() => mockRouter);
  mockExpress.default = mockExpress;
  mockExpress.json = jest.fn();
  mockExpress.urlencoded = jest.fn();
  mockExpress.static = jest.fn();
  return mockExpress;
});
jest.mock("../auth.controller");
jest.mock("../auth.service", () => ({
  ...jest.requireActual("../auth.controller"),
  authenticate: jest.fn(),
  handleAccessControl: jest.fn(),
}));
jest.mock("express-rate-limit");
jest.mock("../../../utils/dynamic-loader");
jest.mock("../../../utils/helpers/deepmerge.helper");
jest.mock("../../../server");
jest.mock("../../base/base.middlewares", () => ({
  ...jest.requireActual("../../base/base.middlewares"),
  handleRequestBodyValidationAndTransformation: jest.fn(() => () => {}),
  addPrismaQueryOptionsToRequest: jest.fn(() => () => {}),
  sendResponse: jest.fn(),
}));
jest.mock("../../base/utils/helpers/base.router.helpers", () => ({
  isEndpointDisabled: jest.fn().mockReturnValue(false),
}));
jest.mock("../utils/auth-openapi-generator", () => ({
  __esModule: true,
  default: { getOpenApiConfig: jest.fn().mockReturnValue({}) },
}));
jest.mock("../../base/utils/router-validator", () => ({
  __esModule: true,
  default: { isExpressRouter: jest.fn().mockReturnValue(false) },
}));
jest.mock("../../../utils/helpers/fs.helpers", () => ({
  getUserFileExtension: jest.fn().mockReturnValue("ts"),
}));
jest.mock("../../debugger/debugger.service", () => ({
  __esModule: true,
  default: { logModuleFinalRouter: jest.fn() },
}));
jest.mock("../../../utils/helpers/routers.helpers", () => ({
  processMiddleware: jest.fn((fn, opts) => (fn ? [fn] : [])),
  createRouteConfig: jest.fn(
    (arkosConfig, endpoint, resource, path, routerConfig, module, auth) => ({
      path: `/${resource}${path}`,
      disabled: false,
      authentication: auth,
      validation: routerConfig?.[endpoint]?.validation,
    })
  ),
}));

describe("Auth Router", () => {
  let mockRouter: any;
  let mockAuthController: any;
  let mockArkosConfig: any;
  let mockPrismaQueryOptions: any;

  beforeEach(() => {
    jest.clearAllMocks();

    (getArkosConfig as jest.Mock).mockReturnValue({
      authentication: { mode: "static" },
      validation: { resolver: "zod" },
    });

    mockRouter = ArkosRouter();

    mockAuthController = {
      getMe: jest.fn(),
      updateMe: jest.fn(),
      deleteMe: jest.fn(),
      login: jest.fn(),
      logout: jest.fn(),
      signup: jest.fn(),
      updatePassword: jest.fn(),
      findOneAuthAction: jest.fn(),
      findManyAuthAction: jest.fn(),
    };

    (catchAsync as jest.Mock).mockImplementation((fn) => fn);

    mockPrismaQueryOptions = {
      getMe: { include: { profile: true } },
      updateMe: { include: { profile: true } },
      deleteMe: { where: { active: true } },
      login: { where: { active: true } },
      signup: { include: { profile: true } },
      updatePassword: { where: { active: true } },
    };

    (authControllerFactory as jest.Mock).mockReturnValue(mockAuthController);
    (getModuleComponents as jest.Mock).mockReturnValue({
      interceptors: {},
      prismaQueryOptions: mockPrismaQueryOptions,
    });
    (rateLimit as jest.Mock).mockReturnValue(jest.fn());
    (deepmerge as any as jest.Mock).mockImplementation((obj1, obj2) => ({
      ...obj1,
      ...obj2,
    }));
    (isEndpointDisabled as jest.Mock).mockReturnValue(false);

    mockArkosConfig = {
      validation: { resolver: "zod" },
      authentication: {
        mode: "static",
        rateLimit: {
          windowMs: 10000,
          limit: 5,
        },
      },
    };
  });

  test("should create router with default middleware configuration when no custom interceptors", () => {
    getAuthRouter(mockArkosConfig);

    expect(ArkosRouter).toHaveBeenCalled();
    expect(getModuleComponents).toHaveBeenCalledWith("auth");
    expect(authControllerFactory).toHaveBeenCalled();

    expect(mockRouter.get).toHaveBeenCalledWith(
      expect.objectContaining({ path: "/users/me" }),
      expect.any(Function),
      mockAuthController.getMe,
      sendResponse
    );

    expect(mockRouter.post).toHaveBeenCalledWith(
      expect.objectContaining({ path: "/auth/login" }),
      expect.any(Function),
      mockAuthController.login,
      sendResponse
    );

    expect(mockRouter.post).toHaveBeenCalledWith(
      expect.objectContaining({ path: "/auth/signup" }),
      expect.any(Function),
      mockAuthController.signup,
      sendResponse
    );

    expect(deepmerge).toHaveBeenCalledWith(
      {
        windowMs: 5000,
        limit: 10,
        standardHeaders: "draft-7",
        legacyHeaders: false,
        handler: expect.any(Function),
      },
      mockArkosConfig.authentication.rateLimit
    );
    expect(rateLimit).toHaveBeenCalled();
    expect(mockRouter.use).toHaveBeenCalled();
  });

  test("should call addPrismaQueryOptionsToRequest with correct parameters for each route", () => {
    getAuthRouter(mockArkosConfig);

    expect(addPrismaQueryOptionsToRequest).toHaveBeenCalledWith(
      mockPrismaQueryOptions,
      "getMe"
    );
    expect(addPrismaQueryOptionsToRequest).toHaveBeenCalledWith(
      mockPrismaQueryOptions,
      "updateMe"
    );
    expect(addPrismaQueryOptionsToRequest).toHaveBeenCalledWith(
      mockPrismaQueryOptions,
      "deleteMe"
    );
    expect(addPrismaQueryOptionsToRequest).toHaveBeenCalledWith(
      mockPrismaQueryOptions,
      "login"
    );
    expect(addPrismaQueryOptionsToRequest).toHaveBeenCalledWith(
      mockPrismaQueryOptions,
      "signup"
    );
    expect(addPrismaQueryOptionsToRequest).toHaveBeenCalledWith(
      mockPrismaQueryOptions,
      "updatePassword"
    );
  });

  test("should create router with custom before+after interceptors", () => {
    const customMiddlewares = {
      beforeGetMe: jest.fn(),
      afterGetMe: jest.fn(),
      beforeLogin: jest.fn(),
      afterLogin: jest.fn(),
      beforeSignup: jest.fn(),
      afterSignup: jest.fn(),
      beforeLogout: jest.fn(),
      afterLogout: jest.fn(),
      beforeUpdatePassword: jest.fn(),
      afterUpdatePassword: jest.fn(),
    };

    (getModuleComponents as jest.Mock).mockReturnValue({
      interceptors: customMiddlewares,
      prismaQueryOptions: mockPrismaQueryOptions,
    });

    getAuthRouter(mockArkosConfig);

    expect(mockRouter.get).toHaveBeenCalledWith(
      expect.objectContaining({ path: "/users/me" }),
      expect.any(Function),
      customMiddlewares.beforeGetMe,
      mockAuthController.getMe,
      customMiddlewares.afterGetMe,
      sendResponse
    );

    expect(mockRouter.post).toHaveBeenCalledWith(
      expect.objectContaining({ path: "/auth/login" }),
      expect.any(Function),
      customMiddlewares.beforeLogin,
      mockAuthController.login,
      customMiddlewares.afterLogin,
      sendResponse
    );

    expect(mockRouter.post).toHaveBeenCalledWith(
      expect.objectContaining({ path: "/auth/signup" }),
      expect.any(Function),
      customMiddlewares.beforeSignup,
      mockAuthController.signup,
      customMiddlewares.afterSignup,
      sendResponse
    );
  });

  test("should pass correct DTOs based on class-validator resolver", () => {
    const mockDtos = {
      updateMe: "UpdateMeDto",
      login: "LoginDto",
      signup: "SignupDto",
      updatePassword: "UpdatePasswordDto",
    };

    (getModuleComponents as jest.Mock).mockReturnValue({
      interceptors: {},
      dtos: mockDtos,
      schemas: {},
      prismaQueryOptions: mockPrismaQueryOptions,
    });

    const classValidatorConfig = {
      validation: { resolver: "class-validator" },
      authentication: { mode: "static" },
    };

    getAuthRouter(classValidatorConfig as any);

    expect(mockRouter.patch).toHaveBeenCalledWith(
      expect.objectContaining({
        path: "/users/me",
        validation: { body: mockDtos.updateMe },
      }),
      expect.any(Function),
      mockAuthController.updateMe,
      sendResponse
    );

    expect(mockRouter.post).toHaveBeenCalledWith(
      expect.objectContaining({
        path: "/auth/login",
        validation: { body: mockDtos.login },
      }),
      expect.any(Function),
      mockAuthController.login,
      sendResponse
    );
  });

  test("should pass correct schemas based on zod resolver", () => {
    const mockSchemas = {
      updateMe: "updateMeSchema",
      login: "loginSchema",
      signup: "signupSchema",
      updatePassword: "updatePasswordSchema",
    };

    (getModuleComponents as jest.Mock).mockReturnValue({
      interceptors: {},
      dtos: {},
      schemas: mockSchemas,
      prismaQueryOptions: mockPrismaQueryOptions,
    });

    const zodConfig = {
      validation: { resolver: "zod" },
      authentication: { mode: "dynamic" },
    };

    getAuthRouter(zodConfig as any);

    expect(mockRouter.patch).toHaveBeenCalledWith(
      expect.objectContaining({
        path: "/users/me",
        validation: { body: mockSchemas.updateMe },
      }),
      expect.any(Function),
      mockAuthController.updateMe,
      sendResponse
    );

    expect(mockRouter.post).toHaveBeenCalledWith(
      expect.objectContaining({
        path: "/auth/login",
        validation: { body: mockSchemas.login },
      }),
      expect.any(Function),
      mockAuthController.login,
      sendResponse
    );
  });

  test("should create all required routes with no interceptors", () => {
    (getModuleComponents as jest.Mock).mockReturnValue({
      interceptors: undefined,
      prismaQueryOptions: mockPrismaQueryOptions,
    });

    getAuthRouter({ authentication: { mode: "static" } });

    expect(mockRouter.get).toHaveBeenCalledWith(
      expect.objectContaining({ path: "/users/me", authentication: true }),
      expect.any(Function),
      expect.any(Function),
      sendResponse
    );

    expect(mockRouter.patch).toHaveBeenCalledWith(
      expect.objectContaining({ path: "/users/me", authentication: true }),
      expect.any(Function),
      expect.any(Function),
      sendResponse
    );

    expect(mockRouter.delete).toHaveBeenCalledWith(
      expect.objectContaining({ path: "/users/me", authentication: true }),
      expect.any(Function),
      expect.any(Function),
      sendResponse
    );

    expect(mockRouter.post).toHaveBeenCalledWith(
      expect.objectContaining({ path: "/auth/login", authentication: false }),
      expect.any(Function),
      expect.any(Function),
      sendResponse
    );

    expect(mockRouter.delete).toHaveBeenCalledWith(
      expect.objectContaining({ path: "/auth/logout", authentication: true }),
      expect.any(Function),
      sendResponse
    );

    expect(mockRouter.post).toHaveBeenCalledWith(
      expect.objectContaining({ path: "/auth/signup", authentication: false }),
      expect.any(Function),
      expect.any(Function),
      sendResponse
    );

    expect(mockRouter.post).toHaveBeenCalledWith(
      expect.objectContaining({
        path: "/auth/update-password",
        authentication: true,
      }),
      expect.any(Function),
      expect.any(Function),
      sendResponse
    );
  });

  test("should create all required routes with only after interceptors", async () => {
    (getModuleComponents as jest.Mock).mockReturnValue({
      interceptors: {
        afterGetMe: jest.fn(),
        afterUpdateMe: jest.fn(),
        afterDeleteMe: jest.fn(),
        afterLogin: jest.fn(),
        afterLogout: jest.fn(),
        afterSignup: jest.fn(),
        afterUpdatePassword: jest.fn(),
      },
      prismaQueryOptions: mockPrismaQueryOptions,
    });

    await getAuthRouter(mockArkosConfig);

    expect(mockRouter.get).toHaveBeenCalledWith(
      expect.objectContaining({ path: "/users/me" }),
      expect.any(Function),
      expect.any(Function),
      expect.any(Function),
      sendResponse
    );

    expect(mockRouter.patch).toHaveBeenCalledWith(
      expect.objectContaining({ path: "/users/me" }),
      expect.any(Function),
      expect.any(Function),
      expect.any(Function),
      sendResponse
    );

    expect(mockRouter.delete).toHaveBeenCalledWith(
      expect.objectContaining({ path: "/users/me" }),
      expect.any(Function),
      expect.any(Function),
      expect.any(Function),
      sendResponse
    );

    expect(mockRouter.post).toHaveBeenCalledWith(
      expect.objectContaining({ path: "/auth/login" }),
      expect.any(Function),
      expect.any(Function),
      expect.any(Function),
      sendResponse
    );

    expect(mockRouter.delete).toHaveBeenCalledWith(
      expect.objectContaining({ path: "/auth/logout" }),
      expect.any(Function),
      expect.any(Function),
      sendResponse
    );

    expect(mockRouter.post).toHaveBeenCalledWith(
      expect.objectContaining({ path: "/auth/signup" }),
      expect.any(Function),
      expect.any(Function),
      expect.any(Function),
      sendResponse
    );

    expect(mockRouter.post).toHaveBeenCalledWith(
      expect.objectContaining({ path: "/auth/update-password" }),
      expect.any(Function),
      expect.any(Function),
      expect.any(Function),
      sendResponse
    );
  });

  test("should create all required routes with only before interceptors", async () => {
    (getModuleComponents as jest.Mock).mockReturnValue({
      interceptors: {
        beforeGetMe: jest.fn(),
        beforeUpdateMe: jest.fn(),
        beforeDeleteMe: jest.fn(),
        beforeLogin: jest.fn(),
        beforeLogout: jest.fn(),
        beforeSignup: jest.fn(),
        beforeUpdatePassword: jest.fn(),
      },
      prismaQueryOptions: mockPrismaQueryOptions,
    });

    await getAuthRouter(mockArkosConfig);

    expect(mockRouter.get).toHaveBeenCalledWith(
      expect.objectContaining({ path: "/users/me" }),
      expect.any(Function),
      expect.any(Function),
      expect.any(Function),
      sendResponse
    );

    expect(mockRouter.patch).toHaveBeenCalledWith(
      expect.objectContaining({ path: "/users/me" }),
      expect.any(Function),
      expect.any(Function),
      expect.any(Function),
      sendResponse
    );

    expect(mockRouter.delete).toHaveBeenCalledWith(
      expect.objectContaining({ path: "/users/me" }),
      expect.any(Function),
      expect.any(Function),
      expect.any(Function),
      sendResponse
    );

    expect(mockRouter.post).toHaveBeenCalledWith(
      expect.objectContaining({ path: "/auth/login" }),
      expect.any(Function),
      expect.any(Function),
      expect.any(Function),
      sendResponse
    );

    expect(mockRouter.delete).toHaveBeenCalledWith(
      expect.objectContaining({ path: "/auth/logout" }),
      expect.any(Function),
      expect.any(Function),
      sendResponse
    );

    expect(mockRouter.post).toHaveBeenCalledWith(
      expect.objectContaining({ path: "/auth/signup" }),
      expect.any(Function),
      expect.any(Function),
      expect.any(Function),
      sendResponse
    );

    expect(mockRouter.post).toHaveBeenCalledWith(
      expect.objectContaining({ path: "/auth/update-password" }),
      expect.any(Function),
      expect.any(Function),
      expect.any(Function),
      sendResponse
    );
  });

  test("should create all required routes with before, after and error interceptors", async () => {
    (getModuleComponents as jest.Mock).mockReturnValue({
      interceptors: {
        beforeGetMe: jest.fn(),
        afterGetMe: jest.fn(),
        onGetMeError: jest.fn(),
        beforeUpdateMe: jest.fn(),
        afterUpdateMe: jest.fn(),
        onUpdateMeError: jest.fn(),
        beforeDeleteMe: jest.fn(),
        afterDeleteMe: jest.fn(),
        onDeleteMeError: jest.fn(),
        beforeLogin: jest.fn(),
        afterLogin: jest.fn(),
        onLoginError: jest.fn(),
        beforeLogout: jest.fn(),
        afterLogout: jest.fn(),
        onLogoutError: jest.fn(),
        beforeSignup: jest.fn(),
        afterSignup: jest.fn(),
        onSignupError: jest.fn(),
        beforeUpdatePassword: jest.fn(),
        afterUpdatePassword: jest.fn(),
        onUpdatePasswordError: jest.fn(),
      },
      prismaQueryOptions: mockPrismaQueryOptions,
    });

    await getAuthRouter(mockArkosConfig);

    expect(mockRouter.get).toHaveBeenCalledWith(
      expect.objectContaining({ path: "/users/me" }),
      expect.any(Function),
      expect.any(Function),
      expect.any(Function),
      expect.any(Function),
      sendResponse,
      expect.any(Function)
    );

    expect(mockRouter.patch).toHaveBeenCalledWith(
      expect.objectContaining({ path: "/users/me" }),
      expect.any(Function),
      expect.any(Function),
      expect.any(Function),
      expect.any(Function),
      sendResponse,
      expect.any(Function)
    );

    expect(mockRouter.delete).toHaveBeenCalledWith(
      expect.objectContaining({ path: "/users/me" }),
      expect.any(Function),
      expect.any(Function),
      expect.any(Function),
      expect.any(Function),
      sendResponse,
      expect.any(Function)
    );

    expect(mockRouter.post).toHaveBeenCalledWith(
      expect.objectContaining({ path: "/auth/login" }),
      expect.any(Function),
      expect.any(Function),
      expect.any(Function),
      expect.any(Function),
      sendResponse,
      expect.any(Function)
    );

    expect(mockRouter.delete).toHaveBeenCalledWith(
      expect.objectContaining({ path: "/auth/logout" }),
      expect.any(Function),
      expect.any(Function),
      expect.any(Function),
      sendResponse,
      expect.any(Function)
    );

    expect(mockRouter.post).toHaveBeenCalledWith(
      expect.objectContaining({ path: "/auth/signup" }),
      expect.any(Function),
      expect.any(Function),
      expect.any(Function),
      expect.any(Function),
      sendResponse,
      expect.any(Function)
    );

    expect(mockRouter.post).toHaveBeenCalledWith(
      expect.objectContaining({ path: "/auth/update-password" }),
      expect.any(Function),
      expect.any(Function),
      expect.any(Function),
      expect.any(Function),
      sendResponse,
      expect.any(Function)
    );
  });

  test("should handle auth-action routes with proper authentication config from authConfigs", () => {
    const mockAuthConfigs = {
      accessControl: {
        View: { roles: ["admin"] },
      },
    };

    (getModuleComponents as jest.Mock).mockReturnValue({
      interceptors: {},
      prismaQueryOptions: mockPrismaQueryOptions,
      authConfigs: mockAuthConfigs,
    });

    getAuthRouter(mockArkosConfig);

    expect(mockRouter.get).toHaveBeenCalledWith(
      expect.objectContaining({ path: "/auth-actions" }),
      expect.any(Function),
      sendResponse
    );

    expect(mockRouter.get).toHaveBeenCalledWith(
      expect.objectContaining({ path: "/auth-actions/:resourceName" }),
      expect.any(Function),
      sendResponse
    );
  });

  test("should return early when routerConfig.disable is true", () => {
    (getModuleComponents as jest.Mock).mockReturnValue({
      interceptors: {},
      prismaQueryOptions: mockPrismaQueryOptions,
      router: { config: { disable: true } },
    });

    getAuthRouter(mockArkosConfig);

    expect(mockRouter.get).not.toHaveBeenCalled();
    expect(mockRouter.post).not.toHaveBeenCalled();
    expect(mockRouter.patch).not.toHaveBeenCalled();
    expect(mockRouter.delete).not.toHaveBeenCalled();
  });

  test("should skip disabled endpoints based on isEndpointDisabled", () => {
    (isEndpointDisabled as jest.Mock).mockImplementation(
      (config, endpoint) => endpoint === "login" || endpoint === "signup"
    );

    getAuthRouter(mockArkosConfig);

    const loginCalls = mockRouter.post.mock.calls.filter(
      (args: any[]) => args[0]?.path === "/auth/login"
    );
    const signupCalls = mockRouter.post.mock.calls.filter(
      (args: any[]) => args[0]?.path === "/auth/signup"
    );

    expect(loginCalls).toHaveLength(0);
    expect(signupCalls).toHaveLength(0);
  });

  test("should skip rate limiting when all auth endpoints are disabled", () => {
    (isEndpointDisabled as jest.Mock).mockImplementation((config, endpoint) =>
      ["login", "logout", "signup", "updatePassword"].includes(endpoint)
    );

    getAuthRouter(mockArkosConfig);

    expect(mockRouter.use).not.toHaveBeenCalledWith("/auth", expect.anything());
  });

  test("should apply rate limiting when at least one auth endpoint is enabled", () => {
    (isEndpointDisabled as jest.Mock).mockImplementation(
      (config, endpoint) => endpoint !== "login"
    );

    getAuthRouter(mockArkosConfig);

    expect(mockRouter.use).toHaveBeenCalledWith("/auth", expect.any(Function));
  });

  test("should mount custom express router when getModuleComponents returns one", () => {
    const fakeExpressRouter = { get: jest.fn(), post: jest.fn() };
    (routerValidator.isExpressRouter as jest.Mock).mockReturnValue(true);

    (getModuleComponents as jest.Mock).mockReturnValue({
      interceptors: {},
      prismaQueryOptions: mockPrismaQueryOptions,
      router: {
        default: fakeExpressRouter,
        config: {},
      },
    });

    getAuthRouter(mockArkosConfig);

    expect(mockRouter.use).toHaveBeenCalledWith("/auth", fakeExpressRouter);
  });

  test("should throw when custom router module export is not a valid router", () => {
    const fakeInvalidRouter = { notARouter: true };
    (routerValidator.isExpressRouter as jest.Mock).mockReturnValue(false);

    (getModuleComponents as jest.Mock).mockReturnValue({
      interceptors: {},
      prismaQueryOptions: mockPrismaQueryOptions,
      router: {
        default: fakeInvalidRouter,
        config: {},
      },
    });

    expect(() => getAuthRouter(mockArkosConfig)).toThrow("ValidationError");
  });

  test("should call authOpenAPIGenerator.getOpenApiConfig for each endpoint", () => {
    getAuthRouter(mockArkosConfig);

    const endpoints = [
      "login",
      "logout",
      "signup",
      "updatePassword",
      "getMe",
      "updateMe",
      "deleteMe",
      "findManyAuthAction",
      "findOneAuthAction",
    ];

    for (const endpoint of endpoints) {
      expect(authOpenAPIGenerator.getOpenApiConfig).toHaveBeenCalledWith(
        expect.anything(),
        endpoint
      );
    }
  });

  test("should not override existing openapi config when experimental.openapi is false", () => {
    (getModuleComponents as jest.Mock).mockReturnValue({
      interceptors: {},
      prismaQueryOptions: mockPrismaQueryOptions,
      router: {
        config: {
          login: { experimental: { openapi: false } },
        },
      },
    });

    getAuthRouter(mockArkosConfig);

    const callsForLogin = (
      authOpenAPIGenerator.getOpenApiConfig as jest.Mock
    ).mock.calls.filter(([, endpoint]) => endpoint === "login");
    expect(callsForLogin).toHaveLength(0);
  });

  test("should handle null return from getModuleComponents gracefully", () => {
    (getModuleComponents as jest.Mock).mockReturnValue(null);

    expect(() => getAuthRouter(mockArkosConfig)).not.toThrow();
  });

  test("should use default rate limit values when no custom rateLimit config is provided", () => {
    getAuthRouter({ authentication: { mode: "static" } });

    expect(deepmerge).toHaveBeenCalledWith(
      expect.objectContaining({ windowMs: 5000, limit: 10 }),
      {}
    );
  });
});
