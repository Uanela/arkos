import { spawn, ChildProcess } from "child_process";
import { watch } from "chokidar";
import { fullCleanCwd, getUserFileExtension } from "../helpers/fs.helpers";
import { getVersion } from "./utils/cli.helpers";
import { loadEnvironmentVariables } from "../dotenv.helpers";
import { importModule } from "../helpers/global.helpers";
import fs from "fs";
import path from "path";
import sheu from "../sheu";
import portAndHostAllocator from "../features/port-and-host-allocator";

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
    let restartingFiles = new Set<string>();
    // Detect if project uses TypeScript or JavaScript
    const fileExt = getUserFileExtension();

    // Find the application entry point
    const entryPoint = path.resolve(process.cwd(), `src/app.${fileExt}`);

    if (!fs.existsSync(entryPoint)) {
      console.error(`Could not find application entry point at ${entryPoint}`);
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
        child = spawn("npx", ["tsx-strict", "--watch", entryPoint], {
          stdio: "inherit",
          env,
          shell: true,
        });
      } else {
        // Enhanced nodemon configuration
        child = spawn(
          "npx",
          [
            "node-dev",
            "--respawn",
            "--notify=false",
            "--ignore",
            "node_modules",
            "--ignore",
            "dist",
            "--ignore",
            "build",
            "--ignore",
            ".dist",
            "--ignore",
            ".build",
            "--watch",
            "src",
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
    const scheduleRestart = (reason: string, filePath?: string) => {
      if (filePath) restartingFiles.add(filePath);

      if (restartTimeout) clearTimeout(restartTimeout);
      const now = new Date();
      const time = now.toTimeString().split(" ")[0];

      isRestarting = true;
      if (child) {
        child.kill();
        child = null;
      }

      restartTimeout = setTimeout(() => {
        sheu.info(`\x1b[90m${time}\x1b[0m Restarting: ${reason.toLowerCase()}`);
        startServer();
        restartTimeout = null;
        restartingFiles.delete(filePath!);
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

      envWatcher.on("all", (_, filePath) => {
        try {
          envFiles = loadEnvironmentVariables();
          // Restart server to pick up new env vars
          scheduleRestart("Environments files changed", filePath);
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
          "jsconfig.json",
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
          awaitWriteFinish: {
            stabilityThreshold: 3000,
          },
        }
      );

      additionalWatcher.on("add", (filePath) => {
        if (!restartingFiles.has(filePath))
          scheduleRestart(
            `${fullCleanCwd(filePath)} has been created`,
            filePath
          );
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
          const env = getEnv();
          const hostAndPort =
            await portAndHostAllocator.getHostAndAvailablePort(env, {
              ...config,
              logWarning: true,
              caller: "dev",
            });
          // Config is ready, display the info with actual values
          console.info(`\n  \x1b[1m\x1b[36m  Arkos.js ${getVersion()}\x1b[0m`);
          if (config?.port !== undefined)
            console.info(
              `  - Local:        http://${hostAndPort.host}:${hostAndPort.port}`
            );
          console.info(
            `  - Environments: ${fullCleanCwd(envFiles?.join(", ") || "")
              .replaceAll(`${process.cwd()}/`, "")
              .replaceAll("/", "")}\n`
          );
          return true;
        }
        return false;
      } catch (err: any) {
        const message = err?.message;
        if (
          !message.includes("../../server") &&
          !message.includes("cjs/server")
        )
          console.info(err);
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
        await new Promise((resolve) => setTimeout(resolve, 100));
        attempts++;
      }

      // Fall back to defaults if config never became available
      if (attempts >= maxAttempts) {
        const env = getEnv();
        const hostAndPort = await portAndHostAllocator.getHostAndAvailablePort(
          env,
          { logWarning: true }
        );

        console.info(`\n  \x1b[1m\x1b[36m  Arkos.js ${getVersion()}\x1b[0m`);
        console.info(
          `  - Local:        http://${hostAndPort?.host}:${hostAndPort?.port}`
        );
        console.info(
          `  - Environments: ${fullCleanCwd(envFiles?.join(", ") || "")
            .replaceAll(`${process.cwd()}/`, "")
            .replaceAll("/", "")}\n`
        );
      }
    };

    waitForConfig();

    // Enhanced cleanup function
    const cleanup = () => {
      if (restartTimeout) clearTimeout(restartTimeout);

      if (envWatcher) envWatcher.close();

      if (additionalWatcher) additionalWatcher.close();

      if (child) {
        child.kill("SIGTERM");

        // Force kill after 5 seconds if still running
        setTimeout(() => {
          if (child && !child.killed) child.kill("SIGKILL");
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
