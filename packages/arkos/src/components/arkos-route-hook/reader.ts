import loadableRegistry from "../../components/arkos-loadable-registry";
import {
  ArkosModuleType,
  ArkosRouteHookHooks,
  ArkosRouteHookMethodConfig,
  ArkosRouteHookInstance,
  ArkosAuthRouteHookInstance,
  ArkosFileUploadRouteHookInstance,
} from "./types";
import { ArkosRequestHandler, ArkosRouteConfig } from "../../exports";
import { kebabCase } from "../../exports/utils";

type PrismaOperations = keyof Omit<
  ArkosRouteHookInstance<any>,
  "__type" | "moduleName"
>;

export type OperationByModule<TModule extends ArkosModuleType> =
  TModule extends "file-upload"
    ? keyof Omit<ArkosFileUploadRouteHookInstance, "__type" | "moduleName">
    : TModule extends "auth"
      ? keyof Omit<ArkosAuthRouteHookInstance, "__type" | "moduleName">
      : PrismaOperations;

/**
 * Reader for `ArkosRouteHook` instances.
 * Reads config from the global loadable registry by module name.
 *
 * @example
 * ```ts
 * routeHookReader.getHooks("user", "findMany")        // { before, after, onError }
 * routeHookReader.getRouteConfig("user", "findMany")  // ArkosRouteConfig minus path and hooks
 * routeHookReader.getPrismaArgs("user", "findMany")   // prismaArgs for that operation
 * routeHookReader.getFullConfig("user", "findMany")   // full raw config object
 * routeHookReader.hasOperation("user", "findMany")    // true | false
 * routeHookReader.forOperation("user", "findMany")    // { before, after, onError, prismaArgs, routeConfig }
 * ```
 */
class ArkosRouteHookReader {
  private getRouteHook(moduleName: ArkosModuleType) {
    return loadableRegistry.getItem("ArkosRouteHook", kebabCase(moduleName));
  }

  private getStore(
    moduleName: ArkosModuleType
  ): Record<string, ArkosRouteHookMethodConfig> {
    return (this.getRouteHook(moduleName) as any)?._store ?? {};
  }

  /**
   * Returns true if the routeHook has a config registered for the given operation.
   */
  hasOperation<TModule extends ArkosModuleType>(
    moduleName: TModule,
    operation: OperationByModule<TModule>
  ): boolean {
    return operation in this.getStore(moduleName);
  }

  /**
   * Returns the full raw config for the given operation, or `null` if not registered.
   */
  getFullConfig<TModule extends ArkosModuleType>(
    moduleName: TModule,
    operation: OperationByModule<TModule>
  ): ArkosRouteHookMethodConfig | null {
    return this.getStore(moduleName)[operation as string] ?? null;
  }

  /**
   * Returns only the lifecycle hooks (`before`, `after`, `onError`) for the given operation.
   */
  getHooks<TModule extends ArkosModuleType>(
    moduleName: TModule,
    operation: OperationByModule<TModule>
  ): ArkosRouteHookHooks | undefined {
    const config = this.getStore(moduleName)[operation as string];
    if (!config) return {};
    const { before, after, onError } = config;
    return { before, after, onError };
  }

  /**
   * Returns the `ArkosRouteConfig` portion of the config (excludes `path`, hooks, and `prismaArgs`)
   * for the given operation.
   */
  getRouteConfig<TModule extends ArkosModuleType>(
    moduleName: TModule,
    operation: OperationByModule<TModule>
  ): Omit<ArkosRouteConfig, "path"> | null {
    const config = this.getStore(moduleName)[operation as string];
    if (!config) return null;
    const { before, after, onError, prismaArgs, ...routeConfig } = config;
    return routeConfig;
  }

  /**
   * Returns the `prismaArgs` for the given operation, or `undefined` if not set.
   */
  getPrismaArgs<TModule extends ArkosModuleType>(
    moduleName: TModule,
    operation: OperationByModule<TModule>
  ): Record<string, any> | undefined {
    return this.getStore(moduleName)[operation as string]?.prismaArgs;
  }

  /**
   * Returns all extracted slices for a given operation in one call.
   */
  forOperation<TModule extends ArkosModuleType>(
    moduleName: TModule,
    operation: OperationByModule<TModule>
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
    } = this.getHooks(moduleName, operation) || {};
    const prismaArgs = this.getPrismaArgs(moduleName, operation);
    const routeConfig = this.getRouteConfig(moduleName, operation) ?? {};
    return { before, after, onError, prismaArgs, routeConfig };
  }
}

export const routeHookReader = new ArkosRouteHookReader();
