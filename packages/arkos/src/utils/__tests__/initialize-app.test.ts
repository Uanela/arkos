import initializeApp from "../initialize-app";
import { getArkosConfig } from "../../server";
import { isAuthenticationEnabled } from "../helpers/arkos-config.helpers";
import { getFileUploadRouter } from "../../modules/file-upload/file-upload.router";
import { getAuthRouter } from "../../modules/auth/auth.router";
import {
  getAvailableResourcesAndRoutesRouter,
  getPrismaModelsRouter,
} from "../../modules/base/base.router";
import { getSwaggerRouter } from "../../modules/swagger/swagger.router";
import errorHandler from "../../modules/error-handler/error-handler.controller";
import { AppError } from "../../exports/error-handler";

jest.mock("../../server", () => ({ getArkosConfig: jest.fn() }));
jest.mock("../helpers/arkos-config.helpers", () => ({
  isAuthenticationEnabled: jest.fn(),
}));
jest.mock("../../modules/file-upload/file-upload.router", () => ({
  getFileUploadRouter: jest.fn(() => "fileUploadRouter"),
}));
jest.mock("../../modules/auth/auth.router", () => ({
  getAuthRouter: jest.fn(() => "authRouter"),
}));
jest.mock("../../modules/base/base.router", () => ({
  getPrismaModelsRouter: jest.fn(() => "modelsRouter"),
  getAvailableResourcesAndRoutesRouter: jest.fn(
    () => "availableResourcesRouter"
  ),
}));
jest.mock("../../modules/swagger/swagger.router", () => ({
  getSwaggerRouter: jest.fn(() => "swaggerRouter"),
}));
jest.mock("../../modules/error-handler/error-handler.controller", () => ({
  __esModule: true,
  default: jest.fn(),
}));
jest.mock("../../exports/error-handler", () => ({
  AppError: jest
    .fn()
    .mockImplementation(function (message, status, meta, code) {
      ///@ts-ignore
      const parent = this as any;
      parent.message = message;
      parent.status = status;
      parent.meta = meta;
      parent.code = code;
    }),
}));

const mockGetArkosConfig = getArkosConfig as jest.Mock;
const mockIsAuthenticationEnabled = isAuthenticationEnabled as jest.Mock;

function makeMockApp() {
  return {
    get: jest.fn(),
    use: jest.fn(),
  };
}

function baseConfig(overrides = {}) {
  return {
    globalPrefix: "/api",
    welcomeMessage: "Welcome",
    ...overrides,
  };
}

