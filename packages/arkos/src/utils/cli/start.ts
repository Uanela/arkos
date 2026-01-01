import path from "path";
import fs from "fs";
import { ChildProcess, spawn } from "child_process";
import { loadEnvironmentVariables } from "../dotenv.helpers";
import { fullCleanCwd } from "../helpers/fs.helpers";
import portAndHostAllocator from "../features/port-and-host-allocator";
import watermarkStamper from "./utils/watermark-stamper";
import sheu from "../sheu";

interface StartOptions {
  port?: string;
  host?: string;
}

let child: ChildProcess | null = null;
let envFiles: string[] | undefined;

/**
 * Production start command for the arkos CLI
 */
export async function startCommand(options: StartOptions = {}) {
  if (!process.env.NODE_ENV) process.env.NODE_ENV = "production";
  process.env.ARKOS_BUILD = "true";

  envFiles = loadEnvironmentVariables();

  try {
    const { port, host } = options;

    const entryPoint = path.join(process.cwd(), ".build", "src", "app.js");

    if (!fs.existsSync(path.join(entryPoint))) {
      sheu.error(
        `Could not find built application entry point at ${fullCleanCwd(entryPoint)}`
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

    child = spawn("node", [entryPoint], {
      stdio: "inherit",
      env,
      shell: true,
    });

    process.on("SIGINT", () => {
      if (child) child.kill();

      process.exit(0);
    });

    const hostAndPort = await portAndHostAllocator.getHostAndAvailablePort(
      env,
      {
        logWarning: true,
      }
    );

    process.env.__PORT = hostAndPort.port || "";
    process.env.__HOST = hostAndPort.host || "";

    watermarkStamper.stamp({
      envFiles,
      ...hostAndPort,
    });
  } catch (error) {
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
