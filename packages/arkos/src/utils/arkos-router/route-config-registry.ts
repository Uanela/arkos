import { ArkosRouteConfig } from "./types";

export default class RouteConfigRegistry {
  private static configs = new WeakMap<
    Function | Array<Function>,
    ArkosRouteConfig & { method: string }
  >();

  static register(
    handler: Function | Array<Function>,
    config: ArkosRouteConfig,
    method: string
  ) {
    this.configs.set(handler, { ...config, method });
  }

  static get(handler: Function) {
    return this.configs.get(handler);
  }

  static getAll() {
    return this.configs;
  }
}
