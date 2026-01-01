import { IncomingMessage, Server, ServerResponse } from "http";
import AppError from "./modules/error-handler/utils/app-error";
import { Express } from "express";
import { bootstrap } from "./app";
import http from "http";
import sheu from "./utils/sheu";
import portAndHostAllocator from "./utils/features/port-and-host-allocator";
import { killDevelopmentServerChildProcess } from "./utils/cli/dev";
import { killServerChildProcess } from "./utils/cli/utils/cli.helpers";
import { killProductionServerChildProcess } from "./utils/cli/start";
import { ArkosConfig } from "./types/new-arkos-config";
import { ArkosInitConfig } from "./exports";
import { getArkosConfig as getArkosConfigHelper } from "./utils/helpers/arkos-config.helpers";
import runtimeCliCommander from "./utils/cli/utils/runtime-cli-commander";

/**
 * Gives access to the underlying current configurations being used by **Arkos** by default and also loaded through `arkos.config.{ts|js}`
 *
 * @returns {ArkosConfig}
 */
export function getArkosConfig(): ArkosConfig {
  // This was kept only not to require many changes on the given time
  return getArkosConfigHelper();
}

process.on("uncaughtException", (err) => {
  if (err.message.includes("EPIPE")) return;

  sheu.error("\nUNCAUGHT EXCEPTION! SHUTTING DOWN...\n", {
    timestamp: true,
    bold: true,
  });

  console.error(err.name, err.message);
  console.error(err);
  process.exit(1);
});

let server: Server<typeof IncomingMessage, typeof ServerResponse>;
let _app: Express;

/**
 * Initializes the application server.
 *
 * This function starts the server by listening on a specified port.
 * The port is determined by the following order of precedence:
 * 1. The `port` argument passed to the function.
 * 2. Defaults to `8000` if neither is provided.
 *
 * @param {ArkosInitConfig} initConfig - initial configs for the api ( authentication, port).
 * @returns {Promise<Express>} This function returns the Express App after all middlewares configurations.
 * You can prevent it from listen py passing port as undefined
 *
 */
async function initApp(
  initConfig: ArkosInitConfig = {}
): Promise<Express | undefined> {
  try {
    const arkosConfig = getArkosConfig();

    const portAndHost = await portAndHostAllocator.getHostAndAvailablePort(
      process.env,
      arkosConfig
    );

    let networkHost = portAndHostAllocator.getFirstNonLocalIp();

    _app = await bootstrap(initConfig);
    const time = new Date().toTimeString().split(" ")[0];
    const cliCommand = process.env.CLI_COMMAND;

    if (
      !cliCommand &&
      (("port" in arkosConfig && arkosConfig?.port !== undefined) ||
        !("port" in arkosConfig))
    ) {
      server = http.createServer(_app);

      if (initConfig?.configureServer) await initConfig.configureServer(server);

      server.listen(
        Number(portAndHost?.port),
        portAndHost.host! === "localhost" ? "127.0.0.1" : portAndHost.host!,
        () => {
          const host = ["0.0.0.0", "127.0.0.1"].includes(portAndHost?.host)
            ? "localhost"
            : portAndHost?.host;

          const message = `${sheu.gray(time)} {{server}} waiting on http://${host}:${portAndHost?.port}`;

          sheu.ready(
            message.replace(
              "{{server}}",
              `${process.env.ARKOS_BUILD === "true" ? "Production" : "Development"} server`
            )
          );
          if (networkHost && portAndHost.host === "0.0.0.0")
            sheu.ready(
              message
                .replace(host, networkHost)
                .replace("{{server}}", `Network server`)
            );
          if (
            arkosConfig?.swagger?.mode &&
            ((arkosConfig?.swagger?.enableAfterBuild &&
              process.env.ARKOS_BUILD === "true") ||
              process.env.ARKOS_BUILD !== "true")
          )
            sheu.ready(
              `${message.replace("{{server}}", "Documentation")}${arkosConfig?.swagger?.endpoint || "/api/docs"}`
            );
        }
      );
    } else if (!cliCommand) {
      sheu.warn(
        `${sheu.gray(time)} Port set to undefined, hence no internal http server was setup.`
      );
    } else if (cliCommand) runtimeCliCommander.handle();

    return _app;
  } catch (err: any) {
    sheu.error(
      err?.message || "Something went wrong while starting your application!"
    );
    console.error(err);
    killDevelopmentServerChildProcess?.();
    killServerChildProcess?.();
    killProductionServerChildProcess?.();
  }
}

process.on("unhandledRejection", (err: AppError) => {
  sheu.error("\nUNHANDLED REJECTION! SHUTTING DOWN...\n", {
    timestamp: true,
    bold: true,
  });
  console.error(err.name, err.message);
  console.error(err);
  server?.close(() => {
    process.exit(1);
  });
});

/**
 * Terminates the current running express application, server and process.
 *
 * @returns {void}
 */
export function terminateApplicationRunningProcessAndServer(): void {
  server?.close(() => {
    process.exit(1);
  });
}

export function getExpressApp() {
  return _app;
}

export { server, initApp };
