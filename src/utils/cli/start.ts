// src/utils/cli/start.ts
import path from "path";
import fs from "fs";
import { spawn } from "child_process";
import { getArkosConfig } from "../../server";
import { getVersion } from ".";

interface StartOptions {
  port?: string;
  host?: string;
}

/**
 * Production start command for the arkos CLI
 */
export async function startCommand(options: StartOptions = {}) {
  // const configs = getArkosConfig();
  //   console.log(configs);
  try {
    const { port, host } = options;

    // Check for built app file
    const entryPoint = path.join(".build", "src", "app.js");

    if (!fs.existsSync(path.join(process.cwd(), entryPoint))) {
      console.error(
        `❌ Could not find built application entry point at ${entryPoint}`
      );
      process.exit(1);
    }

    // Set environment variables
    const env = {
      ...process.env,
      ...(port && { PORT: port }),
      ...(host && { HOST: host }),
      NODE_ENV: "production",
      ARKOS_BUILD: "true",
    };

    // Start the application
    const child = spawn("node", [entryPoint], {
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

    // console.log(getArkosConfig());

    console.info(`  \x1b[1m\x1b[36m  Arkos.js ${getVersion()}\x1b[0m`);
    console.info(`  - Local:        http://${host}:${port}`);
    console.info(`  - Environments: production\n`);
  } catch (error) {
    console.error("❌ Production server failed to start:", error);
    process.exit(1);
  }
}
