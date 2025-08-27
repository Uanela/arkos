import routerValidator from "../router-validator";

describe("RouterValidator", () => {
  describe("isExpressRouter", () => {
    it("should return false for null input", () => {
      expect(routerValidator.isExpressRouter(null)).toBe(false);
    });

    it("should return false for undefined input", () => {
      expect(routerValidator.isExpressRouter(undefined)).toBe(false);
    });

    it("should return false for non-function input", () => {
      expect(routerValidator.isExpressRouter("string")).toBe(false);
      expect(routerValidator.isExpressRouter(123)).toBe(false);
      expect(routerValidator.isExpressRouter({})).toBe(false);
      expect(routerValidator.isExpressRouter([])).toBe(false);
      expect(routerValidator.isExpressRouter(true)).toBe(false);
    });

    it("should return false for function without router methods", () => {
      const regularFunction = () => {};
      expect(routerValidator.isExpressRouter(regularFunction)).toBe(false);
    });

    it("should return false for function with some router methods but no stack", () => {
      const partialRouter = () => {};
      partialRouter.use = () => {};
      partialRouter.get = () => {};
      partialRouter.route = () => {};

      expect(routerValidator.isExpressRouter(partialRouter)).toBe(false);
    });

    it("should return false for function with router methods but non-array stack", () => {
      const fakeRouter = () => {};
      fakeRouter.use = () => {};
      fakeRouter.get = () => {};
      fakeRouter.route = () => {};
      fakeRouter.stack = "not-an-array";

      expect(routerValidator.isExpressRouter(fakeRouter)).toBe(false);
    });

    it("should return true for valid express router object", () => {
      const expressRouter = () => {};
      expressRouter.use = () => {};
      expressRouter.get = () => {};
      expressRouter.route = () => {};
      expressRouter.stack = [] as any;

      expect(routerValidator.isExpressRouter(expressRouter)).toBe(true);
    });

    it("should return true for express router with non-empty stack", () => {
      const expressRouter = () => {};
      expressRouter.use = () => {};
      expressRouter.get = () => {};
      expressRouter.route = () => {};
      expressRouter.stack = [{}];

      expect(routerValidator.isExpressRouter(expressRouter)).toBe(true);
    });

    it("should handle edge case where stack is null but methods exist", () => {
      const fakeRouter = () => {};
      fakeRouter.use = () => {};
      fakeRouter.get = () => {};
      fakeRouter.route = () => {};
      fakeRouter.stack = null;

      expect(routerValidator.isExpressRouter(fakeRouter)).toBe(false);
    });

    it("should handle edge case where stack is undefined but methods exist", () => {
      const fakeRouter = () => {};
      fakeRouter.use = () => {};
      fakeRouter.get = () => {};
      fakeRouter.route = () => {};
      fakeRouter.stack = undefined;

      expect(routerValidator.isExpressRouter(fakeRouter)).toBe(false);
    });

    it("should handle missing individual router methods", () => {
      // Missing use method
      const routerWithoutUse = () => {};
      routerWithoutUse.get = () => {};
      routerWithoutUse.route = () => {};
      routerWithoutUse.stack = [] as any;
      expect(routerValidator.isExpressRouter(routerWithoutUse)).toBe(false);

      // Missing get method
      const routerWithoutGet = () => {};
      routerWithoutGet.use = () => {};
      routerWithoutGet.route = () => {};
      routerWithoutGet.stack = [] as any;
      expect(routerValidator.isExpressRouter(routerWithoutGet)).toBe(false);

      // Missing route method
      const routerWithoutRoute = () => {};
      routerWithoutRoute.use = () => {};
      routerWithoutRoute.get = () => {};
      routerWithoutRoute.stack = [] as any;
      expect(routerValidator.isExpressRouter(routerWithoutRoute)).toBe(false);
    });

    it("should handle non-function router methods", () => {
      const fakeRouter = () => {};
      fakeRouter.use = "not-a-function";
      fakeRouter.get = () => {};
      fakeRouter.route = () => {};
      fakeRouter.stack = [] as any;

      expect(routerValidator.isExpressRouter(fakeRouter)).toBe(false);
    });
  });
});
