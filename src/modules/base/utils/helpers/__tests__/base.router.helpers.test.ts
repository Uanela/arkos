import { Router } from "express";
import { setupRouters } from "../base.router.helpers"; // Adjust the import path
import * as importHelpers from "../../../../../utils/helpers/models.helpers";
// import authService from "../../../auth/auth.service";
import { BaseController } from "../../../base.controller";
import pluralize from "pluralize";

// Mocks
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
jest.mock("../../../../../utils/helpers/models.helpers");
jest.mock("../../../../auth/auth.service", () => ({
  handleAuthenticationControl: jest.fn(() => "authMiddleware"),
  handleActionAccessControl: jest.fn(() => "accessControlMiddleware"),
}));

jest.mock("../../../../../utils/helpers/base.controller.helpers", () => ({
  handleRequestBodyValidationAndTransformation: jest.fn(
    () => "validationMiddleware"
  ),
}));

jest.mock("../../../base.middlewares", () => ({
  addPrismaQueryOptionsToRequestQuery: jest.fn(() => "queryOptionsMiddleware"),
  sendResponse: "sendResponseMiddleware",
}));

jest.mock("../../../base.controller");
jest.mock("pluralize", () => ({
  plural: jest.fn((str) => `${str}s`),
}));

jest.mock("../../../../../exports/utils", () => ({
  kebabCase: jest.fn((str) => str.toLowerCase()),
}));

jest.mock("fs");

