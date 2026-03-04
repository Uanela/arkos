import { ArkosConfig } from "../exports";
// import { PrismaClient } from "../types/global";

/**
 * Defines and validates the Arkos configuration, filling in defaults where needed.
 * Use this in your `arkos.config.ts` to get full type safety and autocompletion.
 *
 * @example
 * ```ts
 * // arkos.config.ts
 * import { PrismaClient } from "@prisma/client";
 * import { defineConfig } from "arkos";
 *
 * const prisma = new PrismaClient();
 *
 * export default defineConfig({
 *   prisma: { instance: prisma },
 *   globalPrefix: "/api",
 * });
 * ```
 *
 * @see {@link https://www.arkosjs.com/docs/api-reference/define-config}
 */
export function defineConfig(config: ArkosConfig): ArkosConfig {
  if (!config.prisma?.instance) {
    throw new Error(
      "ArkosConfigError: prisma.instance is required. Pass your PrismaClient instance via defineConfig({ prisma: { instance: new PrismaClient() } })."
    );
  }

  // if (!(config.prisma.instance instanceof PrismaClient)) {
  //   throw new Error(
  //     "ArkosConfigError: prisma.instance must be a valid PrismaClient instance."
  //   );
  // }

  return {
    ...config,
    globalPrefix: config.globalPrefix ?? "/api",
    port: config.port ?? 8000,
    request: {
      ...config.request,
      parameters: {
        allowDangerousPrismaQueryOptions:
          config.request?.parameters?.allowDangerousPrismaQueryOptions ?? false,
        ...config.request?.parameters,
      },
    },
    routers: {
      strict: false,
      ...config.routers,
    },
    middlewares: {
      ...config.middlewares,
    },
    debugging: {
      requests: {
        level: 1,
        ...config.debugging?.requests,
      },
      dynamicLoader: {
        level: 0,
        ...config.debugging?.dynamicLoader,
      },
    },
  };
}
