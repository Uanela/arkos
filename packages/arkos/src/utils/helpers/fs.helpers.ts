import path from "node:path";
import fs from "node:fs";

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

  if (
    path.startsWith(`/${process.cwd()}`) ||
    path.startsWith(`${process.cwd()}`) ||
    path.startsWith(`${process.cwd()}/`)
  )
    return path.replaceAll(process.cwd(), "");
  else return path;
}

export let userFileExtension: "ts" | "js" | undefined;

/**
 * Detects the file extension that should be used in the current execution context
 * Returns 'ts' when TypeScript config exists and not in build mode, otherwise 'js'
 * @returns 'ts' | 'js'
 */
export const getUserFileExtension = (root = process.cwd()): "ts" | "js" => {
  if (userFileExtension) return userFileExtension;
  const tsconfigPath = path.join(root, "tsconfig.json");

  function isTs() {
    if (fs.existsSync(tsconfigPath)) {
      return true;
    }

    const packageJsonPath = path.join(root, "package.json");

    if (!fs.existsSync(packageJsonPath)) {
      return false;
    }

    const pkg = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));

    const dependencies = {
      ...pkg.dependencies,
      ...pkg.devDependencies,
      ...pkg.peerDependencies,
    };

    return Boolean(dependencies.typescript);
  }

  return isTs() && process.env.ARKOS_BUILD !== "true" ? "ts" : "js";
};
