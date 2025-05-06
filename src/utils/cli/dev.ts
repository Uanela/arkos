// src/utils/cli/dev.ts
import { spawn } from "child_process";
import { getUserFileExtension } from "../helpers/fs.helpers";
import { getVersion } from ".";
import { loadEnvironmentVariables } from "../dotenv.helpers";
import { importModule } from "../helpers/global.helpers";

interface DevOptions {
  port?: string;
  host?: string;
}

/**
 * Dev server command for the arkos CLI
 */
export async function devCommand(options: DevOptions = {}) {
  process.env.NODE_ENV = "development";

  const envFiles = loadEnvironmentVariables();

  try {
    const { port, host } = options;

    // Detect if project uses TypeScript or JavaScript
    const fileExt = getUserFileExtension();

    // Find the application entry point
    const entryPoint = `src/app.${fileExt}`;

    if (!entryPoint) {
      console.error("❌ Could not find application entry point.");
      process.exit(1);
    }

    // Set environment variables
    const env: { [x: string]: string } = {
      NODE_ENV: "development",
      ...process.env,
      ...(port && { CLI_PORT: port }),
      ...(host && { CLI_HOST: host }),
    };

    // Start the application with the appropriate runner
    let child;

    // Setup file watching if enabled
    if (fileExt === "ts") {
      child = spawn("npx", ["ts-node-dev", "--respawn", entryPoint], {
        stdio: "inherit",
        env,
        shell: true,
      });
    } else {
      child = spawn("npx", ["nodemon", entryPoint], {
        stdio: "inherit",
        env,
        shell: true,
      });
    }

    const checkConfig = async () => {
      try {
        // Import the config getter

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
            `  - Environments: ${envFiles
              ?.join(", ")
              .replaceAll(`${process.cwd()}/`, "")}\n`
          );
          return true;
        }
        return false;
      } catch (error) {
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

        await new Promise((resolve) => setTimeout(resolve, 300));
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

    // console.info(`  \x1b[1m\x1b[36m  Arkos.js ${getVersion()}\x1b[0m`);
    // console.info(
    //   `  - Local:        http://${env.HOST || host}:${env.PORT || port}`
    // );
    // console.info(
    //   `  - Environments: ${envFiles
    //     ?.join(", ")
    //     .replaceAll(`${process.cwd()}/`, "")}\n`
    // );

    // Handle process exit
    process.on("SIGINT", () => {
      if (child) {
        child.kill();
      }
      process.exit(0);
    });
  } catch (error) {
    console.error("❌ Development server failed to start:", error);
    process.exit(1);
  }
}
