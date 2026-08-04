import { defineConfig, UserArkosConfig } from "../define-config";
import sheu from "../sheu";
import ExitError from "./exit-error";
import { crd, getUserFileExtension } from './fs.helpers';
import { getPrismaInstance } from "./prisma.helpers";
import { userRequire } from './global.helpers';
import { loadEnvironmentVariables } from '../dotenv.helpers';

let definedArkosConfig: any = {};

export function readArkosConfig() {
  loadEnvironmentVariables();
  const configFilename = `arkos.config.${getUserFileExtension()}`;
  const configPath = `${crd()}/${configFilename}`;
  try {
    let requireFunc: Function;
    if (typeof jest !== "undefined")
      requireFunc = () => ({});
    else if (typeof require !== "undefined") {
      requireFunc = require;
    } else {
      requireFunc = userRequire;
    }
    definedArkosConfig = requireFunc(configPath);
  } catch (err: any) {
    if (err.message.toLowerCase().includes(`${configFilename}`)) {
      sheu.warn(
        `Using default configs, because ${configFilename} was not found`,
        {
          timestamp: true,
        }
      );
    } else {
      throw err;
    }
  }
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
      ? { __loader: "defineConfig" }
      : (definedArkosConfig as any)?.default || { __loader: "defineConfig" };
  const configFile = `arkos.config.${getUserFileExtension()}`;

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

/**
 * Returns true if application is being run through `arkos start` after `arkos build`
 *
 * @since 1.5.16-beta
 */
export function isProduction() {
  return process.env.ARKOS_BUILD === "true";
}

export function validateArkosConfig() {
  const config = getArkosConfig();
  const authenticationEnabled = isAuthenticationEnabled();

  if (!config?.source?.entryPoint)
    throw ExitError(
      `Invalid value for 'arkosConfig.source.entryPoint', please pass a valid path from the current working directory`
    );

  if (
    authenticationEnabled &&
    isProduction() &&
    !process.env.JWT_SECRET &&
    !config.authentication?.jwt?.secret
  )
    throw ExitError(
      `Missing jwt secret in production, see https://www.arkosjs.com/docs/core-concepts/authentication/setup#configuration`
    );

  if (authenticationEnabled && !getPrismaInstance())
    throw ExitError(
      `Arkos' authentication system relies on prisma instance, please disabled your authentication or see https://www.arkosjs.com/docs/core-concepts/prisma-orm/setup to setup a prisma instance`
    );
}
