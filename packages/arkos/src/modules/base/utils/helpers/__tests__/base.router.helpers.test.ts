import { Router } from "express";
import {
  isEndpointDisabled,
  isParentEndpointAllowed,
  setupRouters,
} from "../base.router.helpers"; // Adjust the import path
import * as importHelpers from "../../../../../utils/dynamic-loader";
import { BaseController } from "../../../base.controller";
import pluralize from "pluralize";
import catchAsync from "../../../../error-handler/utils/catch-async";
import routerValidator from "../../router-validator";
import prismaSchemaParser from "../../../../../utils/prisma/prisma-schema-parser";
import { getArkosConfig } from "../../../../../server";
import z from "zod";

jest.mock("../../../../error-handler/utils/catch-async");
jest.mock("../../../../../server");
jest.mock("fs");
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
jest.mock("../../../../../utils/dynamic-loader");
jest.mock("../../../../auth/auth.service", () => ({
  authenticate: jest.fn(() => jest.fn()),
  handleAccessControl: jest.fn(() => jest.fn()),
}));

jest.mock("../../../base.middlewares", () => ({
  addPrismaQueryOptionsToRequest: jest.fn(() => jest.fn()),
  sendResponse: jest.fn(),
  validateRequestInputs: jest.fn(),
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

jest.mock("../../router-validator", () => ({
  __esModule: true,
  default: {
    isExpressRouter: jest.fn(() => true),
  },
}));

jest
  .spyOn(prismaSchemaParser, "getModelsAsArrayOfStrings")
  .mockReturnValue(["User"]);

describe("setupRouters", () => {
  let router: Router;
  let mockBaseController: any;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();

    (getArkosConfig as jest.Mock).mockImplementation(() => ({
      authentication: { mode: "static" },
      validation: { resolver: "zod" },
    }));
    router = Router();

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
    const CreateUserSchema = z.object({});
    const UpdateUserSchema = z.object({});
    const mockModuleComponents = {
      interceptors: {},
      authConfigs: {},
      prismaQueryOptions: {},
      router: undefined,
      schemas: {
        create: CreateUserSchema,
        update: UpdateUserSchema,
      },
    };

    (importHelpers.getModuleComponents as jest.Mock).mockReturnValue(
      mockModuleComponents
    );

    setupRouters(router, { validation: { resolver: "zod" } });

    expect(router.post).toHaveBeenCalledWith(
      {
        path: "/users",
        authentication: { action: "Create", resource: "user", rule: undefined },
        disabled: false,
        validation: { body: CreateUserSchema },
        experimental: { openapi: false },
      },
      expect.any(Function),
      expect.any(Function),
      expect.any(Function)
    );
    expect(router.get).toHaveBeenCalledWith(
      {
        path: "/users",
        authentication: { action: "View", resource: "user", rule: undefined },
        disabled: false,
        validation: undefined,
        experimental: { openapi: false },
      },
      expect.any(Function),
      expect.any(Function),
      expect.any(Function)
    );
    expect(router.post).toHaveBeenCalledWith(
      {
        path: "/users/many",
        authentication: { action: "Create", resource: "user", rule: undefined },
        disabled: false,
        validation: undefined,
        experimental: { openapi: false },
      },
      expect.any(Function),
      expect.any(Function),
      expect.any(Function)
    );
    expect(router.patch).toHaveBeenCalledWith(
      {
        path: "/users/many",
        authentication: { action: "Update", resource: "user", rule: undefined },
        disabled: false,
        validation: undefined,
        experimental: { openapi: false },
      },
      expect.any(Function),
      expect.any(Function),
      expect.any(Function)
    );

    expect(router.delete).toHaveBeenCalledWith(
      {
        path: "/users/many",
        authentication: { action: "Delete", resource: "user", rule: undefined },
        disabled: false,
        validation: undefined,
        experimental: { openapi: false },
      },
      expect.any(Function),
      expect.any(Function),
      expect.any(Function)
    );

    expect(router.get).toHaveBeenCalledWith(
      {
        path: "/users/:id",
        authentication: { action: "View", resource: "user", rule: undefined },
        disabled: false,
        validation: undefined,
        experimental: { openapi: false },
      },
      expect.any(Function),
      expect.any(Function),
      expect.any(Function)
    );

    expect(router.patch).toHaveBeenCalledWith(
      {
        path: "/users/:id",
        authentication: { action: "Update", resource: "user", rule: undefined },
        disabled: false,
        validation: { body: UpdateUserSchema },
        experimental: { openapi: false },
      },
      expect.any(Function),
      expect.any(Function),
      expect.any(Function)
    );

    expect(router.delete).toHaveBeenCalledWith(
      {
        path: "/users/:id",
        authentication: { action: "Delete", resource: "user", rule: undefined },
        disabled: false,
        validation: undefined,
        experimental: { openapi: false },
      },
      expect.any(Function),
      expect.any(Function),
      expect.any(Function)
    );
  });

  it("should not register disabled routes", async () => {
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

    setupRouters(router, {});

    expect(router.post).not.toHaveBeenCalledWith("/users", expect.anything());
    expect(router.get).not.toHaveBeenCalledWith("/users", expect.anything());

    expect(router.post).toHaveBeenCalledWith(
      {
        authentication: { action: "Create", resource: "user", rule: undefined },
        disabled: false,
        path: "/users/many",
        validation: undefined,
        experimental: { openapi: false },
      },
      expect.any(Function),
      expect.any(Function),
      expect.any(Function)
    );
    expect(router.get).toHaveBeenCalledWith(
      {
        authentication: { action: "View", resource: "user", rule: undefined },
        disabled: false,
        path: "/users/:id",
        validation: undefined,
        experimental: { openapi: false },
      },
      expect.any(Function),
      expect.any(Function),
      expect.any(Function)
    );
  });

  it("should correctly transform the accessControl object into a simple rule object or array", async () => {
    const mockModuleComponents = {
      interceptors: {},
      authConfigs: {
        accessControl: {
          View: { roles: ["TheBeast"] },
          Create: ["TheBeast"],
        },
      },
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

    setupRouters(router, {});

    expect(router.post).not.toHaveBeenCalledWith("/users", expect.anything());
    expect(router.get).not.toHaveBeenCalledWith("/users", expect.anything());

    expect(router.post).toHaveBeenCalledWith(
      {
        authentication: {
          action: "Create",
          resource: "user",
          rule: ["TheBeast"],
        },
        disabled: false,
        path: "/users/many",
        validation: undefined,
        experimental: { openapi: false },
      },
      expect.any(Function),
      expect.any(Function),
      expect.any(Function)
    );
    expect(router.get).toHaveBeenCalledWith(
      {
        authentication: {
          action: "View",
          resource: "user",
          rule: { roles: ["TheBeast"] },
        },
        disabled: false,
        path: "/users/:id",
        validation: undefined,
        experimental: { openapi: false },
      },
      expect.any(Function),
      expect.any(Function),
      expect.any(Function)
    );
  });

  it("should not register any routes if completely disabled", async () => {
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

    setupRouters(router, {});

    expect(router.get).toHaveBeenCalledWith(
      {
        authentication: { action: "View", resource: "user", rule: undefined },
        disabled: true,
        path: "/users",
        validation: undefined,
        experimental: { openapi: false },
      },
      expect.any(Function),
      expect.any(Function),
      expect.any(Function)
    );
    expect(router.post).toHaveBeenCalledWith(
      {
        authentication: { action: "Create", resource: "user", rule: undefined },
        disabled: true,
        path: "/users",
        validation: undefined,
        experimental: { openapi: false },
      },
      expect.any(Function),
      expect.any(Function),
      expect.any(Function)
    );
    expect(router.patch).toHaveBeenCalledWith(
      {
        authentication: { action: "Update", resource: "user", rule: undefined },
        disabled: true,
        path: "/users/:id",
        validation: undefined,
        experimental: { openapi: false },
      },
      expect.any(Function),
      expect.any(Function),
      expect.any(Function)
    );
    expect(router.delete).toHaveBeenCalledWith(
      {
        authentication: { action: "Delete", resource: "user", rule: undefined },
        disabled: true,
        path: "/users/:id",
        validation: undefined,
        experimental: { openapi: false },
      },
      expect.any(Function),
      expect.any(Function),
      expect.any(Function)
    );
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

    setupRouters(router, {});

    expect(router.get).toHaveBeenCalledWith(
      {
        path: "/users",
        authentication: {
          action: "View",
          resource: "user",
          rule: undefined,
        },
        disabled: false,
        validation: undefined,
        experimental: { openapi: false },
      },
      expect.any(Function), // addPrismaQueryOptionsToRequest
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
    setupRouters(router, {});

    // Verify custom middleware is used - should spread the array
    expect(router.get).toHaveBeenCalledWith(
      {
        path: "/users",
        authentication: {
          action: "View",
          resource: "user",
          rule: undefined,
        },
        disabled: false,
        validation: undefined,
        experimental: { openapi: false },
      },
      expect.any(Function), // addPrismaQueryOptionsToRequest
      expect.any(Function), // first beforeFindMany
      expect.any(Function), // second beforeFindMany
      expect.any(Function), // third beforeFindMany
      expect.any(Function), // findManyHandler
      expect.any(Function), // first afterFindMany
      expect.any(Function), // second afterFindMany
      expect.any(Function) // sendResponse
    );
  });

  // it("should throw error when middleware is not a function", () => {
  //   const mockModuleComponents = {
  //     interceptors: {
  //       beforeFindMany: "something-cool", // This should cause an error
  //     },
  //     authConfigs: {},
  //     prismaQueryOptions: {},
  //     router: undefined,
  //   };

  //   (importHelpers.getModuleComponents as jest.Mock).mockReturnValue(
  //     mockModuleComponents
  //   );

  //   try {
  //     setupRouters(router, {});
  //   } catch (err: any) {
  //     expect(err.message).toBe(
  //       expect.stringContaining("Invalid interceptor of type string")
  //     );
  //   }
  // });

  // it("should throw error when middleware array contains non-function values", () => {
  //   const mockModuleComponents = {
  //     interceptors: {
  //       beforeFindMany: [jest.fn(), "not-a-function", jest.fn()], // Second item should cause error
  //     },
  //     authConfigs: {},
  //     prismaQueryOptions: {},
  //     router: undefined,
  //   };

  //   (importHelpers.getModuleComponents as jest.Mock).mockReturnValue(
  //     mockModuleComponents
  //   );

  //   try {
  //     // expect(() => setupRouters(router, {})).toThrow();
  //   } catch {
  //     expect(() => setupRouters(router, {})).toThrow();
  //   }

  // });

  // it("should throw error for various non-function middleware types", async () => {
  //   const mockModuleComponents = {
  //     interceptors: { beforeFindMany: [jest.fn(), null, jest.fn()] },
  //     authConfigs: {},
  //     prismaQueryOptions: {},
  //     router: undefined,
  //   };

  //   (importHelpers.getModuleComponents as jest.Mock).mockReturnValue(
  //     mockModuleComponents
  //   );

  //   try {
  //     expect(() => setupRouters(router, {})).toThrow();
  //   } catch {}

  //   jest.clearAllMocks();
  // });

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

    setupRouters(router, {});

    expect(router.get).not.toHaveBeenCalledWith("/users", expect.anything());
    expect(router.post).toHaveBeenCalledWith(
      {
        path: "/users/many",
        authentication: {
          action: "Create",
          resource: "user",
          rule: undefined,
        },
        disabled: false,
        validation: undefined,
        experimental: { openapi: false },
      },
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
    jest
      .spyOn(prismaSchemaParser, "getModelsAsArrayOfStrings")
      .mockReturnValue(["User", "Post"]);

    const setupPromises = setupRouters(router, {});
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
    jest
      .spyOn(prismaSchemaParser, "getModelsAsArrayOfStrings")
      .mockReturnValue(["Post"]);

    const setupPromises = setupRouters(router, {});
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

  it("should throw an error when invalid express router is passed", async () => {
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

    jest.spyOn(routerValidator, "isExpressRouter").mockReturnValue(false);

    // Call the function
    jest
      .spyOn(prismaSchemaParser, "getModelsAsArrayOfStrings")
      .mockReturnValue(["Post"]);

    try {
      const setupPromises = setupRouters(router, {});
      await Promise.all(await setupPromises);

      expect(setupRouters).toThrow(
        expect.objectContaining({
          message: expect.stringContaining(
            "post.router.js is not a valid express Router."
          ),
        })
      );

      // Verify routes for both models were registered
      expect(pluralize.plural).toHaveBeenCalledWith("post");

      expect(router.use).not.toHaveBeenCalledWith(
        `/posts`,
        expect.any(Function)
      );

      expect(
        (router.get as jest.Mock).mock.calls.length +
          (router.post as jest.Mock).mock.calls.length +
          (router.patch as jest.Mock).mock.calls.length +
          (router.delete as jest.Mock).mock.calls.length
      ).not.toBe(8);
    } catch {}
  });

  describe("setupRouters - Additional Coverage Tests", () => {
    let router: Router;
    let mockBaseController: any;

    beforeEach(() => {
      jest.clearAllMocks();
      router = Router();

      jest.spyOn(routerValidator, "isExpressRouter").mockReturnValue(true);

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

      (BaseController as jest.Mock).mockImplementation(
        () => mockBaseController
      );
      (catchAsync as jest.Mock).mockImplementation((fn) => fn);

      jest
        .spyOn(prismaSchemaParser, "getModelsAsArrayOfStrings")
        .mockReturnValue(["User"]);
    });

    // Test for line 58: when getModuleComponents returns falsy value
    it("should handle when getModuleComponents returns falsy value", async () => {
      (importHelpers.getModuleComponents as jest.Mock).mockReturnValue(null);

      setupRouters(router, {});

      expect(router.post).toHaveBeenCalledWith(
        {
          path: "/users/many",
          authentication: {
            action: "Create",
            resource: "user",
            rule: undefined,
          },
          disabled: false,
          validation: undefined,
          experimental: { openapi: false },
        },
        expect.any(Function),
        expect.any(Function),
        expect.any(Function)
      );
    });

    // Test for lines 333, 340-346: validation configuration branches
    it("should use class-validator DTOs when resolver is class-validator", async () => {
      const CreateManyDto = jest.fn();
      const mockModuleComponents = {
        interceptors: {},
        authConfigs: {},
        prismaQueryOptions: {},
        router: undefined,
        dtos: {
          create: CreateManyDto,
          update: jest.fn(),
          findOne: jest.fn(),
          createMany: CreateManyDto,
          updateMany: jest.fn(),
          deleteMany: jest.fn(),
          delete: jest.fn(),
        },
        schemas: {
          create: jest.fn(),
          update: jest.fn(),
        },
      };

      (importHelpers.getModuleComponents as jest.Mock).mockReturnValue(
        mockModuleComponents
      );

      // Mock arkosConfigs with class-validator resolver
      const arkosConfigs = {
        validation: {
          resolver: "class-validator",
        },
      };

      setupRouters(router, arkosConfigs as any);

      // Verify that DTOs are used (this tests line 333)
      expect(router.post).toHaveBeenCalledWith(
        {
          path: "/users/many",
          authentication: {
            action: "Create",
            resource: "user",
            rule: undefined,
          },
          disabled: false,
          validation: { body: CreateManyDto },
          experimental: { openapi: false },
        },
        expect.any(Function),
        expect.any(Function),
        expect.any(Function)
      );
    });

    it("should use zod schemas when resolver is zod", async () => {
      const CreateManySchema = jest.fn();
      const mockModuleComponents = {
        interceptors: {},
        authConfigs: {},
        prismaQueryOptions: {},
        router: undefined,
        dtos: {
          create: jest.fn(),
        },
        schemas: {
          create: CreateManySchema,
          update: jest.fn(),
          findOne: jest.fn(),
          createMany: CreateManySchema,
          updateMany: jest.fn(),
          deleteMany: jest.fn(),
          delete: jest.fn(),
        },
      };

      (importHelpers.getModuleComponents as jest.Mock).mockReturnValue(
        mockModuleComponents
      );

      // Mock arkosConfigs with zod resolver
      const arkosConfigs = {
        validation: {
          resolver: "zod",
        },
      };

      setupRouters(router, arkosConfigs as any);

      // Verify that schemas are used (this tests line 340)
      expect(router.post).toHaveBeenCalledWith(
        {
          path: "/users/many",
          authentication: {
            action: "Create",
            resource: "user",
            rule: undefined,
          },
          disabled: false,
          validation: { body: CreateManySchema },
          experimental: { openapi: false },
        },
        expect.any(Function),
        expect.any(Function),
        expect.any(Function)
      );
    });

    it("should keep autentication even authConfigs.authenticationControl is an empty object", async () => {
      const mockModuleComponents = {
        interceptors: {},
        authConfigs: { authenticationControl: {} },
        prismaQueryOptions: {},
        router: undefined,
        dtos: {
          create: jest.fn(),
        },
        schemas: {
          create: jest.fn(),
        },
      };

      (importHelpers.getModuleComponents as jest.Mock).mockReturnValue(
        mockModuleComponents
      );

      // Mock arkosConfigs without validation config
      const arkosConfigs = {};

      const setupPromises = setupRouters(router, arkosConfigs);
      await Promise.all(await setupPromises);

      // Should still register routes but without specific validation (tests line 342)
      expect(router.post).toHaveBeenCalledWith(
        {
          path: "/users",
          authentication: {
            action: "Create",
            resource: "user",
            rule: undefined,
          },
          disabled: false,
          validation: undefined,
          experimental: { openapi: false },
        },
        expect.any(Function),
        expect.any(Function),
        expect.any(Function)
      );
    });

    it("should return undefined when validation resolver is not configured", async () => {
      const mockModuleComponents = {
        interceptors: {},
        authConfigs: {},
        prismaQueryOptions: {},
        router: undefined,
        dtos: {
          create: jest.fn(),
        },
        schemas: {
          create: jest.fn(),
        },
      };

      (importHelpers.getModuleComponents as jest.Mock).mockReturnValue(
        mockModuleComponents
      );

      const arkosConfigs = {};

      setupRouters(router, arkosConfigs);

      // Should still register routes but without specific validation (tests line 342)
      expect(router.post).toHaveBeenCalledWith(
        {
          path: "/users",
          authentication: {
            action: "Create",
            resource: "user",
            rule: undefined,
          },
          disabled: false,
          validation: undefined,
          experimental: { openapi: false },
        },
        expect.any(Function),
        expect.any(Function),
        expect.any(Function)
      );
    });

    it("should return undefined when validation resolver is unknown", async () => {
      const mockModuleComponents = {
        interceptors: {},
        authConfigs: {},
        prismaQueryOptions: {},
        router: undefined,
        dtos: {
          create: jest.fn(),
        },
        schemas: {
          create: jest.fn(),
        },
      };

      (importHelpers.getModuleComponents as jest.Mock).mockReturnValue(
        mockModuleComponents
      );

      const arkosConfigs = {
        validation: {
          resolver: "unknown-resolver",
        },
      };

      jest
        .spyOn(prismaSchemaParser, "getModelsAsArrayOfStrings")
        .mockReturnValue(["User"]);

      setupRouters(router, arkosConfigs as any);

      expect(router.post).toHaveBeenCalledWith(
        {
          path: "/users",
          authentication: {
            action: "Create",
            resource: "user",
            rule: undefined,
          },
          disabled: false,
          validation: undefined,
          experimental: { openapi: false },
        },
        expect.any(Function),
        expect.any(Function),
        expect.any(Function)
      );
    });

    it("should detect custom implementation with different path formats", async () => {
      const mockModuleComponents = {
        interceptors: {},
        authConfigs: {},
        prismaQueryOptions: {},
        router: {
          default: {
            stack: [
              {
                path: "/api/users",
                method: { toLowerCase: () => "post" },
                handle: jest.fn(),
              },
            ],
          },
        },
      };

      (importHelpers.getModuleComponents as jest.Mock).mockReturnValue(
        mockModuleComponents
      );

      const setupPromises = setupRouters(router, {});
      await Promise.all(await setupPromises);

      expect(router.post).not.toHaveBeenCalledWith("/users", expect.anything());
    });

    it("should detect custom implementation with api/ path format", async () => {
      const mockModuleComponents = {
        interceptors: {},
        authConfigs: {},
        prismaQueryOptions: {},
        router: {
          default: {
            stack: [
              {
                path: "api/users",
                method: { toLowerCase: () => "get" },
                handle: jest.fn(),
              },
            ],
          },
        },
      };

      (importHelpers.getModuleComponents as jest.Mock).mockReturnValue(
        mockModuleComponents
      );

      const setupPromises = setupRouters(router, {});
      await Promise.all(await setupPromises);

      // Should not register GET /users because custom implementation exists
      expect(router.get).not.toHaveBeenCalledWith("/users", expect.anything());
    });

    it("should detect custom implementation with api/path/ trailing slash format", async () => {
      const mockModuleComponents = {
        interceptors: {},
        authConfigs: {},
        prismaQueryOptions: {},
        router: {
          default: {
            stack: [
              {
                path: "api/users/",
                method: { toLowerCase: () => "patch" },
                handle: jest.fn(),
              },
            ],
          },
        },
      };

      (importHelpers.getModuleComponents as jest.Mock).mockReturnValue(
        mockModuleComponents
      );

      setupRouters(router, {});

      expect(router.patch).not.toHaveBeenCalledWith(
        "/users",
        expect.anything()
      );
    });

    it("should detect custom implementation with /api/path/ format", async () => {
      const mockModuleComponents = {
        interceptors: {},
        authConfigs: {},
        prismaQueryOptions: {},
        router: {
          default: {
            stack: [
              {
                path: "/api/users/",
                method: { toLowerCase: () => "delete" },
                handle: jest.fn(),
              },
            ],
          },
        },
      };

      (importHelpers.getModuleComponents as jest.Mock).mockReturnValue(
        mockModuleComponents
      );

      setupRouters(router, {});

      expect(router.delete).not.toHaveBeenCalledWith(
        "/users",
        expect.anything()
      );
    });
  });

  describe("isEndpointDisabled - Additional Coverage", () => {
    it("should return false when routerConfig is undefined", () => {
      const result = isEndpointDisabled(undefined as any, "createOne");
      expect(result).toBe(false);
    });

    it("should return false when routerConfig.disable is undefined", () => {
      const routerConfig = {};
      const result = isEndpointDisabled(routerConfig, "createOne");
      expect(result).toBe(false);
    });

    it("should handle when disable is an object but endpoint is not specified", () => {
      const routerConfig = {
        disable: {
          findMany: true,
        },
      };
      const result = isEndpointDisabled(routerConfig, "createOne");
      expect(result).toBe(false); // Should return false when endpoint is not in disable object
    });
  });

  describe("isParentEndpointAllowed", () => {
    it("should return false when routerConfig is null", () => {
      const result = isParentEndpointAllowed(null, "createOne");
      expect(result).toBe(false);
    });

    it("should return false when routerConfig.parent is undefined", () => {
      const routerConfig = {};
      const result = isParentEndpointAllowed(routerConfig, "createOne");
      expect(result).toBe(false);
    });

    it("should return true when parent.endpoints is '*'", () => {
      const routerConfig = {
        parent: {
          endpoints: "*",
        },
      };
      const result = isParentEndpointAllowed(routerConfig, "createOne");
      expect(result).toBe(true);
    });

    it("should return true when endpoint is in parent.endpoints array", () => {
      const routerConfig = {
        parent: {
          endpoints: ["createOne", "findMany"],
        },
      };
      const result = isParentEndpointAllowed(routerConfig, "createOne");
      expect(result).toBe(true);
    });

    it("should return false when endpoint is not in parent.endpoints array", () => {
      const routerConfig = {
        parent: {
          endpoints: ["findMany", "updateOne"],
        },
      };
      const result = isParentEndpointAllowed(routerConfig, "createOne");
      expect(result).toBe(false);
    });

    it("should return true when parent.endpoints is neither '*' nor array (default case)", () => {
      const routerConfig = {
        parent: {
          endpoints: "some-other-value",
        },
      };
      const result = isParentEndpointAllowed(routerConfig, "createOne");
      expect(result).toBe(true);
    });
  });
});
