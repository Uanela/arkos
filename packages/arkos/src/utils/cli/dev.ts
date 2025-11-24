import { spawn, ChildProcess } from "child_process";
import chokidar from "chokidar";
import { fullCleanCwd, getUserFileExtension } from "../helpers/fs.helpers";
import { loadEnvironmentVariables } from "../dotenv.helpers";
import fs from "fs";
import path from "path";
import sheu from "../sheu";
import portAndHostAllocator from "../features/port-and-host-allocator";
import watermarkStamper from "./utils/watermark-stamper";

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
  if (process.env.NODE_ENV === "test" || !process.env.NODE_ENV)
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
    };

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

    startServer();

    const envWatcher = setupEnvWatcher();

    const env = getEnv();
    const hostAndPort = await portAndHostAllocator.getHostAndAvailablePort(
      env,
      { logWarning: true }
    );

    watermarkStamper.stamp({
      ...hostAndPort,
      envFiles,
    });

    const cleanup = () => {
      if (restartTimeout) clearTimeout(restartTimeout);

      if (envWatcher) envWatcher.close();

      if (child) {
        child.kill("SIGTERM");

        setTimeout(() => {
          if (child && !child.killed) child.kill("SIGKILL");
        }, 5000);
      }

      process.exit(0);
    };

    process.on("SIGINT", cleanup);
    process.on("SIGTERM", cleanup);

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
