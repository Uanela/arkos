#!/usr/bin/env node
(async () => {
  try {
    const { join } = await import("path");
    const { existsSync, readFileSync } = await import("fs");

    let useEsm = false;

    try {
      const pkgPath = join(process.cwd(), "package.json");
      if (existsSync(pkgPath)) {
        const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
        useEsm = pkg.type === "module";
      }
    } catch (err) {
      console.error("Error checking package.json:", err);
    }

    process.env.CLI = "true";
    if (useEsm) await import("./dist/esm/utils/cli/index.js");
    else await import("./dist/cjs/utils/cli/index.js");
  } catch (err) {
    console.error("Failed to load CLI:", err);
    process.exit(1);
  }
})();
