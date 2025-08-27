class RouterValidator {
  isExpressRouter(obj: any) {
    if (!obj || typeof obj !== "function") return false;

    const hasRouterMethods =
      typeof obj.use === "function" &&
      typeof obj.get === "function" &&
      typeof obj.route === "function";

    const hasStack = Array.isArray(obj.stack);

    return hasRouterMethods && hasStack;
  }
}

const routerValidator = new RouterValidator();

export default routerValidator;
