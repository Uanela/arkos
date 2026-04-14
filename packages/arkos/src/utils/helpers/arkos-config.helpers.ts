import { defineConfig, UserArkosConfig } from "../define-config";
import sheu from "../sheu";
import * as fsHelpers from "./fs.helpers";
import { getPrismaInstance } from "./prisma.helpers";
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
  const configFile = `arkos.config.${fsHelpers.getUserFileExtension()}`;

  if (
    (config as any).__loader !== "defineConfig" &&
    typeof jest == "undefined" &&
    typeof definedArkosConfig === "object"
  ) {
    sheu.error(
      `From v1.6 config under ${configFile} must be wrapped in \`defineConfig()\` function from \`arkos/config\`. You can do the following under your ${configFile}:

import { defineConfig } from "arkos/config"

const config = defineConfig({ ... })

export default config
`
    );
    process.exit(1);
  }

  return defineConfig(config) as any;
}

export function isProduction() {
  return process.env.ARKOS_BUILD === "true";
}

export function validateArkosConfig() {
  const config = getArkosConfig();
  const authenticationEnabled = isAuthenticationEnabled();

  if (
    authenticationEnabled &&
    isProduction() &&
    !process.env.JWT_SECRET &&
    !config.authentication?.jwt?.secret
  )
    throw Error(
      `Missing jwt secret in production, see https://www.arkosjs.com/docs/core-concepts/authentication/setup#configuration`
    );

  if (authenticationEnabled && !getPrismaInstance())
    throw Error(
      `Arkos' authentication system relies on prisma instance, please disabled your authentication or see https://www.arkosjs.com/docs/core-concepts/prisma-orm/setup to setup a prisma instance`
    );
}
