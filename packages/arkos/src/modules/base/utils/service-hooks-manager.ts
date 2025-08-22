type ServiceHook = (args: Record<string, any>) => Promise<void>;

/**
 * Manages and handles service hooks implementation on the base service class
 */
class ServiceHooksManager {
  /*
   * Handles single function or array of functions of service hook
   */
  async handleHook(
    hooksReceived: ServiceHook | ServiceHook[],
    hooksArgs: Record<string, any>
  ) {
    const hooks = Array.isArray(hooksReceived)
      ? hooksReceived
      : [hooksReceived];

    for (const hook of hooks) {
      await hook(hooksArgs);
    }
  }

  validateServiceHook(hook: ServiceHook) {
    if (typeof hook !== "function")
      throw new Error(
        `Validation Error: service hook must be of type function or array of functions but received value of type ${typeof hook}`
      );
  }
}

const serviceHooksManager = new ServiceHooksManager();

export default serviceHooksManager;
