import fs from "fs";
import { killDevelopmentServerChildProcess } from "../dev";
import { killProductionServerChildProcess } from "../start";
import path from "path";
import { getUserFileExtension } from "../../helpers/fs.helpers";
import { importModule } from "../../helpers/global.helpers";
import { ArkosConfig } from "../../../types/new-arkos-config";

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

export async function loadArkosConfig() {
  const configPath = path.resolve(
    process.cwd(),
    `arkos.config.${getUserFileExtension}`
  );

  try {
    const config = (await importModule(configPath)) as ArkosConfig;
    return config;
  } catch {
    console.error(`Could not find application entry point at ${configPath}`);
    process.exit(1);
  }
}
