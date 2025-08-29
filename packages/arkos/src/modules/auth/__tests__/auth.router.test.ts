import { Router } from "express";
import { getAuthRouter } from "../auth.router";
import { authControllerFactory } from "../auth.controller";
import authService from "../auth.service";
import rateLimit from "express-rate-limit";
import { getModuleComponents } from "../../../utils/dynamic-loader";
import {
  sendResponse,
  addPrismaQueryOptionsToRequest,
  handleRequestBodyValidationAndTransformation,
} from "../../base/base.middlewares";
import deepmerge from "../../../utils/helpers/deepmerge.helper";
import { getArkosConfig } from "../../../server";
import catchAsync from "../../error-handler/utils/catch-async";

// Mock dependencies
jest.mock("../../error-handler/utils/catch-async");
jest.mock("fs");
jest.mock("express", () => {
  const mockRouter = {
    get: jest.fn().mockReturnThis(),
    post: jest.fn().mockReturnThis(),
    patch: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    use: jest.fn().mockReturnThis(),
  };

  // Create a mock express function
  const mockExpress: any = jest.fn(() => ({
    use: jest.fn().mockReturnThis(),
    listen: jest.fn().mockReturnThis(),
    // Add any other express app methods you need
  }));

  // Add Router as a property to the function
  mockExpress.Router = jest.fn(() => mockRouter);

  // Setup for ES modules
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

    // Setup mocks
    mockRouter = Router();
    mockAuthController = {
      getMe: jest.fn(),
      updateMe: jest.fn(),
      deleteMe: jest.fn(),
      login: jest.fn(),
      logout: jest.fn(),
      signup: jest.fn(),
      updatePassword: jest.fn(),
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

    (authControllerFactory as jest.Mock).mockResolvedValue(mockAuthController);
    (getModuleComponents as jest.Mock).mockReturnValue({
      interceptors: {},
      prismaQueryOptions: mockPrismaQueryOptions,
    });
    (rateLimit as jest.Mock).mockReturnValue(jest.fn());
    (deepmerge as any as jest.Mock).mockImplementation((obj1, obj2) => ({
      ...obj1,
      ...obj2,
    }));
    (getArkosConfig as jest.Mock).mockReturnValue({});

    mockArkosConfig = {
      authentication: {
        requestRateLimitOptions: {
          windowMs: 10000,
          limit: 5,
        },
      },
    };
  });

  test("should create router with default middleware configuration when no custom interceptors", async () => {
    // Act
    await getAuthRouter(mockArkosConfig);

    // Assert
    expect(Router).toHaveBeenCalled();
    expect(getModuleComponents).toHaveBeenCalledWith("auth");
    expect(authControllerFactory).toHaveBeenCalled();

    // Check routes are defined with the new middleware
    expect(mockRouter.get).toHaveBeenCalledWith(
      "/users/me",
      authService.authenticate,
      expect.any(Function), // addPrismaQueryOptionsToRequest middleware
      mockAuthController.getMe,
      sendResponse
    );

    expect(mockRouter.post).toHaveBeenCalledWith(
      "/auth/login",
      expect.any(Function), // handleRequestBodyValidationAndTransformation middleware
      expect.any(Function), // addPrismaQueryOptionsToRequest middleware
      mockAuthController.login,
      sendResponse
    );

    expect(mockRouter.post).toHaveBeenCalledWith(
      "/auth/signup",
      expect.any(Function), // handleRequestBodyValidationAndTransformation middleware
      expect.any(Function), // addPrismaQueryOptionsToRequest middleware
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
      mockArkosConfig.authentication.requestRateLimitOptions
    );
    expect(rateLimit).toHaveBeenCalled();
    expect(mockRouter.use).toHaveBeenCalled();
  });

  test("should call addPrismaQueryOptionsToRequest with correct parameters for each route", async () => {
    // Act
    await getAuthRouter(mockArkosConfig);

    // Assert
    // Check that the middleware was called with correct parameters for each route
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
    // Arrange
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

    // Act
    await getAuthRouter(mockArkosConfig);

    // Assert
    // Check routes have custom middleware chains with addPrismaQueryOptionsToRequest
    expect(mockRouter.get).toHaveBeenCalledWith(
      "/users/me",
      authService.authenticate,
      expect.any(Function), // addPrismaQueryOptionsToRequest middleware
      customMiddlewares.beforeGetMe,
      mockAuthController.getMe,
      customMiddlewares.afterGetMe,
      sendResponse
    );

    expect(mockRouter.post).toHaveBeenCalledWith(
      "/auth/login",
      expect.any(Function), // handleRequestBodyValidationAndTransformation middleware
      expect.any(Function), // addPrismaQueryOptionsToRequest middleware
      customMiddlewares.beforeLogin,
      mockAuthController.login,
      customMiddlewares.afterLogin,
      sendResponse
    );

    expect(mockRouter.post).toHaveBeenCalledWith(
      "/auth/signup",
      expect.any(Function), // handleRequestBodyValidationAndTransformation middleware
      expect.any(Function), // addPrismaQueryOptionsToRequest middleware
      customMiddlewares.beforeSignup,
      mockAuthController.signup,
      customMiddlewares.afterSignup,
      sendResponse
    );
  });

  test("should pass correct DTOs or schemas to handleRequestBodyValidationAndTransformation based on config", async () => {
    // Arrange
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

    // Act
    await getAuthRouter(classValidatorConfig as any);

    // Assert - check that DTOs were passed
    expect(handleRequestBodyValidationAndTransformation).toHaveBeenCalledWith(
      mockDtos.updateMe
    );
    expect(handleRequestBodyValidationAndTransformation).toHaveBeenCalledWith(
      mockDtos.login
    );
    expect(handleRequestBodyValidationAndTransformation).toHaveBeenCalledWith(
      mockDtos.signup
    );
    expect(handleRequestBodyValidationAndTransformation).toHaveBeenCalledWith(
      mockDtos.updatePassword
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

    // Act
    await getAuthRouter(zodConfig as any);

    // Assert - check that schemas were passed
    expect(handleRequestBodyValidationAndTransformation).toHaveBeenCalledWith(
      mockSchemas.updateMe
    );
    expect(handleRequestBodyValidationAndTransformation).toHaveBeenCalledWith(
      mockSchemas.login
    );
    expect(handleRequestBodyValidationAndTransformation).toHaveBeenCalledWith(
      mockSchemas.signup
    );
    expect(handleRequestBodyValidationAndTransformation).toHaveBeenCalledWith(
      mockSchemas.updatePassword
    );
  });

  test("should create all required routes with no interceptors passed", async () => {
    // Act
    (getModuleComponents as jest.Mock).mockReturnValue({
      interceptors: undefined,
      prismaQueryOptions: mockPrismaQueryOptions,
    });

    await getAuthRouter({});

    // Assert
    expect(mockRouter.get).toHaveBeenCalledWith(
      "/users/me",
      expect.any(Function),
      expect.any(Function),
      expect.any(Function),
      sendResponse
    );

    expect(mockRouter.patch).toHaveBeenCalledWith(
      "/users/me",
      expect.any(Function),
      expect.any(Function),
      expect.any(Function),
      expect.any(Function),
      sendResponse
    );

    expect(mockRouter.delete).toHaveBeenCalledWith(
      "/users/me",
      expect.any(Function),
      expect.any(Function),
      expect.any(Function),
      sendResponse
    );

    expect(mockRouter.post).toHaveBeenCalledWith(
      "/auth/login",
      expect.any(Function),
      expect.any(Function),
      expect.any(Function),
      sendResponse
    );

    expect(mockRouter.delete).toHaveBeenCalledWith(
      "/auth/logout",
      expect.any(Function),
      expect.any(Function),
      sendResponse
    );

    expect(mockRouter.post).toHaveBeenCalledWith(
      "/auth/signup",
      expect.any(Function),
      expect.any(Function),
      expect.any(Function),
      sendResponse
    );

    expect(mockRouter.post).toHaveBeenCalledWith(
      "/auth/update-password",
      expect.any(Function),
      expect.any(Function),
      expect.any(Function),
      expect.any(Function),
      sendResponse
    );
  });

  test("should create all required routes with after interceptors passed to all routes", async () => {
    // Act
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

    // Assert
    expect(mockRouter.get).toHaveBeenCalledWith(
      "/users/me",
      expect.any(Function), // authenticate
      expect.any(Function), // addPrismaQueryOptionsToRequest
      expect.any(Function), // getMe
      expect.any(Function), // afterGetMe
      sendResponse
    );

    expect(mockRouter.patch).toHaveBeenCalledWith(
      "/users/me",
      expect.any(Function), // authenticate
      expect.any(Function), // handleRequestBodyValidationAndTransformation
      expect.any(Function), // addPrismaQueryOptionsToRequest
      expect.any(Function), // updateMe
      expect.any(Function), // afterUpdateMe
      sendResponse
    );

    expect(mockRouter.delete).toHaveBeenCalledWith(
      "/users/me",
      expect.any(Function), // authenticate
      expect.any(Function), // addPrismaQueryOptionsToRequest
      expect.any(Function), // deleteMe
      expect.any(Function), // afterDeleteMe
      sendResponse
    );

    expect(mockRouter.post).toHaveBeenCalledWith(
      "/auth/login",
      expect.any(Function), // handleRequestBodyValidationAndTransformation
      expect.any(Function), // addPrismaQueryOptionsToRequest
      expect.any(Function), // login
      expect.any(Function), // afterLogin
      sendResponse
    );

    expect(mockRouter.delete).toHaveBeenCalledWith(
      "/auth/logout",
      expect.any(Function), // authenticate
      expect.any(Function), // logout
      expect.any(Function), // afterLogout
      sendResponse
    );

    expect(mockRouter.post).toHaveBeenCalledWith(
      "/auth/signup",
      expect.any(Function), // handleRequestBodyValidationAndTransformation
      expect.any(Function), // addPrismaQueryOptionsToRequest
      expect.any(Function), // signup
      expect.any(Function), // afterSignup
      sendResponse
    );

    expect(mockRouter.post).toHaveBeenCalledWith(
      "/auth/update-password",
      expect.any(Function), // authenticate
      expect.any(Function), // handleRequestBodyValidationAndTransformation
      expect.any(Function), // addPrismaQueryOptionsToRequest
      expect.any(Function), // updatePassword
      expect.any(Function), // afterUpdatePassword
      sendResponse
    );
  });

  test("should create all required routes with before interceptors passed to all routes", async () => {
    // Act
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

    // Assert
    expect(mockRouter.get).toHaveBeenCalledWith(
      "/users/me",
      expect.any(Function), // authenticate
      expect.any(Function), // addPrismaQueryOptionsToRequest
      expect.any(Function), // beforeGetMe
      expect.any(Function), // getMe
      sendResponse
    );

    expect(mockRouter.patch).toHaveBeenCalledWith(
      "/users/me",
      expect.any(Function), // authenticate
      expect.any(Function), // handleRequestBodyValidationAndTransformation
      expect.any(Function), // addPrismaQueryOptionsToRequest
      expect.any(Function), // beforeUpdateMe
      expect.any(Function), // updateMe
      sendResponse
    );

    expect(mockRouter.delete).toHaveBeenCalledWith(
      "/users/me",
      expect.any(Function), // authenticate
      expect.any(Function), // addPrismaQueryOptionsToRequest
      expect.any(Function), // beforeDeleteMe
      expect.any(Function), // deleteMe
      sendResponse
    );

    expect(mockRouter.post).toHaveBeenCalledWith(
      "/auth/login",
      expect.any(Function), // handleRequestBodyValidationAndTransformation
      expect.any(Function), // addPrismaQueryOptionsToRequest
      expect.any(Function), // beforeLogin
      expect.any(Function), // login
      sendResponse
    );

    expect(mockRouter.delete).toHaveBeenCalledWith(
      "/auth/logout",
      expect.any(Function), // authenticate
      expect.any(Function), // beforeLogout
      expect.any(Function), // logout
      sendResponse
    );

    expect(mockRouter.post).toHaveBeenCalledWith(
      "/auth/signup",
      expect.any(Function), // handleRequestBodyValidationAndTransformation
      expect.any(Function), // addPrismaQueryOptionsToRequest
      expect.any(Function), // beforeSignup
      expect.any(Function), // signup
      sendResponse
    );

    expect(mockRouter.post).toHaveBeenCalledWith(
      "/auth/update-password",
      expect.any(Function), // authenticate
      expect.any(Function), // handleRequestBodyValidationAndTransformation
      expect.any(Function), // addPrismaQueryOptionsToRequest
      expect.any(Function), // beforeUpdatePassword
      expect.any(Function), // updatePassword
      sendResponse
    );
  });

  test("should create all required routes with before and after interceptors passed to all routes", async () => {
    // Act
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

    // Assert
    expect(mockRouter.get).toHaveBeenCalledWith(
      "/users/me",
      expect.any(Function), // authenticate
      expect.any(Function), // addPrismaQueryOptionsToRequest
      expect.any(Function), // beforeGetMe
      expect.any(Function), // getMe
      expect.any(Function), // afterGetMe
      sendResponse,
      expect.any(Function) // Error handler middleware
    );

    expect(mockRouter.patch).toHaveBeenCalledWith(
      "/users/me",
      expect.any(Function), // authenticate
      expect.any(Function), // handleRequestBodyValidationAndTransformation
      expect.any(Function), // addPrismaQueryOptionsToRequest
      expect.any(Function), // beforeUpdateMe
      expect.any(Function), // updateMe
      expect.any(Function), // afterUpdateMe
      sendResponse,
      expect.any(Function) // Error handler middleware
    );

    expect(mockRouter.delete).toHaveBeenCalledWith(
      "/users/me",
      expect.any(Function), // authenticate
      expect.any(Function), // addPrismaQueryOptionsToRequest
      expect.any(Function), // beforeDeleteMe
      expect.any(Function), // deleteMe
      expect.any(Function), // afterDeleteMe
      sendResponse,
      expect.any(Function) // Error handler middleware
    );

    expect(mockRouter.post).toHaveBeenCalledWith(
      "/auth/login",
      expect.any(Function), // handleRequestBodyValidationAndTransformation
      expect.any(Function), // addPrismaQueryOptionsToRequest
      expect.any(Function), // beforeLogin
      expect.any(Function), // login
      expect.any(Function), // afterLogin
      sendResponse,
      expect.any(Function) // Error handler middleware
    );

    expect(mockRouter.delete).toHaveBeenCalledWith(
      "/auth/logout",
      expect.any(Function), // authenticate
      expect.any(Function), // beforeLogout
      expect.any(Function), // logout
      expect.any(Function), // afterLogout
      sendResponse,
      expect.any(Function) // Error handler middleware
    );

    expect(mockRouter.post).toHaveBeenCalledWith(
      "/auth/signup",
      expect.any(Function), // handleRequestBodyValidationAndTransformation
      expect.any(Function), // addPrismaQueryOptionsToRequest
      expect.any(Function), // beforeSignup
      expect.any(Function), // signup
      expect.any(Function), // afterSignup
      sendResponse,
      expect.any(Function) // Error handler middleware
    );

    expect(mockRouter.post).toHaveBeenCalledWith(
      "/auth/update-password",
      expect.any(Function), // authenticate
      expect.any(Function), // handleRequestBodyValidationAndTransformation
      expect.any(Function), // addPrismaQueryOptionsToRequest
      expect.any(Function), // beforeUpdatePassword
      expect.any(Function), // updatePassword
      expect.any(Function), // afterUpdatePassword
      sendResponse,
      expect.any(Function) // Error handler middleware
    );
  });
});
