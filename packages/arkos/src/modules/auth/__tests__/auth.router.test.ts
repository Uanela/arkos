import { getAuthRouter } from "../auth.router";
import loadableRegistry from "../../../components/arkos-loadable-registry";
import authController from "../auth.controller";
import {
  sendResponse,
  addPrismaQueryOptionsToRequest,
} from "../../base/base.middlewares";
import ArkosRouter from "../../../utils/arkos-router";

// -- Minimal mocks: only what can't run in unit/integration context --
jest.mock("fs");
jest.mock("../../../utils/dynamic-loader");
jest.mock("../auth.controller", () => ({
  __esModule: true,
  default: {
    getMe: jest.fn(),
    updateMe: jest.fn(),
    deleteMe: jest.fn(),
    login: jest.fn(),
    logout: jest.fn(),
    signup: jest.fn(),
    updatePassword: jest.fn(),
    findOneAuthAction: jest.fn(),
    findManyAuthAction: jest.fn(),
  },
}));
jest.mock("../../base/base.middlewares", () => ({
  sendResponse: jest.fn(),
  addPrismaQueryOptionsToRequest: jest.fn(() => jest.fn()),
  handleRequestBodyValidationAndTransformation: jest.fn(() => jest.fn()),
}));
jest.mock("../../../utils/arkos-router", () => {
  const mockRouter = {
    get: jest.fn().mockReturnThis(),
    post: jest.fn().mockReturnThis(),
    patch: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    use: jest.fn().mockReturnThis(),
  };
  return {
    __esModule: true,
    default: jest.fn(() => mockRouter),
  };
});

// Real loadableRegistry + routeHookReader used — no mock

function getMockRouter() {
  return (ArkosRouter as jest.Mock).mock.results[
    (ArkosRouter as jest.Mock).mock.results.length - 1
  ].value;
}

