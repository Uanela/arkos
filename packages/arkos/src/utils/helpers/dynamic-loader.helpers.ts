import { ArkosConfig, RouterConfig } from "../../exports";

/**
 * Applies strict routing rules to module configuration
 */
export function applyStrictRoutingRules(
  arkosConfig: ArkosConfig,
  moduleConfig?: RouterConfig
): RouterConfig {
  const strictMode = arkosConfig?.routers?.strict || false;

  const config = moduleConfig || {};

  if (strictMode === true) {
    return {
      ...config,
      disable:
        typeof config.disable === "boolean"
          ? config.disable
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
    };
  } else if (strictMode === "no-bulk") {
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
    };
  }

  return config;
}
