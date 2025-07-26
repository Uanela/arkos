import fs from "fs";
import { killDevelopmentServerChildProcess } from "../dev";
import { killProductionServerChildProcess } from "../start";
import path, { dirname } from "path";
import { fileURLToPath } from "url";
// import { fileURLToPath } from "url";
// import { dirname } from "path";

export function ensureDirectoryExists(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

export function killServerChildProcess() {
  killDevelopmentServerChildProcess();
  killProductionServerChildProcess();
}

// export function getVersion() {
//   let currentDir: string;
//   // @ts-ignore
//   if (typeof __dirname !== "undefined") {
//     // @ts-ignore
//     currentDir = __dirname;
//   } else {
//     // @ts-ignore
//     currentDir = dirname(fileURLToPath((import.meta as any).url));
//   }

//   const packageJson = JSON.parse(
//     fs.readFileSync(
//       path.join(currentDir, "../../../../../package.json"),
//       "utf8"
//     ) || "{}"
//   );
//   return packageJson?.version || "1.0.0";
// }

//export async function getVersion() {
//  //@ts-ignore
//  const pkg = await import("../../../../../package.json", {
//    with: { type: "json" }, // Use 'with' instead of 'assert'
//  });
//  const version = "default" in pkg ? pkg.default.versoin : pkg.version;

//  return version || "1.0.0";
//}
export function getVersion() {
  return "{{version}}";
}
