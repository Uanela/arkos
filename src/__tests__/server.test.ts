import { IncomingMessage, Server, ServerResponse } from "http";
import { Express } from "express";
import { initApp, getArkosConfig, getExpressApp } from "../server";
import { ArkosConfig } from "../types/arkos-config";
import { bootstrap } from "../app";

// Mock dependencies
jest.mock("../app", () => ({
  bootstrap: jest.fn().mockResolvedValue({
    listen: jest.fn().mockReturnValue({
      close: jest.fn(),
    }),
  }),
}));

jest.mock("http");

// Spy on console methods
const consoleInfoSpy = jest.spyOn(console, "info").mockImplementation();
const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();

describe("Server Module", () => {
  let mockServer: Partial<
    Server<typeof IncomingMessage, typeof ServerResponse>
  >;
  let mockApp: Partial<Express>;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Mock the server and app
    mockServer = { close: jest.fn() };
    mockApp = {
      listen: jest.fn().mockImplementation((port, callback) => {
        if (typeof callback === "function") callback();
        return mockServer;
      }),
    };

    (bootstrap as jest.Mock).mockResolvedValue(mockApp);
  });

  afterEach(() => {
    // Clean up any test-specific process listeners
    process.removeAllListeners("unhandledRejection");
    process.removeAllListeners("uncaughtException");
  });

  describe("initApp", () => {
    it("initializes app with default config when no config is provided", async () => {
      const app = await initApp();

      expect(bootstrap).toHaveBeenCalledWith({
        welcomeMessage: expect.any(String),
        port: 8000,
        fileUpload: {
          baseUploadDir: "uploads",
          baseRoute: "/api/uploads",
        },
      });

      expect(mockApp.listen).toHaveBeenCalledWith(8000, expect.any(Function));
      expect(consoleInfoSpy).toHaveBeenCalledTimes(2); // Welcome message and port info
    });

    it("merges provided config with default config", async () => {
      const customConfig: ArkosConfig = {
        port: 9000,
        welcomeMessage: "Custom welcome message",
      };

      await initApp(customConfig);

      const expectedConfig = {
        welcomeMessage: "Custom welcome message",
        port: 9000,
        fileUpload: {
          baseUploadDir: "uploads",
          baseRoute: "/api/uploads",
        },
      };

      expect(bootstrap).toHaveBeenCalledWith(expectedConfig);
      expect(mockApp.listen).toHaveBeenCalledWith(9000, expect.any(Function));
    });

    it("starts server with host when provided", async () => {
      const customConfig: ArkosConfig = {
        port: 9000,
        host: "0.0.0.0",
      };

      await initApp(customConfig);

      expect(mockApp.listen).toHaveBeenCalledWith(
        [9000, "0.0.0.0"],
        expect.any(Function)
      );
    });

    it("does not start server when port is undefined", async () => {
      const customConfig: ArkosConfig = {
        port: undefined,
      };

      await initApp(customConfig);

      expect(mockApp.listen).not.toHaveBeenCalled();
    });

    it("logs environment when NODE_ENV is set", async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = "test";

      await initApp({ port: 8000 });

      expect(consoleInfoSpy).toHaveBeenCalledWith("Environment: test");

      // Restore original env
      process.env.NODE_ENV = originalEnv;
    });
  });

  describe("getArkosConfig", () => {
    it("returns the current config", async () => {
      const customConfig: ArkosConfig = {
        port: 9000,
      };

      await initApp(customConfig);
      const config = getArkosConfig();

      expect(config).toEqual({
        welcomeMessage: expect.any(String),
        port: 9000,
        host: "0.0.0.0",
        fileUpload: {
          baseUploadDir: "uploads",
          baseRoute: "/api/uploads",
        },
      });
    });
  });

  describe("getExpressApp", () => {
    it("returns the express app instance", async () => {
      await initApp();
      const app = getExpressApp();

      expect(app).toBe(mockApp);
    });
  });
});
