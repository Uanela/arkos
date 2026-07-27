#!/usr/bin/env node
(async () => {
  const { join, dirname } = await import("path");
  const { existsSync, readFileSync } = await import("fs");
  const { spawn } = await import("child_process");
  const { fileURLToPath } = await import("node:url");

  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);

  const pkgPath = join(process.cwd(), "package.json");
  let useEsm = false;
  if (existsSync(pkgPath)) {
    const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
    useEsm = pkg.type === "module";
  }
  const entryPoint = join(
    __dirname,
    `dist/${useEsm ? "esm" : "cjs"}/utils/cli/index.js`
  );
  const args = [
    ...["--import", "tsx"],
    entryPoint,
    ...process.argv.slice(2),
  ];
  process.env.NO_CLI = "true";
  process.env.FORCE_COLOR = "3";
  process.env.__ARKOS_CLI = "true";
  const child = spawn(process.execPath, args, {
    stdio: ["inherit", "inherit", "pipe"],
  });
  child.stderr.on("data", (data) => {
    const str = data.toString();
    if (!str.includes("ExperimentalWarning: Type Stripping is an experimental"))
      process.stderr.write(data);
  });
  child.on("exit", (code) => process.exit(code ?? 0));
})();


