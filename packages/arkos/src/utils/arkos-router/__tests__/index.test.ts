import { Router } from "express";
import ArkosRouter, { generateOpenAPIFromApp } from "../";
import RouteConfigRegistry from "../route-config-registry";
import { getArkosConfig } from "../../../server";

jest.mock("fs", () => ({
  readdirSync: jest.fn(),
}));
jest.mock("../../../exports/error-handler", () => ({
  catchAsync: jest.fn((fn: any) => fn),
}));
jest.mock("../../../server", () => ({ getArkosConfig: jest.fn(() => ({})) }));

RouteConfigRegistry.register = jest.fn();
RouteConfigRegistry.get = jest.fn();

const ArkosRouterWrapper = (opts: any) => {
  const router = Router();
  const proxied = ArkosRouter(opts) as any;

  proxied.__router__ = router;

  return proxied;
};

describe("ArkosRouter", () => {
  const config = { path: "/test" };

  beforeEach(() => {
    jest.clearAllMocks();
    RouteConfigRegistry.register = jest.fn();
    RouteConfigRegistry.get = jest.fn();
  });

  it("should throw an error when path is passed", () => {
    const router = Router();
    const proxied = ArkosRouter() as any;

    proxied.__router__ = router;
    try {
      proxied.get("/normal", jest.fn());
    } catch (err: any) {
      expect(err.message).toBe(
        "First argument of ArkosRouter().get() must be a valid ArkosRouteConfig object with path field, but recevied /normal"
      );
    }
  });

  it("should register config and call original method when first argument is ArkosRouteConfig", () => {
    const proxied = ArkosRouter() as any;
    const handler = jest.fn();

    proxied.get(config, handler);

    expect(RouteConfigRegistry.register).toHaveBeenCalledWith(
      handler,
      config,
      "get"
    );
  });

  it("should use the last handler in handlers array for registration", () => {
    const proxied = ArkosRouter() as any;
    const h1 = jest.fn();
    const h2 = jest.fn();

    proxied.post(config, h1, h2);

    expect(RouteConfigRegistry.register).toHaveBeenCalledWith(
      h2,
      config,
      "post"
    );
  });

  it("should return original method if property is not HTTP method", () => {
    const proxied = ArkosRouter() as any;
    expect(typeof proxied.use).toBe("function");
  });

  it("should throw error when strict validation is enabled without validators or explicit false", () => {
    (getArkosConfig as jest.Mock).mockReturnValue({
      validation: {
        resolver: "zod",
        strict: true,
      },
    });
    try {
      const proxied = ArkosRouter() as any;
      proxied.get({ path: "/api/cacilda" });
    } catch (err: any) {
      expect(err.message).toBe(
        "When using strict validation you must either pass { validation: false } in order to explicitly tell that no input will be received, or pass `undefined` for each input type e.g { validation: { query: undefined } } in order to deny the input of given request input."
      );
    }
  });

  it("should throw an error when validation is not enabled and tries to pass validation option into ArkosRouter", () => {
    (getArkosConfig as jest.Mock).mockReturnValue({});
    try {
      const proxied = ArkosRouter() as any;
      proxied.get({ path: "/api/cacilda", validation: {} });
    } catch (err: any) {
      expect(err.message).toBe(
        "Trying to pass validators into route GET /api/cacilda config validation option without choosing a validation resolver under arkos.init({ validation: { resolver: '' } })"
      );
    }
  });

  it("should throw an error when authentication is not enabled and tries to pass authentication option into ArkosRouter", () => {
    (getArkosConfig as jest.Mock).mockReturnValue({});
    try {
      const proxied = ArkosRouter() as any;
      proxied.get({ path: "/api/cacilda", authentication: {} });
    } catch (err: any) {
      expect(err.message).toContain(
        "Trying to authenticate route GET /api/cacilda without choosing an authentication mode under arkos.config.js"
      );
    }
  });
});

// Mock dependencies
// jest.mock("../route-config-registry");

