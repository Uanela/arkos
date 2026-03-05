import { ArkosLoadable } from "../../types/arkos";
import {
  ArkosServiceHookMethodConfigs,
  ServiceHookOperationConfig,
} from "./types";

/**
 * Reader for `ArkosServiceHook` instances.
 * Reads config directly from the instance passed in — no internal registry.
 *
 * @example
 * ```ts
 * serviceHookReader.getHooks(userServiceHook, "createOne")          // { before, after, onError }
 * serviceHookReader.getHooks(userServiceHook, "createOne").before   // ServiceHookHandler[]
 * serviceHookReader.getHooks(userServiceHook, "createOne").after    // ServiceHookHandler[]
 * serviceHookReader.getHooks(userServiceHook, "createOne").onError  // ServiceHookHandler[]
 * serviceHookReader.hasOperation(userServiceHook, "createOne")      // true | false
 * serviceHookReader.getFullConfig(userServiceHook, "createOne")     // { before, after, onError } | null
 * ```
 */
class ArkosServiceHookReader {
  private getStore(
    serviceHook: ArkosLoadable
  ): Partial<ArkosServiceHookMethodConfigs<any, any>> {
    return (serviceHook as any)._store ?? {};
  }

  /**
   * Returns true if the serviceHook has a config registered for the given operation.
   */
  hasOperation(serviceHook: ArkosLoadable, operation: string): boolean {
    return operation in this.getStore(serviceHook);
  }

  /**
   * Returns the full raw config for the given operation, or `null` if not registered.
   */
  getFullConfig(
    serviceHook: ArkosLoadable,
    operation: string
  ): ServiceHookOperationConfig<any, any, any> | null {
    return (this.getStore(serviceHook) as any)[operation] ?? null;
  }

  /**
   * Returns only the lifecycle hooks (`before`, `after`, `onError`) for the given operation.
   */
  getHooks(
    serviceHook: ArkosLoadable | null | undefined,
    operation: string
  ): ServiceHookOperationConfig<any, any, any> | undefined {
    if (!serviceHook) return;
    const config = (this.getStore(serviceHook) as any)[operation];
    if (!config) return {};

    const { before, after, onError } = config;
    return { before, after, onError };
  }
}

export const serviceHookReader = new ArkosServiceHookReader();
