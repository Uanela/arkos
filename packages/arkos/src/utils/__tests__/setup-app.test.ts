import setupApp from "../setup-app";
import { getArkosConfig } from "../helpers/arkos-config.helpers";
import { handleRequestLogs } from "../../modules/base/base.middlewares";
import debuggerService from "../../modules/debugger/debugger.service";
import { queryParser } from "../helpers/query-parser.helpers";
import compression from "compression";
import rateLimit from "express-rate-limit";
import cors from "cors";
import express from "express";
import cookieParser from "cookie-parser";

jest.mock("../helpers/arkos-config.helpers");
jest.mock("../helpers/query-parser.helpers", () => ({
  queryParser: jest.fn(() => "queryParserMiddleware"),
}));
jest.mock("../helpers/deepmerge.helper", () => ({
  __esModule: true,
  default: jest.fn((...args) => Object.assign({}, ...args)),
}));
jest.mock("../../modules/base/base.middlewares", () => ({
  handleRequestLogs: jest.fn(),
}));
jest.mock("../../modules/debugger/debugger.service", () => ({
  __esModule: true,
  default: { logRequestInfo: jest.fn() },
}));
jest.mock("compression", () => jest.fn(() => "compressionMiddleware"));
jest.mock("express-rate-limit", () => jest.fn(() => "rateLimitMiddleware"));
jest.mock("cors", () => jest.fn(() => "corsMiddleware"));
jest.mock("express", () => ({
  json: jest.fn(() => "expressJsonMiddleware"),
}));
jest.mock("cookie-parser", () => jest.fn(() => "cookieParserMiddleware"));

const mockGetArkosConfig = getArkosConfig as jest.Mock;

function makeMockApp() {
  return { use: jest.fn() };
}

