import { promisify } from "util";
import fs from "fs";
import path from "path";

export const statAsync = promisify(fs.stat);
export const accessAsync = promisify(fs.access);
export const mkdirAsync = promisify(fs.mkdir);

export let userFileExtension: "ts" | "js" | undefined;

/**
 * Detects the file extension that should be used in the current execution context
 * Returns 'js' when running from compiled code and 'ts' in development
 * @returns 'ts' | 'js'
 */
export const getUserFileExtension = (): "ts" | "js" => {
  if (userFileExtension) return userFileExtension;

  try {
    // Check if we're currently in a build/compiled directory
    const currentDir = process.cwd();
    const dirName = path.basename(currentDir);

    // If we're in a build directory, we should use .js because we're in compiled code
    if ([".build", "build", "dist", "lib", "out"].includes(dirName)) {
      userFileExtension = "js";
      return userFileExtension;
    }

    // Check if current execution path contains indicators of compiled code
    const executionPath = process.argv[1] || "";
    if (
      executionPath.includes("/.build/") ||
      executionPath.includes("/build/") ||
      executionPath.includes("/dist/")
    ) {
      userFileExtension = "js";
      return userFileExtension;
    }

    // Check the caller file - if it ends with .js, we're likely in compiled code
    let callerIsJS = false;
    try {
      // This is a hacky way to get the caller file, but can help in many cases
      const stack = new Error().stack;
      if (stack) {
        const callerLine = stack.split("\n")[2] || "";
        callerIsJS = callerLine.includes(".js:");
      }
    } catch (e) {
      // Ignore error if we can't get stack trace
    }

    if (callerIsJS) {
      userFileExtension = "js";
      return userFileExtension;
    }

    // Check which file extensions are available in the current directory
    try {
      const files = fs.readdirSync(currentDir);
      const hasJSFiles = files.some(
        (file) => file.endsWith(".js") && !file.endsWith(".config.js")
      );
      const hasTSFiles = files.some(
        (file) => file.endsWith(".ts") && !file.endsWith(".config.ts")
      );

      // If we only have JS files and no TS files, use JS
      if (hasJSFiles && !hasTSFiles) {
        userFileExtension = "js";
        return userFileExtension;
      }

      // If we have TS files, prefer TS
      if (hasTSFiles) {
        userFileExtension = "ts";
        return userFileExtension;
      }
    } catch (e) {
      // Continue if directory read fails
    }

    // As a last resort, check for tsconfig.json
    try {
      if (fs.existsSync(path.join(currentDir, "tsconfig.json"))) {
        userFileExtension = "ts";
        return userFileExtension;
      }
    } catch (e) {
      // Continue if check fails
    }

    // Default to js for safety
    userFileExtension = "js";
    return userFileExtension;
  } catch (e) {
    // Always default to js if anything goes wrong
    userFileExtension = "js";
    return userFileExtension;
  }
};
