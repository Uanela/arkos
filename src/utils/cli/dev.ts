// // src/utils/cli/dev.ts
// import { spawn } from "child_process";
// import { getUserFileExtension } from "../helpers/fs.helpers";
// import { getVersion } from ".";
// import { loadEnvironmentVariables } from "../dotenv.helpers";
// import { importModule } from "../helpers/global.helpers";

// interface DevOptions {
//   port?: string;
//   host?: string;
// }

// /**
//  * Dev server command for the arkos CLI
//  */
// export async function devCommand(options: DevOptions = {}) {
//   process.env.NODE_ENV = "development";

//   const envFiles = loadEnvironmentVariables();

//   try {
//     const { port, host } = options;

//     // Detect if project uses TypeScript or JavaScript
//     const fileExt = getUserFileExtension();

//     // Find the application entry point
//     const entryPoint = `src/app.${fileExt}`;

//     if (!entryPoint) {
//       console.error("❌ Could not find application entry point.");
//       process.exit(1);
//     }

//     // Set environment variables
//     const env: { [x: string]: string } = {
//       NODE_ENV: "development",
//       ...process.env,
//       ...(port && { CLI_PORT: port }),
//       ...(host && { CLI_HOST: host }),
//     };

//     // Start the application with the appropriate runner
//     let child;

//     // Setup file watching if enabled
//     if (fileExt === "ts") {
//       child = spawn("npx", ["ts-node-dev", "--respawn", entryPoint], {
//         stdio: "inherit",
//         env,
//         shell: true,
//       });
//     } else {
//       child = spawn("npx", ["nodemon", entryPoint], {
//         stdio: "inherit",
//         env,
//         shell: true,
//       });
//     }

//     const checkConfig = async () => {
//       try {
//         // Import the config getter

//         const { getArkosConfig } = await importModule("../../server");

//         const config = getArkosConfig();

//         if (config && config.available) {
//           // Config is ready, display the info with actual values
//           console.info("\n");
//           console.info(`  \x1b[1m\x1b[36m  Arkos.js ${getVersion()}\x1b[0m`);
//           console.info(
//             `  - Local:        http://${
//               env.CLI_HOST || config.host || env.HOST || "localhost"
//             }:${env.CLI_PORT || config.port || env.PORT || "8000"}`
//           );
//           console.info(
//             `  - Environments: ${envFiles
//               ?.join(", ")
//               .replaceAll(`${process.cwd()}/`, "")}\n`
//           );
//           return true;
//         }
//         return false;
//       } catch (error) {
//         return false;
//       }
//     };

//     // Try to get config periodically
//     const waitForConfig = async () => {
//       let attempts = 0;
//       const maxAttempts = 15;

//       while (attempts < maxAttempts) {
//         const ready = await checkConfig();
//         if (ready) break;

//         await new Promise((resolve) => setTimeout(resolve, 300));
//         attempts++;
//       }

//       // Fall back to defaults if config never became available
//       if (attempts >= maxAttempts) {
//         console.info("\n");
//         console.info(`  \x1b[1m\x1b[36m  Arkos.js ${getVersion()}\x1b[0m`);
//         console.info(
//           `  - Local:        http://${
//             env.CLI_HOST || env.HOST || "localhost"
//           }:${env.CLI_PORT || env.PORT || "8000"}`
//         );
//         console.info(
//           `  - Environments: ${envFiles
//             ?.join(", ")
//             .replaceAll(`${process.cwd()}/`, "")}\n`
//         );
//       }
//     };

//     waitForConfig();

//     // Handle process exit
//     process.on("SIGINT", () => {
//       if (child) {
//         child.kill();
//       }
//       process.exit(0);
//     });
//   } catch (error) {
//     console.error("❌ Development server failed to start:", error);
//     process.exit(1);
//   }
// }

// src/utils/cli/dev.ts
import { spawn, ChildProcess } from "child_process";
import { watch } from "chokidar";
import { getUserFileExtension } from "../helpers/fs.helpers";
import { getVersion } from ".";
import { loadEnvironmentVariables } from "../dotenv.helpers";
import { importModule } from "../helpers/global.helpers";
import fs from "fs";
import path from "path";

interface DevOptions {
  port?: string;
  host?: string;
  watch?: boolean; // Add option to disable custom watching
}

/**
 * Dev server command for the arkos CLI
 */