describe("setupApp", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetArkosConfig.mockReturnValue({});
  });

  describe("compression middleware", () => {
    it("should apply compression with default options when not configured", () => {
      const app = makeMockApp();
      setupApp(app as any);
      expect(compression).toHaveBeenCalledWith({});
      expect(app.use).toHaveBeenCalledWith("compressionMiddleware");
    });

    it("should apply compression with custom options", () => {
      mockGetArkosConfig.mockReturnValue({
        middlewares: { compression: { level: 6 } },
      });
      const app = makeMockApp();
      setupApp(app as any);
      expect(compression).toHaveBeenCalledWith({ level: 6 });
    });

    it("should apply custom compression function directly", () => {
      const customCompression = jest.fn();
      mockGetArkosConfig.mockReturnValue({
        middlewares: { compression: customCompression },
      });
      const app = makeMockApp();
      setupApp(app as any);
      expect(app.use).toHaveBeenCalledWith(customCompression);
      expect(compression).not.toHaveBeenCalled();
    });

    it("should skip compression when set to false", () => {
      mockGetArkosConfig.mockReturnValue({
        middlewares: { compression: false },
      });
      const app = makeMockApp();
      setupApp(app as any);
      expect(compression).not.toHaveBeenCalled();
    });
  });

  describe("rateLimit middleware", () => {
    it("should apply rate limit with default options when not configured", () => {
      const app = makeMockApp();
      setupApp(app as any);
      expect(rateLimit).toHaveBeenCalledWith(
        expect.objectContaining({ windowMs: 60000, limit: 300 })
      );
      expect(app.use).toHaveBeenCalledWith("rateLimitMiddleware");
    });

    it("should merge custom rate limit options", () => {
      mockGetArkosConfig.mockReturnValue({
        middlewares: { rateLimit: { limit: 100 } },
      });
      const app = makeMockApp();
      setupApp(app as any);
      expect(rateLimit).toHaveBeenCalledWith(
        expect.objectContaining({ limit: 100 })
      );
    });

    it("should apply custom rateLimit function directly", () => {
      const customRateLimit = jest.fn();
      mockGetArkosConfig.mockReturnValue({
        middlewares: { rateLimit: customRateLimit },
      });
      const app = makeMockApp();
      setupApp(app as any);
      expect(app.use).toHaveBeenCalledWith(customRateLimit);
      expect(rateLimit).not.toHaveBeenCalled();
    });

    it("should skip rateLimit when set to false", () => {
      mockGetArkosConfig.mockReturnValue({
        middlewares: { rateLimit: false },
      });
      const app = makeMockApp();
      setupApp(app as any);
      expect(rateLimit).not.toHaveBeenCalled();
    });

    it("default handler should return 429 with message", () => {
      const app = makeMockApp();
      setupApp(app as any);

      const rateLimitCall = (rateLimit as jest.Mock).mock.calls[0][0];
      const mockRes = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      rateLimitCall.handler({}, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(429);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: "Too many requests, please try again later",
      });
    });
  });

  describe("cors middleware", () => {
    it("should apply cors with default config when not configured", () => {
      const app = makeMockApp();
      setupApp(app as any);
      expect(cors).toHaveBeenCalled();
      expect(app.use).toHaveBeenCalledWith("corsMiddleware");
    });

    it("should apply custom cors function directly", () => {
      const customCors = jest.fn();
      mockGetArkosConfig.mockReturnValue({
        middlewares: { cors: customCors },
      });
      const app = makeMockApp();
      setupApp(app as any);
      expect(app.use).toHaveBeenCalledWith(customCors);
      expect(cors).not.toHaveBeenCalled();
    });

    it("should use customHandler when provided", () => {
      const customHandler = jest.fn();
      mockGetArkosConfig.mockReturnValue({
        middlewares: { cors: { customHandler } },
      });
      const app = makeMockApp();
      setupApp(app as any);
      expect(cors).toHaveBeenCalledWith(customHandler);
    });

    it("should skip cors when set to false", () => {
      mockGetArkosConfig.mockReturnValue({ middlewares: { cors: false } });
      const app = makeMockApp();
      setupApp(app as any);
      expect(cors).not.toHaveBeenCalled();
    });

    describe("cors origin callback", () => {
      function getCorsOriginFn(corsConfig: object) {
        mockGetArkosConfig.mockReturnValue({
          middlewares: { cors: corsConfig },
        });
        const app = makeMockApp();
        setupApp(app as any);
        const corsCall = (cors as jest.Mock).mock.calls[0][0];
        return corsCall.origin;
      }

      it('should allow all origins when allowedOrigins is "*"', () => {
        const origin = getCorsOriginFn({ allowedOrigins: "*" });
        const cb = jest.fn();
        origin("http://example.com", cb);
        expect(cb).toHaveBeenCalledWith(null, true);
      });

      it("should allow origin when it is in the allowedOrigins array", () => {
        const origin = getCorsOriginFn({
          allowedOrigins: ["http://example.com"],
        });
        const cb = jest.fn();
        origin("http://example.com", cb);
        expect(cb).toHaveBeenCalledWith(null, true);
      });

      it("should reject origin not in the allowedOrigins array", () => {
        const origin = getCorsOriginFn({
          allowedOrigins: ["http://example.com"],
        });
        const cb = jest.fn();
        origin("http://other.com", cb);
        expect(cb).toHaveBeenCalledWith(null, false);
      });

      it("should allow undefined origin (same-origin requests) with array", () => {
        const origin = getCorsOriginFn({
          allowedOrigins: ["http://example.com"],
        });
        const cb = jest.fn();
        origin(undefined, cb);
        expect(cb).toHaveBeenCalledWith(null, true);
      });

      it("should allow matching origin when allowedOrigins is a string", () => {
        const origin = getCorsOriginFn({
          allowedOrigins: "http://example.com",
        });
        const cb = jest.fn();
        origin("http://example.com", cb);
        expect(cb).toHaveBeenCalledWith(null, true);
      });

      it("should reject non-matching origin when allowedOrigins is a string", () => {
        const origin = getCorsOriginFn({
          allowedOrigins: "http://example.com",
        });
        const cb = jest.fn();
        origin("http://other.com", cb);
        expect(cb).toHaveBeenCalledWith(null, false);
      });

      it("should allow undefined origin when allowedOrigins is a string", () => {
        const origin = getCorsOriginFn({
          allowedOrigins: "http://example.com",
        });
        const cb = jest.fn();
        origin(undefined, cb);
        expect(cb).toHaveBeenCalledWith(null, true);
      });

      it("should deny all when allowedOrigins is not set", () => {
        const origin = getCorsOriginFn({});
        const cb = jest.fn();
        origin("http://example.com", cb);
        expect(cb).toHaveBeenCalledWith(null, false);
      });
    });
  });

  describe("express.json middleware", () => {
    it("should apply express.json with default options when not configured", () => {
      const app = makeMockApp();
      setupApp(app as any);
      expect(express.json).toHaveBeenCalledWith({});
      expect(app.use).toHaveBeenCalledWith("expressJsonMiddleware");
    });

    it("should apply express.json with custom options", () => {
      mockGetArkosConfig.mockReturnValue({
        middlewares: { expressJson: { limit: "10mb" } },
      });
      const app = makeMockApp();
      setupApp(app as any);
      expect(express.json).toHaveBeenCalledWith({ limit: "10mb" });
    });

    it("should apply custom expressJson function directly", () => {
      const customJson = jest.fn();
      mockGetArkosConfig.mockReturnValue({
        middlewares: { expressJson: customJson },
      });
      const app = makeMockApp();
      setupApp(app as any);
      expect(app.use).toHaveBeenCalledWith(customJson);
      expect(express.json).not.toHaveBeenCalled();
    });

    it("should skip express.json when set to false", () => {
      mockGetArkosConfig.mockReturnValue({
        middlewares: { expressJson: false },
      });
      const app = makeMockApp();
      setupApp(app as any);
      expect(express.json).not.toHaveBeenCalled();
    });
  });

  describe("cookieParser middleware", () => {
    it("should apply cookieParser with no params when not configured", () => {
      const app = makeMockApp();
      setupApp(app as any);
      expect(cookieParser).toHaveBeenCalledWith();
      expect(app.use).toHaveBeenCalledWith("cookieParserMiddleware");
    });

    it("should apply cookieParser with array params", () => {
      mockGetArkosConfig.mockReturnValue({
        middlewares: { cookieParser: ["secret", { decode: jest.fn() }] },
      });
      const app = makeMockApp();
      setupApp(app as any);
      expect(cookieParser).toHaveBeenCalledWith("secret", expect.any(Object));
    });

    it("should apply custom cookieParser function directly", () => {
      const customCookieParser = jest.fn();
      mockGetArkosConfig.mockReturnValue({
        middlewares: { cookieParser: customCookieParser },
      });
      const app = makeMockApp();
      setupApp(app as any);
      expect(app.use).toHaveBeenCalledWith(customCookieParser);
      expect(cookieParser).not.toHaveBeenCalled();
    });

    it("should skip cookieParser when set to false", () => {
      mockGetArkosConfig.mockReturnValue({
        middlewares: { cookieParser: false },
      });
      const app = makeMockApp();
      setupApp(app as any);
      expect(cookieParser).not.toHaveBeenCalled();
    });
  });

  describe("queryParser middleware", () => {
    it("should apply queryParser with default options when not configured", () => {
      const app = makeMockApp();
      setupApp(app as any);
      expect(queryParser).toHaveBeenCalledWith(
        expect.objectContaining({
          parseNull: true,
          parseUndefined: true,
          parseBoolean: true,
          parseNumber: true,
        })
      );
      expect(app.use).toHaveBeenCalledWith("queryParserMiddleware");
    });

    it("should merge custom queryParser options", () => {
      mockGetArkosConfig.mockReturnValue({
        middlewares: { queryParser: { parseNumber: false } },
      });
      const app = makeMockApp();
      setupApp(app as any);
      expect(queryParser).toHaveBeenCalledWith(
        expect.objectContaining({ parseNumber: false })
      );
    });

    it("should apply custom queryParser function directly", () => {
      const customQueryParser = jest.fn();
      mockGetArkosConfig.mockReturnValue({
        middlewares: { queryParser: customQueryParser },
      });
      const app = makeMockApp();
      setupApp(app as any);
      expect(app.use).toHaveBeenCalledWith(customQueryParser);
    });

    it("should skip queryParser when set to false", () => {
      mockGetArkosConfig.mockReturnValue({
        middlewares: { queryParser: false },
      });
      const app = makeMockApp();
      setupApp(app as any);
      expect(queryParser).not.toHaveBeenCalled();
    });
  });

  describe("requestLogger middleware", () => {
    it("should apply handleRequestLogs by default", () => {
      const app = makeMockApp();
      setupApp(app as any);
      expect(app.use).toHaveBeenCalledWith(handleRequestLogs);
    });

    it("should apply custom requestLogger function directly", () => {
      const customLogger = jest.fn();
      mockGetArkosConfig.mockReturnValue({
        middlewares: { requestLogger: customLogger },
      });
      const app = makeMockApp();
      setupApp(app as any);
      expect(app.use).toHaveBeenCalledWith(customLogger);
      expect(app.use).not.toHaveBeenCalledWith(handleRequestLogs);
    });

    it("should skip requestLogger when set to false", () => {
      mockGetArkosConfig.mockReturnValue({
        middlewares: { requestLogger: false },
      });
      const app = makeMockApp();
      setupApp(app as any);
      expect(app.use).not.toHaveBeenCalledWith(handleRequestLogs);
    });
  });

  describe("debugger middleware", () => {
    it("should always apply debuggerService.logRequestInfo", () => {
      const app = makeMockApp();
      setupApp(app as any);
      expect(app.use).toHaveBeenCalledWith(debuggerService.logRequestInfo);
    });

    it("should apply logRequestInfo even when all other middlewares are disabled", () => {
      mockGetArkosConfig.mockReturnValue({
        middlewares: {
          compression: false,
          rateLimit: false,
          cors: false,
          expressJson: false,
          cookieParser: false,
          queryParser: false,
          requestLogger: false,
        },
      });
      const app = makeMockApp();
      setupApp(app as any);
      expect(app.use).toHaveBeenCalledTimes(1);
      expect(app.use).toHaveBeenCalledWith(debuggerService.logRequestInfo);
    });
  });

  describe("return value", () => {
    it("should return the app instance", () => {
      const app = makeMockApp();
      const result = setupApp(app as any);
      expect(result).toBe(app);
    });
  });

  describe("no config", () => {
    it("should apply all default middlewares when config is undefined", () => {
      mockGetArkosConfig.mockReturnValue(undefined);
      const app = makeMockApp();
      setupApp(app as any);
      expect(compression).toHaveBeenCalled();
      expect(rateLimit).toHaveBeenCalled();
      expect(cors).toHaveBeenCalled();
      expect(express.json).toHaveBeenCalled();
      expect(cookieParser).toHaveBeenCalled();
      expect(queryParser).toHaveBeenCalled();
      expect(app.use).toHaveBeenCalledWith(handleRequestLogs);
      expect(app.use).toHaveBeenCalledWith(debuggerService.logRequestInfo);
    });
  });
});
