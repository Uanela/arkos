import { ArkosConfig, RouterConfig } from "../../exports";
import fs from "fs";
import deepmerge from "./deepmerge.helper";

/**
 * Applies strict routing rules to module configuration
 */
export function applyStrictRoutingRules<T extends string>(
  appModule: T,
  arkosConfig: ArkosConfig,
  moduleConfig?: RouterConfig<T>
): RouterConfig<T> {
  const strictMode = arkosConfig?.routers?.strict || false;
  let config: any = moduleConfig || ({} as RouterConfig<T>);
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

  // IMPORTANT: Order matters in deepmerge!
  // User config must be SECOND argument to override defaults

  if (hadBooleanDisable) {
    const disableValue = config.disable;
    const disableObject: Record<string, boolean> = {};
    const endpointConfigs: Record<string, any> = {};

    for (const endpoint of allEndpoints) {
      (disableObject as any)[endpoint] = disableValue;
      endpointConfigs[endpoint] = deepmerge((config as any)[endpoint] || {}, {
        disabled: disableValue,
      });
    }

    return deepmerge(config as any, {
      disable: disableObject,
      ...endpointConfigs,
    }) as RouterConfig<T>;
  }

  if (strictMode === true) {
    const strictDefaults: any =
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

    const disableConfig: any = deepmerge(
      strictDefaults,
      (config?.disable as any) || {}
    );

    const endpointConfigs: Record<string, any> = {};
    for (const endpoint of Object.keys(strictDefaults)) {
      endpointConfigs[endpoint] = deepmerge(
        { disabled: strictDefaults[endpoint] },
        (config as any)[endpoint] || {}
      );
    }

    const syncedDisable: Record<string, boolean> = { ...disableConfig };
    for (const endpoint of allEndpoints) {
      const endpointDisabled = (config as any)[endpoint]?.disabled;
      if (endpointDisabled !== undefined) {
        syncedDisable[endpoint] = endpointDisabled;
      }
    }

    const syncedEndpoints: Record<string, any> = { ...endpointConfigs };
    for (const endpoint of allEndpoints) {
      if (syncedDisable[endpoint] !== undefined) {
        syncedEndpoints[endpoint] = deepmerge(syncedEndpoints[endpoint] || {}, {
          disabled: syncedDisable[endpoint],
        });
      }
    }

    return deepmerge(config as any, {
      disable: syncedDisable,
      ...syncedEndpoints,
    }) as RouterConfig<T>;
  } else if (
    strictMode === "no-bulk" &&
    !["auth", "file-upload"].includes(appModule.toLowerCase())
  ) {
    const noBulkDefaults: any = {
      createMany: true,
      updateMany: true,
      deleteMany: true,
    };

    const disableConfig: any = deepmerge(
      noBulkDefaults,
      (config.disable as any) || {}
    );

    const endpointConfigs: Record<string, any> = {};
    for (const endpoint of Object.keys(noBulkDefaults)) {
      endpointConfigs[endpoint] = deepmerge(
        { disabled: noBulkDefaults[endpoint] },
        (config as any)[endpoint] || {}
      );
    }

    const syncedDisable: Record<string, boolean> = { ...disableConfig };
    for (const endpoint of allEndpoints) {
      const endpointDisabled = (config as any)[endpoint]?.disabled;
      if (endpointDisabled !== undefined) {
        syncedDisable[endpoint] = endpointDisabled;
      }
    }

    const syncedEndpoints: Record<string, any> = { ...endpointConfigs };
    for (const endpoint of allEndpoints) {
      if (syncedDisable[endpoint] !== undefined) {
        syncedEndpoints[endpoint] = deepmerge(
          { disabled: syncedDisable[endpoint] },
          syncedEndpoints[endpoint] || {}
        );
      }
    }

    return deepmerge(config as any, {
      disable: syncedDisable,
      ...syncedEndpoints,
    }) as RouterConfig<T>;
  }

  return config;
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