describe("Auth Router", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Ensure no stale hook registrations bleed between tests
    (loadableRegistry as any).items = new Map();
  });

  describe("No ArkosRouteHook registered (default behavior)", () => {
    it("should register GET /users/me with correct route config", () => {
      getAuthRouter();
      const router = getMockRouter();

      expect(router.get).toHaveBeenCalledWith(
        { path: "/users/me" },
        expect.any(Function), // addPrismaQueryOptionsToRequest
        authController.getMe,
        sendResponse
      );
    });

    it("should register PATCH /users/me with correct route config", () => {
      getAuthRouter();
      const router = getMockRouter();

      expect(router.patch).toHaveBeenCalledWith(
        { path: "/users/me" },
        expect.any(Function),
        authController.updateMe,
        sendResponse
      );
    });

    it("should register DELETE /users/me with correct route config", () => {
      getAuthRouter();
      const router = getMockRouter();

      expect(router.delete).toHaveBeenCalledWith(
        { path: "/users/me" },
        expect.any(Function),
        authController.deleteMe,
        sendResponse
      );
    });

    it("should register POST /auth/login with rateLimit config", () => {
      getAuthRouter();
      const router = getMockRouter();

      expect(router.post).toHaveBeenCalledWith(
        expect.objectContaining({
          path: "/auth/login",
          rateLimit: expect.objectContaining({
            windowMs: 5000,
            limit: 10,
            standardHeaders: "draft-7",
            legacyHeaders: false,
            handler: expect.any(Function),
          }),
        }),
        expect.any(Function),
        authController.login,
        sendResponse
      );
    });

    it("should register DELETE /auth/logout with rateLimit config", () => {
      getAuthRouter();
      const router = getMockRouter();

      expect(router.delete).toHaveBeenCalledWith(
        expect.objectContaining({
          path: "/auth/logout",
          rateLimit: expect.objectContaining({ windowMs: 5000, limit: 10 }),
        }),
        authController.logout,
        sendResponse
      );
    });

    it("should register POST /auth/signup with rateLimit config", () => {
      getAuthRouter();
      const router = getMockRouter();

      expect(router.post).toHaveBeenCalledWith(
        expect.objectContaining({
          path: "/auth/signup",
          rateLimit: expect.objectContaining({ windowMs: 5000, limit: 10 }),
        }),
        expect.any(Function),
        authController.signup,
        sendResponse
      );
    });

    it("should register POST /auth/update-password with rateLimit config", () => {
      getAuthRouter();
      const router = getMockRouter();

      expect(router.post).toHaveBeenCalledWith(
        expect.objectContaining({
          path: "/auth/update-password",
          rateLimit: expect.objectContaining({ windowMs: 5000, limit: 10 }),
        }),
        expect.any(Function),
        authController.updatePassword,
        sendResponse
      );
    });

    it("should register GET /auth-actions", () => {
      getAuthRouter();
      const router = getMockRouter();

      expect(router.get).toHaveBeenCalledWith(
        { path: "/auth-actions" },
        authController.findManyAuthAction,
        sendResponse
      );
    });

    it("should register GET /auth-actions/:resourceName", () => {
      getAuthRouter();
      const router = getMockRouter();

      expect(router.get).toHaveBeenCalledWith(
        { path: "/auth-actions/:resourceName" },
        authController.findOneAuthAction,
        sendResponse
      );
    });

    it("should call addPrismaQueryOptionsToRequest with empty prismaArgs for each route", () => {
      getAuthRouter();

      expect(addPrismaQueryOptionsToRequest).toHaveBeenCalledWith(
        { getMe: {} },
        "getMe"
      );
      expect(addPrismaQueryOptionsToRequest).toHaveBeenCalledWith(
        { updateMe: {} },
        "updateMe"
      );
      expect(addPrismaQueryOptionsToRequest).toHaveBeenCalledWith(
        { deleteMe: {} },
        "deleteMe"
      );
      expect(addPrismaQueryOptionsToRequest).toHaveBeenCalledWith(
        { login: {} },
        "login"
      );
      expect(addPrismaQueryOptionsToRequest).toHaveBeenCalledWith(
        { signup: {} },
        "signup"
      );
      expect(addPrismaQueryOptionsToRequest).toHaveBeenCalledWith(
        { updatePassword: {} },
        "updatePassword"
      );
    });
  });

  describe("ArkosRouteHook registered with before/after/onError hooks", () => {
    const beforeGetMe = jest.fn();
    const afterGetMe = jest.fn();
    const onGetMeError = jest.fn();
    const beforeLogin = jest.fn();
    const afterLogin = jest.fn();

    beforeEach(() => {
      // Register a real ArkosRouteHook into the real loadableRegistry
      const mockHook = {
        __type: "ArkosRouteHook",
        moduleName: "auth",
        _store: {
          getMe: {
            before: [beforeGetMe],
            after: [afterGetMe],
            onError: [onGetMeError],
            prismaArgs: { include: { profile: true } },
            authentication: true, // top-level — getRouteConfig spreads everything except before/after/onError/prismaArgs
          },
          login: {
            before: [beforeLogin],
            after: [afterLogin],
            onError: [],
            prismaArgs: { where: { active: true } },
            authentication: false,
          },
        },
      };
      loadableRegistry.register(mockHook as any);
    });

    it("should include before/after/onError for GET /users/me", () => {
      getAuthRouter();
      const router = getMockRouter();

      const call = router.get.mock.calls.find(
        ([config]: any) => config?.path === "/users/me"
      );

      expect(call).toBeDefined();
      // [routeConfig, addPrismaQuery, ...before, controller, ...after, sendResponse, ...onError]
      expect(call).toContain(authController.getMe);
      expect(call).toContain(sendResponse);
      // before and after are wrapped in catchAsync — verify they appear as functions
      const fnArgs = call.filter((a: any) => typeof a === "function");
      // addPrismaQuery + catchAsync(before) + controller + catchAsync(after) + sendResponse + catchAsync(onError)
      expect(fnArgs.length).toBeGreaterThanOrEqual(5);
    });

    it("should spread routeConfig into route object for GET /users/me", () => {
      getAuthRouter();
      const router = getMockRouter();

      const call = router.get.mock.calls.find(
        ([config]: any) => config?.path === "/users/me"
      );

      expect(call[0]).toMatchObject({
        path: "/users/me",
        authentication: true,
      });
    });

    it("should spread routeConfig into route object for POST /auth/login", () => {
      getAuthRouter();
      const router = getMockRouter();

      const call = router.post.mock.calls.find(
        ([config]: any) => config?.path === "/auth/login"
      );

      expect(call[0]).toMatchObject({
        path: "/auth/login",
        authentication: false,
        rateLimit: expect.objectContaining({ windowMs: 5000 }),
      });
    });

    it("should pass prismaArgs to addPrismaQueryOptionsToRequest for getMe", () => {
      getAuthRouter();

      expect(addPrismaQueryOptionsToRequest).toHaveBeenCalledWith(
        { getMe: { include: { profile: true } } },
        "getMe"
      );
    });

    it("should pass prismaArgs to addPrismaQueryOptionsToRequest for login", () => {
      getAuthRouter();

      expect(addPrismaQueryOptionsToRequest).toHaveBeenCalledWith(
        { login: { where: { active: true } } },
        "login"
      );
    });

    it("should handle only before hooks for GET /users/me", () => {
      const beforeGetMe = jest.fn();
      (loadableRegistry as any).items = new Map();
      loadableRegistry.register({
        __type: "ArkosRouteHook",
        moduleName: "auth",
        _store: {
          getMe: { before: [beforeGetMe], after: [], onError: [] },
        },
      } as any);

      getAuthRouter();
      const router = getMockRouter();
      const call = router.get.mock.calls.find(
        ([c]: any) => c?.path === "/users/me"
      );

      expect(call).toContain(authController.getMe);
      expect(call).toContain(sendResponse);
      // addPrismaQuery + catchAsync(before) + controller + sendResponse = 4 args minimum, no onError
      expect(call.length).toBe(5);
    });

    it("should handle only after hooks for GET /users/me", () => {
      const afterGetMe = jest.fn();
      (loadableRegistry as any).items = new Map();
      loadableRegistry.register({
        __type: "ArkosRouteHook",
        moduleName: "auth",
        _store: {
          getMe: { before: [], after: [afterGetMe], onError: [] },
        },
      } as any);

      getAuthRouter();
      const router = getMockRouter();
      const call = router.get.mock.calls.find(
        ([c]: any) => c?.path === "/users/me"
      );

      expect(call).toContain(authController.getMe);
      expect(call).toContain(sendResponse);
      expect(call.length).toBe(5);
    });
  });

  describe("rateLimit handler behavior", () => {
    it("should respond 429 with correct message when rate limit handler is called", () => {
      getAuthRouter();
      const router = getMockRouter();

      const loginCall = router.post.mock.calls.find(
        ([config]: any) => config?.path === "/auth/login"
      );
      const handler = loginCall[0].rateLimit.handler;

      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      handler({}, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(429);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: "Too many requests, please try again later",
      });
    });
  });
});
