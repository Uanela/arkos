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
import { getFileUploadRouter } from "../modules/file-upload/file-upload.router";
import deepmerge from "../utils/helpers/deepmerge.helper";
import { getArkosConfig } from "../exports";
import { isAuthenticationEnabled } from "../utils/helpers/arkos-config.helpers";

jest.mock("../utils/helpers/arkos-config.helpers");
jest.mock("fs", () => ({
  ...jest.requireActual("fs"),
  readdirSync: jest.fn(),
  readFileSync: jest.fn(),
}));

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
    static: jest.fn().mockReturnThis(),
  }));

  (mockExpress as any).static = jest.fn(() => mockRouter);
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
    .mockImplementation((_, _1, next) => next()),
}));

jest.mock("../utils/helpers/query-parser.helpers", () => ({
  queryParser: jest.fn(() => "queryParser"),
}));

jest.mock("../modules/base/base.middlewares", () => ({
  handleRequestLogs: jest.fn().mockImplementation((_, _1, next) => next()),
}));

jest.mock("../modules/error-handler/error-handler.controller", () =>
  jest
    .fn()
    .mockImplementation((err, _, res, _1) =>
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

jest.mock("../modules/file-upload/file-upload.router", () => ({
  getFileUploadRouter: jest.fn().mockResolvedValue(jest.fn()),
}));
jest.mock("../server", () => ({
  getArkosConfig: jest.fn(() => ({})),
}));

describe("App Bootstrap", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("loads Prisma module on startup", async () => {
    await bootstrap({});

    expect(loadPrismaModule).toHaveBeenCalled();
  });

  it("calls configureApp if provided in ArkosConfig", async () => {
    const configureApp = jest.fn();

    await bootstrap({
      configureApp,
    });

    expect(configureApp).toHaveBeenCalledWith(expect.any(Object));
  });

  describe("Middleware Configuration", () => {
    it("registers default middlewares", async () => {
      await bootstrap({});

      expect(compression).toHaveBeenCalled();
      expect(rateLimit).toHaveBeenCalled();
      expect(cors).toHaveBeenCalled();
      expect(express.json).toHaveBeenCalled();
      expect(cookieParser).toHaveBeenCalled();
      expect(queryParser).toHaveBeenCalled();
      expect(app.use).toHaveBeenCalledTimes(12);
    });

    it("skips disabled middlewares", async () => {
      (getArkosConfig as jest.Mock).mockReturnValue({
        middlewares: { compression: false, cors: false, cookieParser: false },
      });

      await bootstrap({
        use: [],
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
      const customCompressionMiddleware = jest.fn();
      const customCorsMiddleware = jest.fn();

      (getArkosConfig as jest.Mock).mockReturnValue({
        middlewares: {
          compression: customCompressionMiddleware as any,
          cors: customCorsMiddleware as any,
        },
      });

      await bootstrap({});

      expect(compression).not.toHaveBeenCalled();
      expect(cors).not.toHaveBeenCalled();
      expect(app.use).toHaveBeenCalledWith(customCompressionMiddleware);
      expect(app.use).toHaveBeenCalledWith(customCorsMiddleware);
    });

    it("registers additional custom middlewares", async () => {
      const customMiddleware1 = jest.fn().mockReturnValue("customMiddleware1");
      const customMiddleware2 = jest.fn().mockReturnValue("customMiddleware2");

      await bootstrap({
        use: [customMiddleware1(), customMiddleware2()],
      });

      expect(customMiddleware1).toHaveBeenCalled();
      expect(customMiddleware2).toHaveBeenCalled();
      expect(app.use).toHaveBeenCalledWith("customMiddleware1");
      expect(app.use).toHaveBeenCalledWith("customMiddleware2");
    });

    it("passes correct options to compression middleware", async () => {
      const compressionOptions = { level: 6, threshold: 1024 };

      (getArkosConfig as jest.Mock).mockReturnValue({
        middlewares: {
          compression: compressionOptions,
        },
      });
      await bootstrap({});

      expect(compression).toHaveBeenCalledWith(compressionOptions);
    });

    it("passes correct options to rate limit middleware", async () => {
      const rateLimitOptions = { windowMs: 30000, limit: 500 };

      (getArkosConfig as jest.Mock).mockReturnValue({
        middlewares: {
          rateLimit: rateLimitOptions,
        },
      });

      await bootstrap({});

      expect(deepmerge).toHaveBeenCalledWith(
        expect.objectContaining({
          windowMs: 60 * 1000,
          limit: 300,
        }),
        rateLimitOptions
      );
    });

    it('configures cors with all origins when "*" is specified', async () => {
      (getArkosConfig as jest.Mock).mockReturnValue({
        middlewares: {
          cors: { allowedOrigins: "*" },
        },
      });
      await bootstrap({});

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
      (getArkosConfig as jest.Mock).mockReturnValue({
        middlewares: {
          cors: { allowedOrigins },
        },
      });

      await bootstrap({});

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
      const customHandler = jest.fn((_, callback) => callback(null, true));

      (getArkosConfig as jest.Mock).mockReturnValue({
        middlewares: {
          cors: customHandler,
        },
      });
      const app = await bootstrap({});

      expect(app.use).toHaveBeenCalledWith(customHandler);
    });
  });

  describe("Router Configuration", () => {
    it("registers default routers", async () => {
      await bootstrap({});

      expect(app.get).toHaveBeenCalledWith("/api", expect.any(Function));
      expect(getFileUploadRouter).toHaveBeenCalled();
      expect(getPrismaModelsRouter).toHaveBeenCalled();
      expect(getAvailableResourcesAndRoutesRouter).toHaveBeenCalled();
    });

    it("registers auth router when authentication is configured", async () => {
      (isAuthenticationEnabled as jest.Mock).mockReturnValue(true);
      await bootstrap({});

      expect(getAuthRouter).toHaveBeenCalled();
      expect(app.use).toHaveBeenCalledWith("/api", expect.any(Function));
    });

    it("registers additional custom routers", async () => {
      const customRouter1 = "Router1";
      const customRouter2 = "Router2";

      await bootstrap({
        use: [customRouter1, customRouter2] as any,
      });

      expect(app.use).toHaveBeenCalledWith(customRouter1);
      expect(app.use).toHaveBeenCalledWith(customRouter2);
    });

    it("correctly handles welcome endpoint", async () => {
      const welcomeMessage = "Custom Welcome Message";

      (getArkosConfig as jest.Mock).mockReturnValue({
        welcomeMessage,
      });
      await bootstrap({});

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

    // it("allows replacing the auth router", async () => {
    //   const customAuthRouter = jest.fn().mockResolvedValue("customAuthRouter");
    //   (getArkosConfig as jest.Mock).mockReturnValue({
    //     authentication: {
    //       mode: "static",
    //       jwt: {
    //         secret: "test-secret",
    //       },
    //     },
    //   });

    //   await bootstrap({
    //   });

    //   expect(getAuthRouter).not.toHaveBeenCalled();
    //   expect(customAuthRouter).toHaveBeenCalledWith(
    //     expect.objectContaining({
    //       authentication: expect.objectContaining({
    //         mode: "static",
    //       }),
    //     })
    //   );
    // });
  });

  it("registers error handler as last but one", async () => {
    await bootstrap({});

    const useCalls = (app.use as jest.Mock).mock.calls;
    const lastCall = useCalls[useCalls.length - 1];

    expect(lastCall[0]).toBe(errorHandler);
  });

  // it("registers not found last", async () => {
  //   await bootstrap({
  //     welcomeMessage: "Test API",
  //     port: 3000,
  //   });

  //   // Mock app.use to capture the calls
  //   const useCalls = (app.use as jest.Mock).mock.calls;
  //   const lastUseCall = useCalls[useCalls.length - 1];

  //   // Check if the last middleware is the error handler
  //   expect(lastUseCall[0]).toBe(any.Function);
  // });

  it("returns the configured express app", async () => {
    const result = await bootstrap({});

    expect(result).toBe(app);
  });
});
