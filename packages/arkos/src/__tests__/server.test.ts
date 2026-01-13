import { Express } from "express";
import http from "http";
import sheu from "../utils/sheu";
import { ArkosInitConfig } from "../types/arkos-config";

const mockProcessExit = jest
  .spyOn(process, "exit")
  .mockImplementation((code?: any) => {
    throw new Error(`process.exit called with ${code}`);
  });

jest.useFakeTimers();

import * as server from "../server";
import { bootstrap } from "../app";
import portAndHostAllocator from "../utils/features/port-and-host-allocator";
import runtimeCliCommander from "../utils/cli/utils/runtime-cli-commander";
import * as arkosConfigHelpers from "../utils/helpers/arkos-config.helpers";

const {
  initApp,
  getExpressApp,
  terminateApplicationRunningProcessAndServer,
  getArkosConfig,
} = server;

jest.mock("../app");
jest.mock("../utils/features/port-and-host-allocator");
jest.mock("../utils/sheu");
jest.mock("../utils/cli/utils/runtime-cli-commander");
jest.mock("../utils/prisma/prisma-schema-parser", () => ({
  getModelsAsArrayOfStrings: jest.fn(() => []),
  parse: jest.fn(),
}));
jest.mock("fs");
jest.mock("http", () => {
  const mockServer = {
    listen: jest.fn().mockImplementation((_: any, _1: any, callback: any) => {
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
    mockApp = { use: jest.fn(), get: jest.fn() } as any;
    (bootstrap as jest.Mock).mockResolvedValue(mockApp);
    (portAndHostAllocator.getFirstNonLocalIp as jest.Mock).mockReturnValue(
      "192.168.1.100"
    );

    originalProcessEnv = { ...process.env };
    process.env.NODE_ENV = "test";
    process.env.__PORT = "8000";
    process.env.__HOST = "127.0.0.1";
    delete process.env.CLI_COMMAND;
    delete process.env.CLI;
    delete process.env.ARKOS_BUILD;

    originalConsoleError = jest.spyOn(console, "error").mockImplementation();
    mockProcessExit.mockClear();
  });

  afterEach(() => {
    process.env = originalProcessEnv;
    jest.clearAllMocks();
    originalConsoleError.mockRestore();
  });

  describe("getExpressApp", () => {
    it("should return undefined when app has not been initialized", () => {
      const app = getExpressApp();
      expect(app).toBeUndefined();
    });

    it("should return the express app instance after initialization", async () => {
      await initApp();
      const app = getExpressApp();
      expect(app).toBe(mockApp);
    });
  });

  describe("getArkosConfig", () => {
    it("should return default config", () => {
      const config = getArkosConfig();
      expect(config).toHaveProperty("port");
      expect(config).toHaveProperty("host");
      expect(config).toHaveProperty("welcomeMessage");
    });

    it("should include file upload configuration", () => {
      const config = getArkosConfig();
      expect(config.fileUpload).toEqual({
        baseUploadDir: "uploads",
        baseRoute: "/api/uploads",
      });
    });
  });

  describe("initApp - Basic Initialization", () => {
    it("should initialize app with default config when no config is provided", async () => {
      await initApp();

      expect(bootstrap).toHaveBeenCalledWith({});
      expect(http.createServer).toHaveBeenCalledWith(mockApp);
      expect(mockServer.listen).toHaveBeenCalledWith(
        8000,
        "127.0.0.1",
        expect.any(Function)
      );
    });

    it("should initialize app with empty config object", async () => {
      await initApp({});

      expect(bootstrap).toHaveBeenCalledWith({});
      expect(mockServer.listen).toHaveBeenCalled();
    });

    it("should call bootstrap with provided config", async () => {
      const customConfig: ArkosInitConfig = {
        use: [],
      };

      await initApp(customConfig);

      expect(bootstrap).toHaveBeenCalledWith(customConfig);
    });
  });

  describe("initApp - Port and Host Configuration", () => {
    it("should use __PORT environment variable", async () => {
      process.env.__PORT = "3000";
      process.env.__HOST = "0.0.0.0";

      await initApp();

      expect(mockServer.listen).toHaveBeenCalledWith(
        3000,
        "0.0.0.0",
        expect.any(Function)
      );
    });

    it("should convert localhost to 127.0.0.1 when listening", async () => {
      process.env.__PORT = "8080";
      process.env.__HOST = "localhost";

      await initApp();

      expect(mockServer.listen).toHaveBeenCalledWith(
        8080,
        "127.0.0.1",
        expect.any(Function)
      );
    });

    it("should not start server when port is undefined in config", async () => {
      jest.spyOn(arkosConfigHelpers, "getArkosConfig").mockReturnValueOnce({
        port: undefined,
        host: "0.0.0.0",
        welcomeMessage: "Test",
        fileUpload: { baseUploadDir: "uploads", baseRoute: "/api/uploads" },
        routers: { strict: false },
        debugging: { requests: { level: 1 } },
      });

      await initApp();

      expect(mockServer.listen).not.toHaveBeenCalled();
      expect(sheu.warn).toHaveBeenCalledWith(
        expect.stringContaining("Port set to undefined")
      );
    });

    it("should handle numeric port values", async () => {
      process.env.__PORT = "9999";
      process.env.__HOST = "127.0.0.1";

      await initApp();

      expect(mockServer.listen).toHaveBeenCalledWith(
        9999,
        "127.0.0.1",
        expect.any(Function)
      );
    });
  });

  describe("initApp - Server Configuration", () => {
    it("should call configureServer when provided", async () => {
      const configureServerMock = jest.fn().mockResolvedValue(undefined);
      const customConfig: ArkosInitConfig = {
        configureServer: configureServerMock,
      };

      process.env.__PORT = "8000";
      process.env.__HOST = "127.0.0.1";

      await initApp(customConfig);

      expect(configureServerMock).toHaveBeenCalledWith(mockServer);
    });

    // it("should await async configureServer", async () => {
    //   let resolved = false;
    //   const configureServerMock = jest.fn().mockImplementation(async () => {
    //     await new Promise((resolve) => setTimeout(resolve, 10));
    //     resolved = true;
    //   });

    //   process.env.__PORT = "8000";
    //   process.env.__HOST = "127.0.0.1";

    //   await initApp({ configureServer: configureServerMock });
    //   jest.advanceTimersByTime(100);

    //   expect(resolved).toBe(true);
    // });

    it("should handle configureServer throwing error", async () => {
      const error = new Error("Configure server failed");
      const configureServerMock = jest.fn().mockRejectedValue(error);

      process.env.__PORT = "8000";
      process.env.__HOST = "127.0.0.1";

      await expect(
        initApp({ configureServer: configureServerMock })
      ).rejects.toThrow("Configure server failed");

      expect(sheu.error).toHaveBeenCalledWith("Configure server failed");
      expect(console.error).toHaveBeenCalledWith(error);
    });
  });

  describe("initApp - Server Messages", () => {
    it("should display development server message by default", async () => {
      process.env.__PORT = "8000";
      process.env.__HOST = "127.0.0.1";
      delete process.env.ARKOS_BUILD;

      await initApp();

      const calls = (sheu.ready as jest.Mock).mock.calls;
      const devServerCall = calls.find(
        (call) =>
          call[0].includes("Development server") &&
          call[0].includes("localhost:8000")
      );
      expect(devServerCall).toBeDefined();
    });

    it("should display production server message when ARKOS_BUILD is true", async () => {
      process.env.ARKOS_BUILD = "true";
      process.env.__PORT = "8000";
      process.env.__HOST = "127.0.0.1";

      await initApp();

      const calls = (sheu.ready as jest.Mock).mock.calls;
      const prodServerCall = calls.find(
        (call) =>
          call[0].includes("Production server") &&
          call[0].includes("localhost:8000")
      );
      expect(prodServerCall).toBeDefined();
    });

    it("should display network server message when host is 0.0.0.0", async () => {
      process.env.__PORT = "8000";
      process.env.__HOST = "0.0.0.0";

      await initApp();

      const calls = (sheu.ready as jest.Mock).mock.calls;
      const networkCall = calls.find(
        (call) =>
          call[0].includes("Network server") &&
          call[0].includes("192.168.1.100:8000")
      );
      expect(networkCall).toBeDefined();
    });

    it("should not display network server message when host is not 0.0.0.0", async () => {
      process.env.__PORT = "8000";
      process.env.__HOST = "127.0.0.1";

      await initApp();

      const calls = (sheu.ready as jest.Mock).mock.calls;
      const networkCall = calls.find((call) =>
        call[0].includes("Network server")
      );
      expect(networkCall).toBeUndefined();
    });

    it("should display custom host when not localhost or 0.0.0.0", async () => {
      process.env.__PORT = "8000";
      process.env.__HOST = "example.com";

      await initApp();

      const calls = (sheu.ready as jest.Mock).mock.calls;
      const customHostCall = calls.find((call) =>
        call[0].includes("example.com:8000")
      );
      expect(customHostCall).toBeDefined();
    });
  });

  describe("initApp - Swagger Documentation Messages", () => {
    it("should display swagger documentation message when swagger mode is enabled", async () => {
      jest.spyOn(arkosConfigHelpers, "getArkosConfig").mockReturnValue({
        port: 8000,
        host: "0.0.0.0",
        welcomeMessage: "Test",
        fileUpload: { baseUploadDir: "uploads", baseRoute: "/api/uploads" },
        routers: { strict: false },
        debugging: { requests: { level: 1 } },
        swagger: {
          mode: "zod",
          endpoint: "/api/docs",
        },
      });

      await initApp();

      expect(sheu.ready).toHaveBeenCalledWith(
        expect.stringContaining(
          "Documentation waiting on http://localhost:8000/api/docs"
        )
      );
    });

    it("should use default swagger endpoint when not specified", async () => {
      jest.spyOn(arkosConfigHelpers, "getArkosConfig").mockReturnValue({
        port: 8000,
        host: "0.0.0.0",
        welcomeMessage: "Test",
        fileUpload: { baseUploadDir: "uploads", baseRoute: "/api/uploads" },
        routers: { strict: false },
        debugging: { requests: { level: 1 } },
        swagger: {
          mode: "prisma",
        },
      });

      await initApp();

      expect(sheu.ready).toHaveBeenCalledWith(
        expect.stringContaining("/api/docs")
      );
    });

    it("should not display swagger message when ARKOS_BUILD is true and enableAfterBuild is false", async () => {
      process.env.ARKOS_BUILD = "true";
      jest.spyOn(arkosConfigHelpers, "getArkosConfig").mockReturnValue({
        port: 8000,
        host: "0.0.0.0",
        welcomeMessage: "Test",
        fileUpload: { baseUploadDir: "uploads", baseRoute: "/api/uploads" },
        routers: { strict: false },
        debugging: { requests: { level: 1 } },
        swagger: {
          mode: "zod",
          endpoint: "/api/docs",
          enableAfterBuild: false,
        },
      });

      await initApp();

      const calls = (sheu.ready as jest.Mock).mock.calls;
      const swaggerCall = calls.find((call) =>
        call[0].includes("Documentation")
      );
      expect(swaggerCall).toBeUndefined();
    });

    it("should display swagger message when ARKOS_BUILD is true and enableAfterBuild is true", async () => {
      process.env.ARKOS_BUILD = "true";
      jest.spyOn(arkosConfigHelpers, "getArkosConfig").mockReturnValue({
        port: 8000,
        host: "0.0.0.0",
        welcomeMessage: "Test",
        fileUpload: { baseUploadDir: "uploads", baseRoute: "/api/uploads" },
        routers: { strict: false },
        debugging: { requests: { level: 1 } },
        swagger: {
          mode: "zod",
          endpoint: "/api/docs",
          enableAfterBuild: true,
        },
      });

      await initApp();

      expect(sheu.ready).toHaveBeenCalledWith(
        expect.stringContaining("Documentation")
      );
    });
  });

  describe("initApp - CLI Command Handling", () => {
    it("should not start server when CLI_COMMAND is set", async () => {
      process.env.CLI_COMMAND = "EXPORT_AUTH_ACTION";

      await initApp();

      expect(mockServer.listen).not.toHaveBeenCalled();
      expect(runtimeCliCommander.handle).toHaveBeenCalled();
    });

    it("should call runtimeCliCommander.handle when CLI_COMMAND is set", async () => {
      process.env.CLI_COMMAND = "EXPORT_AUTH_ACTION";

      await initApp();

      expect(runtimeCliCommander.handle).toHaveBeenCalledTimes(1);
    });

    it("should not call runtimeCliCommander when CLI_COMMAND is not set", async () => {
      delete process.env.CLI_COMMAND;

      await initApp();

      expect(runtimeCliCommander.handle).not.toHaveBeenCalled();
    });
  });

  describe("initApp - Error Handling", () => {
    it("should handle errors during bootstrap", async () => {
      const error = new Error("Bootstrap failed");
      (bootstrap as jest.Mock).mockRejectedValueOnce(error);

      await expect(initApp()).rejects.toThrow("Bootstrap failed");

      expect(sheu.error).toHaveBeenCalledWith("Bootstrap failed");
      expect(console.error).toHaveBeenCalledWith(error);
    });

    it("should handle errors with custom message", async () => {
      const error = new Error("Custom error message");
      (bootstrap as jest.Mock).mockRejectedValueOnce(error);

      await expect(initApp()).rejects.toThrow("Custom error message");

      expect(sheu.error).toHaveBeenCalledWith("Custom error message");
    });

    it("should handle errors without message", async () => {
      const error = new Error();
      (bootstrap as jest.Mock).mockRejectedValueOnce(error);

      await expect(initApp()).rejects.toThrow();

      expect(sheu.error).toHaveBeenCalledWith(
        "Something went wrong while starting your application!"
      );
    });
  });

  describe("terminateApplicationRunningProcessAndServer", () => {
    it("should close server and exit process", () => {
      expect(() => {
        terminateApplicationRunningProcessAndServer();
      }).toThrow("process.exit called with 1");

      expect(mockServer.close).toHaveBeenCalled();
    });

    it("should call server.close callback", () => {
      const closeMock = jest.fn((callback) => {
        callback();
      });
      mockServer.close = closeMock;

      expect(() => {
        terminateApplicationRunningProcessAndServer();
      }).toThrow("process.exit called with 1");

      expect(closeMock).toHaveBeenCalled();
    });
  });

  describe("Process Event Handlers - uncaughtException", () => {
    it("should ignore EPIPE errors", () => {
      const error = new Error("EPIPE broken pipe");

      (process as any).emit("uncaughtException", error);

      expect(console.error).not.toHaveBeenCalled();
    });

    it("should log non-EPIPE errors when CLI is not true", () => {
      delete process.env.CLI;
      const error = new Error("Test error");

      (process as any).emit("uncaughtException", error);

      expect(sheu.error).toHaveBeenCalledWith(
        "UNCAUGHT EXCEPTION! SHUTTING DOWN...\n",
        { timestamp: true, bold: true }
      );
      expect(console.error).toHaveBeenCalledWith(error);
    });

    it("should not log when CLI is true", () => {
      process.env.CLI = "true";
      const error = new Error("Test error");

      (process as any).emit("uncaughtException", error);

      expect(sheu.error).not.toHaveBeenCalled();
      expect(console.error).toHaveBeenCalledWith(error);
    });

    it("should exit process after timeout", () => {
      const error = new Error("Test error");

      (process as any).emit("uncaughtException", error);

      expect(() => {
        jest.runAllTimers();
      }).toThrow("process.exit called with 1");
    });
  });

  describe("Process Event Handlers - unhandledRejection", () => {
    beforeEach(async () => {
      await initApp();
    });

    it("should log unhandled rejection", () => {
      const error = new Error("Test rejection");

      try {
        (process as any).emit("unhandledRejection", error);
        jest.runAllTimers();
      } catch (e) {}

      expect(console.error).toHaveBeenCalledWith(error);
    });

    it("should log message when CLI is not true", () => {
      delete process.env.CLI;
      const error = new Error("Test rejection");

      try {
        (process as any).emit("unhandledRejection", error);
        jest.runAllTimers();
      } catch (e) {}

      expect(sheu.error).toHaveBeenCalledWith(
        "UNHANDLED REJECTION! SHUTTING DOWN...\n",
        { timestamp: true, bold: true }
      );
    });

    it("should not log message when CLI is true", () => {
      process.env.CLI = "true";
      const error = new Error("Test rejection");

      try {
        (process as any).emit("unhandledRejection", error);
        jest.runAllTimers();
      } catch (e) {}

      expect(sheu.error).not.toHaveBeenCalled();
    });

    it("should close server on unhandled rejection", () => {
      const error = new Error("Test rejection");

      try {
        (process as any).emit("unhandledRejection", error);
        jest.runAllTimers();
      } catch (e) {}

      expect(mockServer.close).toHaveBeenCalled();
    });

    it("should exit via setTimeout when server is not available", () => {
      const closeSpy = mockServer.close;
      mockServer.close = undefined;

      const error = new Error("Test rejection");
      (process as any).emit("unhandledRejection", error);

      expect(() => {
        jest.runAllTimers();
      }).toThrow("process.exit called with 1");

      mockServer.close = closeSpy;
    });
  });

  describe("Integration Scenarios", () => {
    it("should handle complete initialization flow", async () => {
      const configureServer = jest.fn();
      const config: ArkosInitConfig = {
        use: [],
        configureServer,
      };

      process.env.__PORT = "3000";
      process.env.__HOST = "0.0.0.0";

      const app = await initApp(config);

      expect(bootstrap).toHaveBeenCalledWith(config);
      expect(configureServer).toHaveBeenCalledWith(mockServer);
      expect(http.createServer).toHaveBeenCalledWith(mockApp);
      expect(mockServer.listen).toHaveBeenCalledWith(
        3000,
        "0.0.0.0",
        expect.any(Function)
      );
      expect(app).toBe(mockApp);
    });

    it("should handle initialization with swagger and authentication", async () => {
      jest.spyOn(arkosConfigHelpers, "getArkosConfig").mockReturnValue({
        port: 8000,
        host: "0.0.0.0",
        welcomeMessage: "Test",
        fileUpload: { baseUploadDir: "uploads", baseRoute: "/api/uploads" },
        routers: { strict: false },
        debugging: { requests: { level: 1 } },
        swagger: {
          mode: "zod",
          endpoint: "/custom-docs",
        },
        authentication: {
          mode: "dynamic",
          enabled: true,
        },
      });

      await initApp();

      expect(sheu.ready).toHaveBeenCalledWith(
        expect.stringContaining("/custom-docs")
      );
    });

    it("should return app without starting server in CLI mode", async () => {
      process.env.CLI_COMMAND = "EXPORT_AUTH_ACTION";

      const app = await initApp();

      expect(app).toBe(mockApp);
      expect(mockServer.listen).not.toHaveBeenCalled();
      expect(runtimeCliCommander.handle).toHaveBeenCalled();
    });
  });

  describe("Edge Cases", () => {
    it("should handle missing __PORT environment variable", async () => {
      delete process.env.__PORT;
      delete process.env.PORT;

      await initApp();

      expect(mockServer.listen).toHaveBeenCalled();
    });

    it("should handle missing __HOST environment variable", async () => {
      delete process.env.__HOST;
      delete process.env.HOST;

      await initApp();

      expect(mockServer.listen).toHaveBeenCalled();
    });

    it("should handle server listen callback errors gracefully", async () => {
      const listenError = new Error("Listen failed");
      mockServer.listen.mockImplementationOnce(
        (_: any, _1: any, callback: any) => {
          callback(listenError);
          return mockServer;
        }
      );

      await initApp();

      expect(mockServer.listen).toHaveBeenCalled();
    });
  });
});
