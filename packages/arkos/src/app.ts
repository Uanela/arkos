import express from "express";
import { bootstrap } from "./utils/bootstrap";
import setupApp from "./utils/setup-app";
import { Arkos, ArkosLoadable } from "./types/arkos";
import initializeApp from "./utils/initialize-app";
import { Express } from "express";
import { logAppStartp } from "./server";
import { ArkosLoadableRegistry } from "./components/arkos-loadable-registry";

export function arkos(): Arkos {
  const app = express() as any as Arkos;

  setupApp(app);

  const registry = new ArkosLoadableRegistry();

  app.load = (...items: ArkosLoadable[]) => {
    items.forEach((item) => registry.register(item));
    return app;
  };

  app.setup = function () {
    return initializeApp(app, registry);
  };

  const originalListen = app.listen.bind(app) as any as Express["listen"];

  type userCb = (err?: Error) => void;
  const defaultCb = (port: number | string, host: string, cb?: userCb) => {
    logAppStartp(port, host);
    return cb || function () {};
  };

  app.listen = function (cb?: userCb): Arkos {
    app.setup();

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
