import { getAuthRouter } from "../auth.router";
import loadableRegistry from "../../../components/arkos-loadable-registry";
import authController from "../auth.controller";
import {
  sendResponse,
  addPrismaQueryOptionsToRequest,
} from "../../base/base.middlewares";
import ArkosRouter from "../../../utils/arkos-router";
import authOpenAPIGenerator from "../utils/auth-openapi-generator";

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

jest.mock("../utils/auth-openapi-generator", () => ({
  __esModule: true,
  default: {
    getOpenApiConfig: jest.fn().mockReturnValue({ summary: "generated" }),
  },
}));

jest.mock("../../../utils/helpers/routers.helpers", () => ({
  processMiddleware: jest.fn(() => []),
}));

function getMockRouter() {
  return (ArkosRouter as jest.Mock).mock.results[
    (ArkosRouter as jest.Mock).mock.results.length - 1
  ].value;
}

describe("getAuthRouter", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (loadableRegistry as any).items = new Map();
  });

  describe("No ArkosRouteHook registered (default behavior)", () => {
    it("should register GET /users/me", () => {
      getAuthRouter();
      const router = getMockRouter();

      expect(router.get).toHaveBeenCalledWith(
        { path: "/users/me" },
        expect.any(Function),
        authController.getMe,
        sendResponse
      );
    });

    it("should register PATCH /users/me", () => {
      getAuthRouter();
      const router = getMockRouter();

      expect(router.patch).toHaveBeenCalledWith(
        { path: "/users/me" },
        expect.any(Function),
        authController.updateMe,
        sendResponse
      );
    });

    it("should register DELETE /users/me", () => {
      getAuthRouter();
      const router = getMockRouter();

      expect(router.delete).toHaveBeenCalledWith(
        { path: "/users/me" },
        expect.any(Function),
        authController.deleteMe,
        sendResponse
      );
    });

    it("should register POST /auth/login with rateLimit and authentication: false", () => {
      getAuthRouter();
      const router = getMockRouter();

      expect(router.post).toHaveBeenCalledWith(
        expect.objectContaining({
          path: "/auth/login",
          authentication: false,
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

    it("should register DELETE /auth/logout with rateLimit", () => {
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

    it("should register POST /auth/signup with rateLimit and authentication: false", () => {
      getAuthRouter();
      const router = getMockRouter();

      expect(router.post).toHaveBeenCalledWith(
        expect.objectContaining({
          path: "/auth/signup",
          authentication: false,
          rateLimit: expect.objectContaining({ windowMs: 5000, limit: 10 }),
        }),
        expect.any(Function),
        authController.signup,
        sendResponse
      );
    });

    it("should register POST /auth/update-password with rateLimit", () => {
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
        { getMe: undefined },
        "getMe"
      );
      expect(addPrismaQueryOptionsToRequest).toHaveBeenCalledWith(
        { updateMe: undefined },
        "updateMe"
      );
      expect(addPrismaQueryOptionsToRequest).toHaveBeenCalledWith(
        { deleteMe: undefined },
        "deleteMe"
      );
      expect(addPrismaQueryOptionsToRequest).toHaveBeenCalledWith(
        { login: undefined },
        "login"
      );
      expect(addPrismaQueryOptionsToRequest).toHaveBeenCalledWith(
        { signup: undefined },
        "signup"
      );
      expect(addPrismaQueryOptionsToRequest).toHaveBeenCalledWith(
        { updatePassword: undefined },
        "updatePassword"
      );
    });
  });

  describe("OpenAPI injection", () => {
    it("should call getOpenApiConfig for all 9 endpoints", () => {
      getAuthRouter();

      expect(authOpenAPIGenerator.getOpenApiConfig).toHaveBeenCalledTimes(9);
    });

    it("should call getOpenApiConfig with correct endpoint names", () => {
      getAuthRouter();

      const calledEndpoints = (
        authOpenAPIGenerator.getOpenApiConfig as jest.Mock
      ).mock.calls.map(([, endpoint]) => endpoint);

      expect(calledEndpoints).toContain("getMe");
      expect(calledEndpoints).toContain("updateMe");
      expect(calledEndpoints).toContain("deleteMe");
      expect(calledEndpoints).toContain("login");
      expect(calledEndpoints).toContain("logout");
      expect(calledEndpoints).toContain("signup");
      expect(calledEndpoints).toContain("updatePassword");
      expect(calledEndpoints).toContain("findManyAuthAction");
      expect(calledEndpoints).toContain("findOneAuthAction");
    });

    it("should inject openapi config into experimental for each endpoint", () => {
      (authOpenAPIGenerator.getOpenApiConfig as jest.Mock).mockReturnValue({
        summary: "generated",
      });

      getAuthRouter();
      const router = getMockRouter();

      const getCall = router.get.mock.calls.find(
        ([config]: any) => config?.path === "/users/me"
      );
      expect(getCall[0].experimental?.openapi).toEqual({
        summary: "generated",
      });
    });

    it("should skip openapi injection when experimental.openapi is false", () => {
      (loadableRegistry as any).items = new Map();
      loadableRegistry.register({
        __type: "ArkosRouteHook",
        moduleName: "auth",
        _store: {
          login: {
            before: [],
            after: [],
            onError: [],
            experimental: { openapi: false },
          },
        },
      } as any);

      getAuthRouter();

      const calledEndpoints = (
        authOpenAPIGenerator.getOpenApiConfig as jest.Mock
      ).mock.calls.map(([, endpoint]) => endpoint);
      expect(calledEndpoints).not.toContain("login");
    });

    it("should preserve existing experimental config when injecting openapi", () => {
      (loadableRegistry as any).items = new Map();
      loadableRegistry.register({
        __type: "ArkosRouteHook",
        moduleName: "auth",
        _store: {
          getMe: {
            before: [],
            after: [],
            onError: [],
            experimental: { uploads: { type: "single", field: "avatar" } },
          },
        },
      } as any);

      getAuthRouter();
      const router = getMockRouter();

      const getCall = router.get.mock.calls.find(
        ([config]: any) => config?.path === "/users/me"
      );
      expect(getCall[0].experimental?.uploads).toEqual({
        type: "single",
        field: "avatar",
      });
      expect(getCall[0].experimental?.openapi).toBeDefined();
    });
  });

  describe("ArkosRouteHook registered", () => {
    const beforeGetMe = jest.fn();
    const afterGetMe = jest.fn();
    const onGetMeError = jest.fn();
    const beforeLogin = jest.fn();
    const afterLogin = jest.fn();

    beforeEach(() => {
      (loadableRegistry as any).items = new Map();
      loadableRegistry.register({
        __type: "ArkosRouteHook",
        moduleName: "auth",
        _store: {
          getMe: {
            before: [beforeGetMe],
            after: [afterGetMe],
            onError: [onGetMeError],
            prismaArgs: { include: { profile: true } },
            authentication: true,
          },
          login: {
            before: [beforeLogin],
            after: [afterLogin],
            onError: [],
            prismaArgs: { where: { active: true } },
            authentication: false,
          },
        },
      } as any);
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
  });

  describe("rateLimit handler", () => {
    it("should respond 429 with correct message", () => {
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
