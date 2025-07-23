import fs from "fs";
import path from "path";

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

  return await import(correctedPath);
}
