import { extractArkosRoutes } from "../index";
import RouteConfigRegistry from "../../../route-config-registry";

describe("extractArkosRoutes", () => {
  const handler1 = jest.fn();
  const handler2 = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    RouteConfigRegistry.get = jest.fn((handler) => {
      if (handler === handler1) return { route: "/a", method: "GET" };
      if (handler === handler2) return { route: "/b", method: "POST" };
      return undefined;
    });
  });

  it("should extract routes with their methods and configs", () => {
    const app = {
      _router: {
        stack: [
          {
            route: {
              path: "/a",
              methods: { get: true },
              stack: [{ handle: handler1 }],
            },
          },
          {
            route: {
              path: "/b",
              methods: { post: true },
              stack: [{ handle: handler2 }],
            },
          },
        ],
      },
    };

    const result = extractArkosRoutes(app);

    expect(result).toEqual([
      { path: "/a", method: "GET", config: { route: "/a", method: "GET" } },
      { path: "/b", method: "POST", config: { route: "/b", method: "POST" } },
    ]);
  });

  it("should handle nested routers", () => {
    const handler3 = jest.fn();
    RouteConfigRegistry.get = jest.fn((handler) => {
      if (handler === handler3) return { route: "/c", method: "GET" };
      return undefined;
    });

    const app = {
      _router: {
        stack: [
          {
            name: "router",
            handle: {
              stack: [
                {
                  route: {
                    path: "/c",
                    methods: { get: true },
                    stack: [{ handle: handler3 }],
                  },
                },
              ],
            },
            regexp: /\/nested\/?/,
          },
        ],
      },
    };

    const result = extractArkosRoutes(app, "/base");

    expect(result).toEqual([
      {
        path: "/base/nested/c",
        method: "GET",
        config: { route: "/c", method: "GET" },
      },
    ]);
  });

  it("should return empty array if no stack", () => {
    const app = {};
    const result = extractArkosRoutes(app);
    expect(result).toEqual([]);
  });
});
