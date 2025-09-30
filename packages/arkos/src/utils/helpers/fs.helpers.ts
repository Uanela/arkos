import fs from "fs";
import path from "path";

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

  let cwd = process.cwd().replace(/\/+$/, ""); // remove trailing slashes
  cwd = process.cwd().replace(/\\+$/, ""); // remove trailing slashes
  const escapedCwd = cwd.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); // escape regex special chars

  return path.replace(process.cwd(), "").replace(/\/+$/, "").replace("\\", "");
}

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

    const hasTsConfig = fs.existsSync(path.join(currentDir, "tsconfig.json"));

    const hasAppTs = fs.existsSync(path.join(currentDir, "src", "app.ts"));
    const hasAppJs = fs.existsSync(path.join(currentDir, "src", "app.js"));

    const isBuildMode = process.env.ARKOS_BUILD === "true";

    if (isBuildMode) userFileExtension = "js";
    else if (hasTsConfig && hasAppTs) userFileExtension = "ts";
    else if (hasAppTs && !hasAppJs) userFileExtension = "ts";
    else if (hasAppJs) userFileExtension = "js";
    else userFileExtension = "js";

    return userFileExtension;
  } catch (e) {
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
 *   console.info('File exists!');
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
