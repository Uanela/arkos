import fs from "fs";
import { killDevelopmentServerChildProcess } from "../dev";
import { killProductionServerChildProcess } from "../start";
import path from "path";

export function ensureDirectoryExists(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

export function killServerChildProcess() {
  killDevelopmentServerChildProcess();
  killProductionServerChildProcess();
}

export function getVersion() {
  const packageJson = JSON.parse(
    fs.readFileSync(
      path.join(__dirname, "../../../../../package.json"),
      "utf8"
    ) || "{}"
  );

  return packageJson?.version || "1.0.0";
}
