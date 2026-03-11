import fs from "fs";
import path from "path";

function fixImportPath(dir: string, importPath: string, ext: string): string {
  const fullImportPath = path.resolve(dir, importPath);
  if (fs.existsSync(fullImportPath + "/index" + ext)) {
    return importPath + "/index" + ext;
  }
  return importPath + ext;
}

export function fixImports(dir: string) {
  const files = fs.readdirSync(dir, { withFileTypes: true });
  files?.forEach((file) => {
    const fullPath = path.join(dir, file.name);
    if (file.isDirectory()) {
      fixImports(fullPath);
    } else if (/\.(js|cjs|mjs)$/.test(file.name)) {
      const ext = path.extname(file.name) || ".js"; // .js, .cjs, .mjs
      let content = fs.readFileSync(fullPath, "utf8");

      // from "..." (import/export)
      content = content.replace(/from\s+['"](\.[^'"]*)['"]/g, (match, p) =>
        p.endsWith(ext) ? match : match.replace(p, fixImportPath(dir, p, ext))
      );
      // import "..." (side-effect imports)
      content = content.replace(/import\s+['"](\.[^'"]*)['"]/g, (match, p) =>
        p.endsWith(ext) ? match : match.replace(p, fixImportPath(dir, p, ext))
      );
      // dynamic import("...")
      content = content.replace(
        /import\s*\(\s*['"](\.[^'"]*)['"]\s*\)/g,
        (match, p) =>
          p.endsWith(ext) ? match : match.replace(p, fixImportPath(dir, p, ext))
      );
      // require("...")
      content = content.replace(
        /require\s*\(\s*['"](\.[^'"]*)['"]\s*\)/g,
        (match, p) =>
          p.endsWith(ext) ? match : match.replace(p, fixImportPath(dir, p, ext))
      );

      fs.writeFileSync(fullPath, content);
    }
  });
}
