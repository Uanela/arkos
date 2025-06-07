import { promisify } from "util";
import fs from "fs";
import path from "path";

export const statAsync = promisify(fs.stat);
export const accessAsync = promisify(fs.access);
export const mkdirAsync = promisify(fs.mkdir);

export const crd = () =>
  process.env.ARKOS_BUILD === "true"
    ? process.cwd() + "/.build/"
    : process.cwd();

export let userFileExtension: "ts" | "js" | undefined;

/**
 * Detects the file extension that should be used in the current execution context
 * Returns 'ts' when TypeScript config exists and not in build mode, otherwise 'js'
 * @returns 'ts' | 'js'
 */
export const getUserFileExtension = (): "ts" | "js" => {
  if (userFileExtension) return userFileExtension;

  try {
    const currentDir = process.cwd();

    // Check for tsconfig.json in current directory
    const hasTsConfig = fs.existsSync(path.join(currentDir, "tsconfig.json"));

    // Check environment variable for build mode
    const isBuildMode = process.env.ARKOS_BUILD === "true";

    // If tsconfig exists and not in build mode, use TypeScript
    if (hasTsConfig && !isBuildMode) {
      userFileExtension = "ts";
    } else {
      userFileExtension = "js";
    }

    return userFileExtension;
  } catch (e) {
    // Default to js if anything goes wrong
    userFileExtension = "js";
    return userFileExtension;
  }
};

/**
 * Checks if a file exists at the specified file path.
 *
 * @param filePath - The path to the file to check
 * @returns {boolean} True if the file exists, false otherwise or if there's an error
 *
 * @example
 * ```ts
 * const exists = checkFileExists('./path/to/file.txt');
 * if (exists) {
 *   console.log('File exists!');
 * }
 * ```
 */
export function checkFileExists(filePath: string): boolean {
  try {
    return fs.existsSync(path.resolve(filePath));
  } catch (error) {
    return false;
  }
}
