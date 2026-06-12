import path from "path";
import fs from "fs";
import { ChildProcess, spawn } from "child_process";
import { loadEnvironmentVariables } from "../dotenv.helpers";
import { fullCleanCwd } from "../helpers/fs.helpers";
import watermarkStamper from "./utils/watermark-stamper";
import sheu from "../sheu";
import { getArkosConfig } from "../helpers/arkos-config.helpers";

interface StartOptions {
  port?: string;
  host?: string;
  stamp?: false;
  shouldThrow?: true;
}

let child: ChildProcess | null = null;
let envFiles: string[] | undefined;

/**
 * Production start command for the arkos CLI
 */
export function startCommand(options: StartOptions = {}) {
  process.env.NO_CLI = "true";

  if (!process.env.NODE_ENV) process.env.NODE_ENV = "production";
  process.env.ARKOS_BUILD = "true";

  envFiles = loadEnvironmentVariables();

  try {
    const { port, host } = options;

    const config = getArkosConfig();

    const entryPoint = path.join(
      process.cwd(),
      ".build",
      config.source?.entryPoint!.replace(".ts", ".js")!
    );

    if (!fs.existsSync(path.join(entryPoint))) {
      sheu.error(
        `Could not find built application entry point at ${fullCleanCwd(entryPoint).replaceAll(/^\/+/g, "")}`
      );
      process.exit(1);
    }

    const env: { [x: string]: string } = {
      NODE_ENV: "production",
      ...process.env,
      ...(port && { CLI_PORT: port }),
      ...(host && { CLI_HOST: host }),
      ARKOS_BUILD: "true",
      CLI: "false",
    };

    env.__HOST =
      env?.CLI_HOST ||
      env?.HOST ||
      (env.ARKOS_BUILD !== "true" ? "0.0.0.0" : "127.0.0.1");

    env.__PORT = env?.CLI_PORT || env?.PORT || "8000";

    if (options.stamp !== false)
      watermarkStamper.stamp({
        envFiles,
        port: env.__PORT,
        host: env.__HOST,
      });

    child = spawn("node", [entryPoint], {
      stdio: "inherit",
      env,
      shell: true,
    });

    process.on("SIGINT", () => {
      if (child) child.kill();

      process.exit(0);
    });

    return child;
  } catch (error) {
    if (options.shouldThrow) throw error;
    sheu.error("Production server failed to start:");
    console.error(error);
    process.exit(1);
  }
}

/**
 * Help function to help other processes to terminate the production server child process
 */
export function killProductionServerChildProcess() {
  (child as ChildProcess)?.kill?.();
  child = null;
}
