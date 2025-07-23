import { defineConfig } from "tsup";

export default defineConfig([
  {
    entry: ["src/exports/index.ts"],
    format: ["esm"],
    outDir: "dist/es2020",
    dts: {
      entry: "src/exports/index.ts",
    },
    splitting: true,
    sourcemap: false,
    clean: true,
    minify: true,
    target: "es2020",
  },
  {
    entry: ["src/exports/index.ts"],
    format: ["cjs"],
    outDir: "dist/cjs",
    splitting: true,
    sourcemap: false,
    clean: false,
    minify: true,
    target: "es2020",
  },
]);
