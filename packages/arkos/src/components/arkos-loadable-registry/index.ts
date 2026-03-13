import { ArkosLoadable } from "../../types/arkos";
import { ArkosModuleType } from "../arkos-route-hook/types";

const LOADABLES = ["ArkosRouteHook", "ArkosServiceHook"];

/**
 * Registry for all items loaded via `app.load()`.
 * Instantiated once at app start and passed through the entire Arkos chain.
 */
export class ArkosLoadableRegistry {
  private readonly items: Map<string, Map<string, ArkosLoadable>> = new Map();

  /**
   * Registers a loadable item into the registry.
   * Called internally by `app.load()`.
   */
  register(item: ArkosLoadable): void {
    const type = (item as any).__type;
    const moduleName = (item as any).moduleName;

    if (!LOADABLES.includes(type))
      throw Error(
        `Invalid loadable component, expected on of ${LOADABLES.join(", ")} but received "${item}"`
      );

    if (!this.items.has(type)) this.items.set(type, new Map());

    this.items.get(type)!.set(moduleName, item);
  }

  /**
   * Returns the interceptor for the given module name, or `null` if not registered.
   */
  getItem(
    loadableType: "ArkosRouteHook" | "ArkosServiceHook",
    moduleName: ArkosModuleType
  ): ArkosLoadable | null {
    return this.items.get(loadableType)?.get(moduleName) ?? null;
  }

  /**
   * Returns true if an interceptor is registered for the given module name.
   */
  hasItem(
    loadableType: "ArkosRouteHook" | "ArkosServiceHook",
    moduleName: string
  ): boolean {
    return this.items.get(loadableType)?.has(moduleName) ?? false;
  }
}

const loadableRegistry = new ArkosLoadableRegistry();

export default loadableRegistry;
