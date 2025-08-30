import { Express } from "express";
import {
  initApp,
  getArkosConfig,
  getExpressApp,
  terminateApplicationRunningProcessAndServer,
} from "../server";
import { ArkosConfig } from "../types/arkos-config";
import { bootstrap } from "../app";
import http from "http";
import portAndHostAllocator from "../utils/features/port-and-host-allocator";
import sheu from "../utils/sheu";

jest.mock("../utils/features/port-and-host-allocator");
jest.mock("../app", () => ({
  bootstrap: jest.fn().mockResolvedValue({}),
}));
jest.mock("../utils/sheu");
jest.mock("http", () => {
  const mockServer = {
    listen: jest.fn().mockImplementation((_, _1, callback) => {
      if (typeof callback === "function") callback();
      return mockServer;
    }),
    close: jest.fn().mockImplementation((callback) => {
      if (typeof callback === "function") callback();
    }),
  };
  return {
    createServer: jest.fn().mockReturnValue(mockServer),
    Server: jest.fn(),
  };
});

describe("Server Module", () => {
  let mockServer: any;
  let mockApp: Partial<Express>;
  let originalProcessEnv: NodeJS.ProcessEnv;
  let originalConsoleError: jest.SpyInstance;

  beforeEach(() => {
    mockServer = (http.createServer as jest.Mock)();
    mockApp = {};
    (bootstrap as jest.Mock).mockResolvedValue(mockApp);
    (
      portAndHostAllocator.getHostAndAvailablePort as jest.Mock
    ).mockResolvedValue({
      port: 8000,
      host: "localhost",
    });

    originalProcessEnv = { ...process.env };
    process.env.NODE_ENV = "test";

    // Mock console.error to track calls
    originalConsoleError = jest.spyOn(console, "error").mockImplementation();
  });

  afterEach(() => {
    process.env = originalProcessEnv;
    jest.clearAllMocks();
    originalConsoleError.mockRestore();
  });

  describe("getExpressApp", () => {
    it("returns undefined when app hasn't been initialized", () => {
      const app = getExpressApp();
      expect(app).toBeUndefined();
    });

    it("returns the express app instance", async () => {
      await initApp();
      const app = getExpressApp();

      expect(app).toBe(mockApp);
    });
  });

  describe("initApp", () => {
    it("initializes app with default config when no config is provided", async () => {
      await initApp();

      expect(bootstrap).toHaveBeenCalledWith(
        expect.objectContaining({
          welcomeMessage: expect.any(String),
          port: 8000,
          host: "localhost",
          fileUpload: expect.any(Object),
          available: true,
        })
      );

      expect(http.createServer).toHaveBeenCalledWith(mockApp);
      expect(mockServer.listen).toHaveBeenCalledWith(
        8000,
        "127.0.0.1",
        expect.any(Function)
      );
    });

    it("merges provided config with default config", async () => {
      const customConfig: ArkosConfig = {
        port: 9000,
        welcomeMessage: "Custom Welcome",
      };

      await initApp(customConfig);

      expect(bootstrap).toHaveBeenCalledWith(
        expect.objectContaining({
          welcomeMessage: "Custom Welcome",
          port: 9000,
          host: "localhost",
        })
      );
    });

    it("uses environment variables for port and host", async () => {
      process.env.CLI_PORT = "7000";
      process.env.CLI_HOST = "127.0.0.1";

      // Mock port allocator to return the env values
      (
        portAndHostAllocator.getHostAndAvailablePort as jest.Mock
      ).mockResolvedValue({
        port: 7000,
        host: "127.0.0.1",
      });

      await initApp();

      expect(mockServer.listen).toHaveBeenCalledWith(
        7000,
        "127.0.0.1",
        expect.any(Function)
      );
    });

    it("does not start server when port is undefined", async () => {
      const customConfig: ArkosConfig = { port: undefined };

      await initApp(customConfig);

      expect(mockServer.listen).not.toHaveBeenCalled();
      expect(sheu.warn).toHaveBeenCalledWith(
        expect.stringContaining("Port set to undefined")
      );
    });

    it("calls configureServer when provided", async () => {
      const configureServerMock = jest.fn();
      const customConfig: ArkosConfig = {
        port: 8000,
        configureServer: configureServerMock,
      };

      await initApp(customConfig);

      expect(configureServerMock).toHaveBeenCalledWith(mockServer);
    });

    it("handles errors during initialization", async () => {
      const error = new Error("Bootstrap failed");
      (bootstrap as jest.Mock).mockRejectedValueOnce(error);

      await initApp();

      expect(sheu.error).toHaveBeenCalledWith("Bootstrap failed");
      expect(console.error).toHaveBeenCalledWith(error);
    });

    it("handles case where portAndHostAllocator returns undefined", async () => {
      (
        portAndHostAllocator.getHostAndAvailablePort as jest.Mock
      ).mockResolvedValue(undefined);

      await initApp();

      expect(bootstrap).toHaveBeenCalledWith(
        expect.objectContaining({
          port: 8000, // Should fall back to default
          host: "localhost", // Should fall back to default
        })
      );
    });
  });

  describe("getArkosConfig", () => {
    it("returns the current config", async () => {
      await initApp();
      const config = getArkosConfig();

      expect(config).toMatchObject({
        port: 8000,
        host: "localhost",
        available: true,
        fileUpload: expect.any(Object),
      });
    });

    it("returns config even when initApp hasn't been called", () => {
      const config = getArkosConfig();
      expect(config).toHaveProperty("port");
      expect(config).toHaveProperty("host");
    });
  });

  describe("terminateApplicationRunningProcessAndServer", () => {
    it("closes the server and exits process", () => {
      const mockExit = jest.spyOn(process, "exit").mockImplementation();

      terminateApplicationRunningProcessAndServer();

      expect(mockServer.close).toHaveBeenCalled();
      expect(mockExit).toHaveBeenCalledWith(1);

      mockExit.mockRestore();
    });

    it("handles case when server is not defined", () => {
      const mockExit = jest.spyOn(process, "exit").mockImplementation();

      // Reset server reference
      (initApp as any).server = undefined;

      terminateApplicationRunningProcessAndServer();

      expect(mockExit).toHaveBeenCalledWith(1);

      mockExit.mockRestore();
    });
  });

  describe("Process Event Handlers", () => {
    let originalProcessListeners: any;

    beforeEach(() => {
      // Store original process listeners
      originalProcessListeners = {
        uncaughtException: process.listeners("uncaughtException"),
        unhandledRejection: process.listeners("unhandledRejection"),
      };

      // Remove existing listeners to avoid interference
      process.removeAllListeners("uncaughtException");
      process.removeAllListeners("unhandledRejection");

      // Import the server module again to register event handlers
      jest.resetModules();
      require("../server");
    });

    afterEach(() => {
      // Restore original process listeners
      process.removeAllListeners("uncaughtException");
      process.removeAllListeners("unhandledRejection");
      originalProcessListeners.uncaughtException.forEach((listener: any) =>
        process.on("uncaughtException", listener)
      );
      originalProcessListeners.unhandledRejection.forEach((listener: any) =>
        process.on("unhandledRejection", listener)
      );
    });

    it("handles uncaughtException", () => {
      const mockExit = jest.spyOn(process, "exit").mockImplementation();
      const error = new Error("Some cool error");

      process.emit("uncaughtException", error);

      expect(console.error).toHaveBeenCalledWith(error.name, error.message);
      expect(mockExit).toHaveBeenCalledWith(1);

      mockExit.mockRestore();
    });

    it("ignores EPIPE errors in uncaughtException", () => {
      const mockExit = jest.spyOn(process, "exit").mockImplementation();
      const error = new Error("EPIPE broken pipe");

      process.emit("uncaughtException", error);

      expect(mockExit).not.toHaveBeenCalled();
      expect(console.error).not.toHaveBeenCalled();

      mockExit.mockRestore();
    });

    it("handles unhandledRejection", async () => {
      const mockExit = jest.spyOn(process, "exit").mockImplementation();
      const error = new Error("Test rejection");

      (process as any).emit("unhandledRejection", error);

      expect(console.error).toHaveBeenCalledWith(error.name, error.message);

      mockExit.mockRestore();
    });

    //     it("handles unhandledRejection when server is not defined", () => {
    //       const mockExit = jest.spyOn(process, "exit").mockImplementation();
    //       const error = new Error("Test rejection");

    //       // Reset server reference
    //       (initApp as any).server = undefined;

    //       (process as any).emit("unhandledRejection", error);

    //       expect(sheu.error).toHaveBeenCalledWith(
    //         "\nUNHANDLED REJECTION! SHUTTING DOWN...\n",
    //         { timestamp: true, bold: true }
    //       );
    //       expect(console.error).toHaveBeenCalledWith(error.name, error.message);
    //       expect(mockExit).toHaveBeenCalledWith(1);

    //       mockExit.mockRestore();
    //     });
  });

  describe("Edge Cases", () => {
    it("handles case where portAndHostAllocator throws error", async () => {
      const error = new Error("Port allocation failed");
      (
        portAndHostAllocator.getHostAndAvailablePort as jest.Mock
      ).mockRejectedValueOnce(error);

      await initApp();

      expect(sheu.error).toHaveBeenCalledWith("Port allocation failed");
      expect(console.error).toHaveBeenCalledWith(error);
    });

    it("handles case where configureServer throws error", async () => {
      const configureServerMock = jest.fn().mockImplementation(() => {
        throw new Error("Configure server failed");
      });
      const customConfig: ArkosConfig = {
        port: 8000,
        configureServer: configureServerMock,
      };

      await initApp(customConfig);

      expect(configureServerMock).toHaveBeenCalledWith(mockServer);
      // Error should be caught and logged
      expect(console.error).toHaveBeenCalled();
    });

    it("handles case where server.listen callback throws error", async () => {
      const error = new Error("Server listen failed");
      mockServer.listen.mockImplementationOnce(
        (port: number, host: string, callback: Function) => {
          if (typeof callback === "function") {
            callback(error);
          }
          return mockServer;
        }
      );

      await initApp();

      // Error should be caught and logged
      expect(console.error).toHaveBeenCalled();
    });
  });
});
