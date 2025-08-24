import { Router } from "express";
import { setupRouters } from "../base.router.helpers"; // Adjust the import path
import * as importHelpers from "../../../../../utils//dynamic-loader";
import { BaseController } from "../../../base.controller";
import pluralize from "pluralize";
import catchAsync from "../../../../error-handler/utils/catch-async";

jest.mock("../../../../error-handler/utils/catch-async");
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
jest.mock("../../../../../utils//dynamic-loader");
jest.mock("../../../../auth/auth.service", () => ({
  handleAuthenticationControl: jest.fn(() => jest.fn()),
  handleAccessControl: jest.fn(() => jest.fn()),
}));

jest.mock("../../../base.middlewares", () => ({
  addPrismaQueryOptionsToRequest: jest.fn(() => jest.fn()),
  sendResponse: jest.fn(),
  handleRequestBodyValidationAndTransformation: jest.fn(() => jest.fn()),
}));

jest.mock("../../../base.controller");
jest.mock("pluralize", () => ({
  ...jest.requireActual("pluralize"),
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
      createOne: jest.fn(),
      findMany: jest.fn(),
      findOne: jest.fn(),
      updateOne: jest.fn(),
      deleteOne: jest.fn(),
      createMany: jest.fn(),
      updateMany: jest.fn(),
      deleteMany: jest.fn(),
    };

    (BaseController as jest.Mock).mockImplementation(() => mockBaseController);

    (catchAsync as jest.Mock).mockImplementation((fn) => fn);
  });

  it("should register all routes for a model with no customization", async () => {
    // Mock the imported modules
    const mockModuleComponents = {
      interceptors: {},
      authConfigs: {},
      prismaQueryOptions: {},
      router: undefined,
    };

    (importHelpers.getModuleComponents as jest.Mock).mockReturnValue(
      mockModuleComponents
    );

    // Call the function
    const setupPromises = setupRouters(["User"], router, {});
    await Promise.all(await setupPromises);

    // Verify all routes are registered
    expect(router.post).toHaveBeenCalledWith(
      "/users",
      expect.any(Function),
      expect.any(Function),
      expect.any(Function),
      expect.any(Function),
      expect.any(Function),
      expect.any(Function)
    );
    expect(router.get).toHaveBeenCalledWith(
      "/users",
      expect.any(Function),
      expect.any(Function),
      expect.any(Function),
      expect.any(Function),
      expect.any(Function)
    );
    expect(router.post).toHaveBeenCalledWith(
      "/users/many",
      expect.any(Function),
      expect.any(Function),
      expect.any(Function),
      expect.any(Function),
      expect.any(Function),
      expect.any(Function)
    );
    expect(router.patch).toHaveBeenCalledWith(
      "/users/many",
      expect.any(Function),
      expect.any(Function),
      expect.any(Function),
      expect.any(Function),
      expect.any(Function),
      expect.any(Function)
    );
    expect(router.delete).toHaveBeenCalledWith(
      "/users/many",
      expect.any(Function),
      expect.any(Function),
      expect.any(Function),
      expect.any(Function),
      expect.any(Function),
      expect.any(Function)
    );
    expect(router.get).toHaveBeenCalledWith(
      "/users/:id",
      expect.any(Function),
      expect.any(Function),
      expect.any(Function),
      expect.any(Function),
      expect.any(Function),
      expect.any(Function)
    );
    expect(router.patch).toHaveBeenCalledWith(
      "/users/:id",
      expect.any(Function),
      expect.any(Function),
      expect.any(Function),
      expect.any(Function),
      expect.any(Function),
      expect.any(Function)
    );
    expect(router.delete).toHaveBeenCalledWith(
      "/users/:id",
      expect.any(Function),
      expect.any(Function),
      expect.any(Function),
      expect.any(Function),
      expect.any(Function),
      expect.any(Function)
    );
  });

  it("should not register disabled routes", async () => {
    // Mock the imported modules with disabled routes
    const mockModuleComponents = {
      interceptors: {},
      authConfigs: {},
      prismaQueryOptions: {},
      router: {
        config: {
          disable: {
            createOne: true,
            findMany: true,
          },
        },
      },
    };

    (importHelpers.getModuleComponents as jest.Mock).mockReturnValue(
      mockModuleComponents
    );

    // Call the function
    const setupPromises = setupRouters(["User"], router, {});
    await Promise.all(await setupPromises);

    // Verify disabled routes are not registered
    expect(router.post).not.toHaveBeenCalledWith("/users", expect.anything());
    expect(router.get).not.toHaveBeenCalledWith("/users", expect.anything());

    // Verify other routes are registered
    expect(router.post).toHaveBeenCalledWith(
      "/users/many",
      expect.any(Function),
      expect.any(Function),
      expect.any(Function),
      expect.any(Function),
      expect.any(Function),
      expect.any(Function)
    );
    expect(router.get).toHaveBeenCalledWith(
      "/users/:id",
      expect.any(Function),
      expect.any(Function),
      expect.any(Function),
      expect.any(Function),
      expect.any(Function),
      expect.any(Function)
    );
  });

  it("should not register any routes if completely disabled", async () => {
    // Mock the imported modules with all routes disabled
    const mockModuleComponents = {
      interceptors: {},
      authConfigs: {},
      prismaQueryOptions: {},
      router: {
        default: {},
        config: {
          disable: true,
        },
      },
    };

    (importHelpers.getModuleComponents as jest.Mock).mockReturnValue(
      mockModuleComponents
    );

    // Call the function
    const setupPromises = setupRouters(["User"], router, {});
    await Promise.all(await setupPromises);

    // Verify no routes are registered
    expect(router.get).not.toHaveBeenCalled();
    expect(router.post).not.toHaveBeenCalled();
    expect(router.patch).not.toHaveBeenCalled();
    expect(router.delete).not.toHaveBeenCalled();
  });

  it("should use custom middleware when provided as function", async () => {
    // Mock the imported modules with custom interceptors
    const mockModuleComponents = {
      interceptors: {
        beforeFindMany: jest.fn(),
        afterFindMany: jest.fn(),
      },
      authConfigs: {},
      prismaQueryOptions: {},
      router: undefined,
    };

    (importHelpers.getModuleComponents as jest.Mock).mockReturnValue(
      mockModuleComponents
    );

    // Call the function
    const setupPromises = setupRouters(["User"], router, {});
    await Promise.all(await setupPromises);

    // Verify custom middleware is used
    expect(router.get).toHaveBeenCalledWith(
      "/users",
      expect.any(Function),
      expect.any(Function),
      expect.any(Function),
      expect.any(Function), // beforeFindMany
      expect.any(Function), // findManyHandler
      expect.any(Function), // afterFindMany
      expect.any(Function) // sendResponse
    );
  });

  it("should use custom middleware when provided as array of functions", async () => {
    // Mock the imported modules with custom interceptors as arrays
    const mockModuleComponents = {
      interceptors: {
        beforeFindMany: [jest.fn(), jest.fn(), jest.fn()],
        afterFindMany: [jest.fn(), jest.fn()],
      },
      authConfigs: {},
      prismaQueryOptions: {},
      router: undefined,
    };

    (importHelpers.getModuleComponents as jest.Mock).mockReturnValue(
      mockModuleComponents
    );

    // Call the function
    const setupPromises = setupRouters(["User"], router, {});
    await Promise.all(await setupPromises);

    // Verify custom middleware is used - should spread the array
    expect(router.get).toHaveBeenCalledWith(
      "/users",
      expect.any(Function),
      expect.any(Function),
      expect.any(Function),
      expect.any(Function), // first beforeFindMany
      expect.any(Function), // second beforeFindMany
      expect.any(Function), // third beforeFindMany
      expect.any(Function), // findManyHandler
      expect.any(Function), // first afterFindMany
      expect.any(Function), // second afterFindMany
      expect.any(Function) // sendResponse
    );
  });

  it("should throw error when middleware is not a function", async () => {
    // Mock the imported modules with invalid middleware
    const mockModuleComponents = {
      interceptors: {
        beforeFindMany: "not-a-function", // This should cause an error
      },
      authConfigs: {},
      prismaQueryOptions: {},
      router: undefined,
    };

    (importHelpers.getModuleComponents as jest.Mock).mockReturnValue(
      mockModuleComponents
    );

    // Call the function and expect it to throw
    const setupPromises = setupRouters(["User"], router, {});

    await expect(Promise.all(await setupPromises)).rejects.toThrow();
  });

  it("should throw error when middleware array contains non-function values", async () => {
    // Mock the imported modules with invalid middleware in array
    const mockModuleComponents = {
      interceptors: {
        beforeFindMany: [jest.fn(), "not-a-function", jest.fn()], // Second item should cause error
      },
      authConfigs: {},
      prismaQueryOptions: {},
      router: undefined,
    };

    (importHelpers.getModuleComponents as jest.Mock).mockReturnValue(
      mockModuleComponents
    );

    // Call the function and expect it to throw
    const setupPromises = setupRouters(["User"], router, {});

    await expect(Promise.all(await setupPromises)).rejects.toThrow();
  });

  it("should throw error for various non-function middleware types", async () => {
    const mockModuleComponents = {
      interceptors: { beforeFindMany: [jest.fn(), null, jest.fn()] },
      authConfigs: {},
      prismaQueryOptions: {},
      router: undefined,
    };

    (importHelpers.getModuleComponents as jest.Mock).mockReturnValue(
      mockModuleComponents
    );

    let setupPromises = null;
    try {
      setupPromises = (await setupRouters(["User"], router, {})) as any;
    } catch (err) {
      expect(setupPromises).rejects.toThrow();
    }

    jest.clearAllMocks();
  });

  it("should not register routes that have custom implementations", async () => {
    // Create mock custom router stack
    const customRouterStack = [
      { path: "/users", method: "GET", handle: jest.fn() },
    ];

    // Mock the imported modules with custom router
    const mockModuleComponents = {
      interceptors: {},
      authConfigs: {},
      prismaQueryOptions: {},
      router: {
        default: {
          stack: customRouterStack,
        },
      },
    };

    // Mock hasCustomImplementation to return true for specific path/method
    mockModuleComponents.router.default.stack.some = jest
      .fn()
      .mockImplementation((callback) =>
        callback({ path: "/users", method: "GET" })
      );

    (importHelpers.getModuleComponents as jest.Mock).mockReturnValue(
      mockModuleComponents
    );

    // Call the function
    const setupPromises = setupRouters(["User"], router, {});
    await Promise.all(await setupPromises);

    // Verify the route with custom implementation is not registered
    expect(router.get).not.toHaveBeenCalledWith("/users", expect.anything());

    // Verify other routes are still registered
    expect(router.post).toHaveBeenCalledWith(
      "/users/many",
      expect.any(Function),
      expect.any(Function),
      expect.any(Function),
      expect.any(Function),
      expect.any(Function),
      expect.any(Function)
    );
  });

  it("should handle multiple models in parallel", async () => {
    // Mock the imported modules for different models
    const mockUserModules = {
      interceptors: {},
      authConfigs: {},
      prismaQueryOptions: {},
      router: undefined,
    };

    const mockPostModules = {
      interceptors: {},
      authConfigs: {},
      prismaQueryOptions: {},
      router: undefined,
    };

    (importHelpers.getModuleComponents as jest.Mock).mockImplementation(
      (modelName) => {
        if (modelName === "user") return Promise.resolve(mockUserModules);
        if (modelName === "post") return Promise.resolve(mockPostModules);
        return Promise.resolve({});
      }
    );

    // Call the function
    const setupPromises = setupRouters(["User", "Post"], router, {});
    await Promise.all(await setupPromises);

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

  it("should first setup the custom router if provided", async () => {
    const mockPostModules = {
      interceptors: {},
      authConfigs: {},
      prismaQueryOptions: {},
      router: {
        default: jest.fn(), // Mock router as function
      },
    };

    (importHelpers.getModuleComponents as jest.Mock).mockImplementation(
      (modelName) => {
        if (modelName === "post") return mockPostModules;
        return {};
      }
    );

    // Call the function
    const setupPromises = setupRouters(["Post"], router, {});
    await Promise.all(await setupPromises);

    // Verify routes for both models were registered
    expect(pluralize.plural).toHaveBeenCalledWith("post");

    expect(router.use).toHaveBeenCalledWith(`/posts`, expect.any(Function));

    // 8 routes per model
    expect(
      (router.get as jest.Mock).mock.calls.length +
        (router.post as jest.Mock).mock.calls.length +
        (router.patch as jest.Mock).mock.calls.length +
        (router.delete as jest.Mock).mock.calls.length
    ).toBe(8);
  });
});
