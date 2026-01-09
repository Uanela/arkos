import { spawn, ChildProcess, execSync } from "child_process";
import { getUserFileExtension } from "../helpers/fs.helpers";
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
  if (!process.env.NODE_ENV) process.env.NODE_ENV = "development";
  envFiles = loadEnvironmentVariables();
  child = null;
  let restartTimeout: NodeJS.Timeout | null = null;

  try {
    const { port, host } = options;

    const fileExt = getUserFileExtension();
    const entryPoint = path.resolve(process.cwd(), `src/app.${fileExt}`);

    if (!fs.existsSync(entryPoint)) {
      console.error(`Could not find application entry point at ${entryPoint}`);
      return process.exit(1);
    }

    const baseServiceTypesPath = path.resolve(
      process.cwd(),
      `node_modules/@arkosjs/types/base.service.d.ts`
    );
    if (fileExt === "ts" && !fs.existsSync(baseServiceTypesPath)) {
      const answer = await new Promise<boolean>((resolve) => {
        sheu.warn(
          'Missing base services types please run "npx arkos prisma generate" to generate and sync the types from @prisma/client'
        );
        process.stdout.write(
          `\n${sheu.green("?", { bold: true })} Would you like to run "npx arkos prisma generate"? (Y/n): `
        );
        process.stdin.once("data", (data) => {
          const result = data.toString().trim().toLowerCase();
          process.stdin.pause();
          resolve(result === "y" || result.length === 0);
        });
      });

      if (answer) {
        console.info("\nSyncing base service with @prisma/client...");
        console.log("");
        execSync(`npx arkos prisma generate`);
      } else
        throw Error(
          'Missing BaseService types please run "npx arkos prisma generate" to generate and sync the types from @prisma/client, see more at https://www.arkosjs.com/docs/cli/built-in-cli#typescript-types-generation.'
        );
    }

    const getEnv = () =>
      ({
        NODE_ENV: "development",
        ...process.env,
        ...(port && { CLI_PORT: port }),
        ...(host && { CLI_HOST: host }),
        CLI: "false",
      }) as { [x: string]: string };

    const env = getEnv();
    const hostAndPort = await portAndHostAllocator.getHostAndAvailablePort(
      env,
      { logWarning: true }
    );

    watermarkStamper.stamp({
      ...hostAndPort,
      envFiles,
    });

    process.env.__PORT = hostAndPort.port || "";
    process.env.__HOST = hostAndPort.host || "";

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
      }
    };

    startServer();

    const cleanup = () => {
      if (restartTimeout) clearTimeout(restartTimeout);

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
    sheu.error("Development server failed to start:");
    console.error(error);

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
