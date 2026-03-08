import { defineConfig, UserArkosConfig } from "../define-config";
import sheu from "../sheu";
import * as fsHelpers from "./fs.helpers";
("ReplaceWithNeededImportsForArkosConfig"); // This will be filled by post build script

let definedArkosConfig: any = {};

try {
  definedArkosConfig = "ReplaceWithDynamicImport"; // This will be filled by post build script
} catch (err: any) {
  if (err.message.toLowerCase().includes("cannot find module"))
    sheu.warn(
      `Using default configs, because arkos.config.${fsHelpers.getUserFileExtension()} was not found`,
      {
        timestamp: true,
      }
    );
}

export function isUsingAuthentication() {
  const { authentication } = getArkosConfig();

  return authentication?.mode;
}

export function isAuthenticationEnabled() {
  const { authentication } = getArkosConfig();

  return authentication?.mode && authentication?.enabled !== false;
}

/**
 * Gives access to the underlying current configurations being used by **Arkos** by default and also loaded through `arkos.config.{ts|js}`
 *
 * @returns {ArkosConfig}
 */
export function getArkosConfig(): UserArkosConfig {
  const config =
    typeof definedArkosConfig === "string"
      ? {}
      : (definedArkosConfig as any)?.default || {};

  if ((config as any).__loader !== "defineConfig" && !typeof jest) {
    sheu.error(
      `From v1.6 config under arkos.config.${fsHelpers.getUserFileExtension()} must be wrapped in \`defineConfig()\` function from \`arkos/config\` `
    );
    process.exit(1);
  }

  return defineConfig(config) as any;
}
