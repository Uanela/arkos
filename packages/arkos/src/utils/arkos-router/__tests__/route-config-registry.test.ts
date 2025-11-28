import RouteConfigRegistry from "../route-config-registry";

describe("RouteConfigRegistry", () => {
  const handler1 = () => {};
  const handler2 = () => {};

  it("should register and retrieve a config", () => {
    const config = { route: "/test1" };
    RouteConfigRegistry.register(handler1, config as any, "GET");
    const result = RouteConfigRegistry.get(handler1);
    expect(result).toEqual({ ...config, method: "GET" });
  });

  it("should return undefined for unregistered handler", () => {
    const result = RouteConfigRegistry.get(() => {});
    expect(result).toBeUndefined();
  });

  it("should store multiple configs independently", () => {
    const config1 = { route: "/test1" };
    const config2 = { route: "/test2" };
    RouteConfigRegistry.register(handler1, config1 as any, "GET");
    RouteConfigRegistry.register(handler2, config2 as any, "POST");
    const result1 = RouteConfigRegistry.get(handler1);
    const result2 = RouteConfigRegistry.get(handler2);
    expect(result1).toEqual({ ...config1, method: "GET" });
    expect(result2).toEqual({ ...config2, method: "POST" });
  });

  it("should return the WeakMap instance", () => {
    const result = RouteConfigRegistry.getAll();
    expect(result instanceof WeakMap).toBe(true);
  });
});
