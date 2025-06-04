// src/utils/cli/utils.ts
import fs from "fs";
import path from "path";

// export function toPascalCase(str: string): string {
//   return str
//     .replace(/[\W_]/g, " ")
//     .replace(/\s+/g, " ")
//     .trim()
//     .split(" ")
//     .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
//     .join("");
// }

// export function toCamelCase(str: string): string {
//   const pascal = toPascalCase(str);
//   return pascal.charAt(0).toLowerCase() + pascal.slice(1);
// }

// export function toKebabCase(str: string): string {
//   return str
//     .replace(/([a-z])([A-Z])/g, "$1-$2")
//     .replace(/[\W_]/g, "-")
//     .replace(/-+/g, "-")
//     .replace(/^-|-$/g, "")
//     .toLowerCase();
// }

export function ensureDirectoryExists(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

export function fileExists(filePath: string): boolean {
  return fs.existsSync(filePath);
}

// export function getProjectType(): "typescript" | "javascript" {
//   const tsConfigExists = fileExists(path.join(process.cwd(), "tsconfig.json"));
//   const packageJson = path.join(process.cwd(), "package.json");

//   if (tsConfigExists) return "typescript";

//   if (fileExists(packageJson)) {
//     try {
//       const pkg = JSON.parse(fs.readFileSync(packageJson, "utf8"));
//       if (pkg.devDependencies?.typescript || pkg.dependencies?.typescript) {
//         return "typescript";
//       }
//     } catch {
//       // ignore
//     }
//   }

//   return "javascript";
// }
