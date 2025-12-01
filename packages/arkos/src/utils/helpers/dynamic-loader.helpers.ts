import { ArkosConfig, RouterConfig } from "../../exports";
import fs from "fs";

/**
 * Applies strict routing rules to module configuration
 */
export function applyStrictRoutingRules<T extends string>(
  appModule: T,
  arkosConfig: ArkosConfig,
  moduleConfig?: RouterConfig<T>
): RouterConfig<T> {
  const strictMode = arkosConfig?.routers?.strict || false;
  let config: any = moduleConfig ? { ...moduleConfig } : {};
  appModule = appModule.toLowerCase() as T;

  const allEndpoints =
    appModule === "auth"
      ? [
          "getMe",
          "updateMe",
          "deleteMe",
          "login",
          "logout",
          "signup",
          "updatePassword",
          "findManyAuthAction",
        ]
      : appModule === "file-upload"
        ? ["findFile", "uploadFile", "updateFile", "deleteFile"]
        : [
            "createOne",
            "findOne",
            "updateOne",
            "deleteOne",
            "createMany",
            "findMany",
            "updateMany",
            "deleteMany",
          ];

  const hadBooleanDisable = typeof config.disable === "boolean";
  if (hadBooleanDisable) {
    const disableValue = config.disable;
    config.disable = {};

    for (const endpoint of allEndpoints) {
      config.disable[endpoint] = disableValue;

      if (!config[endpoint]) {
        config[endpoint] = {};
      }
      config[endpoint].disabled = disableValue;
    }

    return config as RouterConfig<T>;
  }

  if (strictMode === true) {
    const strictDefaults: Record<string, boolean> =
      appModule === "auth"
        ? {
            getMe: true,
            updateMe: true,
            deleteMe: true,
            login: true,
            logout: true,
            signup: true,
            updatePassword: true,
            findManyAuthAction: true,
          }
        : appModule === "file-upload"
          ? {
              findFile: true,
              uploadFile: true,
              updateFile: true,
              deleteFile: true,
            }
          : {
              createOne: true,
              findOne: true,
              updateOne: true,
              deleteOne: true,
              createMany: true,
              findMany: true,
              updateMany: true,
              deleteMany: true,
            };

    applyDisabledFlags(config, allEndpoints, strictDefaults);
  } else if (
    strictMode === "no-bulk" &&
    !["auth", "file-upload"].includes(appModule.toLowerCase())
  ) {
    const noBulkDefaults: Record<string, boolean> = {
      createMany: true,
      updateMany: true,
      deleteMany: true,
    };

    applyDisabledFlags(config, allEndpoints, noBulkDefaults);
  }

  return config as RouterConfig<T>;
}

function applyDisabledFlags(
  config: any,
  allEndpoints: string[],
  defaults: Record<string, boolean>
): void {
  if (!config.disable || typeof config.disable === "boolean") {
    config.disable = {};
  }

  for (const endpoint of allEndpoints) {
    const defaultDisabled = defaults[endpoint];
    const userDisableOverride = config.disable[endpoint];
    const endpointDisabled = config[endpoint]?.disabled;

    let finalDisabled: boolean | undefined;

    if (endpointDisabled !== undefined) {
      finalDisabled = endpointDisabled;
    } else if (userDisableOverride !== undefined) {
      finalDisabled = userDisableOverride;
    } else if (defaultDisabled !== undefined) {
      finalDisabled = defaultDisabled;
    }

    if (finalDisabled !== undefined) {
      config.disable[endpoint] = finalDisabled;

      if (!config[endpoint]) {
        config[endpoint] = {};
      }
      config[endpoint].disabled = finalDisabled;
    }
  }
}

export function validateRouterConfigConsistency(
  appModule: string,
  config: Record<string, any>
): void {
  if (!config.disable || typeof config.disable === "boolean") return;

  const endpoints = Object.keys(config.disable) as any[];

  for (const endpoint of endpoints) {
    const oldWayValue = (config.disable as any)[endpoint];
    const newWayValue = (config as any)[endpoint]?.disabled;

    if (
      oldWayValue !== undefined &&
      newWayValue !== undefined &&
      oldWayValue !== newWayValue
    ) {
      throw new Error(
        `Conflicting disabled values for endpoint "${endpoint}" of module ${appModule}: ` +
          `disable.${endpoint} = ${oldWayValue}, but ${endpoint}.disabled = ${newWayValue}. ` +
          `Please use only one method to disable endpoints.`
      );
    }
  }
}

export async function pathExists(path: string) {
  try {
    await fs.promises.stat(path);
    return true;
  } catch (err) {
    return false;
  }
}
