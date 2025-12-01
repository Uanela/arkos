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

  // Add other express exports you might need
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
  handleRequestBodyValidationAndTransformation: jest.fn(() => {
    return () => {};
  }),
  addPrismaQueryOptionsToRequest: jest.fn(() => {
    return () => {};
  }),
  sendResponse: jest.fn(),
}));

describe("Auth Router", () => {
  let mockRouter: any;
  let mockAuthController: any;
  let mockArkosConfig: any;
  let mockPrismaQueryOptions: any;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    (getArkosConfig as jest.Mock).mockImplementation(() => ({
      authentication: { mode: "static" },
      validation: { resolver: "zod" },
    }));

    // Setup mocks

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
    // (getArkosConfig as jest.Mock).mockReturnValue({});

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

  test("should create router with default middleware configuration when no custom interceptors", async () => {
    getAuthRouter(mockArkosConfig);

    expect(ArkosRouter).toHaveBeenCalled();
    expect(getModuleComponents).toHaveBeenCalledWith("auth");
    expect(authControllerFactory).toHaveBeenCalled();

    // GET /users/me - protected route
    expect(mockRouter.get).toHaveBeenCalledWith(
      {
        path: "/users/me",
        disabled: false,
        authentication: true,
        validation: undefined,
        experimental: { openapi: false },
      },
      expect.any(Function), // addPrismaQueryOptionsToRequest
      mockAuthController.getMe,
      sendResponse
    );

    // POST /auth/login - public route
    expect(mockRouter.post).toHaveBeenCalledWith(
      {
        path: "/auth/login",
        disabled: false,
        authentication: false,
        validation: undefined,
        experimental: { openapi: false },
      },
      expect.any(Function), // addPrismaQueryOptionsToRequest
      mockAuthController.login,
      sendResponse
    );

    // POST /auth/signup - public route
    expect(mockRouter.post).toHaveBeenCalledWith(
      {
        path: "/auth/signup",
        disabled: false,
        authentication: false,
        validation: undefined,
        experimental: { openapi: false },
      },
      expect.any(Function), // addPrismaQueryOptionsToRequest
      mockAuthController.signup,
      sendResponse
    );

    // Verify rate limiting is applied with merged config
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

  test("should call addPrismaQueryOptionsToRequest with correct parameters for each route", async () => {
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

  test("should create router with custom middleware configuration", async () => {
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

    // GET /users/me with custom interceptors
    expect(mockRouter.get).toHaveBeenCalledWith(
      {
        path: "/users/me",
        disabled: false,
        authentication: true,
        validation: undefined,
        experimental: { openapi: false },
      },
      expect.any(Function), // addPrismaQueryOptionsToRequest
      customMiddlewares.beforeGetMe,
      mockAuthController.getMe,
      customMiddlewares.afterGetMe,
      sendResponse
    );

    // POST /auth/login with custom interceptors
    expect(mockRouter.post).toHaveBeenCalledWith(
      {
        path: "/auth/login",
        disabled: false,
        authentication: false,
        validation: undefined,
        experimental: { openapi: false },
      },
      expect.any(Function), // addPrismaQueryOptionsToRequest
      customMiddlewares.beforeLogin,
      mockAuthController.login,
      customMiddlewares.afterLogin,
      sendResponse
    );

    // POST /auth/signup with custom interceptors
    expect(mockRouter.post).toHaveBeenCalledWith(
      {
        path: "/auth/signup",
        disabled: false,
        authentication: false,
        validation: undefined,
        experimental: { openapi: false },
      },
      expect.any(Function), // addPrismaQueryOptionsToRequest
      customMiddlewares.beforeSignup,
      mockAuthController.signup,
      customMiddlewares.afterSignup,
      sendResponse
    );
  });

  test("should pass correct DTOs or schemas to validation config based on resolver", async () => {
    const mockDtos = {
      updateMe: "UpdateMeDto",
      login: "LoginDto",
      signup: "SignupDto",
      updatePassword: "UpdatePasswordDto",
    };

    const mockSchemas = {
      updateMe: "updateMeSchema",
      login: "loginSchema",
      signup: "signupSchema",
      updatePassword: "updatePasswordSchema",
    };

    (getModuleComponents as jest.Mock).mockReturnValue({
      interceptors: {},
      dtos: mockDtos,
      schemas: mockSchemas,
      prismaQueryOptions: mockPrismaQueryOptions,
    });

    // Test with class-validator configuration
    const classValidatorConfig = {
      validation: { resolver: "class-validator" },
      authentication: { mode: "static" },
    };

    getAuthRouter(classValidatorConfig as any);

    expect(mockRouter.patch).toHaveBeenCalledWith(
      {
        path: "/users/me",
        disabled: false,
        authentication: true,
        validation: { body: mockDtos.updateMe },
        experimental: { openapi: false },
      },
      expect.any(Function),
      mockAuthController.updateMe,
      sendResponse
    );

    expect(mockRouter.post).toHaveBeenCalledWith(
      {
        path: "/auth/login",
        disabled: false,
        authentication: false,
        validation: { body: mockDtos.login },
        experimental: { openapi: false },
      },
      expect.any(Function),
      mockAuthController.login,
      sendResponse
    );

    // Reset for next test
    jest.clearAllMocks();
    (getModuleComponents as jest.Mock).mockReturnValue({
      interceptors: {},
      dtos: mockDtos,
      schemas: mockSchemas,
      prismaQueryOptions: mockPrismaQueryOptions,
    });

    // Test with zod configuration
    const zodConfig = {
      validation: { resolver: "zod" },
      authentication: { mode: "dynamic" },
    };

    getAuthRouter(zodConfig as any);

    expect(mockRouter.patch).toHaveBeenCalledWith(
      {
        path: "/users/me",
        disabled: false,
        authentication: true,
        validation: { body: mockSchemas.updateMe },
        experimental: { openapi: false },
      },
      expect.any(Function),
      mockAuthController.updateMe,
      sendResponse
    );

    expect(mockRouter.post).toHaveBeenCalledWith(
      {
        path: "/auth/login",
        disabled: false,
        authentication: false,
        validation: { body: mockSchemas.login },
        experimental: { openapi: false },
      },
      expect.any(Function),
      mockAuthController.login,
      sendResponse
    );
  });

  test("should create all required routes with no interceptors passed", async () => {
    (getModuleComponents as jest.Mock).mockReturnValue({
      interceptors: undefined,
      prismaQueryOptions: mockPrismaQueryOptions,
    });

    getAuthRouter({ authentication: { mode: "static" } });

    // GET /users/me
    expect(mockRouter.get).toHaveBeenCalledWith(
      {
        path: "/users/me",
        disabled: false,
        authentication: true,
        validation: undefined,
        experimental: { openapi: false },
      },
      expect.any(Function),
      expect.any(Function),
      sendResponse
    );

    // PATCH /users/me
    expect(mockRouter.patch).toHaveBeenCalledWith(
      {
        path: "/users/me",
        disabled: false,
        authentication: true,
        validation: undefined,
        experimental: { openapi: false },
      },
      expect.any(Function),
      expect.any(Function),
      sendResponse
    );

    // DELETE /users/me
    expect(mockRouter.delete).toHaveBeenCalledWith(
      {
        path: "/users/me",
        disabled: false,
        authentication: true,
        validation: undefined,
        experimental: { openapi: false },
      },
      expect.any(Function),
      expect.any(Function),
      sendResponse
    );

    // POST /auth/login
    expect(mockRouter.post).toHaveBeenCalledWith(
      {
        path: "/auth/login",
        disabled: false,
        authentication: false,
        validation: undefined,
        experimental: { openapi: false },
      },
      expect.any(Function),
      expect.any(Function),
      sendResponse
    );

    // DELETE /auth/logout
    expect(mockRouter.delete).toHaveBeenCalledWith(
      {
        path: "/auth/logout",
        disabled: false,
        authentication: true,
        validation: undefined,
        experimental: { openapi: false },
      },
      expect.any(Function),
      sendResponse
    );

    // POST /auth/signup
    expect(mockRouter.post).toHaveBeenCalledWith(
      {
        path: "/auth/signup",
        disabled: false,
        authentication: false,
        validation: undefined,
        experimental: { openapi: false },
      },
      expect.any(Function),
      expect.any(Function),
      sendResponse
    );

    // POST /auth/update-password
    expect(mockRouter.post).toHaveBeenCalledWith(
      {
        path: "/auth/update-password",
        disabled: false,
        authentication: true,
        validation: undefined,
        experimental: { openapi: false },
      },
      expect.any(Function),
      expect.any(Function),
      sendResponse
    );
  });

  test("should create all required routes with after interceptors passed to all routes", async () => {
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

    // GET /users/me
    expect(mockRouter.get).toHaveBeenCalledWith(
      {
        path: "/users/me",
        disabled: false,
        authentication: true,
        validation: undefined,
        experimental: { openapi: false },
      },
      expect.any(Function), // addPrismaQueryOptionsToRequest
      expect.any(Function), // getMe
      expect.any(Function), // afterGetMe
      sendResponse
    );

    // PATCH /users/me
    expect(mockRouter.patch).toHaveBeenCalledWith(
      {
        path: "/users/me",
        disabled: false,
        authentication: true,
        validation: undefined,
        experimental: { openapi: false },
      },
      expect.any(Function), // addPrismaQueryOptionsToRequest
      expect.any(Function), // updateMe
      expect.any(Function), // afterUpdateMe
      sendResponse
    );

    // DELETE /users/me
    expect(mockRouter.delete).toHaveBeenCalledWith(
      {
        path: "/users/me",
        disabled: false,
        authentication: true,
        validation: undefined,
        experimental: { openapi: false },
      },
      expect.any(Function), // addPrismaQueryOptionsToRequest
      expect.any(Function), // deleteMe
      expect.any(Function), // afterDeleteMe
      sendResponse
    );

    // POST /auth/login
    expect(mockRouter.post).toHaveBeenCalledWith(
      {
        path: "/auth/login",
        disabled: false,
        authentication: false,
        validation: undefined,
        experimental: { openapi: false },
      },
      expect.any(Function), // addPrismaQueryOptionsToRequest
      expect.any(Function), // login
      expect.any(Function), // afterLogin
      sendResponse
    );

    // DELETE /auth/logout
    expect(mockRouter.delete).toHaveBeenCalledWith(
      {
        path: "/auth/logout",
        disabled: false,
        authentication: true,
        validation: undefined,
        experimental: { openapi: false },
      },
      expect.any(Function), // logout
      expect.any(Function), // afterLogout
      sendResponse
    );

    // POST /auth/signup
    expect(mockRouter.post).toHaveBeenCalledWith(
      {
        path: "/auth/signup",
        disabled: false,
        authentication: false,
        validation: undefined,
        experimental: { openapi: false },
      },
      expect.any(Function), // addPrismaQueryOptionsToRequest
      expect.any(Function), // signup
      expect.any(Function), // afterSignup
      sendResponse
    );

    // POST /auth/update-password
    expect(mockRouter.post).toHaveBeenCalledWith(
      {
        path: "/auth/update-password",
        disabled: false,
        authentication: true,
        validation: undefined,
        experimental: { openapi: false },
      },
      expect.any(Function), // addPrismaQueryOptionsToRequest
      expect.any(Function), // updatePassword
      expect.any(Function), // afterUpdatePassword
      sendResponse
    );
  });

  test("should create all required routes with before interceptors passed to all routes", async () => {
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

    // GET /users/me
    expect(mockRouter.get).toHaveBeenCalledWith(
      {
        path: "/users/me",
        disabled: false,
        authentication: true,
        validation: undefined,
        experimental: { openapi: false },
      },
      expect.any(Function), // addPrismaQueryOptionsToRequest
      expect.any(Function), // beforeGetMe
      expect.any(Function), // getMe
      sendResponse
    );

    // PATCH /users/me
    expect(mockRouter.patch).toHaveBeenCalledWith(
      {
        path: "/users/me",
        disabled: false,
        authentication: true,
        validation: undefined,
        experimental: { openapi: false },
      },
      expect.any(Function), // addPrismaQueryOptionsToRequest
      expect.any(Function), // beforeUpdateMe
      expect.any(Function), // updateMe
      sendResponse
    );

    // DELETE /users/me
    expect(mockRouter.delete).toHaveBeenCalledWith(
      {
        path: "/users/me",
        disabled: false,
        authentication: true,
        validation: undefined,
        experimental: { openapi: false },
      },
      expect.any(Function), // addPrismaQueryOptionsToRequest
      expect.any(Function), // beforeDeleteMe
      expect.any(Function), // deleteMe
      sendResponse
    );

    // POST /auth/login
    expect(mockRouter.post).toHaveBeenCalledWith(
      {
        path: "/auth/login",
        disabled: false,
        authentication: false,
        validation: undefined,
        experimental: { openapi: false },
      },
      expect.any(Function), // addPrismaQueryOptionsToRequest
      expect.any(Function), // beforeLogin
      expect.any(Function), // login
      sendResponse
    );

    // DELETE /auth/logout
    expect(mockRouter.delete).toHaveBeenCalledWith(
      {
        path: "/auth/logout",
        disabled: false,
        authentication: true,
        validation: undefined,
        experimental: { openapi: false },
      },
      expect.any(Function), // beforeLogout
      expect.any(Function), // logout
      sendResponse
    );

    // POST /auth/signup
    expect(mockRouter.post).toHaveBeenCalledWith(
      {
        path: "/auth/signup",
        disabled: false,
        authentication: false,
        validation: undefined,
        experimental: { openapi: false },
      },
      expect.any(Function), // addPrismaQueryOptionsToRequest
      expect.any(Function), // beforeSignup
      expect.any(Function), // signup
      sendResponse
    );

    // POST /auth/update-password
    expect(mockRouter.post).toHaveBeenCalledWith(
      {
        path: "/auth/update-password",
        disabled: false,
        authentication: true,
        validation: undefined,
        experimental: { openapi: false },
      },
      expect.any(Function), // addPrismaQueryOptionsToRequest
      expect.any(Function), // beforeUpdatePassword
      expect.any(Function), // updatePassword
      sendResponse
    );
  });

  test("should create all required routes with before and after interceptors passed to all routes", async () => {
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

    // GET /users/me
    expect(mockRouter.get).toHaveBeenCalledWith(
      {
        path: "/users/me",
        disabled: false,
        authentication: true,
        validation: undefined,
        experimental: { openapi: false },
      },
      expect.any(Function), // addPrismaQueryOptionsToRequest
      expect.any(Function), // beforeGetMe
      expect.any(Function), // getMe
      expect.any(Function), // afterGetMe
      sendResponse,
      expect.any(Function) // Error handler middleware
    );

    // PATCH /users/me
    expect(mockRouter.patch).toHaveBeenCalledWith(
      {
        path: "/users/me",
        disabled: false,
        authentication: true,
        validation: undefined,
        experimental: { openapi: false },
      },
      expect.any(Function), // addPrismaQueryOptionsToRequest
      expect.any(Function), // beforeUpdateMe
      expect.any(Function), // updateMe
      expect.any(Function), // afterUpdateMe
      sendResponse,
      expect.any(Function) // Error handler middleware
    );

    // DELETE /users/me
    expect(mockRouter.delete).toHaveBeenCalledWith(
      {
        path: "/users/me",
        disabled: false,
        authentication: true,
        validation: undefined,
        experimental: { openapi: false },
      },
      expect.any(Function), // addPrismaQueryOptionsToRequest
      expect.any(Function), // beforeDeleteMe
      expect.any(Function), // deleteMe
      expect.any(Function), // afterDeleteMe
      sendResponse,
      expect.any(Function) // Error handler middleware
    );

    // POST /auth/login
    expect(mockRouter.post).toHaveBeenCalledWith(
      {
        path: "/auth/login",
        disabled: false,
        authentication: false,
        validation: undefined,
        experimental: { openapi: false },
      },
      expect.any(Function), // addPrismaQueryOptionsToRequest
      expect.any(Function), // beforeLogin
      expect.any(Function), // login
      expect.any(Function), // afterLogin
      sendResponse,
      expect.any(Function) // Error handler middleware
    );

    // DELETE /auth/logout
    expect(mockRouter.delete).toHaveBeenCalledWith(
      {
        path: "/auth/logout",
        disabled: false,
        authentication: true,
        validation: undefined,
        experimental: { openapi: false },
      },
      expect.any(Function), // beforeLogout
      expect.any(Function), // logout
      expect.any(Function), // afterLogout
      sendResponse,
      expect.any(Function) // Error handler middleware
    );

    // POST /auth/signup
    expect(mockRouter.post).toHaveBeenCalledWith(
      {
        path: "/auth/signup",
        disabled: false,
        authentication: false,
        validation: undefined,
        experimental: { openapi: false },
      },
      expect.any(Function), // addPrismaQueryOptionsToRequest
      expect.any(Function), // beforeSignup
      expect.any(Function), // signup
      expect.any(Function), // afterSignup
      sendResponse,
      expect.any(Function) // Error handler middleware
    );

    // POST /auth/update-password
    expect(mockRouter.post).toHaveBeenCalledWith(
      {
        path: "/auth/update-password",
        disabled: false,
        authentication: true,
        validation: undefined,
        experimental: { openapi: false },
      },
      expect.any(Function), // addPrismaQueryOptionsToRequest
      expect.any(Function), // beforeUpdatePassword
      expect.any(Function), // updatePassword
      expect.any(Function), // afterUpdatePassword
      sendResponse,
      expect.any(Function) // Error handler middleware
    );
  });

  test("should handle auth-action routes with proper authentication config", async () => {
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

    // GET /auth-actions
    expect(mockRouter.get).toHaveBeenCalledWith(
      {
        path: "/auth-actions",
        disabled: false,
        authentication: {
          resource: "auth",
          action: "View",
          rule: { roles: ["admin"] },
        },
        validation: undefined,
        experimental: { openapi: false },
      },
      expect.any(Function), // findManyAuthAction
      sendResponse
    );

    // GET /auth-actions/:resourceName
    expect(mockRouter.get).toHaveBeenCalledWith(
      {
        path: "/auth-actions/:resourceName",
        disabled: false,
        authentication: {
          resource: "auth",
          action: "View",
          rule: { roles: ["admin"] },
        },
        validation: undefined,
        experimental: { openapi: false },
      },
      expect.any(Function), // findOneAuthAction
      sendResponse
    );
  });
});
