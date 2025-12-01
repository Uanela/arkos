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
        "Please pass valid value for path field to use in your route"
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
      expect(err.message).toBe(
        "Trying to authenticate route GET /api/cacilda without choosing an authentication mode under arkos.init({ authentication: { mode: '' } })"
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
    const openapiPaths = await generateOpenAPIFromApp(mockApp);

    expect(openapiPaths).toHaveProperty("/users");
    expect(openapiPaths["/users"]).toHaveProperty("get");
    expect(openapiPaths["/users"]["get"].summary).toBe("Get all users");
    expect(openapiPaths["/users"]["get"].tags).toEqual(["Users"]);
  });

  it("should skip routes with openapi set to false", async () => {
    const openapiPaths = await generateOpenAPIFromApp(mockApp);

    // Route with openapi: false should be skipped
    expect(openapiPaths).not.toHaveProperty("/users/:id");
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

  //   const openapiPaths = await generateOpenAPIFromApp(mockApp);

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

    const openapiPaths = await generateOpenAPIFromApp(mockApp);

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

    const openapiPaths = await generateOpenAPIFromApp(emptyApp);

    expect(openapiPaths).toEqual({});
  });

  it("should handle routes without config in registry", async () => {
    (RouteConfigRegistry.get as jest.Mock).mockReturnValue(null);

    const openapiPaths = await generateOpenAPIFromApp(mockApp);

    expect(openapiPaths).toEqual({});
  });

  it("should handle boolean openapi config true", async () => {
    mockRoutes[0].config.experimental.openapi = true;

    const openapiPaths = await generateOpenAPIFromApp(mockApp);

    expect(openapiPaths["/users"]["get"].summary).toBe("GET /users");
    expect(openapiPaths["/users"]["get"].description).toBe("GET /users");
    expect(openapiPaths["/users"]["get"].tags).toEqual(["Defaults"]);
  });

  it("should convert boolean openapi config to object", async () => {
    mockRoutes[0].config.experimental.openapi = true;

    const openapiPaths = await generateOpenAPIFromApp(mockApp);

    expect(openapiPaths["/users"]["get"]).toMatchObject({
      summary: "GET /users",
      description: "GET /users",
      tags: ["Defaults"],
      operationId: "get:/users",
    });
  });
});
