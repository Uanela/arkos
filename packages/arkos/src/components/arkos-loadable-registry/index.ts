import { ArkosLoadable } from "../../types/arkos";
import { interceptorReader } from "../arkos-interceptor/reader";

/**
 * Registry for all items loaded via `app.load()`.
 * Instantiated once at app start and passed through the entire Arkos chain.
 */
export class ArkosLoadableRegistry {
  private readonly interceptors: Map<string, ArkosLoadable> = new Map();

  /**
   * Registers a loadable item into the registry.
   * Called internally by `app.load()`.
   */
  register(item: ArkosLoadable): void {
    interceptorReader.register(item);
    this.interceptors.set((item as any).moduleName, item);
  }

  /**
   * Returns the interceptor for the given module name, or `null` if not registered.
   */
  getInterceptor(moduleName: string): ArkosLoadable | null {
    return this.interceptors.get(moduleName) ?? null;
  }

  /**
   * Returns true if an interceptor is registered for the given module name.
   */
  hasInterceptor(moduleName: string): boolean {
    return this.interceptors.has(moduleName);
  }
}
