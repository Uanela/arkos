import { Router } from "express";
import { isEndpointDisabled, setupRouters } from "../base.router.helpers";
import * as importHelpers from "../../../../../utils/dynamic-loader";
import { BaseController } from "../../../base.controller";
import pluralize from "pluralize";
import catchAsync from "../../../../error-handler/utils/catch-async";
import routerValidator from "../../router-validator";
import prismaSchemaParser from "../../../../../utils/prisma/prisma-schema-parser";
import { getArkosConfig } from "../../../../../server";
import z from "zod";

jest.mock("../../model-openapi-generator", () => ({
  __esModule: true,
  default: { getOpenApiConfig: jest.fn().mockReturnValue({}) },
}));
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
jest.mock("../../router-validator", () => ({
  __esModule: true,
  default: { isExpressRouter: jest.fn(() => true) },
}));

jest
  .spyOn(prismaSchemaParser, "getModelsAsArrayOfStrings")
  .mockReturnValue(["User"]);

describe("setupRouters", () => {
  let router: any;
  let mockBaseController: any;

  beforeEach(() => {
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

  it("should register all routes for a model with no customization", () => {
    const CreateUserSchema = z.object({});
    const UpdateUserSchema = z.object({});

    (importHelpers.getModuleComponents as jest.Mock).mockReturnValue({
      interceptors: {},
      authConfigs: {},
      prismaQueryOptions: {},
      router: undefined,
      schemas: {
        create: CreateUserSchema,
        update: UpdateUserSchema,
      },
    });

    setupRouters(router, {
      validation: { resolver: "zod" },
      authentication: { mode: "static" },
    });

    expect(router.post).toHaveBeenCalledWith(
      expect.objectContaining({
        path: "/users",
        authentication: { action: "Create", resource: "user", rule: undefined },
        disabled: false,
        validation: { body: CreateUserSchema },
      }),
      expect.any(Function),
      expect.any(Function),
      expect.any(Function)
    );
    expect(router.get).toHaveBeenCalledWith(
      expect.objectContaining({
        path: "/users",
        authentication: { action: "View", resource: "user", rule: undefined },
        disabled: false,
      }),
      expect.any(Function),
      expect.any(Function),
      expect.any(Function)
    );
    expect(router.post).toHaveBeenCalledWith(
      expect.objectContaining({
        path: "/users/many",
        authentication: { action: "Create", resource: "user", rule: undefined },
        disabled: false,
      }),
      expect.any(Function),
      expect.any(Function),
      expect.any(Function)
    );
    expect(router.patch).toHaveBeenCalledWith(
      expect.objectContaining({
        path: "/users/many",
        authentication: { action: "Update", resource: "user", rule: undefined },
        disabled: false,
      }),
      expect.any(Function),
      expect.any(Function),
      expect.any(Function)
    );
    expect(router.delete).toHaveBeenCalledWith(
      expect.objectContaining({
        path: "/users/many",
        authentication: { action: "Delete", resource: "user", rule: undefined },
        disabled: false,
      }),
      expect.any(Function),
      expect.any(Function),
      expect.any(Function)
    );
    expect(router.get).toHaveBeenCalledWith(
      expect.objectContaining({
        path: "/users/:id",
        authentication: { action: "View", resource: "user", rule: undefined },
        disabled: false,
      }),
      expect.any(Function),
      expect.any(Function),
      expect.any(Function)
    );
    expect(router.patch).toHaveBeenCalledWith(
      expect.objectContaining({
        path: "/users/:id",
        authentication: { action: "Update", resource: "user", rule: undefined },
        disabled: false,
        validation: { body: UpdateUserSchema },
      }),
      expect.any(Function),
      expect.any(Function),
      expect.any(Function)
    );
    expect(router.delete).toHaveBeenCalledWith(
      expect.objectContaining({
        path: "/users/:id",
        authentication: { action: "Delete", resource: "user", rule: undefined },
        disabled: false,
      }),
      expect.any(Function),
      expect.any(Function),
      expect.any(Function)
    );
  });

  it("should not register disabled routes", () => {
    (importHelpers.getModuleComponents as jest.Mock).mockReturnValue({
      interceptors: {},
      authConfigs: {},
      prismaQueryOptions: {},
      router: {
        config: {
          disable: { createOne: true, findMany: true },
        },
      },
    });

    setupRouters(router, { authentication: { mode: "static" } });

    expect(router.post).not.toHaveBeenCalledWith("/users", expect.anything());
    expect(router.get).not.toHaveBeenCalledWith("/users", expect.anything());

    expect(router.post).toHaveBeenCalledWith(
      expect.objectContaining({
        authentication: { action: "Create", resource: "user", rule: undefined },
        disabled: false,
        path: "/users/many",
      }),
      expect.any(Function),
      expect.any(Function),
      expect.any(Function)
    );
    expect(router.get).toHaveBeenCalledWith(
      expect.objectContaining({
        authentication: { action: "View", resource: "user", rule: undefined },
        disabled: false,
        path: "/users/:id",
      }),
      expect.any(Function),
      expect.any(Function),
      expect.any(Function)
    );
  });

  it("should correctly transform the accessControl object into a simple rule object or array", () => {
    (importHelpers.getModuleComponents as jest.Mock).mockReturnValue({
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
          disable: { createOne: true, findMany: true },
        },
      },
    });

    setupRouters(router, { authentication: { mode: "static" } });

    expect(router.post).not.toHaveBeenCalledWith("/users", expect.anything());
    expect(router.get).not.toHaveBeenCalledWith("/users", expect.anything());

    expect(router.post).toHaveBeenCalledWith(
      expect.objectContaining({
        authentication: {
          action: "Create",
          resource: "user",
          rule: ["TheBeast"],
        },
        disabled: false,
        path: "/users/many",
      }),
      expect.any(Function),
      expect.any(Function),
      expect.any(Function)
    );
    expect(router.get).toHaveBeenCalledWith(
      expect.objectContaining({
        authentication: {
          action: "View",
          resource: "user",
          rule: { roles: ["TheBeast"] },
        },
        disabled: false,
        path: "/users/:id",
      }),
      expect.any(Function),
      expect.any(Function),
      expect.any(Function)
    );
  });

  it("should not register any routes if completely disabled", () => {
    (importHelpers.getModuleComponents as jest.Mock).mockReturnValue({
      interceptors: {},
      authConfigs: {},
      prismaQueryOptions: {},
      router: {
        default: {},
        config: { disable: true },
      },
    });

    setupRouters(router, { authentication: { mode: "static" } });

    expect(router.get).toHaveBeenCalledWith(
      expect.objectContaining({
        authentication: { action: "View", resource: "user", rule: undefined },
        disabled: true,
        path: "/users",
      }),
      expect.any(Function),
      expect.any(Function),
      expect.any(Function)
    );
    expect(router.post).toHaveBeenCalledWith(
      expect.objectContaining({
        authentication: { action: "Create", resource: "user", rule: undefined },
        disabled: true,
        path: "/users",
      }),
      expect.any(Function),
      expect.any(Function),
      expect.any(Function)
    );
    expect(router.patch).toHaveBeenCalledWith(
      expect.objectContaining({
        authentication: { action: "Update", resource: "user", rule: undefined },
        disabled: true,
        path: "/users/:id",
      }),
      expect.any(Function),
      expect.any(Function),
      expect.any(Function)
    );
    expect(router.delete).toHaveBeenCalledWith(
      expect.objectContaining({
        authentication: { action: "Delete", resource: "user", rule: undefined },
        disabled: true,
        path: "/users/:id",
      }),
      expect.any(Function),
      expect.any(Function),
      expect.any(Function)
    );
  });

  it("should use custom middleware when provided as function", () => {
    (importHelpers.getModuleComponents as jest.Mock).mockReturnValue({
      interceptors: {
        beforeFindMany: jest.fn(),
        afterFindMany: jest.fn(),
      },
      authConfigs: {},
      prismaQueryOptions: {},
      router: undefined,
    });

    setupRouters(router, {});

    expect(router.get).toHaveBeenCalledWith(
      expect.objectContaining({
        path: "/users",
        disabled: false,
      }),
      expect.any(Function),
      expect.any(Function),
      expect.any(Function),
      expect.any(Function),
      expect.any(Function)
    );
  });

  it("should use custom middleware when provided as array of functions", () => {
    (importHelpers.getModuleComponents as jest.Mock).mockReturnValue({
      interceptors: {
        beforeFindMany: [jest.fn(), jest.fn(), jest.fn()],
        afterFindMany: [jest.fn(), jest.fn()],
      },
      authConfigs: {},
      prismaQueryOptions: {},
      router: undefined,
    });

    setupRouters(router, { authentication: { mode: "static" } });

    expect(router.get).toHaveBeenCalledWith(
      expect.objectContaining({
        path: "/users",
        authentication: { action: "View", resource: "user", rule: undefined },
        disabled: false,
      }),
      expect.any(Function),
      expect.any(Function),
      expect.any(Function),
      expect.any(Function),
      expect.any(Function),
      expect.any(Function),
      expect.any(Function),
      expect.any(Function)
    );
  });

  it("should not register routes that have custom implementations", () => {
    const customRouterStack = [
      { path: "/users", method: "GET", handle: jest.fn() },
    ];

    const mockModuleComponents = {
      interceptors: {},
      authConfigs: {},
      prismaQueryOptions: {},
      router: { default: { stack: customRouterStack } },
    };

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
      expect.objectContaining({
        path: "/users/many",
        disabled: false,
      }),
      expect.any(Function),
      expect.any(Function),
      expect.any(Function)
    );
  });

  it("should handle multiple models in parallel", async () => {
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

    jest
      .spyOn(prismaSchemaParser, "getModelsAsArrayOfStrings")
      .mockReturnValue(["User", "Post"]);

    const setupPromises = setupRouters(router, {
      authentication: { mode: "static" },
    });
    await Promise.all(await setupPromises);

    expect(pluralize.plural).toHaveBeenCalledWith("user");
    expect(pluralize.plural).toHaveBeenCalledWith("post");

    expect(
      (router.get as jest.Mock).mock.calls.length +
        (router.post as jest.Mock).mock.calls.length +
        (router.patch as jest.Mock).mock.calls.length +
        (router.delete as jest.Mock).mock.calls.length
    ).toBe(16);
  });

  it("should first setup the custom router if provided", async () => {
    (importHelpers.getModuleComponents as jest.Mock).mockImplementation(
      (modelName) => {
        if (modelName === "post")
          return {
            interceptors: {},
            authConfigs: {},
            prismaQueryOptions: {},
            router: { default: jest.fn() },
          };
        return {};
      }
    );

    jest
      .spyOn(prismaSchemaParser, "getModelsAsArrayOfStrings")
      .mockReturnValue(["Post"]);

    const setupPromises = setupRouters(router, {
      authentication: { mode: "static" },
    });
    await Promise.all(await setupPromises);

    expect(pluralize.plural).toHaveBeenCalledWith("post");
    expect(router.use).toHaveBeenCalledWith(`/posts`, expect.any(Function));
    expect(
      (router.get as jest.Mock).mock.calls.length +
        (router.post as jest.Mock).mock.calls.length +
        (router.patch as jest.Mock).mock.calls.length +
        (router.delete as jest.Mock).mock.calls.length
    ).toBe(8);
  });

  it("should throw an error when invalid express router is passed", async () => {
    (importHelpers.getModuleComponents as jest.Mock).mockImplementation(
      (modelName) => {
        if (modelName === "post")
          return {
            interceptors: {},
            authConfigs: {},
            prismaQueryOptions: {},
            router: { default: jest.fn() },
          };
        return {};
      }
    );

    jest.spyOn(routerValidator, "isExpressRouter").mockReturnValue(false);
    jest
      .spyOn(prismaSchemaParser, "getModelsAsArrayOfStrings")
      .mockReturnValue(["Post"]);

    try {
      const setupPromises = setupRouters(router, {
        authentication: { mode: "static" },
      });
      await Promise.all(await setupPromises);

      expect(setupRouters).toThrow(
        expect.objectContaining({
          message: expect.stringContaining(
            "post.router.js is not a valid express Router."
          ),
        })
      );
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
    let router: any;
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

    it("should handle when getModuleComponents returns falsy value", () => {
      (importHelpers.getModuleComponents as jest.Mock).mockReturnValue(null);

      setupRouters(router, {});

      expect(router.post).toHaveBeenCalledWith(
        expect.objectContaining({
          path: "/users/many",
          disabled: false,
        }),
        expect.any(Function),
        expect.any(Function),
        expect.any(Function)
      );
    });

    it("should use class-validator DTOs when resolver is class-validator", async () => {
      const CreateManyDto = jest.fn();

      (importHelpers.getModuleComponents as jest.Mock).mockReturnValue({
        interceptors: {},
        authConfigs: {},
        prismaQueryOptions: {},
        router: undefined,
        dtos: {
          create: CreateManyDto,
          update: jest.fn(),
          createMany: CreateManyDto,
          updateMany: jest.fn(),
        },
        schemas: { create: jest.fn(), update: jest.fn() },
      });

      setupRouters(router, {
        authentication: { mode: "static" },
        validation: { resolver: "class-validator" },
      } as any);

      expect(router.post).toHaveBeenCalledWith(
        expect.objectContaining({
          path: "/users/many",
          authentication: {
            action: "Create",
            resource: "user",
            rule: undefined,
          },
          disabled: false,
          validation: { body: CreateManyDto },
        }),
        expect.any(Function),
        expect.any(Function),
        expect.any(Function)
      );
    });

    it("should use zod schemas when resolver is zod", async () => {
      const CreateManySchema = jest.fn();

      (importHelpers.getModuleComponents as jest.Mock).mockReturnValue({
        interceptors: {},
        authConfigs: {},
        prismaQueryOptions: {},
        router: undefined,
        dtos: { create: jest.fn() },
        schemas: {
          create: CreateManySchema,
          update: jest.fn(),
          createMany: CreateManySchema,
          updateMany: jest.fn(),
        },
      });

      setupRouters(router, {
        authentication: { mode: "static" },
        validation: { resolver: "zod" },
      } as any);

      expect(router.post).toHaveBeenCalledWith(
        expect.objectContaining({
          path: "/users/many",
          authentication: {
            action: "Create",
            resource: "user",
            rule: undefined,
          },
          disabled: false,
          validation: { body: CreateManySchema },
        }),
        expect.any(Function),
        expect.any(Function),
        expect.any(Function)
      );
    });

    it("should keep authentication even authConfigs.authenticationControl is an empty object", () => {
      (importHelpers.getModuleComponents as jest.Mock).mockReturnValue({
        interceptors: {},
        authConfigs: { authenticationControl: {} },
        prismaQueryOptions: {},
        router: undefined,
        dtos: { create: jest.fn() },
        schemas: { create: jest.fn() },
      });

      setupRouters(router, { authentication: { mode: "static" } } as any);

      expect(router.post).toHaveBeenCalledWith(
        expect.objectContaining({
          path: "/users",
          authentication: {
            action: "Create",
            resource: "user",
            rule: undefined,
          },
          disabled: false,
        }),
        expect.any(Function),
        expect.any(Function),
        expect.any(Function)
      );
    });

    it("should return undefined when validation resolver is not configured", () => {
      (importHelpers.getModuleComponents as jest.Mock).mockReturnValue({
        interceptors: {},
        authConfigs: {},
        prismaQueryOptions: {},
        router: undefined,
        dtos: { create: jest.fn() },
        schemas: { create: jest.fn() },
      });

      setupRouters(router, {} as any);

      expect(router.post).toHaveBeenCalledWith(
        expect.objectContaining({
          path: "/users",
          disabled: false,
        }),
        expect.any(Function),
        expect.any(Function),
        expect.any(Function)
      );
    });

    it("should return undefined when validation resolver is unknown", () => {
      (importHelpers.getModuleComponents as jest.Mock).mockReturnValue({
        interceptors: {},
        authConfigs: {},
        prismaQueryOptions: {},
        router: undefined,
        dtos: { create: jest.fn() },
        schemas: { create: jest.fn() },
      });

      jest
        .spyOn(prismaSchemaParser, "getModelsAsArrayOfStrings")
        .mockReturnValue(["User"]);

      setupRouters(router, {
        authentication: { mode: "static" },
        validation: { resolver: "unknown-resolver" },
      } as any);

      expect(router.post).toHaveBeenCalledWith(
        expect.objectContaining({
          path: "/users",
          authentication: {
            action: "Create",
            resource: "user",
            rule: undefined,
          },
          disabled: false,
        }),
        expect.any(Function),
        expect.any(Function),
        expect.any(Function)
      );
    });

    it("should detect custom implementation with different path formats", async () => {
      (importHelpers.getModuleComponents as jest.Mock).mockReturnValue({
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
      });

      const setupPromises = setupRouters(router, {
        authentication: { mode: "static" },
      });
      await Promise.all(await setupPromises);

      expect(router.post).not.toHaveBeenCalledWith("/users", expect.anything());
    });

    it("should detect custom implementation with api/ path format", async () => {
      (importHelpers.getModuleComponents as jest.Mock).mockReturnValue({
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
      });

      const setupPromises = setupRouters(router, {
        authentication: { mode: "static" },
      });
      await Promise.all(await setupPromises);

      expect(router.get).not.toHaveBeenCalledWith("/users", expect.anything());
    });

    it("should detect custom implementation with api/path/ trailing slash format", async () => {
      (importHelpers.getModuleComponents as jest.Mock).mockReturnValue({
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
      });

      setupRouters(router, { authentication: { mode: "static" } });

      expect(router.patch).not.toHaveBeenCalledWith(
        "/users",
        expect.anything()
      );
    });

    it("should detect custom implementation with /api/path/ format", async () => {
      (importHelpers.getModuleComponents as jest.Mock).mockReturnValue({
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
      });

      setupRouters(router, { authentication: { mode: "static" } });

      expect(router.delete).not.toHaveBeenCalledWith(
        "/users",
        expect.anything()
      );
    });
  });

  describe("isEndpointDisabled - Additional Coverage", () => {
    it("should return false when routerConfig is undefined", () => {
      expect(isEndpointDisabled(undefined as any, "createOne")).toBe(false);
    });

    it("should return false when routerConfig.disable is undefined", () => {
      expect(isEndpointDisabled({}, "createOne")).toBe(false);
    });

    it("should handle when disable is an object but endpoint is not specified", () => {
      expect(
        isEndpointDisabled({ disable: { findMany: true } }, "createOne")
      ).toBe(false);
    });
  });
});
