import { ArkosRouteHookHooks, ArkosRouteHookMethodConfig } from "./types";
import { ArkosRequestHandler, ArkosRouteConfig } from "../../exports";
import { ArkosLoadable } from "../../types/arkos";

/**
 * Reader for `ArkosRouteHook` instances.
 * Reads config directly from the instance passed in — no internal registry.
 *
 * @example
 * ```ts
 * routeHookReader.getHooks(userRouteHook, "findMany")        // { before, after, onError }
 * routeHookReader.getRouteConfig(userRouteHook, "findMany")  // ArkosRouteConfig minus path and hooks
 * routeHookReader.getPrismaArgs(userRouteHook, "findMany")   // prismaArgs for that operation
 * routeHookReader.getFullConfig(userRouteHook, "findMany")   // full raw config object
 * routeHookReader.hasOperation(userRouteHook, "findMany")    // true | false
 * routeHookReader.forOperation(userRouteHook, "findMany")    // { before, after, onError, prismaArgs, routeConfig }
 * ```
 */
class ArkosRouteHookReader {
  private getStore(
    routeHook: ArkosLoadable
  ): Record<string, ArkosRouteHookMethodConfig> {
    return (routeHook as any)._store ?? {};
  }

  /**
   * Returns true if the routeHook has a config registered for the given operation.
   */
  hasOperation(routeHook: ArkosLoadable, operation: string): boolean {
    return operation in this.getStore(routeHook);
  }

  /**
   * Returns the full raw config for the given operation, or `null` if not registered.
   */
  getFullConfig(
    routeHook: ArkosLoadable,
    operation: string
  ): ArkosRouteHookMethodConfig | null {
    return this.getStore(routeHook)[operation] ?? null;
  }

  /**
   * Returns only the lifecycle hooks (`before`, `after`, `onError`) for the given operation.
   */
  getHooks(
    routeHook: ArkosLoadable | null | undefined,
    operation: string
  ): ArkosRouteHookHooks | undefined {
    if (!routeHook) return;
    const config = this.getStore(routeHook)[operation];
    if (!config) return {};

    const { before, after, onError } = config;
    return { before, after, onError };
  }

  /**
   * Returns the `ArkosRouteConfig` portion of the config (excludes `path`, hooks, and `prismaArgs`)
   * for the given operation.
   */
  getRouteConfig(
    routeHook: ArkosLoadable,
    operation: string
  ): Omit<ArkosRouteConfig, "path"> | null {
    const config = this.getStore(routeHook)[operation];
    if (!config) return null;

    const { before, after, onError, prismaArgs, ...routeConfig } = config;
    return routeConfig;
  }

  /**
   * Returns the `prismaArgs` for the given operation, or `undefined` if not set.
   */
  getPrismaArgs(
    routeHook: ArkosLoadable,
    operation: string
  ): Record<string, any> | undefined {
    return this.getStore(routeHook)[operation]?.prismaArgs;
  }

  /**
   * Returns all extracted slices for a given operation in one call.
   */
  forOperation(
    routeHook: ArkosLoadable,
    operation: string
  ): {
    before: ArkosRequestHandler[];
    after: ArkosRequestHandler[];
    onError: ArkosRequestHandler[];
    prismaArgs?: Record<string, any>;
    routeConfig: Omit<ArkosRouteConfig, "path">;
  } {
    const {
      before = [],
      after = [],
      onError = [],
    } = this.getHooks(routeHook, operation) || {};
    const prismaArgs = this.getPrismaArgs(routeHook, operation);
    const routeConfig = this.getRouteConfig(routeHook, operation) ?? {};

    return { before, after, onError, prismaArgs, routeConfig };
  }
}

export const routeHookReader = new ArkosRouteHookReader();
