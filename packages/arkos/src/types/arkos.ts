import { Express } from "express";
import { ArkosRouteConfig } from "../exports";
import {
  ArkosAuthRouteHookInstance,
  ArkosFileUploadRouteHookInstance,
  ArkosRouteHookInstance,
} from "../components/arkos-route-hook/types";

export interface Arkos extends Omit<Express, "listen"> {
  /**
   * Loads Arkos-specific instances into the app for internal usage.
   * Unlike use(), load() has no order — it simply makes the loaded
   * data available for Arkos to apply where needed.
   */
  load(...items: ArkosLoadable[]): this;

  /**
   * Applies all loaded items to the app by adding them as middleware,
   * routers, or handlers at the end of the stack.
   *
   * This ensures that Arkos internals always run after user middleware/routes.
   * Automatically called before listen() if not called manually.
   */
  build(): this;

  /**
   * Starts the server using Arkos-managed port and host configuration.
   * Automatically calls build() if not called manually.
   *
   * @param callback Optional callback invoked once server starts
   */
  listen(callback?: (error?: Error) => void): this;

  /**
   * Returns the server configuration [port, host, callback?]
   * Can be used with http.createServer(app).listen(...args)
   */
  getServerConfig(
    cb?: (err?: Error) => void
  ): [number, string, ((err?: Error) => void)?];
}

/**
 * Union of all valid types that can be passed to `app.load()`.
 * Grows as new Arkos-specific loadable types are introduced.
 */
export type ArkosLoadable =
  | ArkosRouteHookInstance
  | ArkosAuthRouteHookInstance
  | ArkosFileUploadRouteHookInstance;

export interface IArkosRouteHook {
  readonly __type: "ArkosRouteHook";
  readonly moduleName: string;
  beforeCreateOne(config: Omit<ArkosRouteConfig, "path">): this;
  afterCreateOne(config: Omit<ArkosRouteConfig, "path">): this;
  beforeFindMany(config: Omit<ArkosRouteConfig, "path">): this;
  // ... etc
}