describe("initializeApp", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetArkosConfig.mockReturnValue(baseConfig());
    mockIsAuthenticationEnabled.mockReturnValue(false);
    delete process.env.ARKOS_BUILD;
  });

  describe("return value", () => {
    it("should return the app instance", () => {
      const app = makeMockApp();
      const result = initializeApp(app as any);
      expect(result).toBe(app);
    });
  });

  describe("globalPrefix", () => {
    it("should default to /api when not configured", () => {
      mockGetArkosConfig.mockReturnValue(
        baseConfig({ globalPrefix: undefined })
      );
      const app = makeMockApp();
      initializeApp(app as any);
      expect(app.get).toHaveBeenCalledWith(
        { path: "/api" },
        expect.any(Function)
      );
    });

    it("should use configured globalPrefix", () => {
      mockGetArkosConfig.mockReturnValue(baseConfig({ globalPrefix: "/v1" }));
      const app = makeMockApp();
      initializeApp(app as any);
      expect(app.get).toHaveBeenCalledWith(
        { path: "/v1" },
        expect.any(Function)
      );
    });
  });

  describe("welcomeRoute", () => {
    it("should register default welcome route handler", () => {
      const app = makeMockApp();
      initializeApp(app as any);
      expect(app.get).toHaveBeenCalledWith(
        { path: "/api" },
        expect.any(Function)
      );
    });

    it("default welcome handler responds with 200 and welcomeMessage", () => {
      mockGetArkosConfig.mockReturnValue(
        baseConfig({ welcomeMessage: "Hello!" })
      );
      const app = makeMockApp();
      initializeApp(app as any);

      const handler = (app.get as jest.Mock).mock.calls[0][1];
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      handler({}, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ message: "Hello!" });
    });

    it("should use custom welcomeRoute function when provided", () => {
      const customWelcome = jest.fn();
      mockGetArkosConfig.mockReturnValue(
        baseConfig({ routers: { welcomeRoute: customWelcome } })
      );
      const app = makeMockApp();
      initializeApp(app as any);
      expect(app.get).toHaveBeenCalledWith({ path: "/api" }, customWelcome);
    });

    it("should skip welcomeRoute when set to false", () => {
      mockGetArkosConfig.mockReturnValue(
        baseConfig({ routers: { welcomeRoute: false } })
      );
      const app = makeMockApp();
      initializeApp(app as any);
      expect(app.get).not.toHaveBeenCalled();
    });
  });

  describe("file upload router", () => {
    it("should always mount fileUploadRouter", () => {
      const app = makeMockApp();
      initializeApp(app as any);
      expect(getFileUploadRouter).toHaveBeenCalledWith(expect.any(Object));
      expect(app.use).toHaveBeenCalledWith("fileUploadRouter");
    });
  });

  describe("auth router", () => {
    it("should mount authRouter when authentication is enabled", () => {
      mockIsAuthenticationEnabled.mockReturnValue(true);
      const app = makeMockApp();
      initializeApp(app as any);
      expect(getAuthRouter).toHaveBeenCalledWith(expect.any(Object));
      expect(app.use).toHaveBeenCalledWith("/api", "authRouter");
    });

    it("should not mount authRouter when authentication is disabled", () => {
      mockIsAuthenticationEnabled.mockReturnValue(false);
      const app = makeMockApp();
      initializeApp(app as any);
      expect(getAuthRouter).not.toHaveBeenCalled();
      expect(app.use).not.toHaveBeenCalledWith("/api", "authRouter");
    });
  });

  describe("models and resources routers", () => {
    it("should always mount modelsRouter under globalPrefix", () => {
      const app = makeMockApp();
      initializeApp(app as any);
      expect(getPrismaModelsRouter).toHaveBeenCalledWith(expect.any(Object));
      expect(app.use).toHaveBeenCalledWith("/api", "modelsRouter");
    });

    it("should always mount availableResourcesRouter under globalPrefix", () => {
      const app = makeMockApp();
      initializeApp(app as any);
      expect(getAvailableResourcesAndRoutesRouter).toHaveBeenCalled();
      expect(app.use).toHaveBeenCalledWith("/api", "availableResourcesRouter");
    });
  });

  describe("swagger router", () => {
    it("should mount swagger when config.swagger is set and ARKOS_BUILD is not true", () => {
      mockGetArkosConfig.mockReturnValue(
        baseConfig({ swagger: { enableAfterBuild: false } })
      );
      const app = makeMockApp();
      initializeApp(app as any);
      expect(getSwaggerRouter).toHaveBeenCalled();
      expect(app.use).toHaveBeenCalledWith("/api", "swaggerRouter");
    });

    it("should mount swagger when ARKOS_BUILD is true and enableAfterBuild is true", () => {
      process.env.ARKOS_BUILD = "true";
      mockGetArkosConfig.mockReturnValue(
        baseConfig({ swagger: { enableAfterBuild: true } })
      );
      const app = makeMockApp();
      initializeApp(app as any);
      expect(getSwaggerRouter).toHaveBeenCalled();
      expect(app.use).toHaveBeenCalledWith("/api", "swaggerRouter");
    });

    it("should not mount swagger when ARKOS_BUILD is true and enableAfterBuild is not true", () => {
      process.env.ARKOS_BUILD = "true";
      mockGetArkosConfig.mockReturnValue(
        baseConfig({ swagger: { enableAfterBuild: false } })
      );
      const app = makeMockApp();
      initializeApp(app as any);
      expect(getSwaggerRouter).not.toHaveBeenCalled();
    });

    it("should not mount swagger when config.swagger is not set", () => {
      const app = makeMockApp();
      initializeApp(app as any);
      expect(getSwaggerRouter).not.toHaveBeenCalled();
    });
  });

  describe("catch-all 404 route", () => {
    it("should register a wildcard route that throws AppError", () => {
      const app = makeMockApp();
      initializeApp(app as any);

      const wildcardCall = (app.use as jest.Mock).mock.calls.find(
        (call) => call[0] === "*"
      );
      expect(wildcardCall).toBeDefined();

      const handler = wildcardCall[1];
      const req = { originalUrl: "/unknown/path" };

      expect(() => handler(req)).toThrow();
      expect(AppError).toHaveBeenCalledWith(
        "Route not found",
        404,
        { route: "/unknown/path" },
        "RouteNotFound"
      );
    });
  });

  describe("errorHandler middleware", () => {
    it("should apply default errorHandler when not configured", () => {
      const app = makeMockApp();
      initializeApp(app as any);
      expect(app.use).toHaveBeenCalledWith(errorHandler);
    });

    it("should apply custom errorHandler function when provided", () => {
      const customErrorHandler = jest.fn();
      mockGetArkosConfig.mockReturnValue(
        baseConfig({ middlewares: { errorHandler: customErrorHandler } })
      );
      const app = makeMockApp();
      initializeApp(app as any);
      expect(app.use).toHaveBeenCalledWith(customErrorHandler);
      expect(app.use).not.toHaveBeenCalledWith(errorHandler);
    });

    it("should skip errorHandler when set to false", () => {
      mockGetArkosConfig.mockReturnValue(
        baseConfig({ middlewares: { errorHandler: false } })
      );
      const app = makeMockApp();
      initializeApp(app as any);
      expect(app.use).not.toHaveBeenCalledWith(errorHandler);
    });
  });
});
