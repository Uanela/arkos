import { Bundler } from "../src/utils/bundler";

const bundler = new Bundler();

bundler.bundle({ ext: ".js", outDir: "./dist/esm" });
