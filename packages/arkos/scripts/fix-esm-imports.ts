import { fixImports } from "../src/utils/fix-esm-imports";

fixImports("./dist/esm");
fixImports("./dist/cjs");
