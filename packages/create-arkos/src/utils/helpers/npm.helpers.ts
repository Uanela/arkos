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

/**
 * Helps getting the current package manager from user agent
 *
 * @returns {string} the package manager
 * @default "npm"
 */
export function detectPackageManagerFromUserAgent(): string {
  const userAgent = process.env.npm_config_user_agent || "";

  if (!userAgent) return "npm";
  if (userAgent.includes("pnpm")) return "pnpm";
  if (userAgent.includes("yarn")) return "yarn";
  if (userAgent.includes("npm")) return "npm";
  if (userAgent.includes("bun")) return "bun";
  if (userAgent.includes("cnpm")) return "cnpm";
  if (userAgent.includes("corepack")) return "corepack";
  if (userAgent.includes("deno")) return "deno";

  return "npm";
}
