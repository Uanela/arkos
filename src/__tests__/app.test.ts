import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import compression from "compression";
import { rateLimit } from "express-rate-limit";
import { bootstrap, app } from "../app";
import { queryParser } from "../utils/helpers/query-parser.helpers";
import { loadPrismaModule } from "../utils/helpers/prisma.helpers";
import errorHandler from "../modules/error-handler/error-handler.controller";
import { getAuthRouter } from "../modules/auth/auth.router";
import {
  getPrismaModelsRouter,
  getAvailableResourcesAndRoutesRouter,
} from "../modules/base/base.router";
import { getFileUploaderRouter } from "../modules/file-uploader/file-uploader.router";
import deepmerge from "../utils/helpers/deepmerge.helper";

// Mock dependencies
jest.mock("express", () => {
  const mockRouter = {
    get: jest.fn().mockReturnThis(),
    post: jest.fn().mockReturnThis(),
    put: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    use: jest.fn().mockReturnThis(),
  };

  const mockExpress = jest.fn(() => ({
    get: jest.fn(),
    use: jest.fn(),
    listen: jest.fn(),
    set: jest.fn(),
  }));

  (mockExpress as any).Router = jest.fn(() => mockRouter);
  (mockExpress as any).json = jest.fn(() => "express.json");

  return mockExpress;
});

jest.mock("cors", () => jest.fn(() => "cors"));
jest.mock("cookie-parser", () => jest.fn(() => "cookieParser"));
jest.mock("compression", () => jest.fn(() => "compression"));
jest.mock("express-rate-limit", () => ({
  rateLimit: jest.fn(() => "rateLimit"),
}));
jest.mock("dotenv", () => ({
  config: jest.fn(),
}));

jest.mock("../utils/helpers/deepmerge.helper", () =>
  jest.fn((target, source) => ({ ...target, ...source }))
);

jest.mock("../utils/helpers/prisma.helpers", () => ({
  loadPrismaModule: jest.fn().mockResolvedValue(undefined),
  checkDatabaseConnection: jest
    .fn()
    .mockImplementation((req, res, next) => next()),
}));

jest.mock("../utils/helpers/query-parser.helpers", () => ({
  queryParser: jest.fn(() => "queryParser"),
}));

jest.mock("../modules/base/base.middlewares", () => ({
  handleRequestLogs: jest.fn().mockImplementation((req, res, next) => next()),
}));

jest.mock("../modules/error-handler/error-handler.controller", () =>
  jest
    .fn()
    .mockImplementation((err, req, res, next) =>
      res.status(500).json({ error: err.message })
    )
);

jest.mock("../modules/auth/auth.router", () => ({
  getAuthRouter: jest.fn().mockResolvedValue(jest.fn()),
}));

jest.mock("../modules/base/base.router", () => ({
  getPrismaModelsRouter: jest.fn().mockResolvedValue(jest.fn()),
  getAvailableResourcesAndRoutesRouter: jest.fn().mockReturnValue(jest.fn()),
}));

jest.mock("../modules/file-uploader/file-uploader.router", () => ({
  getFileUploaderRouter: jest.fn().mockResolvedValue(jest.fn()),
}));

