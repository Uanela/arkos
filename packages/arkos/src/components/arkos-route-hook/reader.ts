import { ArkosRouteHookHooks, ArkosRouteHookMethodConfig } from "./types";
import { ArkosRequestHandler, ArkosRouteConfig } from "../../exports";
import { ArkosLoadable } from "../../types/arkos";

/**
 * Singleton registry for reading config from loaded `ArkosRouteHook` instances.
 * Populated by `app.load()` — not intended for direct user use.
 *
 * @example
 * ```ts
 * // registering (done internally by app.load())
 * routeHookReader.register(userRouteHook);
 *
 * // reading (done internally by Arkos route handlers)
 * routeHookReader.moduleName                          // "user"
 * routeHookReader.getHooks(userRouteHook, "findMany")        // { before, after, onError }
 * routeHookReader.getRouteConfig(userRouteHook, "findMany")  // ArkosRouteConfig minus path and hooks
 * routeHookReader.getPrismaArgs(userRouteHook, "findMany")  // prismaArgs for that operation
 * routeHookReader.getFullConfig(userRouteHook, "findMany")   // full raw config object
 * routeHookReader.hasOperation(userRouteHook, "findMany")    // true | false
 * ```
 */
class ArkosRouteHookReader {
  private readonly registry: Map<
    string,
    Record<string, ArkosRouteHookMethodConfig>
  > = new Map();

  /**
   * Registers an routeHook instance into the reader.
   * Called internally by `app.load()`.
   */
  register(routeHook: ArkosLoadable): void {
    const moduleName = (routeHook as any).moduleName;
    const store = (routeHook as any)._store ?? {};
    this.registry.set(moduleName, store);
  }

  private getStore(
    routeHook: ArkosLoadable
  ): Record<string, ArkosRouteHookMethodConfig> {
    const moduleName = (routeHook as any).moduleName;
    return this.registry.get(moduleName) ?? {};
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
   * Returns the `prismaArgs` for the given operation, or `null` if not set.
   */
  getPrismaArgs(
    routeHook: ArkosLoadable,
    operation: string
  ): Record<string, any> | undefined {
    return this.getStore(routeHook)[operation]?.prismaArgs;
  }

  /**
   * Returns all extracted slices for a given operation in one call.
   * The `prismaArgs` is wrapped in `{ [operation]: value }` to match
   * the existing `PrismaArgs` shape.
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
