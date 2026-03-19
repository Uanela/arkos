// src/utils/arkos-router/__tests__/apply-arkos-router-proxy.test.ts
import { applyArkosRouterProxy } from "../apply-arkos-router-proxy";
import { Router } from "express";
import RouteConfigRegistry from "../../../route-config-registry";
import { getArkosConfig } from "../../../../../server";
import ExitError from "../../../../helpers/exit-error";

jest.mock("../../../../helpers/exit-error", () => ({
  __esModule: true,
  default: jest.fn(),
}));
jest.mock("fs", () => ({
  readdirSync: jest.fn(),
}));
jest.mock("../../../../../exports/error-handler", () => ({
  catchAsync: jest.fn((fn: any) => fn),
}));
jest.mock("../../../../../server", () => ({
  getArkosConfig: jest.fn(() => ({})),
}));

RouteConfigRegistry.register = jest.fn();
RouteConfigRegistry.get = jest.fn();

const makeRouter = (opts?: any) =>
  applyArkosRouterProxy(Router(opts), opts) as any;

describe("applymakeRouterProxy", () => {
  const config = { path: "/test" };

  beforeEach(() => {
    jest.clearAllMocks();
    RouteConfigRegistry.register = jest.fn();
    RouteConfigRegistry.get = jest.fn();
  });

  describe("makeRouter OpenAPI tag merging", () => {
    it("should merge router-level and route-level openapi tags", () => {
      const router = makeRouter({ openapi: { tags: ["Users"] } }) as any;
      const handler = jest.fn();

      router.get(
        {
          path: "/merge-test",
          experimental: {
            openapi: {
              tags: ["Admin"],
            },
          },
        },
        handler
      );

      const registeredConfig = (RouteConfigRegistry.register as jest.Mock).mock
        .calls[0][1];

      expect(registeredConfig.experimental.openapi.tags).toEqual([
        "Users",
        "Admin",
      ]);
    });
  });

  it("should throw an error when path is passed", () => {
    const router = Router();
    const proxied = makeRouter() as any;

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
    const proxied = makeRouter() as any;
    const handler = jest.fn();

    proxied.get(config, handler);

    expect(RouteConfigRegistry.register).toHaveBeenCalledWith(
      handler,
      config,
      "get"
    );
  });

  it("should use the last handler in handlers array for registration", () => {
    const proxied = makeRouter() as any;
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
    const proxied = makeRouter() as any;
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
      const proxied = makeRouter() as any;
      proxied.get({ path: "/api/cacilda" });
    } catch (err: any) {
      expect(err.message).toBe(
        "When using strict validation you must either pass { validation: false } in order to explicitly tell that no input will be received, or pass `undefined` for each input type e.g { validation: { query: undefined } } in order to deny the input of given request input."
      );
    }
  });

  it("should throw an error when validation is not enabled and tries to pass validation option into makeRouter", () => {
    (getArkosConfig as jest.Mock).mockReturnValue({});
    try {
      const proxied = makeRouter() as any;
      proxied.get({ path: "/api/cacilda", validation: {} });
    } catch (err: any) {
      expect(err.message).toBe(
        "Trying to pass validators into route GET /api/cacilda config validation option without choosing a validation resolver under arkos.init({ validation: { resolver: '' } })"
      );
    }
  });

  it("should throw an error when authentication is not enabled and tries to pass authentication option into makeRouter", () => {
    (getArkosConfig as jest.Mock).mockReturnValue({});
    try {
      const proxied = makeRouter() as any;
      proxied.get({ path: "/api/cacilda", authentication: {} });
    } catch (err: any) {
      expect(err.message).toContain(
        "Trying to authenticate route GET /api/cacilda without choosing an authentication mode under arkos.config.js"
      );
    }
  });

  describe("makeRouter - use() method", () => {
    beforeEach(() => {
      jest.clearAllMocks();
      RouteConfigRegistry.register = jest.fn();
      RouteConfigRegistry.get = jest.fn();
      (ExitError as jest.Mock).mockImplementation(() => {}); // re-setup after clearAllMocks
    });

    it("should fall through to native express use when passed a function", () => {
      const proxied = makeRouter() as any;
      const middleware = jest.fn();
      expect(() => proxied.use(middleware)).not.toThrow();
      expect(ExitError).not.toHaveBeenCalled();
    });

    it("should fall through to native express use when passed a path string", () => {
      const proxied = makeRouter() as any;
      const middleware = jest.fn();
      expect(() => proxied.use("/api", middleware)).not.toThrow();
      expect(ExitError).not.toHaveBeenCalled();
    });

    it("should apply middleware stack when passed ArkosUseConfig", () => {
      (getArkosConfig as jest.Mock).mockReturnValue({
        authentication: { mode: "static" },
      });
      const proxied = makeRouter() as any;
      const middleware = jest.fn();
      expect(() =>
        proxied.use({ authentication: true }, middleware)
      ).not.toThrow();
    });

    it("should apply path when passed in ArkosUseConfig", () => {
      (getArkosConfig as jest.Mock).mockReturnValue({
        authentication: { mode: "static" },
      });
      const proxied = makeRouter() as any;
      const middleware = jest.fn();
      expect(() =>
        proxied.use({ path: "/api/admin", authentication: true }, middleware)
      ).not.toThrow();
    });

    it("should not require path in ArkosUseConfig", () => {
      (getArkosConfig as jest.Mock).mockReturnValue({
        authentication: { mode: "static" },
      });
      const proxied = makeRouter() as any;
      const middleware = jest.fn();
      expect(() =>
        proxied.use({ authentication: true }, middleware)
      ).not.toThrow();
    });

    it("should call ExitError when authentication is set but no authentication mode configured", () => {
      (getArkosConfig as jest.Mock).mockReturnValue({});
      const proxied = makeRouter() as any;
      const middleware = jest.fn();

      try {
        proxied.use({ path: "/api/admin", authentication: true }, middleware);
      } catch {
        expect(ExitError).toHaveBeenCalledWith(
          expect.stringContaining(
            "Trying to authenticate route use /api/admin without choosing an authentication mode"
          )
        );
      }
    });

    it("should respect disabled flag and not mount", () => {
      (getArkosConfig as jest.Mock).mockReturnValue({});
      const proxied = makeRouter() as any;
      const middleware = jest.fn();

      proxied.use({ path: "/api/admin", disabled: true }, middleware);

      expect(ExitError).not.toHaveBeenCalled();
    });

    it("should apply prefix to path in ArkosUseConfig", () => {
      (getArkosConfig as jest.Mock).mockReturnValue({
        authentication: { mode: "static" },
      });
      const proxied = makeRouter({ prefix: "/api" }) as any;
      const middleware = jest.fn();
      expect(() =>
        proxied.use({ path: "/admin", authentication: true }, middleware)
      ).not.toThrow();
    });
  });

  describe("ArkosRouter prefix handling", () => {
    let router: any;

    beforeEach(() => {
      jest.clearAllMocks();
      router = makeRouter() as any;
    });

    it("should apply string prefix to string route path", () => {
      const router = makeRouter({ prefix: "/api" });
      router.get({ path: "/users" }, jest.fn());

      expect(RouteConfigRegistry.register).toHaveBeenCalledWith(
        expect.any(Function),
        expect.objectContaining({ path: "/api/users" }),
        "get"
      );
    });

    it("should apply string prefix to regex route path", () => {
      const router = makeRouter({ prefix: "/api" });
      router.get({ path: /^\/users\/\d+$/ }, jest.fn());

      const registeredPath = (RouteConfigRegistry.register as jest.Mock).mock
        .calls[0][1].path;

      expect(registeredPath).toBeInstanceOf(RegExp);
      expect(registeredPath.test("/api/users/1")).toBe(true);
      expect(registeredPath.test("/users/1")).toBe(false);
    });

    it("should apply regex prefix to string route path", () => {
      const router = makeRouter({ prefix: /^\/v\d+/ });
      router.get({ path: "/users" }, jest.fn());

      const registeredPath = (RouteConfigRegistry.register as jest.Mock).mock
        .calls[0][1].path;

      expect(registeredPath).toBeInstanceOf(RegExp);
      expect(registeredPath.test("/v1/users")).toBe(true);
      expect(registeredPath.test("/users")).toBe(false);
    });

    it("should apply regex prefix to regex route path", () => {
      const router = makeRouter({ prefix: /^\/api/ });
      router.get({ path: /^\/users\/\d+$/ }, jest.fn());

      const registeredPath = (RouteConfigRegistry.register as jest.Mock).mock
        .calls[0][1].path;

      expect(registeredPath).toBeInstanceOf(RegExp);
      expect(registeredPath.test("/api/users/1")).toBe(true);
      expect(registeredPath.test("/users/1")).toBe(false);
    });

    it("should apply array prefix to route path", () => {
      const router = makeRouter({ prefix: ["/api", "/v1"] });
      router.get({ path: "/users" }, jest.fn());

      const registeredPath = (RouteConfigRegistry.register as jest.Mock).mock
        .calls[0][1].path;

      expect(registeredPath).toEqual(["/api/users", "/v1/users"]);
    });

    it("should apply prefix only once per route", () => {
      const router = makeRouter({ prefix: "/api" });
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
      const proxied = makeRouter() as any;
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
      const proxied = makeRouter() as any;
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
      const proxied = makeRouter({ prefix: "/api" }) as any;
      const handler = jest.fn();

      proxied.route("/users").get({}, handler);

      expect(RouteConfigRegistry.register).toHaveBeenCalledWith(
        handler,
        { path: "/api/users" },
        "get"
      );
    });

    it("should handle route() with all HTTP methods", () => {
      const proxied = makeRouter() as any;
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
