import { Router } from "express";
import ArkosRouter from "../";
import RouteConfigRegistry from "../route-config-registry";

jest.mock("fs", () => ({
  readdirSync: jest.fn(),
}));

describe("ArkosRouter", () => {
  const config = { route: "/test" };

  beforeEach(() => {
    jest.clearAllMocks();
    RouteConfigRegistry.register = jest.fn();
  });

  it("should call original method when first argument is not ArkosRouteConfig", () => {
    const router = Router();
    const spy = jest.spyOn(router, "get");
    const proxied = ArkosRouter() as any;

    proxied.__router__ = router;

    proxied.get("/normal", jest.fn());

    expect(spy).toHaveBeenCalledWith("/normal", expect.any(Function));
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
});
