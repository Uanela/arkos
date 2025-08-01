// src/utils/cli/start.ts
import path from "path";
import fs from "fs";
import { ChildProcess, spawn } from "child_process";
import { getVersion } from "./utils/cli.helpers";
import { loadEnvironmentVariables } from "../dotenv.helpers";
import { importModule } from "../helpers/global.helpers";
import { fullCleanCwd } from "../helpers/fs.helpers";

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
  process.env.NODE_ENV = "production";
  envFiles = loadEnvironmentVariables();

  try {
    const { port, host } = options;

    // Check for built app file
    const entryPoint = path.join(process.cwd(), ".build", "src", "app.js");

    if (!fs.existsSync(path.join(entryPoint))) {
      console.error(
        `❌ Could not find built application entry point at ${fullCleanCwd(entryPoint)}`
      );
      process.exit(1);
    }

    // Set environment variables
    const env: { [x: string]: string } = {
      ...process.env,
      NODE_ENV: "production",
      ...(port && { CLI_PORT: port }),
      ...(host && { CLI_HOST: host }),
      ARKOS_BUILD: "true",
    };

    // Start the application
    child = spawn("node", [entryPoint], {
      stdio: "inherit",
      env,
      shell: true,
    });

    // Handle process exit
    process.on("SIGINT", () => {
      if (child) {
        child.kill();
      }
      process.exit(0);
    });

    const checkConfig = async () => {
      try {
        const { getArkosConfig } = await importModule("../../server");

        const config = getArkosConfig();

        if (config && config.available) {
          // Config is ready, display the info with actual values
          console.info("\n");
          console.info(`  \x1b[1m\x1b[36m  Arkos.js ${getVersion()}\x1b[0m`);
          console.info(
            `  - Local:        http://${
              env.CLI_HOST || config.host || env.HOST || "localhost"
            }:${env.CLI_PORT || config.port || env.PORT || "8000"}`
          );
          console.info(
            `  - Environments: ${fullCleanCwd(envFiles?.join(", ") || "").replaceAll("/", "")}\n`
          );
          return true;
        }
        return false;
      } catch (error) {
        console.info(error);
        return false;
      }
    };

    // Try to get config periodically
    const waitForConfig = async () => {
      let attempts = 0;
      const maxAttempts = 15;

      while (attempts < maxAttempts) {
        const ready = await checkConfig();
        if (ready) break;
        await new Promise((resolve) => setTimeout(resolve, 50));
        attempts++;
      }

      // Fall back to defaults if config never became available
      if (attempts >= maxAttempts) {
        console.info("\n");
        console.info(`  \x1b[1m\x1b[36m  Arkos.js ${getVersion()}\x1b[0m`);
        console.info(
          `  - Local:        http://${
            env.CLI_HOST || env.HOST || "localhost"
          }:${env.CLI_PORT || env.PORT || "8000"}`
        );
        console.info(
          `  - Environments: ${envFiles
            ?.join(", ")
            .replaceAll(`${process.cwd()}/`, "")}\n`
        );
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
