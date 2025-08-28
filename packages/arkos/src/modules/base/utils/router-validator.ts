class RouterValidator {
  isExpressRouter(router: any) {
    if (!router || typeof router !== "function") return false;

    const hasRouterMethods =
      typeof router?.use === "function" &&
      typeof router?.get === "function" &&
      typeof router?.route === "function";

    const hasStack = Array.isArray(router?.stack);

    return hasRouterMethods && hasStack;
  }
}

const routerValidator = new RouterValidator();

export default routerValidator;
