import { build } from "esbuild";
import fg from "fast-glob";

const entryPoints = await fg("dist/**/*.js");

build({
  entryPoints,
  outdir: "dist",
  minify: true,
  allowOverwrite: true,
  logLimit: 0,
  format: "cjs",
});