export async function devCommand(options: DevOptions = {}) {
  process.env.NODE_ENV = "development";
  let envFiles = loadEnvironmentVariables();
  let child: ChildProcess | null = null;
  let restartTimeout: NodeJS.Timeout | null = null;

  try {
    const { port, host, watch: enableWatch = true } = options;

    // Detect if project uses TypeScript or JavaScript
    const fileExt = getUserFileExtension();

    // Find the application entry point
    const entryPoint = `src/app.${fileExt}`;

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
            // "--clear", // Clear console on restart
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
          if (signal !== "SIGTERM" && signal !== "SIGINT") {
            console.info(`Server exited with code ${code}, restarting...`);
            setTimeout(startServer, 1000);
          }
        });
      }
    };

    // Function to handle server restart with debouncing
    const scheduleRestart = (reason: string) => {
      if (restartTimeout) clearTimeout(restartTimeout);

      console.info(`\n${reason}, restarting server...`);

      restartTimeout = setTimeout(() => {
        startServer();
        restartTimeout = null;
      }, 1000);
    };

    // Setup environment file watching
    const setupEnvWatcher = () => {
      const envWatcher = watch(".env*", {
        ignoreInitial: true,
        persistent: true,
      });

      envWatcher.on("all", (event, filePath) => {
        // console.info(`Environment file ${event}: ${filePath}`);

        // Reload environment variables
        try {
          envFiles = loadEnvironmentVariables();
          console.info(`Reloaded environment variables from ${filePath}`);

          // Restart server to pick up new env vars
          scheduleRestart("Environment file changed");
        } catch (error) {
          console.error(`Error reloading ${filePath}:`, error);
        }
      });

      // console.info("Watching .env* files for changes...");
      return envWatcher;
    };

    // Setup additional file watching for better new file detection
    const setupAdditionalWatcher = () => {
      const additionalWatcher = watch(
        ["src/**/*", "package.json", "tsconfig.json", "arkos.config.*"],
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
        console.info(`New file detected: ${filePath}`);
        scheduleRestart("New file added");
      });

      additionalWatcher.on("unlink", (filePath) => {
        console.info(`File deleted: ${filePath}`);
        scheduleRestart("File deleted");
      });

      additionalWatcher.on("addDir", (dirPath) => {
        console.info(`New directory detected: ${dirPath}`);
        // Don't restart for new directories, but.info them
      });

      console.info("Enhanced file watching enabled...");
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
            `  - Environments: ${envFiles
              ?.join(", ")
              .replaceAll(`${process.cwd()}/`, "")}`
          );
          console.info(
            `  - File watching: ${enableWatch ? "enabled" : "disabled"}\n`
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
        const env = getEnv();
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
            .replaceAll(`${process.cwd()}/`, "")}`
        );
      }
    };

    waitForConfig();

    // Enhanced cleanup function
    const cleanup = () => {
      console.info("\nShutting down development server...");

      if (restartTimeout) {
        clearTimeout(restartTimeout);
      }

      if (envWatcher) {
        envWatcher.close();
      }

      if (additionalWatcher) {
        additionalWatcher.close();
      }

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
    process.exit(1);
  }
}

// Optional: Create configuration files for better watching

/**
 * Create nodemon.json configuration for JavaScript projects
 */
export function createNodemonConfig() {
  const nodemonConfig = {
    watch: ["src", ".env*"],
    ext: "js,json,env",
    ignore: [
      "node_modules/",
      "dist/",
      "build/",
      ".dist/",
      ".build/",
      "coverage/",
      "*.info",
    ],
    delay: "1000",
    env: {
      NODE_ENV: "development",
    },
    verbose: false,
    restartable: "rs",
  };

  fs.writeFileSync("nodemon.json", JSON.stringify(nodemonConfig, null, 2));
  console.info("Created nodemon.json configuration");
}

/**
 * Create ts-node-dev configuration
 */
export function createTsNodeDevConfig() {
  // ts-node-dev uses package.json configuration
  const packageJsonPath = path.join(process.cwd(), "package.json");

  if (fs.existsSync(packageJsonPath)) {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));

    packageJson["ts-node-dev"] = {
      ignore: [
        "node_modules/",
        "dist/",
        "build/",
        ".dist/",
        ".build/",
        "coverage/",
        "*.info",
      ],
      watch: ["src", ".env*"],
      clear: true,
      notify: false,
      respawn: true,
    };

    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
    console.info("Updated package.json with ts-node-dev configuration");
  }
}