describe("App Bootstrap", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("loads Prisma module on startup", async () => {
    await bootstrap({
      welcomeMessage: "Test API",
      port: 3000,
    });

    expect(loadPrismaModule).toHaveBeenCalled();
  });

  it("calls configureApp if provided in ArkosConfig", async () => {
    const configureApp = jest.fn();

    await bootstrap({
      welcomeMessage: "Test API",
      port: 3000,
      configureApp,
    });

    expect(configureApp).toHaveBeenCalledWith(expect.any(Object));
  });

  describe("Middleware Configuration", () => {
    it("registers default middlewares", async () => {
      await bootstrap({
        welcomeMessage: "Test API",
        port: 3000,
      });

      expect(compression).toHaveBeenCalled();
      expect(rateLimit).toHaveBeenCalled();
      expect(cors).toHaveBeenCalled();
      expect(express.json).toHaveBeenCalled();
      expect(cookieParser).toHaveBeenCalled();
      expect(queryParser).toHaveBeenCalled();
      expect(app.use).toHaveBeenCalledTimes(12);
    });

    it("skips disabled middlewares", async () => {
      await bootstrap({
        welcomeMessage: "Test API",
        port: 3000,
        middlewares: {
          disable: ["compression", "cors", "cookie-parser"],
        },
      });

      expect(compression).not.toHaveBeenCalled();
      expect(cors).not.toHaveBeenCalled();
      expect(cookieParser).not.toHaveBeenCalled();

      // These should still be called
      expect(rateLimit).toHaveBeenCalled();
      expect(express.json).toHaveBeenCalled();
      expect(queryParser).toHaveBeenCalled();
    });

    it("uses replaced middlewares", async () => {
      const customCompressionMiddleware = "customCompression";
      const customCorsMiddleware = "customCors";

      await bootstrap({
        welcomeMessage: "Test API",
        port: 3000,
        middlewares: {
          replace: {
            compression: customCompressionMiddleware as any,
            cors: customCorsMiddleware as any,
          },
        },
      });

      expect(compression).not.toHaveBeenCalled();
      expect(cors).not.toHaveBeenCalled();
      expect(app.use).toHaveBeenCalledWith("customCompression");
      expect(app.use).toHaveBeenCalledWith("customCors");
    });

    it("registers additional custom middlewares", async () => {
      const customMiddleware1 = jest.fn().mockReturnValue("customMiddleware1");
      const customMiddleware2 = jest.fn().mockReturnValue("customMiddleware2");

      await bootstrap({
        welcomeMessage: "Test API",
        port: 3000,
        middlewares: {
          additional: [customMiddleware1(), customMiddleware2()],
        },
      });

      expect(customMiddleware1).toHaveBeenCalled();
      expect(customMiddleware2).toHaveBeenCalled();
      expect(app.use).toHaveBeenCalledWith("customMiddleware1");
      expect(app.use).toHaveBeenCalledWith("customMiddleware2");
    });

    it("passes correct options to compression middleware", async () => {
      const compressionOptions = { level: 6, threshold: 1024 };

      await bootstrap({
        welcomeMessage: "Test API",
        port: 3000,
        compressionOptions,
      });

      expect(compression).toHaveBeenCalledWith(compressionOptions);
    });

    it("passes correct options to rate limit middleware", async () => {
      const rateLimitOptions = { windowMs: 30000, limit: 500 };

      await bootstrap({
        welcomeMessage: "Test API",
        port: 3000,
        globalRequestRateLimitOptions: rateLimitOptions,
      });

      // Check that deepmerge was called with default options and provided options
      expect(deepmerge).toHaveBeenCalledWith(
        expect.objectContaining({
          windowMs: 60 * 1000,
          limit: 500,
        }),
        rateLimitOptions
      );
    });

    it('configures cors with all origins when "*" is specified', async () => {
      await bootstrap({
        welcomeMessage: "Test API",
        port: 3000,
        cors: {
          allowedOrigins: "*",
        },
      });

      expect(cors).toHaveBeenCalledWith(
        expect.objectContaining({
          origin: expect.any(Function),
        })
      );

      // Test the origin callback
      const originCallback = (cors as jest.Mock).mock.calls[0][0].origin;
      const mockCallback = jest.fn();

      originCallback("https://example.com", mockCallback);
      expect(mockCallback).toHaveBeenCalledWith(null, true);
    });

    it("configures cors with specific origins", async () => {
      const allowedOrigins = ["https://example.com", "https://test.com"];

      await bootstrap({
        welcomeMessage: "Test API",
        port: 3000,
        cors: {
          allowedOrigins,
        },
      });

      expect(cors).toHaveBeenCalledWith(
        expect.objectContaining({
          origin: expect.any(Function),
        })
      );

      // Test the origin callback
      const originCallback = (cors as jest.Mock).mock.calls[0][0].origin;
      const mockCallback = jest.fn();

      originCallback("https://example.com", mockCallback);
      expect(mockCallback).toHaveBeenCalledWith(null, true);

      originCallback("https://not-allowed.com", mockCallback);
      expect(mockCallback).toHaveBeenCalledWith(null, false);
    });

    it("uses custom CORS handler if provided", async () => {
      const customHandler = jest.fn((origin, callback) => callback(null, true));

      await bootstrap({
        welcomeMessage: "Test API",
        port: 3000,
        cors: {
          customHandler,
        },
      });

      expect(cors).toHaveBeenCalledWith(customHandler);
    });
  });

  describe("Router Configuration", () => {
    it("registers default routers", async () => {
      await bootstrap({
        welcomeMessage: "Welcome to Test API",
        port: 3000,
      });

      expect(app.get).toHaveBeenCalledWith("/api", expect.any(Function));
      expect(getFileUploaderRouter).toHaveBeenCalled();
      expect(getPrismaModelsRouter).toHaveBeenCalled();
      expect(getAvailableResourcesAndRoutesRouter).toHaveBeenCalled();
    });

    it("skips disabled routers", async () => {
      await bootstrap({
        welcomeMessage: "Test API",
        port: 3000,
        routers: {
          disable: [
            "welcome-endpoint",
            "file-uploader",
            "prisma-models-router",
          ],
        },
      });

      expect(app.get).not.toHaveBeenCalledWith("/api", expect.any(Function));
      expect(getFileUploaderRouter).not.toHaveBeenCalled();
      expect(getPrismaModelsRouter).not.toHaveBeenCalled();

      // This should still be called
      expect(getAvailableResourcesAndRoutesRouter).toHaveBeenCalled();
    });

    it("uses replaced routers", async () => {
      const customWelcomeHandler = jest.fn();
      const customFileUploaderRouter = jest
        .fn()
        .mockResolvedValue(express.Router());
      const customPrismaModelsRouter = jest
        .fn()
        .mockResolvedValue(express.Router());

      await bootstrap({
        welcomeMessage: "Test API",
        port: 3000,
        routers: {
          replace: {
            welcomeEndpoint: customWelcomeHandler,
            fileUploader: customFileUploaderRouter,
            prismaModelsRouter: customPrismaModelsRouter,
          },
        },
      });

      expect(app.get).toHaveBeenCalledWith("/api", customWelcomeHandler);
      expect(customFileUploaderRouter).toHaveBeenCalled();
      expect(customPrismaModelsRouter).toHaveBeenCalled();
      expect(getFileUploaderRouter).not.toHaveBeenCalled();
      expect(getPrismaModelsRouter).not.toHaveBeenCalled();
    });

    it("registers auth router when authentication is configured", async () => {
      await bootstrap({
        welcomeMessage: "Test API",
        port: 3000,
        authentication: {
          mode: "static",
          jwt: {
            secret: "test-secret",
            expiresIn: "1d",
          },
        },
      });

      expect(getAuthRouter).toHaveBeenCalled();
      expect(app.use).toHaveBeenCalledWith("/api", expect.any(Function));
    });

    it("registers additional custom routers", async () => {
      const customRouter1 = express.Router();
      const customRouter2 = express.Router();

      await bootstrap({
        welcomeMessage: "Test API",
        port: 3000,
        routers: {
          additional: [customRouter1, customRouter2],
        },
      });

      expect(app.use).toHaveBeenCalledWith(customRouter1);
      expect(app.use).toHaveBeenCalledWith(customRouter2);
    });

    it("correctly handles welcome endpoint", async () => {
      const welcomeMessage = "Custom Welcome Message";

      await bootstrap({
        welcomeMessage,
        port: 3000,
      });

      // Get the welcome handler function
      const getHandler = (app.get as jest.Mock).mock.calls.find(
        (call) => call[0] === "/api"
      )[1];

      const req = {};
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      // Call the handler
      getHandler(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ message: welcomeMessage });
    });

    it("allows replacing the auth router", async () => {
      const customAuthRouter = jest.fn().mockResolvedValue("customAuthRouter");

      await bootstrap({
        welcomeMessage: "Test API",
        port: 3000,
        authentication: {
          mode: "static",
          jwt: {
            secret: "test-secret",
          },
        },
        routers: {
          replace: {
            authRouter: customAuthRouter,
          },
        },
      });

      expect(getAuthRouter).not.toHaveBeenCalled();
      expect(customAuthRouter).toHaveBeenCalledWith(
        expect.objectContaining({
          authentication: expect.objectContaining({
            mode: "static",
          }),
        })
      );
    });
  });

  it("registers error handler last", async () => {
    await bootstrap({
      welcomeMessage: "Test API",
      port: 3000,
    });

    // Mock app.use to capture the calls
    const useCalls = (app.use as jest.Mock).mock.calls;
    const lastUseCall = useCalls[useCalls.length - 1];

    // Check if the last middleware is the error handler
    expect(lastUseCall[0]).toBe(errorHandler);
  });

  it("returns the configured express app", async () => {
    const result = await bootstrap({
      welcomeMessage: "Test API",
      port: 3000,
    });

    expect(result).toBe(app);
  });
});
