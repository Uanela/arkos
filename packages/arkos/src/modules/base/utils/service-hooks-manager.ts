import { ServiceHookHandler } from "../../../components/arkos-service-hook/types";

/**
 * Manages and handles service hooks implementation on the base service class
 */
class ServiceHooksManager {
  /*
   * Handles single function or array of functions of service hook
   */
  async handleHook(
    hooksReceived: ServiceHookHandler<any> | ServiceHookHandler<any>[],
    hooksArgs: Record<string, any>
  ) {
    const hooks = Array.isArray(hooksReceived)
      ? hooksReceived
      : [hooksReceived];

    for (const hook of hooks) {
      await hook(hooksArgs);
    }
  }

  validateServiceHook(hook: ServiceHookHandler<any>) {
    if (typeof hook !== "function")
      throw new Error(
        `Validation Error: service hook must be of type function or array of functions but received value of type ${typeof hook}`
      );
  }
}

const serviceHooksManager = new ServiceHooksManager();

export default serviceHooksManager;
