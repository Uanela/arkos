import { ChildProcess, spawn } from "child_process";
import { loadEnvironmentVariables } from "../dotenv.helpers";
import { getUserFileExtension } from "../helpers/fs.helpers";
import path from "path";
import fs from "fs";
import watermarkStamper from "./utils/watermark-stamper";

export default async function exportAuthActionCommand(options: {
  overwrite?: boolean;
  path?: string;
}) {
  process.env.CLI_COMMAND = "EXPORT_AUTH_ACTION";
  process.env.CLI_COMMAND_OPTIONS = JSON.stringify(options);

  if (process.env.NODE_ENV === "test" || !process.env.NODE_ENV)
    process.env.NODE_ENV = "development";

  const envFiles = loadEnvironmentVariables() || [];
  let child: ChildProcess | null = null;

  try {
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
        CLI: "false",
      }) as { [x: string]: string };

    const startServer = () => {
      if (child) {
        child.kill();
        child = null;
      }

      const env = getEnv();

      child = spawn("npx", ["tsx-strict", "--no-type-check", entryPoint], {
        stdio: "inherit",
        env,
        shell: true,
      });

      if (child)
        child.on("error", (error) => {
          console.error("Failed to start server:", error);
        });
    };

    startServer();

    watermarkStamper.stamp({
      envFiles,
    });

    const cleanup = () => {
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
