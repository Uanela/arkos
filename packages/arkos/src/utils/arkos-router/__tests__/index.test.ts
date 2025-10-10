import { Router } from "express";
import ArkosRouter from "../";
import RouteConfigRegistry from "../route-config-registry";

jest.mock("fs", () => ({
  readdirSync: jest.fn(),
}));
jest.mock("../../../exports/error-handler", () => ({
  catchAsync: jest.fn((fn: any) => fn),
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
    try {
      proxied.get("/normal", jest.fn());

      expect(spy).toThrow(
        "First argument of ArkosRouter().get() must be a valid ArkosRouteConfig but recevied /normal"
      );
    } catch {}
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
    jest.requireMock("../../../server").getArkosConfig.mockReturnValue({
      validation: {
        resolver: "zod",
        strict: true,
      },
    });

    const router = Router();

    const spy = jest.spyOn(router, "get");
    const proxied = ArkosRouter() as any;
    proxied.__router__ = router;
    proxied.get({ route: "/api" });

    expect(spy).toThrow(
      "When using strict validation you must either pass { validation: false } in order to explicitly tell that no input will be received, or pass `undefined` for each input type e.g { validation: { query: undefined } } in order to deny the input of given request input."
    );
  });
});
