import { Express } from "express";
import { IncomingMessage, Server, ServerResponse } from "http";
import {
  ArkosAuthRouteHookInstance,
  ArkosFileUploadRouteHookInstance,
  ArkosRouteHookInstance,
} from "../components/arkos-route-hook/types";
import { ArkosServiceHookInstance } from "../components/arkos-service-hook/types";

/**
 * Creates and configures an Arkos application instance.
 *
 * Arkos extends Express with a small set of methods for registering routers,
 * loading route/service hooks, and booting the application. All Arkos-specific
 * setup (`app.build()`) must happen before the app starts
 * accepting requests.
 *
 * @example
 * ```ts
 * // Simple setup
 * import arkos from "arkos";
 *
 * const app = arkos();
 *
 * app.use(reportsRouter);
 *
 * app.listen();
 * ```
 *
 * @example
 * ```ts
 * // Custom HTTP server (e.g. for WebSockets)
 * import arkos from "arkos";
 * import http from "http";
 *
 * const app = arkos();
 *
 * app.use(reportsRouter);
 *
 * async function start() {
 *  await app.build();
 *
 *  const server = http.createServer(app);
 *  app.listen(server)
 * }
 * main()
 * ```
 *
 * @see {@link https://www.arkosjs.com/docs/core-concepts/routing/setup}
 */
export interface Arkos extends Omit<Express, "listen"> {
  (req: IncomingMessage, res: ServerResponse): void;

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
  listen(callback?: (error?: Error) => void): Promise<Server>;

  /**
   * Starts the server using Arkos-managed port and host configuration.
   * app.build() must be called before this.
   *
   * @param server {Server} - Optional HTTP server to listen on
   * @param callback Optional callback invoked once server starts
   */
  listen(server: Server, callback?: (error?: Error) => void): Promise<Server>;
}

/**
 * Union of all valid types that can be passed to `app.load()`.
 * Grows as new Arkos-specific loadable types are introduced.
 */
export type ArkosLoadable =
  | ArkosRouteHookInstance<any>
  | ArkosAuthRouteHookInstance
  | ArkosFileUploadRouteHookInstance
  | ArkosServiceHookInstance<any, any>;
