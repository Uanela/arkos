import fs from "fs";
import path from "path";

function fixImports(dir: string) {
  const files = fs.readdirSync(dir, { withFileTypes: true });

  files.forEach((file) => {
    const fullPath = path.join(dir, file.name);

    if (file.isDirectory()) {
      fixImports(fullPath);
    } else if (file.name.endsWith(".js")) {
      let content = fs.readFileSync(fullPath, "utf8");

      // Fix relative imports
      content = content.replace(
        /from\s+['"](\.[^'"]*)['"]/g,
        (match, importPath) => {
          if (!importPath.endsWith(".js")) {
            // Check if it's a directory import (ends with folder name)
            const fullImportPath = path.resolve(dir, importPath);
            const indexPath = fullImportPath + "/index.js";

            // If index.js exists, append /index.js, otherwise append .js
            if (fs.existsSync(indexPath)) {
              return match.replace(importPath, importPath + "/index.js");
            } else {
              return match.replace(importPath, importPath + ".js");
            }
          }
          return match;
        }
      );

      // Fix import statements
      content = content.replace(
        /import\s+['"](\.[^'"]*)['"]/g,
        (match, importPath) => {
          if (!importPath.endsWith(".js")) {
            const fullImportPath = path.resolve(dir, importPath);
            const indexPath = fullImportPath + "/index.js";

            if (fs.existsSync(indexPath)) {
              return match.replace(importPath, importPath + "/index.js");
            } else {
              return match.replace(importPath, importPath + ".js");
            }
          }
          return match;
        }
      );

      fs.writeFileSync(fullPath, content);
    }
  });
}

fixImports("./dist/esm");
fixImports("./dist/cjs");
