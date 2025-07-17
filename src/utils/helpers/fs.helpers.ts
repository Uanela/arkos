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

/**
 * Removes the current working directory prefix from the given path.
 * Handles cases with or without a trailing slash in cwd.
 * @param path - The path to clean
 * @returns The path without the cwd prefix
 */
export function fullCleanCwd(path: string): string {
  if (typeof path !== "string") throw new Error("Path must be a string");

  const cwd = process.cwd().replace(/\/+$/, ""); // remove trailing slashes
  const escapedCwd = cwd.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); // escape regex special chars

  return path.replace(new RegExp(`${escapedCwd}/?`, "g"), ""); // remove cwd + optional slash
}

// /**
//  * Removes the current working directory prefix from the given path.
//  * Handles cases with or without a trailing slash in cwd.
//  *
//  * @param path - The path to clean
//  * @returns The path without the cwd prefix
//  */
// export function fullCleanCwd(path: string): string {
//   if (typeof path !== "string") throw new Error("Path must be a string");

//   const cwd = process.cwd().replace(/\/+$/, ""); // remove trailing slashes
//   return path.replace(new RegExp(`${cwd}/`, "g"), ""); // remove cwd + optional slash
// }

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
