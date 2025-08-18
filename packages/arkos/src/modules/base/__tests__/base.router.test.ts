import { Router } from "express";
import {
  getPrismaModelsRouter,
  getAvailableResourcesAndRoutesRouter,
} from "../base.router";
import * as modelsHelpers from "../../../utils/helpers/models.helpers";
import * as baseController from "../base.controller";
import authService from "../../auth/auth.service";
import * as routerHelpers from "../utils/helpers/base.router.helpers";

// Mock the dependencies
jest.mock("express", () => {
  const mockRouter = {
    get: jest.fn().mockReturnThis(),
    post: jest.fn().mockReturnThis(),
    put: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    use: jest.fn().mockReturnThis(),
  };

  const mockExpress = jest.fn(() => ({
    get: jest.fn(),
    use: jest.fn(),
    listen: jest.fn(),
    set: jest.fn(),
  }));

  (mockExpress as any).static = jest.fn(() => mockRouter);
  (mockExpress as any).Router = jest.fn(() => mockRouter);
  (mockExpress as any).json = jest.fn(() => "express.json");

  return mockExpress;
});

jest.mock("../../../utils/helpers/models.helpers");
jest.mock("../base.controller");
jest.mock("../../auth/auth.service");
jest.mock("../utils/helpers/base.router.helpers");
jest.mock("fs");

describe("Base Router", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("getPrismaModelsRouter", () => {
    it("should create a router with routes for all models", async () => {
      // Mock return values
      const mockModels = ["User", "Post", "Comment"];
      (modelsHelpers.getModels as jest.Mock).mockReturnValue(mockModels);

      (routerHelpers.setupRouters as jest.Mock).mockReturnValue([
        Promise.resolve(),
        Promise.resolve(),
        Promise.resolve(),
      ]);

      // Call the function
      const mockRouter = Router();
      const result = await getPrismaModelsRouter({});

      // Assertions
      expect(modelsHelpers.getModels).toHaveBeenCalledTimes(1);
      expect(routerHelpers.setupRouters).toHaveBeenCalledTimes(1);
      expect(routerHelpers.setupRouters).toHaveBeenCalledWith(
        mockModels,
        mockRouter,
        {}
      );
      expect(result).toBe(mockRouter);
    });

    it("should pass arkosConfigs to the router setup if provided", async () => {
      // Mock return values
      const mockModels = ["User", "Post"];
      (modelsHelpers.getModels as jest.Mock).mockReturnValue(mockModels);

      (routerHelpers.setupRouters as jest.Mock).mockReturnValue([
        Promise.resolve(),
        Promise.resolve(),
      ]);

      const mockArkosConfig = { authentication: { mode: "dynamic" } };

      // Call the function
      const mockRouter = Router();
      const result = await getPrismaModelsRouter(mockArkosConfig as any);

      // Assertions
      expect(modelsHelpers.getModels).toHaveBeenCalledTimes(1);
      expect(routerHelpers.setupRouters).toHaveBeenCalledTimes(1);
      expect(routerHelpers.setupRouters).toHaveBeenCalledWith(
        mockModels,
        mockRouter,
        mockArkosConfig
      );
      expect(result).toBe(mockRouter);
    });
  });

  describe("getAvailableResourcesAndRoutesRouter", () => {
    it("should create a router with available routes and resources endpoints", () => {
      // Mock authentication middleware
      (authService.authenticate as jest.Mock) = jest.fn();
      (authService.handleAccessControl as jest.Mock) = jest.fn(() => jest.fn());
      (baseController.getAvailableResources as jest.Mock) = jest.fn();

      // Call the function
      const mockRouter = Router();
      const result = getAvailableResourcesAndRoutesRouter();

      // Verify route setup
      expect(Router).toHaveBeenCalledTimes(2);

      // Verify routes were created
      const routerInstance = (Router as jest.Mock).mock.results[0].value;
      expect(routerInstance.get).toHaveBeenCalledTimes(2);

      // Check second route (available-resources)
      expect(routerInstance.get).toHaveBeenCalledWith(
        "/available-resources",
        authService.authenticate,
        baseController.getAvailableResources
      );

      // Verify result
      expect(result).toBe(mockRouter);
    });
  });
});
