import { spawn, ChildProcess } from "child_process";
import { watch } from "chokidar";
import { fullCleanCwd, getUserFileExtension } from "../helpers/fs.helpers";
import { getVersion } from "./utils/cli.helpers";
import { loadEnvironmentVariables } from "../dotenv.helpers";
import { importModule } from "../helpers/global.helpers";
import fs from "fs";
import path from "path";
import sheu from "../sheu";

interface DevOptions {
  port?: string;
  host?: string;
}

let child: ChildProcess | null = null;
let envFiles: string[] | undefined;

/**
 * Dev server command for the arkos CLI
 */
export async function devCommand(options: DevOptions = {}) {
  process.env.NODE_ENV = "development";
  envFiles = loadEnvironmentVariables();
  child = null;
  let restartTimeout: NodeJS.Timeout | null = null;

  try {
    const { port, host } = options;
    let isRestarting = false;
    // Detect if project uses TypeScript or JavaScript
    const fileExt = getUserFileExtension();

    // Find the application entry point
    const entryPoint = path.resolve(process.cwd(), `src/app.${fileExt}`);

    if (!fs.existsSync(entryPoint)) {
      console.error("Could not find application entry point.");
      process.exit(1);
    }

    // Set environment variables
    const getEnv = () =>
      ({
        NODE_ENV: "development",
        ...process.env,
        ...(port && { CLI_PORT: port }),
        ...(host && { CLI_HOST: host }),
      }) as { [x: string]: string };

    // Function to start the child process
    const startServer = () => {
      if (child) {
        child.kill();
        child = null;
      }

      const env = getEnv();

      if (fileExt === "ts") {
        // Enhanced ts-node-dev configuration
        child = spawn(
          "npx",
          [
            "ts-node-dev",
            "--respawn",
            "--notify=false", // Disable desktop notifications
            "--ignore-watch",
            "node_modules",
            "--ignore-watch",
            "dist",
            "--ignore-watch",
            "build",
            "--ignore-watch",
            ".dist",
            "--ignore-watch",
            ".build",
            "--watch",
            "src", // Explicitly watch src directory
            entryPoint,
          ],
          {
            stdio: "inherit",
            env,
            shell: true,
          }
        );
      } else {
        // Enhanced nodemon configuration
        child = spawn(
          "npx",
          [
            "nodemon",
            "--watch",
            "src",
            "--ext",
            "js,json",
            "--ignore",
            "node_modules/",
            "--ignore",
            "dist/",
            "--ignore",
            "build/",
            "--ignore",
            ".dist/",
            "--ignore",
            ".build/",
            "--delay",
            "1000ms",
            entryPoint,
          ],
          {
            stdio: "inherit",
            env,
            shell: true,
          }
        );
      }

      if (child) {
        child.on("error", (error) => {
          console.error("Failed to start server:", error);
        });

        child.on("exit", (code, signal) => {
          if (!isRestarting && signal !== "SIGTERM" && signal !== "SIGINT") {
            console.info(`Server exited with code ${code}, restarting...`);
            startServer();
          }
        });
      }
    };

    // Function to handle server restart with debouncing
    const scheduleRestart = (reason: string) => {
      if (restartTimeout) clearTimeout(restartTimeout);
      const now = new Date();
      const time = now.toTimeString().split(" ")[0];

      sheu.info(`\x1b[90m${time}\x1b[0m Restarting: ${reason.toLowerCase()}`);

      isRestarting = true;
      if (child) {
        child.kill();
        child = null;
      }
      restartTimeout = setTimeout(() => {
        startServer();
        restartTimeout = null;
      }, 1000);
    };

    // Setup environment file watching
    const setupEnvWatcher = () => {
      const envWatcher = watch(
        fullCleanCwd(envFiles?.join(",") || "")
          .replaceAll("/", "")
          .split(",") || [],
        {
          ignoreInitial: true,
          persistent: true,
        }
      );

      envWatcher.on("all", (event, filePath) => {
        try {
          envFiles = loadEnvironmentVariables();

          // Restart server to pick up new env vars
          scheduleRestart("Environments files changed");
        } catch (error) {
          console.error(`Error reloading ${filePath}:`, error);
        }
      });

      return envWatcher;
    };

    // Setup additional file watching for better new file detection
    const setupAdditionalWatcher = () => {
      const additionalWatcher = watch(
        [
          "src",
          "package.json",
          "tsconfig.json",
          "arkos.config.ts",
          "arkos.config.js",
        ],
        {
          ignoreInitial: true,
          ignored: [
            /node_modules/,
            /\.git/,
            /\.dist/,
            /\.build/,
            /dist/,
            /build/,
            /\.env.*/,
          ],
        }
      );

      additionalWatcher.on("add", (filePath) => {
        scheduleRestart(`${fullCleanCwd(filePath)} has been created`);
      });

      additionalWatcher.on("unlink", (filePath) => {
        scheduleRestart(`${fullCleanCwd(filePath)} has been deleted`);
      });

      return additionalWatcher;
    };

    // Start the server
    startServer();

    // Setup watchers if enabled
    const envWatcher = setupEnvWatcher();
    const additionalWatcher = setupAdditionalWatcher();

    const checkConfig = async () => {
      try {
        // Import the config getter
        const { getArkosConfig } = await importModule("../../server");
        const config = getArkosConfig();
        if (config && config.available) {
          // Config is ready, display the info with actual values
          const env = getEnv();
          console.info("\n");
          console.info(`  \x1b[1m\x1b[36m  Arkos.js ${getVersion()}\x1b[0m`);
          console.info(
            `  - Local:        http://${
              env.CLI_HOST || config.host || env.HOST || "localhost"
            }:${env.CLI_PORT || config.port || env.PORT || "8000"}`
          );
          console.info(
            `  - Environments: ${fullCleanCwd(envFiles?.join(", ") || "")
              .replaceAll(`${process.cwd()}/`, "")
              .replaceAll("/", "")}`
          );
          console.info("\n");
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
        const env = getEnv();
        console.info("\n");
        console.info(`  \x1b[1m\x1b[36m  Arkos.js ${getVersion()}\x1b[0m`);
        console.info(
          `  - Local:        http://${
            env.CLI_HOST || env.HOST || "localhost"
          }:${env.CLI_PORT || env.PORT || "8000"}`
        );
        console.info(
          `  - Environments: ${fullCleanCwd(envFiles?.join(", ") || "")
            .replaceAll(`${process.cwd()}/`, "")
            .replaceAll("/", "")}`
        );
        console.info("\n");
      }
    };

    waitForConfig();

    // Enhanced cleanup function
    const cleanup = () => {
      // console.info("\nShutting down development server...");

      if (restartTimeout) clearTimeout(restartTimeout);

      if (envWatcher) envWatcher.close();

      if (additionalWatcher) additionalWatcher.close();

      if (child) {
        child.kill("SIGTERM");

        // Force kill after 5 seconds if still running
        setTimeout(() => {
          if (child && !child.killed) {
            child.kill("SIGKILL");
          }
        }, 5000);
      }

      process.exit(0);
    };

    // Handle process exit
    process.on("SIGINT", cleanup);
    process.on("SIGTERM", cleanup);

    // Handle uncaught exceptions
    process.on("uncaughtException", (error) => {
      console.error("Uncaught Exception:", error);
      cleanup();
    });
  } catch (error) {
    console.error("Development server failed to start:", error);

    if (child) {
      (child as ChildProcess)?.kill?.();
      child = null;
    }

    process.exit(1);
  }
}

/**
 * Help function to help other processes to terminate the development server child process
 */
export function killDevelopmentServerChildProcess() {
  (child as ChildProcess)?.kill?.();
  child = null;
}
