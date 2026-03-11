import { readFileSync, writeFileSync } from "fs";

const path = "./dist/types/exports/index.d.ts";
const content = readFileSync(path, "utf-8");

const fixed = content.replace("export default arkos;", "export = arkos;");

writeFileSync(path, fixed);