describe("generateOpenAPIFromApp", () => {
  let mockApp: any;
  let mockRoutes: any[];

  beforeEach(() => {
    mockRoutes = [
      {
        path: "/users",
        method: "GET",
        config: {
          experimental: {
            openapi: {
              summary: "Get all users",
              description: "Retrieve a list of all users",
              tags: ["Users"],
            },
          },
        },
      },
      {
        path: "/users/:id",
        method: "POST",
        config: {
          experimental: {
            openapi: false, // Should be skipped
          },
        },
      },
      {
        path: "/products",
        method: "GET",
        config: {}, // Should use defaults
      },
      {
        path: "/products/:id/views/:viewId/:userId",
        method: "GET",
        config: {
          experimental: {
            openapi: {
              parameters: [
                {
                  name: "userId",
                  in: "path",
                  description: "the userId in product",
                },
              ],
            },
          },
        }, // Should use defaults
      },
    ];

    mockApp = {
      _router: {
        stack: [
          {
            route: {
              path: "/users",
              methods: { get: true },
              stack: [{ handle: {} }],
            },
          },
          {
            route: {
              path: "/users/:id",
              methods: { post: true },
              stack: [{ handle: {} }],
            },
          },
        ],
      },
    };

    // Mock RouteConfigRegistry.get to return appropriate configs
    (RouteConfigRegistry.get as jest.Mock).mockImplementation((handler) => {
      if (handler === "product") {
        const route = mockRoutes.find(
          (r) => r.path === "/products/:id/views/:viewId/:userId"
        );

        return route.config;
      }

      const route = mockRoutes.find(
        (r) =>
          r.path === "/users" &&
          r.method === "GET" &&
          handler === mockApp._router.stack[0].route.stack[0].handle
      );

      if (route) return route.config;

      const route2 = mockRoutes.find(
        (r) =>
          r.path === "/users/:id" &&
          r.method === "POST" &&
          handler === mockApp._router.stack[1].route.stack[0].handle
      );
      if (route2) return route2.config;

      return null;
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should generate OpenAPI paths from Express app routes", async () => {
    const openapiPaths = generateOpenAPIFromApp(mockApp);

    expect(openapiPaths).toHaveProperty("/users");
    expect(openapiPaths["/users"]).toHaveProperty("get");
    expect(openapiPaths["/users"]["get"].summary).toBe("Get all users");
    expect(openapiPaths["/users"]["get"].tags).toEqual(["Users"]);
  });

  it("should skip routes with openapi set to false", async () => {
    const openapiPaths = generateOpenAPIFromApp(mockApp);

    // Route with openapi: false should be skipped
    expect(openapiPaths).not.toHaveProperty("/users/:id");
  });

  it("should export path parameters from route path", async () => {
    const routePath = "/products/{id}/views/{viewId}/{userId}";
    const app = {
      _router: {
        stack: [
          {
            route: {
              path: "/products/:id/views/:viewId/:userId",
              methods: { get: true },
              stack: [{ handle: "product" }],
            },
          },
        ],
      },
    };

    const openapiPaths: any = generateOpenAPIFromApp(app);

    expect(openapiPaths[routePath].get.parameters[0].description).toBe(
      "the userId in product"
    );
    expect(openapiPaths[routePath].get.parameters[1].name).toBe("id");
    expect(openapiPaths[routePath].get.parameters[2].name).toBe("viewId");
  });

  it("should throw an error when try to define path parameter that is not contained on the route pathname", async () => {
    const routePath = "/products/:id/:viewId";
    const app = {
      _router: {
        stack: [
          {
            route: {
              path: routePath,
              methods: { get: true },
              stack: [{ handle: "product" }],
            },
          },
        ],
      },
    };

    try {
      generateOpenAPIFromApp(app);
    } catch (err: any) {
      expect(err.message).toBe(
        `ValidationError: Trying to define path parameter 'userId' but it is not present in your pathname ${routePath}`
      );
    }
  });

  // it("should use default values when openapi config is not provided", async () => {
  //   // Add a route without openapi config
  //   mockApp._router.stack.push({
  //     route: {
  //       path: "/products",
  //       methods: { get: true },
  //       stack: [{ handle: {} }],
  //     },
  //   });

  //   mockRoutes.push({
  //     path: "/products",
  //     method: "GET",
  //     config: {}, // No openapi config
  //   });

  //   const openapiPaths =  generateOpenAPIFromApp(mockApp);

  //   expect(openapiPaths).toHaveProperty("/products");
  //   expect(openapiPaths["/products"]["get"].summary).toBe("GET /products");
  //   expect(openapiPaths["/products"]["get"].description).toBe("GET /products");
  //   expect(openapiPaths["/products"]["get"].tags).toEqual(["Others"]);
  // });

  it("should handle routes with object openapi config", async () => {
    mockRoutes[0].config.experimental.openapi = {
      summary: "Custom summary",
      description: "Custom description",
      tags: ["Custom"],
      operationId: "customOperation",
    };

    const openapiPaths = generateOpenAPIFromApp(mockApp);

    expect(openapiPaths["/users"]["get"].summary).toBe("Custom summary");
    expect(openapiPaths["/users"]["get"].description).toBe(
      "Custom description"
    );
    expect(openapiPaths["/users"]["get"].tags).toEqual(["Custom"]);
    expect(openapiPaths["/users"]["get"].operationId).toBe("customOperation");
  });

  it("should handle empty app with no routes", async () => {
    const emptyApp = {
      _router: {
        stack: [],
      },
    };

    const openapiPaths = generateOpenAPIFromApp(emptyApp);

    expect(openapiPaths).toEqual({});
  });

  it("should handle routes without config in registry", async () => {
    (RouteConfigRegistry.get as jest.Mock).mockReturnValue(null);

    const openapiPaths = generateOpenAPIFromApp(mockApp);

    expect(openapiPaths).toEqual({});
  });

  it("should handle boolean openapi config true", async () => {
    mockRoutes[0].config.experimental.openapi = true;

    const openapiPaths = generateOpenAPIFromApp(mockApp);

    expect(openapiPaths["/users"]["get"].summary).toBe("/users");
    expect(openapiPaths["/users"]["get"].description).toBe("GET /users");
    expect(openapiPaths["/users"]["get"].tags).toEqual(["Defaults"]);
  });

  it("should convert boolean openapi config to object", async () => {
    mockRoutes[0].config.experimental.openapi = true;

    const openapiPaths = generateOpenAPIFromApp(mockApp);

    expect(openapiPaths["/users"]["get"]).toMatchObject({
      summary: "/users",
      description: "GET /users",
      tags: ["Defaults"],
      operationId: "get:/users",
    });
  });

  describe("ArkosRouter prefix handling", () => {
    let router: any;

    beforeEach(() => {
      jest.clearAllMocks();
      router = ArkosRouter() as any;
    });

    it("should apply string prefix to string route path", () => {
      const router = ArkosRouterWrapper({ prefix: "/api" });
      router.get({ path: "/users" }, jest.fn());

      expect(RouteConfigRegistry.register).toHaveBeenCalledWith(
        expect.any(Function),
        expect.objectContaining({ path: "/api/users" }),
        "get"
      );
    });

    it("should apply string prefix to regex route path", () => {
      const router = ArkosRouterWrapper({ prefix: "/api" });
      router.get({ path: /^\/users\/\d+$/ }, jest.fn());

      const registeredPath = (RouteConfigRegistry.register as jest.Mock).mock
        .calls[0][1].path;

      expect(registeredPath).toBeInstanceOf(RegExp);
      expect(registeredPath.test("/api/users/1")).toBe(true);
      expect(registeredPath.test("/users/1")).toBe(false);
    });

    it("should apply regex prefix to string route path", () => {
      const router = ArkosRouterWrapper({ prefix: /^\/v\d+/ });
      router.get({ path: "/users" }, jest.fn());

      const registeredPath = (RouteConfigRegistry.register as jest.Mock).mock
        .calls[0][1].path;

      expect(registeredPath).toBeInstanceOf(RegExp);
      expect(registeredPath.test("/v1/users")).toBe(true);
      expect(registeredPath.test("/users")).toBe(false);
    });

    it("should apply regex prefix to regex route path", () => {
      const router = ArkosRouterWrapper({ prefix: /^\/api/ });
      router.get({ path: /^\/users\/\d+$/ }, jest.fn());

      const registeredPath = (RouteConfigRegistry.register as jest.Mock).mock
        .calls[0][1].path;

      expect(registeredPath).toBeInstanceOf(RegExp);
      expect(registeredPath.test("/api/users/1")).toBe(true);
      expect(registeredPath.test("/users/1")).toBe(false);
    });

    it("should apply array prefix to route path", () => {
      const router = ArkosRouterWrapper({ prefix: ["/api", "/v1"] });
      router.get({ path: "/users" }, jest.fn());

      const registeredPath = (RouteConfigRegistry.register as jest.Mock).mock
        .calls[0][1].path;

      expect(registeredPath).toEqual(["/api/users", "/v1/users"]);
    });

    it("should apply prefix only once per route", () => {
      const router = ArkosRouterWrapper({ prefix: "/api" });
      router.get({ path: "/users" }, jest.fn());
      router.get({ path: "/posts" }, jest.fn());

      const calls = (RouteConfigRegistry.register as jest.Mock).mock.calls;

      expect(calls[0][1].path).toBe("/api/users");
      expect(calls[1][1].path).toBe("/api/posts");
    });

    it("should not modify path when no prefix is defined", () => {
      router.get({ path: "/users" }, jest.fn());

      expect(RouteConfigRegistry.register).toHaveBeenCalledWith(
        expect.any(Function),
        expect.objectContaining({ path: "/users" }),
        "get"
      );
    });
  });

  describe("ArkosRouter - route() method", () => {
    beforeEach(() => {
      jest.clearAllMocks();
      RouteConfigRegistry.register = jest.fn();
      RouteConfigRegistry.get = jest.fn();
    });

    it("should handle route().get() and merge path into config", () => {
      const proxied = ArkosRouter() as any;
      const handler = jest.fn();

      proxied.route("/users").get({ validation: {} }, handler);

      expect(RouteConfigRegistry.register).toHaveBeenCalledWith(
        handler,
        { validation: {}, path: "/users" },
        "get"
      );
    });

    it("should chain multiple HTTP methods on same route path", () => {
      (getArkosConfig as jest.Mock).mockReturnValue({
        authentication: { mode: "static" },
      });
      const proxied = ArkosRouter() as any;
      const getHandler = jest.fn();
      const postHandler = jest.fn();

      proxied
        .route("/api/resource")
        .get({ validation: {} }, getHandler)
        .post({ authentication: true }, postHandler);

      expect(RouteConfigRegistry.register).toHaveBeenNthCalledWith(
        1,
        getHandler,
        { validation: {}, path: "/api/resource" },
        "get"
      );
      expect(RouteConfigRegistry.register).toHaveBeenNthCalledWith(
        2,
        postHandler,
        { authentication: true, path: "/api/resource" },
        "post"
      );
    });

    it("should apply prefix to route() paths", () => {
      const proxied = ArkosRouter({ prefix: "/api" }) as any;
      const handler = jest.fn();

      proxied.route("/users").get({}, handler);

      expect(RouteConfigRegistry.register).toHaveBeenCalledWith(
        handler,
        { path: "/api/users" },
        "get"
      );
    });

    it("should handle route() with all HTTP methods", () => {
      const proxied = ArkosRouter() as any;
      const handler = jest.fn();

      proxied.route("/test").delete({}, handler);

      expect(RouteConfigRegistry.register).toHaveBeenCalledWith(
        handler,
        { path: "/test" },
        "delete"
      );
    });
  });
});
