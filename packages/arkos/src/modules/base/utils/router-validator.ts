class RouterValidator {
  isExpressRouter(router: any) {
    if (!router || typeof router !== "function") return false;
    const hasStack = Array.isArray(router?.stack);
    return hasStack;
  }
}

const routerValidator = new RouterValidator();

export default routerValidator;
