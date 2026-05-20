import setupApp from "../setup-app";
import { handleRequestLogs } from "../../modules/base/base.middlewares";
import debuggerService from "../../modules/debugger/debugger.service";
import { queryParser } from "../helpers/query-parser.helpers";
import compression from "compression";
import rateLimit from "express-rate-limit";
import cors from "cors";
import express from "express";
import cookieParser from "cookie-parser";
import sheu from "../sheu";
import { isProduction, getArkosConfig } from "../helpers/arkos-config.helpers";
import { TooManyRequestsError } from "../../modules/error-handler/utils/errors";

jest.mock("../helpers/arkos-config.helpers", () => ({
  isProduction: jest.fn(),
  getArkosConfig: jest.fn(),
}));
jest.mock("../sheu", () => ({ warn: jest.fn() }));
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
const mockIsProduction = isProduction as jest.Mock;

function makeMockApp() {
  return { use: jest.fn() } as any;
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

    it("default handler should return 429 with message", async () => {
      const app = makeMockApp();
      setupApp(app as any);

      const rateLimitCall = (rateLimit as jest.Mock).mock.calls[0][0];
      const mockRes = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      const mockNext = jest.fn();

      await rateLimitCall.handler({}, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(TooManyRequestsError));
    });
  });

  describe("cors middleware", () => {
    it("should apply cors with default config when not configured", () => {
      const app = makeMockApp();
      setupApp(app as any);
      expect(cors).toHaveBeenCalled();
      expect(app.use).toHaveBeenCalledWith("corsMiddleware");
    });

    it("uses replaced middlewares", async () => {
      const app = makeMockApp();
      const customCompressionMiddleware = jest.fn();
      const customCorsMiddleware = jest.fn((_: any, _1: any, _2: any) => {});

      (getArkosConfig as jest.Mock).mockReturnValue({
        middlewares: {
          compression: customCompressionMiddleware as any,
          cors: customCorsMiddleware as any,
        },
      });

      setupApp(app);

      expect(compression).not.toHaveBeenCalled();
      expect(cors).not.toHaveBeenCalled();
      expect(app.use).toHaveBeenCalledWith(customCompressionMiddleware);
      expect(app.use).toHaveBeenCalledWith(customCorsMiddleware);
    });

    it('configures cors with * origins when "*" is specified', async () => {
      const app = makeMockApp();
      (getArkosConfig as jest.Mock).mockReturnValue({
        middlewares: {
          cors: { allowedOrigins: "*" },
        },
      });

      setupApp(app);

      expect(cors).toHaveBeenCalledWith(
        expect.objectContaining({
          origin: "*",
        })
      );

      const origin = (cors as jest.Mock).mock.calls[0][0].origin;

      expect(origin).toBe("*");
    });

    it("configures cors with specific origins", async () => {
      const app = makeMockApp();
      const allowedOrigins = ["https://example.com", "https://test.com"];
      (getArkosConfig as jest.Mock).mockReturnValue({
        middlewares: {
          cors: { allowedOrigins },
        },
      });

      setupApp(app);

      expect(cors).toHaveBeenCalledWith(
        expect.objectContaining({
          origin: allowedOrigins,
        })
      );

      // Test the origin callback
      const origin = (cors as jest.Mock).mock.calls[0][0].origin;
      expect(origin).toBe(allowedOrigins);
    });

    it("should apply custom cors function directly", () => {
      const customCors = jest.fn((_: any, _1: any, _2: any) => {});
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

    describe("cors middleware setup", () => {
      beforeEach(() => {
        jest.clearAllMocks();
      });

      describe("disabled", () => {
        it("should not apply cors when cors is false", () => {
          mockGetArkosConfig.mockReturnValue({
            middlewares: { cors: false },
          });
          const app = makeMockApp();
          setupApp(app as any);
          expect(cors).not.toHaveBeenCalled();
        });
      });

      describe("function shapes", () => {
        it("should use corsConfig as ArkosRequestHandler when function has arity >= 3", () => {
          const handler = jest.fn((req: any, res: any, next: any) => {});
          mockGetArkosConfig.mockReturnValue({
            middlewares: { cors: handler },
          });
          const app = makeMockApp();
          setupApp(app as any);
          expect(cors).not.toHaveBeenCalled();
          expect(app.use).toHaveBeenCalledWith(handler);
        });

        it("should pass CorsOptionsDelegate to cors() when function has arity < 3", () => {
          const delegate = jest.fn((req: any, cb: any) => {});
          mockGetArkosConfig.mockReturnValue({
            middlewares: { cors: delegate },
          });
          const app = makeMockApp();
          setupApp(app as any);
          expect(cors).toHaveBeenCalledWith(delegate);
        });
      });

      describe("deprecated shape warnings", () => {
        it("should warn when customHandler is used", () => {
          mockGetArkosConfig.mockReturnValue({
            middlewares: { cors: { customHandler: jest.fn() } },
          });
          const app = makeMockApp();
          setupApp(app as any);
          expect(sheu.warn).toHaveBeenCalledWith(
            expect.stringContaining("cors.customHandler is deprecated"),
            { timestamp: true }
          );
        });

        it("should warn when allowedOrigins is used", () => {
          mockGetArkosConfig.mockReturnValue({
            middlewares: { cors: { allowedOrigins: "*" } },
          });
          const app = makeMockApp();
          setupApp(app as any);
          expect(sheu.warn).toHaveBeenCalledWith(
            expect.stringContaining("cors.allowedOrigins is deprecated"),
            { timestamp: true }
          );
        });

        it("should warn when options is used", () => {
          mockGetArkosConfig.mockReturnValue({
            middlewares: { cors: { options: { maxAge: 600 } } },
          });
          const app = makeMockApp();
          setupApp(app as any);
          expect(sheu.warn).toHaveBeenCalledWith(
            expect.stringContaining("cors.options is deprecated"),
            { timestamp: true }
          );
        });
      });

      describe("deprecated allowedOrigins shape", () => {
        function getCorsOptions(corsConfig: object) {
          mockGetArkosConfig.mockReturnValue({
            middlewares: { cors: corsConfig },
          });
          const app = makeMockApp();
          setupApp(app as any);
          return (cors as jest.Mock).mock.calls[0][0];
        }

        it('should pass origin: "*" when allowedOrigins is "*"', () => {
          const options = getCorsOptions({ allowedOrigins: "*" });
          expect(options.origin).toBe("*");
        });

        it("should pass origin array when allowedOrigins is an array", () => {
          const options = getCorsOptions({
            allowedOrigins: ["http://example.com"],
          });
          expect(options.origin).toEqual(["http://example.com"]);
        });

        it("should pass origin string when allowedOrigins is a string", () => {
          const options = getCorsOptions({
            allowedOrigins: "http://example.com",
          });
          expect(options.origin).toBe("http://example.com");
        });

        it("should fall back to default origin when allowedOrigins is not set", () => {
          const options = getCorsOptions({});
          expect(options.origin).toBe(true); // dev default
        });

        it("should merge options on top of defaults", () => {
          const options = getCorsOptions({
            allowedOrigins: "http://example.com",
            options: { maxAge: 600 },
          });
          expect(options.origin).toBe("http://example.com");
          expect(options.maxAge).toBe(600);
        });

        it("should delegate to customHandler", () => {
          const handler = jest.fn();
          getCorsOptions({ customHandler: handler });
          expect(cors).toHaveBeenCalledWith(handler);
        });
      });

      describe("plain cors.CorsOptions", () => {
        it("should merge user options on top of defaults", () => {
          mockGetArkosConfig.mockReturnValue({
            middlewares: {
              cors: { origin: "http://example.com", credentials: true },
            },
          });
          const app = makeMockApp();
          setupApp(app as any);
          const options = (cors as jest.Mock).mock.calls[0][0];
          expect(options.origin).toBe("http://example.com");
          expect(options.credentials).toBe(true);
        });

        it("should keep default methods and allowedHeaders when not overridden", () => {
          mockGetArkosConfig.mockReturnValue({
            middlewares: { cors: { origin: "http://example.com" } },
          });
          const app = makeMockApp();
          setupApp(app as any);
          const options = (cors as jest.Mock).mock.calls[0][0];
          expect(options.methods).toEqual([
            "GET",
            "POST",
            "PUT",
            "DELETE",
            "PATCH",
            "OPTIONS",
          ]);
          expect(options.allowedHeaders).toEqual([
            "Content-Type",
            "Authorization",
            "Connection",
          ]);
        });
      });

      describe("defaults", () => {
        it("should apply dev defaults when no cors config is provided", () => {
          mockGetArkosConfig.mockReturnValue({ middlewares: {} });
          const app = makeMockApp();
          setupApp(app as any);
          const options = (cors as jest.Mock).mock.calls[0][0];
          expect(options.origin).toBe(true);
          expect(options.credentials).toBe(true);
        });

        it("should apply production defaults when in production", () => {
          mockIsProduction.mockReturnValue(true);
          mockGetArkosConfig.mockReturnValue({ middlewares: {} });
          const app = makeMockApp();
          setupApp(app as any);
          const options = (cors as jest.Mock).mock.calls[0][0];
          expect(options.origin).toBe("*");
          expect(options.credentials).toBe(false);
        });
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
      expect(cookieParser).toHaveBeenCalledWith(undefined, undefined);
      expect(app.use).toHaveBeenCalledWith("cookieParserMiddleware");
    });

    it("should apply cookieParser with array params", () => {
      mockGetArkosConfig.mockReturnValue({
        middlewares: {
          cookieParser: { secret: "secret", options: { decode: jest.fn() } },
        },
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

    it("should apply logRequestInfo and server listener checker even when all other middlewares are disabled", () => {
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
      expect(app.use).toHaveBeenCalledTimes(2);
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
