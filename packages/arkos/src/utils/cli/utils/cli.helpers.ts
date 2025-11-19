import fs from "fs";
import { killDevelopmentServerChildProcess } from "../dev";
import { killProductionServerChildProcess } from "../start";

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
  return "{{version}}";
}
