import http from "http";
import sheu from "../utils/sheu";

const mockProcessExit = jest
  .spyOn(process, "exit")
  .mockImplementation((code?: any) => {
    throw new Error(`process.exit called with ${code}`);
  });

jest.useFakeTimers();

import * as serverModule from "../server";
import portAndHostAllocator from "../utils/features/port-and-host-allocator";
import * as arkosConfigHelpers from "../utils/helpers/arkos-config.helpers";
import * as appModule from "../app";

jest.mock("../app", () => ({ getAppServer: jest.fn() }));
jest.mock("../utils/features/port-and-host-allocator");
jest.mock("../utils/sheu", () => ({
  __esModule: true,
  default: {
    ready: jest.fn(),
    gray: jest.fn((args) => args),
    error: jest.fn(),
  },
}));
jest.mock("../utils/helpers/arkos-config.helpers");
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

const mockGetArkosConfig = arkosConfigHelpers.getArkosConfig as jest.Mock;
const mockGetAppServer = appModule.getAppServer as jest.Mock;

const baseConfig = {
  port: 3000,
  host: "localhost",
  welcomeMessage: true,
  fileUpload: {
    baseUploadDir: "uploads",
    baseRoute: "/api/uploads",
  },
};

describe("Server Module", () => {
  let mockServer: any;
  let originalProcessEnv: NodeJS.ProcessEnv;
  let originalConsoleError: jest.SpyInstance;

  beforeEach(() => {
    mockServer = (http.createServer as jest.Mock)();
    mockGetArkosConfig.mockReturnValue(baseConfig);
    mockGetAppServer.mockReturnValue(mockServer);
    (portAndHostAllocator.getFirstNonLocalIp as jest.Mock).mockReturnValue(
      "192.168.1.100"
    );

    originalProcessEnv = { ...process.env };
    process.env.NODE_ENV = "test";
    process.env.__PORT = "8000";
    process.env.__HOST = "127.0.0.1";
    delete process.env.CLI_COMMAND;
    delete process.env.NO_CLI;
    delete process.env.ARKOS_BUILD;

    originalConsoleError = jest.spyOn(console, "error").mockImplementation();
    mockProcessExit.mockClear();
  });

  afterEach(() => {
    process.env = originalProcessEnv;
    jest.clearAllMocks();
    originalConsoleError.mockRestore();
  });

  describe("getArkosConfig", () => {
    it("should return config with port and host", () => {
      const config = serverModule.getArkosConfig();
      expect(config).toHaveProperty("port");
      expect(config).toHaveProperty("host");
    });

    it("should return config with welcomeMessage", () => {
      const config = serverModule.getArkosConfig();
      expect(config).toHaveProperty("welcomeMessage");
    });

    it("should include file upload configuration", () => {
      const config = serverModule.getArkosConfig();
      expect(config.fileUpload).toEqual({
        baseUploadDir: "uploads",
        baseRoute: "/api/uploads",
      });
    });

    it("should delegate to getArkosConfig helper", () => {
      serverModule.getArkosConfig();
      expect(mockGetArkosConfig).toHaveBeenCalledTimes(1);
    });
  });

  describe("logAppStartup", () => {
    it("should log development server message on localhost", () => {
      process.env.ARKOS_BUILD = "false";
      serverModule.logAppStartup(3000, "localhost");
      expect(sheu.ready).toHaveBeenCalledWith(
        expect.stringContaining("Development server")
      );
    });

    it("should log production server message when ARKOS_BUILD is true", () => {
      process.env.ARKOS_BUILD = "true";
      serverModule.logAppStartup(3000, "localhost");
      expect(sheu.ready).toHaveBeenCalledWith(
        expect.stringContaining("Production server")
      );
    });

    it("should replace 127.0.0.1 with localhost in message", () => {
      serverModule.logAppStartup(3000, "127.0.0.1");
      expect(sheu.ready).toHaveBeenCalledWith(
        expect.stringContaining("localhost:3000")
      );
    });

    it("should replace 0.0.0.0 with localhost in message", () => {
      serverModule.logAppStartup(3000, "0.0.0.0");
      expect(sheu.ready).toHaveBeenCalledWith(
        expect.stringContaining("localhost:3000")
      );
    });

    it("should log network server when host is 0.0.0.0 and network IP is available", () => {
      (portAndHostAllocator.getFirstNonLocalIp as jest.Mock).mockReturnValue(
        "192.168.1.100"
      );
      serverModule.logAppStartup(3000, "0.0.0.0");
      expect(sheu.ready).toHaveBeenCalledWith(
        expect.stringContaining("Network server")
      );
      expect(sheu.ready).toHaveBeenCalledWith(
        expect.stringContaining("192.168.1.100:3000")
      );
    });

    it("should not log network server when host is not 0.0.0.0", () => {
      serverModule.logAppStartup(3000, "localhost");
      const calls = (sheu.ready as jest.Mock).mock.calls.map((c) => c[0]);
      expect(calls.every((c: string) => !c.includes("Network server"))).toBe(
        true
      );
    });

    it("should not log network server when no network IP is available", () => {
      (portAndHostAllocator.getFirstNonLocalIp as jest.Mock).mockReturnValue(
        null
      );
      serverModule.logAppStartup(3000, "0.0.0.0");
      const calls = (sheu.ready as jest.Mock).mock.calls.map((c) => c[0]);
      expect(calls.every((c: string) => !c.includes("Network server"))).toBe(
        true
      );
    });

    it("should log docs URL when swagger is configured and not in build mode", () => {
      process.env.ARKOS_BUILD = "false";
      mockGetArkosConfig.mockReturnValue({
        ...baseConfig,
        swagger: { endpoint: "/api/docs" },
      });
      serverModule.logAppStartup(3000, "localhost");
      expect(sheu.ready).toHaveBeenCalledWith(
        expect.stringContaining("/api/docs")
      );
    });

    it("should use default swagger endpoint when not specified", () => {
      process.env.ARKOS_BUILD = "false";
      mockGetArkosConfig.mockReturnValue({
        ...baseConfig,
        swagger: {},
      });
      serverModule.logAppStartup(3000, "localhost");
      expect(sheu.ready).toHaveBeenCalledWith(
        expect.stringContaining("/api/docs")
      );
    });

    it("should log docs in build mode when enableAfterBuild is true", () => {
      process.env.ARKOS_BUILD = "true";
      mockGetArkosConfig.mockReturnValue({
        ...baseConfig,
        swagger: { enableAfterBuild: true, endpoint: "/api/docs" },
      });
      serverModule.logAppStartup(3000, "localhost");
      expect(sheu.ready).toHaveBeenCalledWith(
        expect.stringContaining("Documentation")
      );
    });

    it("should not log docs in build mode when enableAfterBuild is false", () => {
      process.env.ARKOS_BUILD = "true";
      mockGetArkosConfig.mockReturnValue({
        ...baseConfig,
        swagger: { enableAfterBuild: false, endpoint: "/api/docs" },
      });
      serverModule.logAppStartup(3000, "localhost");
      const calls = (sheu.ready as jest.Mock).mock.calls.map((c) => c[0]);
      expect(calls.every((c: string) => !c.includes("Documentation"))).toBe(
        true
      );
    });

    it("should not log docs when swagger is not configured", () => {
      mockGetArkosConfig.mockReturnValue({ ...baseConfig });
      serverModule.logAppStartup(3000, "localhost");
      const calls = (sheu.ready as jest.Mock).mock.calls.map((c) => c[0]);
      expect(calls.every((c: string) => !c.includes("Documentation"))).toBe(
        true
      );
    });

    it("should include timestamp in the log message", () => {
      serverModule.logAppStartup(3000, "localhost");
      expect(sheu.ready).toHaveBeenCalledWith(
        expect.stringMatching(/\d{2}:\d{2}:\d{2}/)
      );
    });
  });

  describe("Process Event Handlers - uncaughtException", () => {
    it("should ignore EPIPE errors", () => {
      const error = new Error("EPIPE broken pipe");
      (process as any).emit("uncaughtException", error);
      expect(console.error).not.toHaveBeenCalled();
    });

    it("should log error when NO_CLI is true", () => {
      process.env.NO_CLI = "true";
      const error = new Error("Test error");
      (process as any).emit("uncaughtException", error);
      expect(sheu.error).toHaveBeenCalledWith(
        "UNCAUGHT EXCEPTION! SHUTTING DOWN...\n",
        { timestamp: true, bold: true }
      );
      expect(console.error).toHaveBeenCalledWith(error);
    });

    it("should not call sheu.error when NO_CLI is false", () => {
      process.env.NO_CLI = "false";
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

    it("should not crash on EPIPE even with other text", () => {
      const error = new Error("write EPIPE something");
      expect(() => {
        (process as any).emit("uncaughtException", error);
      }).not.toThrow();
      expect(console.error).not.toHaveBeenCalled();
    });
  });

  describe("Process Event Handlers - unhandledRejection", () => {
    it("should log unhandled rejection error", () => {
      const error = new Error("Test rejection");
      try {
        (process as any).emit("unhandledRejection", error);
        jest.runAllTimers();
      } catch {}
      expect(console.error).toHaveBeenCalledWith(error);
    });

    it("should log sheu message when NO_CLI is true", () => {
      process.env.NO_CLI = "true";
      const error = new Error("Test rejection");
      try {
        (process as any).emit("unhandledRejection", error);
        jest.runAllTimers();
      } catch {}
      expect(sheu.error).toHaveBeenCalledWith(
        "UNHANDLED REJECTION! SHUTTING DOWN...\n",
        { timestamp: true, bold: true }
      );
    });

    it("should not call sheu.error when NO_CLI is false", () => {
      process.env.NO_CLI = "false";
      const error = new Error("Test rejection");
      try {
        (process as any).emit("unhandledRejection", error);
        jest.runAllTimers();
      } catch {}
      expect(sheu.error).not.toHaveBeenCalled();
    });

    it("should close server on unhandled rejection", () => {
      const error = new Error("Test rejection");
      try {
        (process as any).emit("unhandledRejection", error);
        jest.runAllTimers();
      } catch {}
      expect(mockServer.close).toHaveBeenCalled();
    });

    it("should exit via setTimeout when server has no close method", () => {
      mockGetAppServer.mockReturnValue({ close: undefined });
      const error = new Error("Test rejection");
      (process as any).emit("unhandledRejection", error);
      expect(() => {
        jest.runAllTimers();
      }).toThrow("process.exit called with 1");
    });

    it("should exit via setTimeout when server is null", () => {
      mockGetAppServer.mockReturnValue(null);
      const error = new Error("Test rejection");
      (process as any).emit("unhandledRejection", error);
      expect(() => {
        jest.runAllTimers();
      }).toThrow("process.exit called with 1");
    });

    it("should call process.exit(1) after server closes", () => {
      mockServer.close.mockImplementation((cb: () => void) => cb());
      const error = new Error("Test rejection");
      expect(() => {
        (process as any).emit("unhandledRejection", error);
      }).toThrow("process.exit called with 1");
    });
  });
});
