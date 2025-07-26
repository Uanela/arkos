import { execSync } from "child_process";

/**
 * Helps getting npm packages latest version
 *
 * @param {striong} name - name of the npm package (defaults: arkos)
 * @returns {string} version - the package latest version
 * */
export function getNpmPackageVersion(name: string = "arkos"): string {
  const version = execSync(`npm view ${name} version`).toString().trim();
  return version;
}
