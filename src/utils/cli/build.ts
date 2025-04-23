// src/utils/cli/build.ts
import path from "path";
import fs from "fs";
import { execSync, spawn } from "child_process";
import { getUserFileExtension } from "../helpers/fs.helpers";

// Constants
const BUILD_DIR = ".build";
const MODULE_TYPES = ["cjs", "esm"] as const;
type ModuleType = (typeof MODULE_TYPES)[number];

interface BuildOptions {
  watch?: boolean;
  config?: string;
  module?: string;
}

/**
 * Main build function for the arkos CLI
 */
export function buildCommand(options: BuildOptions = {}) {
  try {
    console.info(`🚀 Building project...`);

    ensureBuildDir();

    // Detect project type
    const fileExt = getUserFileExtension();

    if (fileExt === "ts") {
      buildTypeScriptProject(options);
    } else {
      buildJavaScriptProject(options);
    }

    console.info(`✅ Build complete! \n`);
    console.info(`Next step:\n`);
    console.info(`Run the generated build with the start command.\n`);
  } catch (error) {
    console.error("❌ Build failed:", error);
    process.exit(1);
  }
}

/**
 * Validates and normalizes module type option
 */
function validateModuleType(moduleType?: string): ModuleType {
  if (!moduleType) return "cjs";

  const normalizedType = moduleType.toLowerCase();

  // Map common terms to our module types
  if (normalizedType === "cjs" || normalizedType === "commonjs") {
    return "cjs";
  } else if (
    ["esm", "es", "es2020", "esnext", "module"].includes(normalizedType)
  ) {
    return "esm";
  }

  // Default to CJS if unrecognized
  console.warn(
    `⚠️ Unrecognized module type "${moduleType}", defaulting to "cjs"`
  );
  return "cjs";
}

/**
 * Ensure the build directory exists
 */
function ensureBuildDir() {
  if (!fs.existsSync(BUILD_DIR)) {
    fs.mkdirSync(BUILD_DIR, { recursive: true });
  }

  // Create module-specific subdirectories
  for (const moduleType of MODULE_TYPES) {
    const moduleDir = path.join(BUILD_DIR, moduleType);
    if (!fs.existsSync(moduleDir)) {
      fs.mkdirSync(moduleDir, { recursive: true });
    }
  }
}

/**
 * Build a TypeScript project
 */
function buildTypeScriptProject(options: BuildOptions) {
  // Read the user's tsconfig.json
  const tsconfigPath = path.join(
    process.cwd(),
    options.config || "tsconfig.json"
  );
  let tsconfig: any = {};

  try {
    if (fs.existsSync(tsconfigPath)) {
      const tsconfigContent = fs.readFileSync(tsconfigPath, "utf8");
      tsconfig = JSON.parse(tsconfigContent);
    }
  } catch (error) {
    console.error("❌ Error reading tsconfig.json:", error);
    // Continue with default config
  }

  // Create a custom tsconfig that outputs to our .build directory
  const tempTsconfig = {
    ...tsconfig,
    compilerOptions: {
      ...(tsconfig.compilerOptions || {}),
      outDir: path.join(`./${BUILD_DIR}`),
    },
  };

  const tempTsconfigPath = path.join(
    process.cwd(),
    `tsconfig.arkos-build.json`
  );
  fs.writeFileSync(tempTsconfigPath, JSON.stringify(tempTsconfig, null, 2));

  try {
    // Run TypeScript compiler

    if (options.watch) {
      // For watch mode, spawn a process
      const tsc = spawn("npx", ["tsc", "-p", tempTsconfigPath, "--watch"], {
        stdio: "inherit",
        shell: true,
      });

      // Handle process exit
      process.on("SIGINT", () => {
        tsc.kill();
        cleanupTempConfig(tempTsconfigPath);
        process.exit(0);
      });
    } else {
      // For one-time build, use execSync
      execSync(`npx tsc -p ${tempTsconfigPath}`, {
        stdio: "inherit",
        cwd: process.cwd(),
      });

      // Copy non-TypeScript files
      // copyAssetFiles(moduleType);

      // Clean up temp config
      cleanupTempConfig(tempTsconfigPath);
    }
  } catch (error) {
    cleanupTempConfig(tempTsconfigPath);
    throw error;
  }
}

/**
 * Build a JavaScript project
 */
function buildJavaScriptProject(options: BuildOptions) {
  // Target directory
  const targetDir = path.join(BUILD_DIR);

  try {
    // For JS projects, we need to handle module transformations if needed
    if (true) {
      // For ESM output, we might want to transform CJS to ESM if needed
      // This is a simplified approach - for production, consider using tools like Babel
      execSync(
        `npx copyfiles -u 0 "src/**/*.js" "src/**/*.jsx" "src/**/*.mjs" "src/**/*.cjs" ${targetDir}`,
        {
          stdio: "inherit",
          cwd: process.cwd(),
        }
      );
    } else {
      // For CJS output, direct copy is usually fine
      execSync(
        `npx copyfiles -u 0 "src/**/*.js" "src/**/*.jsx" "src/**/*.cjs" "src/**/*.mjs" ${targetDir}`,
        {
          stdio: "inherit",
          cwd: process.cwd(),
        }
      );
    }

    // Copy asset files
    copyAssetFiles();

    // Handle watch mode
    if (options.watch) {
      const patterns = `"src/**/*.js" "src/**/*.jsx" "src/**/*.mjs" "src/**/*.cjs"`;

      const watcher = spawn(
        "npx",
        ["chokidar", patterns, "-c", `npx copyfiles -u 0 {path} ${targetDir}`],
        {
          stdio: "inherit",
          shell: true,
        }
      );

      // Handle process exit
      process.on("SIGINT", () => {
        watcher.kill();
        process.exit(0);
      });
    }
  } catch (error) {
    console.error("❌ Error building JavaScript project:", error);
    throw error;
  }
}

/**
 * Copy asset files to the build directory
 */
function copyAssetFiles() {
  const targetDir = path.join(BUILD_DIR);

  try {
    execSync(
      `npx copyfiles -u 0 "src/**/*.json" "src/**/*.html" "src/**/*.css" "src/**/*.svg" "src/**/*.png" ${targetDir}`,
      {
        stdio: "inherit",
        cwd: process.cwd(),
      }
    );
  } catch (error) {
    console.warn("Warning: Error copying asset files:", error);
  }
}

/**
 * Clean up temporary tsconfig
 */
function cleanupTempConfig(configPath: string) {
  try {
    if (fs.existsSync(configPath)) {
      fs.unlinkSync(configPath);
    }
  } catch (error) {
    console.warn("Warning: Error cleaning up temporary config:", error);
  }
}
