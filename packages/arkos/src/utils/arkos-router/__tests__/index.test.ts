import { generateOpenAPIFromApp } from "../";
import RouteConfigRegistry from "../route-config-registry";

jest.mock("../", () => ({
  __esModule: true,
  ...jest.requireActual("../"),
  default: jest.fn(),
}));
jest.mock("../../helpers/exit-error", () => ({
  __esModule: true,
  default: jest.fn(),
}));
jest.mock("fs", () => ({
  readdirSync: jest.fn(),
}));
jest.mock("../../../exports/error-handler", () => ({
  catchAsync: jest.fn((fn: any) => fn),
}));
jest.mock("../../../server", () => ({ getArkosConfig: jest.fn(() => ({})) }));

RouteConfigRegistry.register = jest.fn();
RouteConfigRegistry.get = jest.fn();

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
});
