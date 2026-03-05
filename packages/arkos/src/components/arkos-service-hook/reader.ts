import { ArkosLoadable } from "../../types/arkos";
import {
  ArkosServiceHookMethodConfigs,
  ServiceHookHandler,
  ServiceHookOperationConfig,
} from "./index";
import { ModelDelegate, ServiceBaseContext } from "../base/types/service.types";

/**
 * Singleton registry for reading config from loaded `ArkosServiceHook` instances.
 * Populated by `app.load()` — not intended for direct user use.
 *
 * @example
 * ```ts
 * // registering (done internally by app.load())
 * serviceHookReader.register(userServiceHook);
 *
 * // reading (done internally by BaseService)
 * serviceHookReader.getHooks(userServiceHook, "createOne", "before") // ServiceHookHandler[]
 * serviceHookReader.getOperation(userServiceHook, "createOne")          // { before, after, onError }
 * serviceHookReader.hasOperation(userServiceHook, "createOne")          // true | false
 * ```
 */
class ArkosServiceHookReader {
  private readonly registry: Map<
    string,
    Partial<ArkosServiceHookMethodConfigs<any, any>>
  > = new Map();

  /**
   * Registers a serviceHook instance into the reader.
   * Called internally by `app.load()`.
   */
  register(serviceHook: ArkosLoadable): void {
    const moduleName = (serviceHook as any).moduleName;
    const store = (serviceHook as any)._store ?? {};
    this.registry.set(moduleName, store);
  }

  private getStore(
    moduleName: string
  ): Partial<ArkosServiceHookMethodConfigs<any, any>> {
    return this.registry.get(moduleName) ?? {};
  }

  /**
   * Returns true if the serviceHook has a config registered for the given operation.
   */
  hasOperation(moduleName: string, operation: string): boolean {
    return operation in this.getStore(moduleName);
  }

  /**
   * Returns the full operation config `{ before, after, onError }` or `null` if not registered.
   */
  getOperation<T extends ModelDelegate = any, Context = ServiceBaseContext>(
    moduleName: string,
    operation: string
  ): ServiceHookOperationConfig<any, any, any> | null {
    return (this.getStore(moduleName) as any)[operation] ?? null;
  }

  /**
   * Returns the handler array for a specific slot (`before`, `after`, `onError`)
   * of a given operation. Returns an empty array if not registered.
   */
  getHooks(
    moduleName: string,
    operation: string,
    slot: "before" | "after" | "onError"
  ): ServiceHookHandler<any>[] {
    const op = this.getOperation(moduleName, operation);
    return op?.[slot] ?? [];
  }

  /**
   * Returns all three handler arrays for a given operation in one call.
   * Always returns arrays — empty if not registered.
   */
  forOperation(
    moduleName: string,
    operation: string
  ): {
    before: ServiceHookHandler<any>[];
    after: ServiceHookHandler<any>[];
    onError: ServiceHookHandler<any>[];
  } {
    const op = this.getOperation(moduleName, operation);
    return {
      before: op?.before ?? [],
      after: op?.after ?? [],
      onError: op?.onError ?? [],
    };
  }
}

export const serviceHookReader = new ArkosServiceHookReader();
