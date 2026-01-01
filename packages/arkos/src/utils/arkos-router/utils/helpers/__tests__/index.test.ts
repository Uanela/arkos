import { extractArkosRoutes, extractPathParams } from "../index";
import RouteConfigRegistry from "../../../route-config-registry";

jest.mock("fs");

describe("extractArkosRoutes", () => {
  const handler1 = jest.fn();
  const handler2 = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    RouteConfigRegistry.get = jest.fn((handler) => {
      if (handler === handler1) return { path: "/a", method: "GET" };
      if (handler === handler2) return { path: "/b", method: "POST" };
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
      { path: "/a", method: "GET", config: { path: "/a", method: "GET" } },
      { path: "/b", method: "POST", config: { path: "/b", method: "POST" } },
    ]);
  });

  it("should handle nested routers", () => {
    const handler3 = jest.fn();
    RouteConfigRegistry.get = jest.fn((handler) => {
      if (handler === handler3) return { path: "/c", method: "GET" };
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
        config: { path: "/c", method: "GET" },
      },
    ]);
  });

  it("should return empty array if no stack", () => {
    const app = {};
    const result = extractArkosRoutes(app);
    expect(result).toEqual([]);
  });
});

describe("extractPathParams", () => {
  it("should extract single path parameter", () => {
    const path = "/api/users/:userId";
    const result = extractPathParams(path);
    expect(result).toEqual(["userId"]);
  });

  it("should extract multiple path parameters", () => {
    const path = "/api/users/:userId/posts/:postId";
    const result = extractPathParams(path);
    expect(result).toEqual(["userId", "postId"]);
  });

  it("should return empty array when no parameters", () => {
    const path = "/api/users";
    const result = extractPathParams(path);
    expect(result).toEqual([]);
  });

  it("should extract parameters with underscores", () => {
    const path = "/api/users/:user_id/posts/:post_id";
    const result = extractPathParams(path);
    expect(result).toEqual(["user_id", "post_id"]);
  });

  it("should extract parameters from complex paths", () => {
    const path =
      "/api/:version/users/:userId/posts/:postId/comments/:commentId";
    const result = extractPathParams(path);
    expect(result).toEqual(["version", "userId", "postId", "commentId"]);
  });

  it("should handle trailing slashes", () => {
    const path = "/api/users/:userId/";
    const result = extractPathParams(path);
    expect(result).toEqual(["userId"]);
  });

  it("should handle paths starting without slash", () => {
    const path = "api/users/:userId";
    const result = extractPathParams(path);
    expect(result).toEqual(["userId"]);
  });
});
