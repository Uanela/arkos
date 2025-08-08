import { IncomingMessage, Server, ServerResponse } from "http";
import { Express } from "express";
import { initApp, getArkosConfig, getExpressApp } from "../server";
import { ArkosConfig } from "../types/arkos-config";
import { bootstrap } from "../app";
import http from "http";
import portAndHostAllocator from "../utils/features/port-and-host-allocator";

jest.mock("../utils/features/port-and-host-allocator");

// Mock dependencies
jest.mock("../app", () => ({
  bootstrap: jest.fn().mockResolvedValue({ port: 8000 }),
}));

jest.mock("../utils/sheu");
// Mock the http module
jest.mock("http", () => {
  const mockServer = {
    listen: jest.fn().mockImplementation((_, _1, callback) => {
      if (typeof callback === "function") callback();
      return mockServer;
    }),
    close: jest.fn(),
  };
  return {
    createServer: jest.fn().mockReturnValue(mockServer),
    Server: jest.fn(),
  };
});

jest.mock("fs");

// Spy on console methods
jest.spyOn(console, "info").mockImplementation();
jest.spyOn(console, "error").mockImplementation();

describe("Server Module", () => {
  let mockServer: Partial<
    Server<typeof IncomingMessage, typeof ServerResponse>
  >;
  let mockApp: Partial<Express>;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Setup http mock
    mockServer = (http.createServer as jest.Mock)();
    mockApp = {};

    (bootstrap as jest.Mock).mockResolvedValue(mockApp);

    (
      portAndHostAllocator.getHostAndAvailablePort as any as jest.Mock
    ).mockResolvedValue({ port: 8000, host: "localhost" });
  });

  afterEach(() => {
    // Clean up any test-specific process listeners
    process.removeAllListeners("unhandledRejection");
    process.removeAllListeners("uncaughtException");
  });

  describe("initApp", () => {
    it("initializes app with default config when no config is provided", async () => {
      (
        portAndHostAllocator.getHostAndAvailablePort as any as jest.Mock
      ).mockResolvedValue({ port: 8000, host: "localhost" });

      await initApp({ port: 8000 });

      expect(bootstrap).toHaveBeenCalledWith(
        expect.objectContaining({
          welcomeMessage: expect.any(String),
          port: 8000,
          host: "localhost",
          fileUpload: {
            baseUploadDir: "uploads",
            baseRoute: "/api/uploads",
          },
          available: true,
        })
      );

      expect(http.createServer).toHaveBeenCalledWith(mockApp);
      expect(mockServer.listen).toHaveBeenCalledWith(
        8000,
        "localhost",
        expect.any(Function)
      );
    });

    it("merges provided config with default config", async () => {
      (
        portAndHostAllocator.getHostAndAvailablePort as any as jest.Mock
      ).mockResolvedValue({ port: 9000, host: "localhost" });

      const customConfig: ArkosConfig = {
        port: 9000,
        welcomeMessage: "Welcome Sheu",
      };

      await initApp(customConfig);

      expect(bootstrap).toHaveBeenCalledWith(
        expect.objectContaining({
          welcomeMessage: "Welcome Sheu",
          port: 9000,
          host: "localhost",
          fileUpload: {
            baseUploadDir: "uploads",
            baseRoute: "/api/uploads",
          },
          available: true,
        })
      );

      expect(mockServer.listen).toHaveBeenCalledWith(
        9000,
        "localhost",
        expect.any(Function)
      );
    });

    it("starts server with host when provided", async () => {
      (
        portAndHostAllocator.getHostAndAvailablePort as any as jest.Mock
      ).mockResolvedValue({ port: 9000, host: "0.0.0.0" });

      const customConfig: ArkosConfig = {
        port: 9000,
        host: "0.0.0.0",
      };

      await initApp(customConfig);

      expect(mockServer.listen).toHaveBeenCalledWith(
        9000,
        "0.0.0.0",
        expect.any(Function)
      );
    });

    it("does not start server when port is undefined", async () => {
      // (
      //   portAndHostAllocator.getHostAndAvailablePort as any as jest.Mock
      // ).mockResolvedValue({ port: undefined, host: "localhost" });
      // Reset the createServer mock to ensure it's not called
      (http.createServer as jest.Mock).mockClear();

      const customConfig: ArkosConfig = {
        port: undefined,
      };

      await initApp(customConfig);

      // We only check that listen wasn't called since server is created even when port is undefined
      expect(mockServer.listen).not.toHaveBeenCalled();
    });

    it("calls configureServer when provided", async () => {
      const configureServerMock = jest.fn();
      const customConfig: ArkosConfig = {
        port: 8000, // Ensure port is defined so server is created
        configureServer: configureServerMock,
      };

      await initApp(customConfig);

      // The HTTP server should be passed to configureServer
      expect(configureServerMock).toHaveBeenCalled();
      expect(configureServerMock.mock.calls[0][0]).toBe(mockServer);
    });
  });

  describe("getArkosConfig", () => {
    it("returns the current config", async () => {
      (
        portAndHostAllocator.getHostAndAvailablePort as any as jest.Mock
      ).mockResolvedValue({ port: 9000, host: "0.0.0.0" });

      const customConfig: ArkosConfig = {
        port: 9000,
        host: "0.0.0.0", // Match the expected host
      };

      await initApp(customConfig);
      const config = getArkosConfig();

      // Use objectContaining instead of toEqual for more flexibility
      expect(config).toMatchObject({
        port: 9000,
        host: "0.0.0.0",
        available: true,
        fileUpload: {
          baseUploadDir: "uploads",
          baseRoute: "/api/uploads",
        },
      });
      expect(config.welcomeMessage).toBeDefined();
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
