import { defineConfig } from "tsup";

export default defineConfig([
  // CommonJS build
  {
    entry: ["src/**/*.ts", "!src/**/*.test.ts", "!src/**/*.spec.ts"],
    format: ["cjs"],
    target: "es2021",
    outDir: "dist/cjs",
    dts: true,
    sourcemap: true,
    clean: true,
    splitting: false,
    treeshake: true,
    minify: false,
    keepNames: true,
    bundle: false,
    outExtension: () => ({ js: ".js" }),
    esbuildOptions(options) {
      options.conditions = ["module"];
    },
  },
  // ESM build
  {
    entry: ["src/**/*.ts", "!src/**/*.test.ts", "!src/**/*.spec.ts"],
    format: ["esm"],
    target: "es2021",
    outDir: "dist/esm",
    dts: true,
    sourcemap: true,
    splitting: false,
    treeshake: true,
    minify: false,
    keepNames: true,
    bundle: false,
    outExtension: () => ({ js: ".js" }),
    esbuildOptions(options) {
      options.conditions = ["module"];
    },
  },
]);
