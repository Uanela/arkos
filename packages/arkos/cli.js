#!/usr/bin/env node
(async () => {
  const { join } = await import("path");
  const { existsSync, readFileSync } = await import("fs");
  const { spawn } = await import("child_process");

  const pkgPath = join(process.cwd(), "package.json");
  let useEsm = false;

  if (existsSync(pkgPath)) {
    const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
    useEsm = pkg.type === "module";
  }

  const tsSrc = join(process.cwd(), "tsconfig.json");
  const entryPoint = join(
    __dirname,
    `dist/${useEsm ? "esm" : "cjs"}/utils/cli/index.js`
  );
  const useTs = existsSync(tsSrc);

  const args = [
    ...(useTs ? ["--experimental-strip-types"] : []),
    entryPoint,
    ...process.argv.slice(2),
  ];

  process.env.NO_CLI = "true";
  const child = spawn(process.execPath, args, {
    stdio: ["inherit", "inherit", "pipe"],
  });
  child.stderr.on("data", (data) => {
    const str = data.toString();
    if (
      !str.includes("DeprecationWarning") &&
      !str.includes("npm warn") &&
      !str.includes("ExperimentalWarning")
    )
      process.stderr.write(data);
  });
  child.on("exit", (code) => process.exit(code ?? 0));
})();
