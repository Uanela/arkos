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
  const config = moduleConfig || ({} as RouterConfig<T>);
  appModule = appModule.toLowerCase() as T;

  if (strictMode === true) {
    return {
      ...config,
      disable:
        typeof config.disable === "boolean"
          ? config.disable
          : appModule === "auth"
            ? {
                getMe: true,
                updateMe: true,
                deleteMe: true,
                login: true,
                logout: true,
                signup: true,
                updatePassword: true,
                findManyAuthAction: true,
                ...(typeof config.disable === "object" ? config.disable : {}),
              }
            : appModule === "file-upload"
              ? {
                  findFile: true,
                  uploadFile: true,
                  updateFile: true,
                  deleteFile: true,
                  ...(typeof config.disable === "object" ? config.disable : {}),
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
                  ...(typeof config.disable === "object" ? config.disable : {}),
                },
    } as RouterConfig<T>;
  } else if (
    strictMode === "no-bulk" &&
    !["auth", "file-upload"].includes(appModule.toLowerCase())
  ) {
    return {
      ...config,
      disable:
        typeof config.disable === "boolean"
          ? config.disable
          : {
              createMany: true,
              updateMany: true,
              deleteMany: true,
              ...(typeof config.disable === "object" ? config.disable : {}),
            },
    } as RouterConfig<T>;
  }

  return config;
}

export async function pathExists(path: string) {
  try {
    await fs.promises.stat(path);
    return true;
  } catch (err) {
    return null;
  }
}
