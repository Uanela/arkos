import loadableRegistry from "../../components/arkos-loadable-registry";
import { ArkosModuleType } from "../arkos-route-hook/types";
import {
  ArkosServiceHookMethodConfigs,
  ServiceHookOperationConfig,
} from "./types";

type ServiceHookOperation = keyof ArkosServiceHookMethodConfigs<any, any>;

/**
 * Reader for `ArkosServiceHook` instances.
 * Reads config from the global loadable registry by module name.
 *
 * @example
 * ```ts
 * serviceHookReader.getHooks("user", "createOne")          // { before, after, onError }
 * serviceHookReader.getHooks("user", "createOne").before   // ServiceHookHandler[]
 * serviceHookReader.getHooks("user", "createOne").after    // ServiceHookHandler[]
 * serviceHookReader.getHooks("user", "createOne").onError  // ServiceHookHandler[]
 * serviceHookReader.hasOperation("user", "createOne")      // true | false
 * serviceHookReader.getFullConfig("user", "createOne")     // { before, after, onError } | null
 * ```
 */
class ArkosServiceHookReader {
  private getServiceHook(moduleName: ArkosModuleType) {
    return loadableRegistry.getItem("ArkosServiceHook", moduleName);
  }

  private getStore(
    moduleName: ArkosModuleType
  ): Partial<ArkosServiceHookMethodConfigs<any, any>> {
    return (this.getServiceHook(moduleName) as any)?._store ?? {};
  }

  /**
   * Returns true if the serviceHook has a config registered for the given operation.
   */
  hasOperation(
    moduleName: ArkosModuleType,
    operation: ServiceHookOperation
  ): boolean {
    return operation in this.getStore(moduleName);
  }

  /**
   * Returns the full raw config for the given operation, or `null` if not registered.
   */
  getFullConfig(
    moduleName: ArkosModuleType,
    operation: ServiceHookOperation
  ): ServiceHookOperationConfig<any, any, any> | null {
    return (this.getStore(moduleName) as any)[operation] ?? null;
  }

  /**
   * Returns only the lifecycle hooks (`before`, `after`, `onError`) for the given operation.
   */
  getHooks(
    moduleName: ArkosModuleType,
    operation: ServiceHookOperation
  ): ServiceHookOperationConfig<any, any, any> | undefined {
    const config = (this.getStore(moduleName) as any)[operation];
    if (!config) return {};
    const { before, after, onError } = config;
    return { before, after, onError };
  }
}

export const serviceHookReader = new ArkosServiceHookReader();
