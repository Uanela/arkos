import "./utils/helpers/arkos-config.helpers"; // just to trigger loading of arkos config
import express from "express";
import { bootstrap } from "./utils/bootstrap";
import setupApp from "./utils/setup-app";
import { Arkos, ArkosLoadable } from "./types/arkos";
import initializeApp from "./utils/initialize-app";
import { Express } from "express";
import { logAppStartp } from "./server";
import { ArkosLoadableRegistry } from "./components/arkos-loadable-registry";
import { BaseController } from "./modules/base/base.controller";
import { BaseService } from "./modules/base/base.service";

/**
 * Creates and configures an Arkos application instance.
 *
 * Arkos extends Express with a small set of methods for registering routers,
 * loading route/service hooks, and booting the application. All Arkos-specific
 * setup (`app.load()`, `app.build()`) must happen before the app starts
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
 * app.load(userRouteHook, userServiceHook);
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
 * app.load(userRouteHook);
 *
 * app.build();
 *
 * const server = http.createServer(app);
 * server.listen(...app.getServerConfig());
 * ```
 *
 * @see {@link https://www.arkosjs.com/docs/core-concepts/routing/setup}
 */
export function arkos(): Arkos {
  const app = express() as any as Arkos;
  setupApp(app);

  const registry = new ArkosLoadableRegistry();

  let builtBy: "listen" | "build" | null = null;

  app.load = (...items: ArkosLoadable[]) => {
    if (builtBy) {
      throw new Error(`app.load() must be called before app.${builtBy}().`);
    }
    items.forEach((item) => registry.register(item));
    return app;
  };

  app.build = function () {
    if (builtBy)
      throw Error(
        builtBy === "listen"
          ? `app.build() must not be called after app.listen(), see https://www.arkosjs.com/docs/core-concepts/routing/setup#setting-up-your-app`
          : `app.build() must only be called once, see https://www.arkosjs.com/docs/core-concepts/routing/setup#setting-up-your-app`
      );

    builtBy = "build";
    BaseController.configure(registry);
    BaseService.configure(registry);
    return initializeApp(app, registry);
  };

  const originalListen = app.listen.bind(app) as any as Express["listen"];
  type userCb = (err?: Error) => void;

  const defaultCb = (port: number | string, host: string, cb?: userCb) => {
    logAppStartp(port, host);
    return cb || function () {};
  };

  app.listen = function (cb?: userCb): Arkos {
    if (builtBy)
      throw Error(
        builtBy === "build"
          ? `app.listen() must not be called after app.build(), see https://www.arkosjs.com/docs/core-concepts/routing/setup#setting-up-your-app`
          : `app.listen() must only be called once, see https://www.arkosjs.com/docs/core-concepts/routing/setup#setting-up-your-app`
      );

    builtBy = "listen";
    BaseController.configure(registry);
    BaseService.configure(registry);
    initializeApp(app, registry);
    const port = Number(process.env.__PORT || process.env.PORT || "8000");
    const host = process.env.__HOST! || process.env.HOST || "127.0.0.1";
    originalListen(port, host, defaultCb(port, host, cb));
    return app;
  };

  app.getServerConfig = (cb?: userCb) => {
    const port = Number(process.env.__PORT || process.env.PORT || "8000");
    const host = process.env.__HOST! || process.env.HOST || "127.0.0.1";
    return [port, host, defaultCb(port, host, cb)];
  };

  return app;
}

export { bootstrap };
