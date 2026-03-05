import { ArkosInterceptorHooks, ArkosInterceptorMethodConfig } from "./types";
import { ArkosRequestHandler, ArkosRouteConfig } from "../../exports";
import { ArkosLoadable } from "../../types/arkos";

/**
 * Singleton registry for reading config from loaded `ArkosInterceptor` instances.
 * Populated by `app.load()` — not intended for direct user use.
 *
 * @example
 * ```ts
 * // registering (done internally by app.load())
 * interceptorReader.register(userInterceptor);
 *
 * // reading (done internally by Arkos route handlers)
 * interceptorReader.moduleName                          // "user"
 * interceptorReader.getHooks(userInterceptor, "findMany")        // { before, after, onError }
 * interceptorReader.getRouteConfig(userInterceptor, "findMany")  // ArkosRouteConfig minus path and hooks
 * interceptorReader.getPrismaArgs(userInterceptor, "findMany")  // prismaArgs for that operation
 * interceptorReader.getFullConfig(userInterceptor, "findMany")   // full raw config object
 * interceptorReader.hasOperation(userInterceptor, "findMany")    // true | false
 * ```
 */
class ArkosInterceptorReader {
  private readonly registry: Map<
    string,
    Record<string, ArkosInterceptorMethodConfig>
  > = new Map();

  /**
   * Registers an interceptor instance into the reader.
   * Called internally by `app.load()`.
   */
  register(interceptor: ArkosLoadable): void {
    const moduleName = (interceptor as any).moduleName;
    const store = (interceptor as any)._store ?? {};
    this.registry.set(moduleName, store);
  }

  private getStore(
    interceptor: ArkosLoadable
  ): Record<string, ArkosInterceptorMethodConfig> {
    const moduleName = (interceptor as any).moduleName;
    return this.registry.get(moduleName) ?? {};
  }

  /**
   * Returns true if the interceptor has a config registered for the given operation.
   */
  hasOperation(interceptor: ArkosLoadable, operation: string): boolean {
    return operation in this.getStore(interceptor);
  }

  /**
   * Returns the full raw config for the given operation, or `null` if not registered.
   */
  getFullConfig(
    interceptor: ArkosLoadable,
    operation: string
  ): ArkosInterceptorMethodConfig | null {
    return this.getStore(interceptor)[operation] ?? null;
  }

  /**
   * Returns only the lifecycle hooks (`before`, `after`, `onError`) for the given operation.
   */
  getHooks(
    interceptor: ArkosLoadable | null | undefined,
    operation: string
  ): ArkosInterceptorHooks | undefined {
    if (!interceptor) return;
    const config = this.getStore(interceptor)[operation];
    if (!config) return {};

    const { before, after, onError } = config;
    return { before, after, onError };
  }

  /**
   * Returns the `ArkosRouteConfig` portion of the config (excludes `path`, hooks, and `prismaArgs`)
   * for the given operation.
   */
  getRouteConfig(
    interceptor: ArkosLoadable,
    operation: string
  ): Omit<ArkosRouteConfig, "path"> | null {
    const config = this.getStore(interceptor)[operation];
    if (!config) return null;

    const { before, after, onError, prismaArgs, ...routeConfig } = config;
    return routeConfig;
  }

  /**
   * Returns the `prismaArgs` for the given operation, or `null` if not set.
   */
  getPrismaArgs(
    interceptor: ArkosLoadable,
    operation: string
  ): Record<string, any> | undefined {
    return this.getStore(interceptor)[operation]?.prismaArgs;
  }

  /**
   * Returns all extracted slices for a given operation in one call.
   * The `prismaArgs` is wrapped in `{ [operation]: value }` to match
   * the existing `PrismaArgs` shape.
   */
  forOperation(
    interceptor: ArkosLoadable,
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
    } = this.getHooks(interceptor, operation) || {};
    const prismaArgs = this.getPrismaArgs(interceptor, operation);

    const routeConfig = this.getRouteConfig(interceptor, operation) ?? {};

    return { before, after, onError, prismaArgs, routeConfig };
  }
}

export const interceptorReader = new ArkosInterceptorReader();
