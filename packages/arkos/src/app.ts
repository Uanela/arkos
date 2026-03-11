import "./utils/helpers/arkos-config.helpers"; // just to trigger loading of arkos config
import express from "express";
import setupApp from "./utils/setup-app";
import { Arkos } from "./types/arkos";
import initializeApp from "./utils/initialize-app";
import { Express } from "express";
import { logAppStartp } from "./server";
import { loadPrismaModule } from "./utils/helpers/prisma.helpers";
import { loadAllModuleComponents } from "./utils/dynamic-loader";
import runtimeCliCommander from "./utils/cli/utils/runtime-cli-commander";
import { IncomingMessage, Server, ServerResponse } from "http";
import ExitError from "./utils/helpers/exit-error";

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

  const app = express() as any as Arkos;
  setupApp(app);
  instanciated = true;

  type AppState = "idle" | "building" | "built" | "listening";
  let state: AppState = "idle";

  async function loadApp() {
    await Promise.all([loadPrismaModule(), loadAllModuleComponents()]);
    const _app = initializeApp(app);
    if (process.env.CLI_COMMAND) await runtimeCliCommander.handle();
    return _app;
  }

  app.build = async function () {
    if (state === "built")
      throw ExitError(`app.build() must only be called once, see ${docsLink}`);
    if (state === "listening")
      throw ExitError(
        `app.build() must be called before app.listen(), see ${docsLink}`
      );
    if (state === "building")
      throw ExitError(`app.build() must only be called once, see ${docsLink}`);

    state = "building";
    const _app = await loadApp();
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
    logAppStartp(port, host);
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
      state = "building";
      await loadApp();
    }

    state = "listening";

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
