import { IncomingMessage, Server, ServerResponse } from "http";
import AppError from "./modules/error-handler/utils/app-error";
import { Express } from "express";
import { bootstrap, InitConfigs } from "./app";

process.on("uncaughtException", (err) => {
  console.error("UNCAUGHT EXCEPTION! SHUTTING DOWN...");
  console.error(err.name, err.message);
  console.error(err);
  process.exit(1);
});

let server: Server<typeof IncomingMessage, typeof ServerResponse>;
let _app: Express;
let _initConfigs: InitConfigs;

/**
 * Initializes the application server.
 *
 * This function starts the server by listening on a specified port.
 * The port is determined by the following order of precedence:
 * 1. The `PORT` environment variable.
 * 2. The `port` argument passed to the function.
 * 3. Defaults to `8000` if neither is provided.
 *
 * @param {Express} app - express app.
 * @param {InitConfigs} initConfigs - initial configs for the api ( authentication, port).
 * @returns {Promise<void>} This function does not return a value.
 */
async function initApp(
  app: Express,
  initConfigs: InitConfigs = {
    authentication: false,
    validation: false,
  }
): Promise<void> {
  _app = app;
  _initConfigs = initConfigs;

  const port = initConfigs.port || Number(process.env.PORT) || 8000;
  const application = await bootstrap(app, initConfigs);

  server = application.listen(port, () => {
    const time = new Date().toTimeString().split(" ")[0];
    console.info(
      `[\x1b[32mREADY\x1b[0m] \x1b[90m${time}\x1b[0m App running on port \x1b[33m${port}\x1b[0m, server waiting on http://localhost:${port}`
    );
    console.log(
      `${!!process.env.NODE_ENV && `Environment is ${process.env.NODE_ENV}`}`
    );
  });
}

process.on("unhandledRejection", (err: AppError) => {
  console.error("UNHANDLED REJECTION! SHUTTING DOWN...");
  console.error(err.name, err.message);
  server.close(() => {
    process.exit(1);
  });
});

export function getInitConfigs() {
  return _initConfigs;
}

export function getExpressApp() {
  return _app;
}

export { server, initApp };