describe("setupRouters", () => {
  let router: Router;
  let mockBaseController: any;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();

    // Setup router mock
    router = Router();

    // Setup BaseController mock
    mockBaseController = {
      createOne: "createOneHandler",
      findMany: "findManyHandler",
      findOne: "findOneHandler",
      updateOne: "updateOneHandler",
      deleteOne: "deleteOneHandler",
      createMany: "createManyHandler",
      updateMany: "updateManyHandler",
      deleteMany: "deleteManyHandler",
    };

    (BaseController as jest.Mock).mockImplementation(() => mockBaseController);
  });

  it("should register all routes for a model with no customization", async () => {
    // Mock the imported modules
    const mockModelModules = {
      middlewares: {},
      authConfigs: {},
      prismaQueryOptions: {},
      router: undefined,
    };

    (importHelpers.importPrismaModelModules as jest.Mock).mockResolvedValue(
      mockModelModules
    );

    // Call the function
    const setupPromises = setupRouters(["User"], router);
    await Promise.all(setupPromises);

    // Verify all routes are registered
    expect(router.post).toHaveBeenCalledWith(
      "/users",
      expect.anything(),
      expect.anything(),
      expect.anything(),
      expect.anything(),
      "createOneHandler",
      "sendResponseMiddleware",
      "sendResponseMiddleware",
      "sendResponseMiddleware"
    );
    expect(router.get).toHaveBeenCalledWith(
      "/users",
      expect.anything(),
      expect.anything(),
      expect.anything(),
      "findManyHandler",
      "sendResponseMiddleware",
      "sendResponseMiddleware",
      "sendResponseMiddleware"
    );
    expect(router.post).toHaveBeenCalledWith(
      "/users/many",
      expect.anything(),
      expect.anything(),
      expect.anything(),
      "createManyHandler",
      "sendResponseMiddleware",
      "sendResponseMiddleware",
      "sendResponseMiddleware"
    );
    expect(router.patch).toHaveBeenCalledWith(
      "/users/many",
      expect.anything(),
      expect.anything(),
      expect.anything(),
      "updateManyHandler",
      "sendResponseMiddleware",
      "sendResponseMiddleware",
      "sendResponseMiddleware"
    );
    expect(router.delete).toHaveBeenCalledWith(
      "/users/many",
      expect.anything(),
      expect.anything(),
      expect.anything(),
      "deleteManyHandler",
      "sendResponseMiddleware",
      "sendResponseMiddleware",
      "sendResponseMiddleware"
    );
    expect(router.get).toHaveBeenCalledWith(
      "/users/:id",
      expect.anything(),
      expect.anything(),
      expect.anything(),
      "findOneHandler",
      "sendResponseMiddleware",
      "sendResponseMiddleware",
      "sendResponseMiddleware"
    );
    expect(router.patch).toHaveBeenCalledWith(
      "/users/:id",
      expect.anything(),
      expect.anything(),
      expect.anything(),
      expect.anything(),
      "updateOneHandler",
      "sendResponseMiddleware",
      "sendResponseMiddleware",
      "sendResponseMiddleware"
    );
    expect(router.delete).toHaveBeenCalledWith(
      "/users/:id",
      expect.anything(),
      expect.anything(),
      expect.anything(),
      "deleteOneHandler",
      "sendResponseMiddleware",
      "sendResponseMiddleware",
      "sendResponseMiddleware"
    );
  });

  it("should not register disabled routes", async () => {
    // Mock the imported modules with disabled routes
    const mockModelModules = {
      middlewares: {},
      authConfigs: {},
      prismaQueryOptions: {},
      router: {
        default: {
          config: {
            disable: {
              createOne: true,
              findMany: true,
            },
          },
        },
      },
    };

    (importHelpers.importPrismaModelModules as jest.Mock).mockResolvedValue(
      mockModelModules
    );

    // Call the function
    const setupPromises = setupRouters(["User"], router);
    await Promise.all(setupPromises);

    // Verify disabled routes are not registered
    expect(router.post).not.toHaveBeenCalledWith("/users", expect.anything());
    expect(router.get).not.toHaveBeenCalledWith("/users", expect.anything());

    // Verify other routes are registered
    expect(router.post).toHaveBeenCalledWith(
      "/users/many",
      expect.anything(),
      expect.anything(),
      expect.anything(),
      "createManyHandler",
      expect.anything(),
      expect.anything(),
      expect.anything()
    );
    expect(router.get).toHaveBeenCalledWith(
      "/users/:id",
      expect.anything(),
      expect.anything(),
      expect.anything(),
      "findOneHandler",
      expect.anything(),
      expect.anything(),
      expect.anything()
    );
  });

  it("should not register any routes if completely disabled", async () => {
    // Mock the imported modules with all routes disabled
    const mockModelModules = {
      middlewares: {},
      authConfigs: {},
      prismaQueryOptions: {},
      router: {
        default: {},
        config: {
          disable: true,
        },
      },
    };

    (importHelpers.importPrismaModelModules as jest.Mock).mockResolvedValue(
      mockModelModules
    );

    // Call the function
    const setupPromises = setupRouters(["User"], router);
    await Promise.all(setupPromises);

    // Verify no routes are registered
    expect(router.get).not.toHaveBeenCalled();
    expect(router.post).not.toHaveBeenCalled();
    expect(router.patch).not.toHaveBeenCalled();
    expect(router.delete).not.toHaveBeenCalled();
  });

  it("should use custom middleware when provided", async () => {
    // Mock the imported modules with custom middlewares
    const mockModelModules = {
      middlewares: {
        beforeFindMany: "customBeforeFindMany",
        afterFindMany: "customAfterFindMany",
      },
      authConfigs: {},
      prismaQueryOptions: {},
      router: undefined,
    };

    (importHelpers.importPrismaModelModules as jest.Mock).mockResolvedValue(
      mockModelModules
    );

    // Call the function
    const setupPromises = setupRouters(["User"], router);
    await Promise.all(setupPromises);

    // Verify custom middleware is used
    expect(router.get).toHaveBeenCalledWith(
      "/users",
      expect.anything(),
      expect.anything(),
      expect.anything(),
      "customBeforeFindMany",
      "findManyHandler",
      "customAfterFindMany",
      "sendResponseMiddleware"
    );
  });

  it("should not register routes that have custom implementations", async () => {
    // Create mock custom router stack
    const customRouterStack = [
      { path: "/users", method: "GET", handle: "customGetHandler" },
    ];

    // Mock the imported modules with custom router
    const mockModelModules = {
      middlewares: {},
      authConfigs: {},
      prismaQueryOptions: {},
      router: {
        default: {
          stack: customRouterStack,
        },
      },
    };

    // Mock hasCustomImplementation to return true for specific path/method
    mockModelModules.router.default.stack.some = jest
      .fn()
      .mockImplementation((callback) =>
        callback({ path: "/users", method: "GET" })
      );

    (importHelpers.importPrismaModelModules as jest.Mock).mockResolvedValue(
      mockModelModules
    );

    // Call the function
    const setupPromises = setupRouters(["User"], router);
    await Promise.all(setupPromises);

    // Verify the route with custom implementation is not registered
    expect(router.get).not.toHaveBeenCalledWith("/users", expect.anything());

    // Verify other routes are still registered
    expect(router.post).toHaveBeenCalledWith(
      "/users",
      expect.anything(),
      expect.anything(),
      expect.anything(),
      expect.anything(),
      expect.anything(),
      expect.anything(),
      expect.anything(),
      expect.anything()
    );
  });

  it("should handle multiple models in parallel", async () => {
    // Mock the imported modules for different models
    const mockUserModules = {
      middlewares: {},
      authConfigs: {},
      prismaQueryOptions: {},
      router: undefined,
    };

    const mockPostModules = {
      middlewares: {},
      authConfigs: {},
      prismaQueryOptions: {},
      router: undefined,
    };

    (importHelpers.importPrismaModelModules as jest.Mock).mockImplementation(
      (modelName) => {
        if (modelName === "user") return Promise.resolve(mockUserModules);
        if (modelName === "post") return Promise.resolve(mockPostModules);
        return Promise.resolve({});
      }
    );

    // Call the function
    const setupPromises = setupRouters(["User", "Post"], router);
    await Promise.all(setupPromises);

    // Verify routes for both models were registered
    expect(pluralize.plural).toHaveBeenCalledWith("user");
    expect(pluralize.plural).toHaveBeenCalledWith("post");

    // 8 routes per model * 2 models = 16 total routes
    expect(
      (router.get as jest.Mock).mock.calls.length +
        (router.post as jest.Mock).mock.calls.length +
        (router.patch as jest.Mock).mock.calls.length +
        (router.delete as jest.Mock).mock.calls.length
    ).toBe(16);
  });
});
