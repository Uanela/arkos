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
import { Server } from "http";

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
 *  server.listen(...app.getServerConfig());
 * }
 * main()
 * ```
 *
 * @see {@link https://www.arkosjs.com/docs/core-concepts/routing/setup}
 */
export function arkos(): Arkos {
  const app = express() as any as Arkos;
  setupApp(app);

  let builtBy: "listen" | "build" | null = null;

  app.build = async function () {
    if (builtBy)
      throw Error(
        builtBy === "listen"
          ? `app.build() must not be called after app.listen(), see https://www.arkosjs.com/docs/core-concepts/routing/setup#setting-up-your-app`
          : `app.build() must only be called once, see https://www.arkosjs.com/docs/core-concepts/routing/setup#setting-up-your-app`
      );

    builtBy = "build";

    await Promise.all([loadPrismaModule(), loadAllModuleComponents()]);

    const _app = initializeApp(app);

    const cliCommand = process.env.CLI_COMMAND;

    if (cliCommand) await runtimeCliCommander.handle();

    return _app;
  };

  const originalListen = app.listen.bind(app) as any as Express["listen"];
  type userCb = (err?: Error) => void;

  const defaultCb = (port: number | string, host: string, cb?: userCb) => {
    logAppStartp(port, host);
    return cb || function () {};
  };

  app.listen = async function (cb?: userCb): Promise<Server> {
    if (builtBy)
      throw Error(
        builtBy === "build"
          ? `app.listen() must not be called after app.build(), see https://www.arkosjs.com/docs/core-concepts/routing/setup#setting-up-your-app`
          : `app.listen() must only be called once, see https://www.arkosjs.com/docs/core-concepts/routing/setup#setting-up-your-app`
      );

    builtBy = "listen";

    await Promise.all([loadPrismaModule(), loadAllModuleComponents()]);

    initializeApp(app);
    const port = Number(process.env.__PORT || process.env.PORT || "8000");
    const host = process.env.__HOST! || process.env.HOST || "127.0.0.1";

    if (process.env.CLI_COMMAND) runtimeCliCommander.handle();

    const server = originalListen(port, host, defaultCb(port, host, cb));

    return server;
  };

  app.getServerConfig = (cb?: userCb) => {
    const port = Number(process.env.__PORT || process.env.PORT || "8000");
    const host = process.env.__HOST! || process.env.HOST || "127.0.0.1";
    return [port, host, defaultCb(port, host, cb)];
  };

  return app;
}
