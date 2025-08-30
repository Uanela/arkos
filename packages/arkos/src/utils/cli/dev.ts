import { spawn, ChildProcess } from "child_process";
import chokidar from "chokidar";
import { fullCleanCwd, getUserFileExtension } from "../helpers/fs.helpers";
import { getVersion } from "./utils/cli.helpers";
import { loadEnvironmentVariables } from "../dotenv.helpers";
import { importModule } from "../helpers/global.helpers";
import fs from "fs";
import path from "path";
import sheu from "../sheu";
import portAndHostAllocator from "../features/port-and-host-allocator";
import smartFsWatcher from "./utils/smart-fs-watcher";
import { ArkosConfig } from "../../exports";

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

    const fileExt = getUserFileExtension();

    const entryPoint = path.resolve(process.cwd(), `src/app.${fileExt}`);

    if (!fs.existsSync(entryPoint)) {
      console.error(`Could not find application entry point at ${entryPoint}`);
      process.exit(1);
    }

    const getEnv = () =>
      ({
        NODE_ENV: "development",
        ...process.env,
        ...(port && { CLI_PORT: port }),
        ...(host && { CLI_HOST: host }),
      }) as { [x: string]: string };

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
        child = spawn(
          "npx",
          ["tsx-strict", "--no-type-check", "--watch", entryPoint],
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

      if (smartFsWatcher) smartFsWatcher.reset();
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
        isRestarting = false;
        restartTimeout = null;
        if (filePath) restartingFiles.delete(filePath);
      }, 1000);
    };

    // Setup environment file watching
    const setupEnvWatcher = () => {
      const envWatcher = chokidar.watch(
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
          scheduleRestart("Environment files changed", "env-files");
        } catch (error) {
          console.error(`Error reloading ${filePath}:`, error);
        }
      });

      return envWatcher;
    };

    // Setup smart watcher for new file detection
    const setupSmartWatcher = () => {
      smartFsWatcher.start((filePath) => {
        if (!restartingFiles.has(filePath)) {
          scheduleRestart(
            `${fullCleanCwd(filePath)} has been created`,
            filePath
          );
        }
      });
      return smartFsWatcher;
    };

    // Start the server
    startServer();

    // Setup watchers
    const envWatcher = setupEnvWatcher();
    setupSmartWatcher();

    const checkConfig = async () => {
      let config: ArkosConfig & { available: boolean } = {} as any;

      try {
        try {
          const server = await importModule("../../server");
          config = server?.getArkosConfig?.();
        } catch (err: any) {
          if (
            !err?.message?.includes("../../server") &&
            !err?.message?.includes("cjs/server") &&
            !err?.message?.includes("esm/server")
          )
            throw err;
        }

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
        } else {
          // Config is ready, display the info with actual values
          console.info(`\n  \x1b[1m\x1b[36m  Arkos.js ${getVersion()}\x1b[0m`);
          console.info(
            `  - Environments: ${fullCleanCwd(envFiles?.join(", ") || "")
              .replaceAll(`${process.cwd()}/`, "")
              .replaceAll("/", "")}\n`
          );
        }
        return false;
      } catch (err: any) {
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

      if (smartFsWatcher) smartFsWatcher.close();

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
  if (smartFsWatcher) smartFsWatcher.close();
}
