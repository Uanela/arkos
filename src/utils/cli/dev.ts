// src/utils/cli/dev.ts
import { spawn } from "child_process";
import { getUserFileExtension } from "../helpers/fs.helpers";
import { getVersion } from ".";
import { getArkosConfig } from "../../server";

interface DevOptions {
  port?: string;
  host?: string;
}

/**
 * Dev server command for the arkos CLI
 */
export async function devCommand(options: DevOptions = {}) {
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
    const env = {
      NODE_ENV: "development",
      ...process.env,
      ...(port && { PORT: port }),
      ...(host && { HOST: host }),
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

    // console.log(getArkosConfig());

    console.info(`  \x1b[1m\x1b[36m  Arkos.js ${getVersion()}\x1b[0m`);
    console.info(`  - Local:        http://${host}:${port}`);
    console.info(`  - Environments: development\n`);

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
