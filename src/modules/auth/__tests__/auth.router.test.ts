import { Router } from "express";
import { getAuthRouter } from "../auth.router";
import { authControllerFactory } from "../auth.controller";
import authService from "../auth.service";
import rateLimit from "express-rate-limit";
import { importPrismaModelModules } from "../../../utils/helpers/models.helpers";
import { sendResponse } from "../../base/base.middlewares";
import deepmerge from "../../../utils/helpers/deepmerge.helper";

// Mock dependencies
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
jest.mock("../auth.service");
jest.mock("express-rate-limit");
jest.mock("../../../utils/helpers/models.helpers");
jest.mock("../../base/base.middlewares");
jest.mock("../../../utils/helpers/deepmerge.helper");
jest.mock("../../../app");

describe("Auth Router", () => {
  let mockRouter: any;
  let mockAuthController: any;
  let mockArkosConfig: any;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Setup mocks
    mockRouter = Router();
    mockAuthController = {
      getMe: jest.fn(),
      login: jest.fn(),
      logout: jest.fn(),
      signup: jest.fn(),
      updatePassword: jest.fn(),
    };

    (authControllerFactory as jest.Mock).mockResolvedValue(mockAuthController);
    (importPrismaModelModules as jest.Mock).mockResolvedValue({
      middlewares: {},
    });
    (rateLimit as jest.Mock).mockReturnValue(jest.fn());
    (deepmerge as any as jest.Mock).mockImplementation((obj1, obj2) => ({
      ...obj1,
      ...obj2,
    }));

    mockArkosConfig = {
      authentication: {
        requestRateLimitOptions: {
          windowMs: 10000,
          limit: 5,
        },
      },
    };
  });

  test("should create router with default middleware configuration when no custom middlewares", async () => {
    // Act
    await getAuthRouter(mockArkosConfig);

    // Assert
    expect(Router).toHaveBeenCalled();
    expect(importPrismaModelModules).toHaveBeenCalledWith("auth");
    expect(authControllerFactory).toHaveBeenCalled();

    // Check routes are defined
    expect(mockRouter.get).toHaveBeenCalledWith(
      "/users/me",
      authService.authenticate,
      mockAuthController.getMe,
      sendResponse,
      sendResponse,
      sendResponse
    );

    expect(mockRouter.post).toHaveBeenCalledWith(
      "/auth/login",
      expect.any(Function),
      mockAuthController.login,
      sendResponse,
      sendResponse,
      sendResponse
    );

    expect(mockRouter.post).toHaveBeenCalledWith(
      "/auth/signup",
      expect.any(Function),
      mockAuthController.signup,
      sendResponse,
      sendResponse,
      sendResponse
    );

    // Verify rate limiting is applied with merged config
    expect(deepmerge).toHaveBeenCalledWith(
      {
        windowMs: 5000,
        limit: 10,
        standardHeaders: "draft-7",
        legacyHeaders: false,
      },
      mockArkosConfig.authentication.requestRateLimitOptions
    );
    expect(rateLimit).toHaveBeenCalled();
    expect(mockRouter.use).toHaveBeenCalled();
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

    (importPrismaModelModules as jest.Mock).mockResolvedValue({
      middlewares: customMiddlewares,
    });

    // Act
    await getAuthRouter(mockArkosConfig);

    // Assert
    // Check routes have custom middleware chains
    expect(mockRouter.get).toHaveBeenCalledWith(
      "/users/me",
      authService.authenticate,
      customMiddlewares.beforeGetMe,
      mockAuthController.getMe,
      customMiddlewares.afterGetMe,
      sendResponse
    );

    expect(mockRouter.post).toHaveBeenCalledWith(
      "/auth/login",
      expect.any(Function),
      customMiddlewares.beforeLogin,
      mockAuthController.login,
      customMiddlewares.afterLogin,
      sendResponse
    );

    expect(mockRouter.post).toHaveBeenCalledWith(
      "/auth/signup",
      expect.any(Function),
      customMiddlewares.beforeSignup,
      mockAuthController.signup,
      customMiddlewares.afterSignup,
      sendResponse
    );
  });

  test("should create all required routes with no middlewares passed", async () => {
    // Act
    await getAuthRouter(mockArkosConfig);

    // Assert
    expect(mockRouter.get).toHaveBeenCalledWith(
      "/users/me",
      expect.any(Function),
      expect.any(Function),
      sendResponse,
      sendResponse,
      sendResponse
    );

    expect(mockRouter.patch).toHaveBeenCalledWith(
      "/users/me",
      expect.any(Function),
      expect.any(Function),
      expect.any(Function),
      sendResponse,
      sendResponse,
      sendResponse
    );

    expect(mockRouter.delete).toHaveBeenCalledWith(
      "/users/me",
      expect.any(Function),
      expect.any(Function),
      sendResponse,
      sendResponse,
      sendResponse
    );

    expect(mockRouter.post).toHaveBeenCalledWith(
      "/auth/login",
      expect.any(Function),
      expect.any(Function),
      sendResponse,
      sendResponse,
      sendResponse
    );

    expect(mockRouter.delete).toHaveBeenCalledWith(
      "/auth/logout",
      expect.any(Function),
      expect.any(Function),
      sendResponse,
      sendResponse,
      sendResponse
    );

    expect(mockRouter.post).toHaveBeenCalledWith(
      "/auth/signup",
      expect.any(Function),
      expect.any(Function),
      sendResponse,
      sendResponse,
      sendResponse
    );

    expect(mockRouter.post).toHaveBeenCalledWith(
      "/auth/update-password",
      expect.any(Function),
      expect.any(Function),
      expect.any(Function),
      sendResponse,
      sendResponse,
      sendResponse
    );
  });

  test("should create all required routes with before middlewares passed to all routes", async () => {
    // Act
    (importPrismaModelModules as jest.Mock).mockResolvedValue({
      middlewares: {
        afterGetMe: jest.fn(),
        afterLogin: jest.fn(),
        afterLogout: jest.fn(),
        afterSignup: jest.fn(),
        afterUpdatePassword: jest.fn(),
      },
    });
    await getAuthRouter(mockArkosConfig);

    // Assert
    expect(mockRouter.get).toHaveBeenCalledWith(
      "/users/me",
      expect.any(Function),
      expect.any(Function),
      expect.any(Function),
      sendResponse,
      sendResponse
    );

    expect(mockRouter.patch).toHaveBeenCalledWith(
      "/users/me",
      expect.any(Function),
      expect.any(Function),
      expect.any(Function),
      expect.any(Function),
      sendResponse,
      sendResponse
    );

    expect(mockRouter.delete).toHaveBeenCalledWith(
      "/users/me",
      expect.any(Function),
      expect.any(Function),
      expect.any(Function),
      sendResponse,
      sendResponse
    );

    expect(mockRouter.post).toHaveBeenCalledWith(
      "/auth/login",
      expect.any(Function),
      expect.any(Function),
      expect.any(Function),
      sendResponse,
      sendResponse
    );

    expect(mockRouter.delete).toHaveBeenCalledWith(
      "/auth/logout",
      expect.any(Function),
      expect.any(Function),
      expect.any(Function),
      sendResponse,
      sendResponse
    );

    expect(mockRouter.post).toHaveBeenCalledWith(
      "/auth/signup",
      expect.any(Function),
      expect.any(Function),
      expect.any(Function),
      sendResponse,
      sendResponse
    );

    expect(mockRouter.post).toHaveBeenCalledWith(
      "/auth/update-password",
      expect.any(Function),
      expect.any(Function),
      expect.any(Function),
      expect.any(Function),
      sendResponse,
      sendResponse
    );
  });

  test("should create all required routes with after middlewares passed to all routes", async () => {
    // Act
    (importPrismaModelModules as jest.Mock).mockResolvedValue({
      middlewares: {
        afterGetMe: jest.fn(),
        afterLogin: jest.fn(),
        afterLogout: jest.fn(),
        afterSignup: jest.fn(),
        afterUpdatePassword: jest.fn(),
      },
    });
    await getAuthRouter(mockArkosConfig);

    // Assert
    expect(mockRouter.get).toHaveBeenCalledWith(
      "/users/me",
      expect.any(Function),
      expect.any(Function),
      expect.any(Function),
      sendResponse,
      sendResponse
    );

    expect(mockRouter.patch).toHaveBeenCalledWith(
      "/users/me",
      expect.any(Function),
      expect.any(Function),
      expect.any(Function),
      expect.any(Function),
      sendResponse,
      sendResponse
    );

    expect(mockRouter.delete).toHaveBeenCalledWith(
      "/users/me",
      expect.any(Function),
      expect.any(Function),
      expect.any(Function),
      sendResponse,
      sendResponse
    );

    expect(mockRouter.post).toHaveBeenCalledWith(
      "/auth/login",
      expect.any(Function),
      expect.any(Function),
      expect.any(Function),
      sendResponse,
      sendResponse
    );

    expect(mockRouter.delete).toHaveBeenCalledWith(
      "/auth/logout",
      expect.any(Function),
      expect.any(Function),
      expect.any(Function),
      sendResponse,
      sendResponse
    );

    expect(mockRouter.post).toHaveBeenCalledWith(
      "/auth/signup",
      expect.any(Function),
      expect.any(Function),
      expect.any(Function),
      sendResponse,
      sendResponse
    );

    expect(mockRouter.post).toHaveBeenCalledWith(
      "/auth/update-password",
      expect.any(Function),
      expect.any(Function),
      expect.any(Function),
      expect.any(Function),
      sendResponse,
      sendResponse
    );
  });
  test("should create all required routes with after and before middlewares passed to all routes", async () => {
    // Act
    (importPrismaModelModules as jest.Mock).mockResolvedValue({
      middlewares: {
        beforeGetMe: jest.fn(),
        afterGetMe: jest.fn(),
        beforeLogin: jest.fn(),
        afterLogin: jest.fn(),
        beforeLogout: jest.fn(),
        afterLogout: jest.fn(),
        beforeSignup: jest.fn(),
        afterSignup: jest.fn(),
        beforeUpdatePassword: jest.fn(),
        afterUpdatePassword: jest.fn(),
      },
    });
    await getAuthRouter(mockArkosConfig);

    // Assert
    expect(mockRouter.get).toHaveBeenCalledWith(
      "/users/me",
      expect.any(Function),
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
      expect.any(Function),

      sendResponse
    );

    expect(mockRouter.delete).toHaveBeenCalledWith(
      "/users/me",
      expect.any(Function),
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
      expect.any(Function),

      sendResponse
    );

    expect(mockRouter.delete).toHaveBeenCalledWith(
      "/auth/logout",
      expect.any(Function),
      expect.any(Function),
      expect.any(Function),
      expect.any(Function),

      sendResponse
    );

    expect(mockRouter.post).toHaveBeenCalledWith(
      "/auth/signup",
      expect.any(Function),
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
      expect.any(Function),

      sendResponse
    );
  });
});
