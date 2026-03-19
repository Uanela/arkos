import "./utils/helpers/arkos-config.helpers";
import express, { Express } from "express";
import setupApp from "./utils/setup-app";
import { Arkos, ArkosLoadable } from "./types/arkos";
import initializeApp from "./utils/initialize-app";
import { logAppStartup } from "./server";
import runtimeCliCommander from "./utils/cli/utils/runtime-cli-commander";
import { IncomingMessage, Server, ServerResponse } from "http";
import ExitError from "./utils/helpers/exit-error";
import loadableRegistry from "./components/arkos-loadable-registry";
import { applyArkosRouterProxy } from "./utils/arkos-router/utils/helpers/apply-arkos-router-proxy";

let appServer: Server<typeof IncomingMessage, typeof ServerResponse>;
const docsLink =
  "https://www.arkosjs.com/docs/core-concepts/routing/setup#setting-up-your-app";
let instanciated = false;

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
export function arkos(): Arkos {
  if (instanciated)
    throw ExitError(`arkos() must be called only once, see ${docsLink}`);

  const app = applyArkosRouterProxy(express(), {}, "app") as any as Arkos;
  setupApp(app);
  instanciated = true;

  type AppState = "idle" | "building" | "built" | "listening";
  let state: AppState = "idle";

  app.load = (...items: ArkosLoadable[]) => {
    if (state !== "idle")
      throw ExitError(
        `app.load() must be called before app.${state === "listening" ? "listen" : "build"}(), see ${docsLink}`
      );

    if (Array.isArray(items[0])) items = items[0];
    items = Array.isArray(items) ? items : [items];

    items.forEach((item) => loadableRegistry.register(item));
    return app;
  };

  function loadApp() {
    const _app = initializeApp(app);
    if (process.env.CLI_COMMAND) runtimeCliCommander.handle();
    return _app;
  }

  app.build = function () {
    if (state === "built" || state === "building")
      throw ExitError(`app.build() must only be called once, see ${docsLink}`);
    if (state === "listening")
      throw ExitError(
        `app.build() must be called before app.listen(), see ${docsLink}`
      );

    state = "building";
    const _app = loadApp();
    state = "built";
    return _app;
  };

  const originalListen = app.listen.bind(app) as any as Express["listen"];
  type UserCallback = (err?: Error) => void;

  const defaultCb = (
    port: number | string,
    host: string,
    cb?: UserCallback
  ) => {
    logAppStartup(port, host);
    return cb || function () {};
  };

  app.listen = async function (...args): Promise<Server> {
    if (state === "listening")
      throw ExitError(`app.listen() must only be called once, see ${docsLink}`);
    if (state === "building")
      throw ExitError(
        `app.build() must be awaited before calling app.listen(), see ${docsLink}`
      );

    if (state === "idle") {
      state = "listening";
      loadApp();
    }

    const port = Number(process.env.__PORT || process.env.PORT || "8000");
    const host = process.env.__HOST! || process.env.HOST || "0.0.0.0";

    if ((args as any)?.length === 0 || typeof args[0] === "function")
      appServer = originalListen(
        port,
        host,
        defaultCb(port, host, args[0] as UserCallback)
      );
    else if (args[0] instanceof Server || typeof args[0] === "object")
      appServer = args[0].listen(
        port,
        host,
        defaultCb(port, host, args[1] as UserCallback)
      );

    return appServer;
  };

  return app;
}

export function getAppServer() {
  return appServer;
}
