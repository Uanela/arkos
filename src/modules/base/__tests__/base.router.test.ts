import { Router } from "express";
import {
  getPrismaModelsRouter,
  getAvailableResourcesAndRoutesRouter,
} from "../base.router"; // Update with the correct path
import {
  getAvalibleRoutes,
  BaseController,
  getAvailableResources,
} from "../base.controller"; // Update with the correct path
import {
  getModels,
  importPrismaModelModules,
} from "../../../utils/helpers/models.helpers";
import {
  addPrismaQueryOptionsToRequestQuery,
  sendResponse,
} from "../base.middlewares"; // Update with the correct path
import authService from "../../auth/auth.service";
import { handleRequestBodyValidationAndTransformation } from "../../../utils/helpers/base.controller.helpers";

// Mock dependencies
jest.mock("express", () => {
  const mockRouter = {
    get: jest.fn().mockReturnThis(),
    post: jest.fn().mockReturnThis(),
    patch: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    route: jest.fn().mockReturnThis(),
    use: jest.fn().mockReturnThis(),
  };

  // Create a mock express function
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

jest.mock("../../../utils/helpers/models.helpers", () => ({
  ...jest.requireActual("../../../utils/helpers/models.helpers"),
  getModels: jest.fn(() => ["user", "products"]),
  importPrismaModelModules: jest.fn(),
}));
jest.mock("../base.controller"); // Update with the correct path
jest.mock("../base.middlewares"); // Update with the correct path
jest.mock("../../auth/auth.service");
jest.mock("../../../utils/helpers/base.controller.helpers");
jest.mock("pluralize", () => ({
  __esModule: true,
  default: {
    plural: jest.fn((str) => `${str}s`),
  },
}));
jest.mock("../../../utils/helpers/change-case.helpers", () => ({
  kebabCase: jest.fn((str) => str.toLowerCase()),
}));
jest.mock("fs");

describe("Base Router", () => {
  let mockRouter: any;
  let mockBaseController: any;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Setup mocks
    mockRouter = Router();
    mockBaseController = {
      createOne: jest.fn(),
      findMany: jest.fn(),
      findOne: jest.fn(),
      updateOne: jest.fn(),
      deleteOne: jest.fn(),
      createMany: jest.fn(),
      updateMany: jest.fn(),
      deleteMany: jest.fn(),
    };

    // Mock BaseController constructor
    (BaseController as jest.Mock).mockImplementation(() => mockBaseController);

    // Mock getModels
    (getModels as jest.Mock).mockReturnValue(["User", "Post", "Comment"]);

    // Mock authService
    (authService.handleAuthenticationControl as jest.Mock).mockReturnValue(
      jest.fn()
    );
    (authService.handleActionAccessControl as jest.Mock).mockReturnValue(
      jest.fn()
    );

    // Mock helpers
    (addPrismaQueryOptionsToRequestQuery as jest.Mock).mockReturnValue(
      jest.fn()
    );
    (handleRequestBodyValidationAndTransformation as jest.Mock).mockReturnValue(
      jest.fn()
    );
  });

  describe("getPrismaModelsRouter", () => {
    test("should create router with routes for all models", async () => {
      // Arrange
      (importPrismaModelModules as jest.Mock).mockResolvedValue({
        middlewares: {},
        authConfigs: {},
        prismaQueryOptions: {},
      });

      // Act
      const router = await getPrismaModelsRouter();

      // Assert
      expect(Router).toHaveBeenCalled();
      expect(getModels).toHaveBeenCalled();
      expect(importPrismaModelModules).toHaveBeenCalledTimes(3); // Once for each model
      expect(BaseController).toHaveBeenCalledTimes(3); // Once for each model

      // Check if routes are created for each model (User, Post, Comment)
      expect(mockRouter.route).toHaveBeenCalledWith("/users");
      expect(mockRouter.route).toHaveBeenCalledWith("/posts");
      expect(mockRouter.route).toHaveBeenCalledWith("/comments");

      // Check if routes with :id parameter are created
      expect(mockRouter.route).toHaveBeenCalledWith("/users/:id");
      expect(mockRouter.route).toHaveBeenCalledWith("/posts/:id");
      expect(mockRouter.route).toHaveBeenCalledWith("/comments/:id");

      // Check if /many routes are created
      expect(mockRouter.route).toHaveBeenCalledWith("/users/many");
      expect(mockRouter.route).toHaveBeenCalledWith("/posts/many");
      expect(mockRouter.route).toHaveBeenCalledWith("/comments/many");

      // Expect the router to be returned
      expect(router).toBe(mockRouter);
    });

    test("should add correct middleware chains for routes with no custom middlewares", async () => {
      // Arrange
      (importPrismaModelModules as jest.Mock).mockResolvedValue({
        middlewares: {},
        authConfigs: {},
        prismaQueryOptions: {},
      });

      // Act
      await getPrismaModelsRouter();

      // Assert - Check route handlers for POST /:resource
      expect(mockRouter.post).toHaveBeenCalledWith(
        expect.any(Function), // authService.handleAuthenticationControl
        expect.any(Function), // authService.handleActionAccessControl
        expect.any(Function), // handleRequestBodyValidationAndTransformation
        expect.any(Function), // addPrismaQueryOptionsToRequestQuery
        mockBaseController.createOne,
        sendResponse,
        sendResponse,
        sendResponse
      );

      // Assert - Check route handlers for GET /:resource
      expect(mockRouter.get).toHaveBeenCalledWith(
        expect.any(Function), // authService.handleAuthenticationControl
        expect.any(Function), // authService.handleActionAccessControl
        expect.any(Function), // addPrismaQueryOptionsToRequestQuery
        mockBaseController.findMany,
        sendResponse,
        sendResponse,
        sendResponse
      );

      // Similar assertions can be made for other routes
    });

    test("should correctly handle custom middlewares in the chain", async () => {
      // Arrange
      const customMiddlewares = {
        beforeCreateOne: jest.fn(),
        afterCreateOne: jest.fn(),
        beforeFindMany: jest.fn(),
        afterFindMany: jest.fn(),
      };

      (importPrismaModelModules as jest.Mock).mockResolvedValue({
        middlewares: customMiddlewares,
        authConfigs: {},
        prismaQueryOptions: {},
      });

      // Act
      await getPrismaModelsRouter();

      // Assert - Check route handlers for POST /:resource with custom middlewares
      expect(mockRouter.post).toHaveBeenCalledWith(
        expect.any(Function), // authService.handleAuthenticationControl
        expect.any(Function), // authService.handleActionAccessControl
        expect.any(Function), // handleRequestBodyValidationAndTransformation
        expect.any(Function), // addPrismaQueryOptionsToRequestQuery
        customMiddlewares.beforeCreateOne,
        mockBaseController.createOne,
        customMiddlewares.afterCreateOne,
        sendResponse
      );

      // Assert - Check route handlers for GET /:resource with custom middlewares
      expect(mockRouter.get).toHaveBeenCalledWith(
        expect.any(Function), // authService.handleAuthenticationControl
        expect.any(Function), // authService.handleActionAccessControl
        expect.any(Function), // addPrismaQueryOptionsToRequestQuery
        customMiddlewares.beforeFindMany,
        mockBaseController.findMany,
        customMiddlewares.afterFindMany,
        sendResponse
      );
    });

    test("should handle only beforeXXX middlewares in the chain", async () => {
      // Arrange
      const customMiddlewares = {
        beforeCreateOne: jest.fn(),
        beforeFindMany: jest.fn(),
      };

      (importPrismaModelModules as jest.Mock).mockResolvedValue({
        middlewares: customMiddlewares,
        authConfigs: {},
        prismaQueryOptions: {},
      });

      // Act
      await getPrismaModelsRouter();

      // Assert
      expect(mockRouter.post).toHaveBeenCalledWith(
        expect.any(Function), // authService.handleAuthenticationControl
        expect.any(Function), // authService.handleActionAccessControl
        expect.any(Function), // handleRequestBodyValidationAndTransformation
        expect.any(Function), // addPrismaQueryOptionsToRequestQuery
        customMiddlewares.beforeCreateOne,
        mockBaseController.createOne,
        sendResponse,
        sendResponse
      );

      expect(mockRouter.get).toHaveBeenCalledWith(
        expect.any(Function), // authService.handleAuthenticationControl
        expect.any(Function), // authService.handleActionAccessControl
        expect.any(Function), // addPrismaQueryOptionsToRequestQuery
        customMiddlewares.beforeFindMany,
        mockBaseController.findMany,
        sendResponse,
        sendResponse
      );
    });

    test("should handle only afterXXX middlewares in the chain", async () => {
      // Arrange
      const customMiddlewares = {
        afterCreateOne: jest.fn(),
        afterFindMany: jest.fn(),
      };

      (importPrismaModelModules as jest.Mock).mockResolvedValue({
        middlewares: customMiddlewares,
        authConfigs: {},
        prismaQueryOptions: {},
      });

      // Act
      await getPrismaModelsRouter();

      // Assert
      expect(mockRouter.post).toHaveBeenCalledWith(
        expect.any(Function), // authService.handleAuthenticationControl
        expect.any(Function), // authService.handleActionAccessControl
        expect.any(Function), // handleRequestBodyValidationAndTransformation
        expect.any(Function), // addPrismaQueryOptionsToRequestQuery
        mockBaseController.createOne,
        customMiddlewares.afterCreateOne,
        sendResponse,
        sendResponse
      );

      expect(mockRouter.get).toHaveBeenCalledWith(
        expect.any(Function), // authService.handleAuthenticationControl
        expect.any(Function), // authService.handleActionAccessControl
        expect.any(Function), // addPrismaQueryOptionsToRequestQuery
        mockBaseController.findMany,
        customMiddlewares.afterFindMany,
        sendResponse,
        sendResponse
      );
    });
  });

  describe("getAvailableResourcesAndRoutesRouter", () => {
    test("should create router with available routes endpoint", () => {
      // Act
      const router = getAvailableResourcesAndRoutesRouter();

      // Assert
      expect(Router).toHaveBeenCalled();
      expect(mockRouter.get).toHaveBeenCalledWith(
        "/available-routes",
        authService.authenticate,
        getAvalibleRoutes
      );

      expect(mockRouter.get).toHaveBeenCalledWith(
        "/available-resources",
        authService.authenticate,
        getAvailableResources
      );

      // Expect the router to be returned
      expect(router).toBe(mockRouter);
    });

    test("should handle missing authService.authenticate gracefully", () => {
      // Arrange
      (authService.authenticate as unknown) = undefined;

      // Act
      const router = getAvailableResourcesAndRoutesRouter();

      // Assert
      expect(Router).toHaveBeenCalled();
      expect(mockRouter.get).toHaveBeenCalledWith(
        "/available-routes",
        undefined,
        getAvalibleRoutes
      );

      expect(mockRouter.get).toHaveBeenCalledWith(
        "/available-resources",
        undefined,
        getAvailableResources
      );

      // Expect the router to be returned
      expect(router).toBe(mockRouter);
    });
  });
});
