import path from "path";
import fs from "fs";
import { ChildProcess, spawn } from "child_process";
import { loadEnvironmentVariables } from "../dotenv.helpers";
import { importModule } from "../helpers/global.helpers";
import { fullCleanCwd } from "../helpers/fs.helpers";
import portAndHostAllocator from "../features/port-and-host-allocator";
import watermarkStamper from "./utils/watermark-stamper";

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
  if (process.env.NODE_ENV === "test") process.env.NODE_ENV = "production";
  envFiles = loadEnvironmentVariables();

  try {
    const { port, host } = options;

    const entryPoint = path.join(process.cwd(), ".build", "src", "app.js");

    if (!fs.existsSync(path.join(entryPoint))) {
      console.error(
        `❌ Could not find built application entry point at ${fullCleanCwd(entryPoint)}`
      );
      process.exit(1);
    }

    const env: { [x: string]: string } = {
      NODE_ENV: "production",
      ...process.env,
      ...(port && { CLI_PORT: port }),
      ...(host && { CLI_HOST: host }),
      ARKOS_BUILD: "true",
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

    const checkConfig = async () => {
      try {
        const { getArkosConfig } = await importModule("../../server");

        const config = getArkosConfig();

        if (config && config.available) {
          const hostAndPort =
            await portAndHostAllocator.getHostAndAvailablePort(env, {
              ...config,
              logWarning: true,
            });

          watermarkStamper.stamp({
            envFiles,
            port:
              "port" in config && config?.port !== undefined
                ? hostAndPort.port
                : undefined,
            host: hostAndPort.host,
          });
          return true;
        }
        return false;
      } catch (err: any) {
        if (!err?.message?.includes("../../server")) console.error(err);
        return false;
      }
    };

    const waitForConfig = async () => {
      let attempts = 0;
      const maxAttempts = 15;

      while (attempts < maxAttempts) {
        const ready = await checkConfig();
        if (ready) break;
        await new Promise((resolve) => setTimeout(resolve, 100));
        attempts++;
      }

      if (attempts >= maxAttempts) {
        if (env.CLI_PORT || env.PORT) portAndHostAllocator.logWarnings();

        watermarkStamper.stamp({
          envFiles,
          host: env.CLI_HOST || env.HOST,
          port: env.CLI_PORT || env.PORT,
        });
      }
    };

    waitForConfig();
  } catch (error) {
    console.error("❌ Production server failed to start:", error);
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
