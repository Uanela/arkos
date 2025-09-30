import path from "path";
import fs from "fs";
import { execSync } from "child_process";
import { fullCleanCwd, getUserFileExtension } from "../helpers/fs.helpers";
import { loadEnvironmentVariables } from "../dotenv.helpers";
import { getVersion } from "./utils/cli.helpers";
import { detectPackageManagerFromUserAgent } from "../helpers/global.helpers";
import sheu from "../sheu";

// Constants
const BUILD_DIR = ".build";
const MODULE_TYPES = ["cjs", "esm"] as const;
type ModuleType = (typeof MODULE_TYPES)[number];

interface BuildOptions {
  config?: string;
  module?: string;
}

/**
 * Main build function for the arkos CLI
 */
export function buildCommand(options: BuildOptions = {}) {
  const fileExt = getUserFileExtension();
  process.env.NODE_ENV = "production";
  process.env.NODE_ENV = "true";

  const envFiles = loadEnvironmentVariables();
  const moduleType = validateModuleType(options.module);

  try {
    console.info(`  \x1b[1m\x1b[36m  Arkos.js ${getVersion()}\x1b[0m`);
    console.info(
      `  - Environments: ${fullCleanCwd(envFiles?.join(", ") || "")
        .replaceAll(`${process.cwd()}/`, "")
        .replaceAll("/", "")}`
    );

    console.info(`\n  Creating an optimized production build...`);

    ensureBuildDir();

    // Detect project type

    if (fileExt === "ts") {
      buildTypeScriptProject(options, moduleType);
    } else {
      buildJavaScriptProject(options, moduleType);
    }

    const packageManger = detectPackageManagerFromUserAgent();

    console.info(`\n\x1b[1m\x1b[32m  Build complete!\x1b[0m\n`);
    console.info(`  \x1b[1mNext step:\x1b[0m`);
    console.info(
      `  Run it using \x1b[1m\x1b[36m${packageManger} run start\x1b[0m\n`
    );
  } catch (err: any) {
    console.info("");
    sheu.error(`Build failed: ${err?.message}`);
    console.error(err);
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
function buildTypeScriptProject(options: BuildOptions, moduleType: ModuleType) {
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

  // Create a custom tsconfig that outputs to our build directory with the correct module type
  const tempTsconfig = {
    ...tsconfig,
    compilerOptions: {
      ...(tsconfig.compilerOptions || {}),
      rootDir: ".",
      outDir: path.join(`./${BUILD_DIR}`),
      // module: moduleType === "esm" ? "ESNext" : "CommonJS",
    },
  };

  const tempTsconfigPath = path.join(
    process.cwd(),
    `tsconfig.arkos-build.json`
  );
  fs.writeFileSync(tempTsconfigPath, JSON.stringify(tempTsconfig, null, 2));

  try {
    execSync(`npx trash ${BUILD_DIR} && npx tsc -p ${tempTsconfigPath}`, {
      stdio: "inherit",
      cwd: process.cwd(),
    });

    copyAllNonSourceFiles(moduleType, [".ts", ".tsx"]);

    // Clean up temp config
    cleanupTempConfig(tempTsconfigPath);
  } catch (error) {
    cleanupTempConfig(tempTsconfigPath);
    throw error;
  }
}

/**
 * Build a JavaScript project
 */
function buildJavaScriptProject(_: BuildOptions, moduleType: ModuleType) {
  const targetDir = path.join(BUILD_DIR);

  try {
    if (moduleType === "esm") {
      execSync(
        `npx copyfiles -u 0 "src/**/*.js" "src/**/*.jsx" "src/**/*.mjs" ${targetDir}`,
        {
          stdio: "inherit",
          cwd: process.cwd(),
        }
      );

      console.info("Note: .cjs files are skipped in ESM build");
    } else {
      execSync(
        `npx copyfiles -u 0 "src/**/*.js" "src/**/*.jsx" "src/**/*.cjs" "src/**/*.mjs" ${targetDir}`,
        {
          stdio: "inherit",
          cwd: process.cwd(),
        }
      );
    }

    copyAllNonSourceFiles(moduleType, [
      ".js",
      ".jsx",
      ".mjs",
      ".cjs",
      ".ts",
      ".tsx",
    ]);

    // Create appropriate package.json in the build directory
    createModulePackageJson(moduleType);
  } catch (error) {
    console.error("❌ Error building JavaScript project:", error);
    throw error;
  }
}

/**
 * Copy all non-source code files to the build directory
 * This function will copy everything except the specified source file extensions
 */
function copyAllNonSourceFiles(_: ModuleType, skipExtensions: string[]) {
  const targetDir = path.join(BUILD_DIR);
  const sourceDir = "src";

  try {
    // Recursive function to copy files
    function copyDirRecursive(dir: string) {
      if (!fs.existsSync(dir)) return;

      const items = fs.readdirSync(dir);

      for (const item of items) {
        const sourcePath = path.join(dir, item);
        const targetPath = path.join(
          targetDir,
          dir.replace(sourceDir, ""),
          item
        );

        // Get file stats
        const stats = fs.statSync(sourcePath);

        if (stats.isDirectory()) {
          // Ensure target directory exists
          if (!fs.existsSync(targetPath)) {
            fs.mkdirSync(targetPath, { recursive: true });
          }
          // Recurse into subdirectory
          copyDirRecursive(sourcePath);
        } else if (stats.isFile()) {
          // Check if this is a file we should skip
          const ext = path.extname(item).toLowerCase();
          if (!skipExtensions.includes(ext)) {
            // Ensure the target directory exists
            const targetDir = path.dirname(targetPath);
            if (!fs.existsSync(targetDir)) {
              fs.mkdirSync(targetDir, { recursive: true });
            }
            // Copy the file
            fs.copyFileSync(sourcePath, targetPath);
          }
        }
      }
    }

    // Start copying from src directory
    copyDirRecursive(sourceDir);

    // Copy project root files if needed
    const rootFilesToCopy = ["README.md", "LICENSE"];

    for (const file of rootFilesToCopy) {
      if (fs.existsSync(path.join(process.cwd(), file))) {
        fs.copyFileSync(
          path.join(process.cwd(), file),
          path.join(targetDir, file)
        );
      }
    }

    // console.info(`Copied all non-source files to ${targetDir}`);
  } catch (error) {
    console.warn("Warning: Error copying project files:", error);
    console.error(error);
  }
}

/**
 * Create appropriate package.json in the build directory
 */
function createModulePackageJson(moduleType: ModuleType) {
  const packageJsonPath = path.join(process.cwd(), "package.json");

  if (!fs.existsSync(packageJsonPath)) {
    return;
  }

  try {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
    const buildPackageJson: any = {
      name: packageJson.name,
      version: packageJson.version,
      description: packageJson.description,
      main: "index.js",
      dependencies: packageJson.dependencies,
    };

    // Set appropriate type field for ESM
    if (moduleType === "esm") {
      buildPackageJson.type = "module";
    }

    const targetDir = path.join(BUILD_DIR, moduleType);
    fs.writeFileSync(
      path.join(targetDir, "package.json"),
      JSON.stringify(buildPackageJson, null, 2)
    );
  } catch (error) {
    console.warn(
      "Warning: Failed to create module-specific package.json",
      error
    );
  }
}

/**
 * Clean up temporary tsconfig
 */
function cleanupTempConfig(configPath: string) {
  try {
    if (fs.existsSync(configPath)) fs.unlinkSync(configPath);
  } catch (error) {
    console.warn("Warning: Error cleaning up temporary config:", error);
  }
}
