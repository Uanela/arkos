import fs from "fs";
import path from "path";
import { createRequire } from "module";
import { pathToFileURL } from "url";
import { getUserFileExtension } from "./fs.helpers";

export function getPackageJson() {
  try {
    const pkgPath = path.join(process.cwd(), "package.json");
    if (fs.existsSync(pkgPath)) {
      return JSON.parse(fs.readFileSync(pkgPath, "utf8"));
    }
  } catch (err) {
    console.error("Error checking package.json:", err);
  }
}

export function isEsm() {
  const pkg = getPackageJson();
  return pkg.type === "module";
}

export async function importModule(
  modulePath: string,
  options: { fixExtension: boolean } = { fixExtension: true }
) {
  // Add .js extension if it's a relative path without extension
  let correctedPath = modulePath;

  if (
    !options.fixExtension ||
    modulePath.endsWith(".ts") ||
    getUserFileExtension() === "ts"
  )
    return await import(modulePath);

  if (
    options?.fixExtension &&
    isEsm() &&
    modulePath.startsWith(".") &&
    !modulePath.endsWith(".js")
  ) {
    const fullImportPath = path.resolve(process.cwd(), modulePath);
    const indexPath = fullImportPath + "/index.js";

    // Check if it's a directory with index.js or a direct file
    if (fs.existsSync(indexPath)) {
      correctedPath = modulePath + "/index.js";
    } else {
      correctedPath = modulePath + ".js";
    }
  }

  // When importing user modules:
  const userRequire = createRequire(
    pathToFileURL(process.cwd() + "/package.json")
  );
  const resolved = userRequire.resolve(modulePath);
  return await import(pathToFileURL(resolved) as any);

  return await import(correctedPath);
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
