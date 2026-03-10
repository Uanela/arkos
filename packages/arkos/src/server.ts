import AppError from "./modules/error-handler/utils/app-error";
import sheu from "./utils/sheu";
import portAndHostAllocator from "./utils/features/port-and-host-allocator";
import { getArkosConfig as getArkosConfigHelper } from "./utils/helpers/arkos-config.helpers";
import { UserArkosConfig } from "./utils/define-config";

/**
 * Gives access to the underlying current configurations being used by **Arkos** by default and also loaded through `arkos.config.{ts|js}`
 *
 * @returns {ArkosConfig}
 */
export function getArkosConfig(): UserArkosConfig {
  // This was kept only not to require many changes on the given time
  return getArkosConfigHelper();
}

process.on("uncaughtException", (err) => {
  if (err.message.includes("EPIPE")) return;

  if (process.env.NO_CLI === "true")
    sheu.error("UNCAUGHT EXCEPTION! SHUTTING DOWN...\n", {
      timestamp: true,
      bold: true,
    });

  console.error(err);
  setTimeout(() => {
    process.exit(1);
  }, 0);
});

let server: any = {};

process.on("unhandledRejection", (err: AppError) => {
  if (process.env.NO_CLI === "true")
    sheu.error("UNHANDLED REJECTION! SHUTTING DOWN...\n", {
      timestamp: true,
      bold: true,
    });
  console.error(err);

  if (server?.close)
    server?.close(() => {
      process.exit(1);
    });
  else
    setTimeout(() => {
      process.exit(1);
    }, 0);
});

export function logAppStartp(port: number | string, _host: string) {
  let networkHost = portAndHostAllocator.getFirstNonLocalIp();
  const config = getArkosConfig();

  const host = ["0.0.0.0", "127.0.0.1"].includes(_host) ? "localhost" : _host;
  const time = new Date().toTimeString().split(" ")[0];

  const message = `${sheu.gray(time)} {{server}} waiting on http://${host}:${port}`;

  sheu.ready(
    message.replace(
      "{{server}}",
      `${process.env.ARKOS_BUILD === "true" ? "Production" : "Development"} server`
    )
  );
  if (networkHost && _host === "0.0.0.0")
    sheu.ready(
      message.replace(host, networkHost).replace("{{server}}", `Network server`)
    );
  if (
    config?.swagger?.mode &&
    ((config?.swagger?.enableAfterBuild &&
      process.env.ARKOS_BUILD === "true") ||
      process.env.ARKOS_BUILD !== "true")
  )
    sheu.ready(
      `${message.replace("{{server}}", "Documentation")}${config?.swagger?.endpoint || "/api/docs"}`
    );
}

export { server };
