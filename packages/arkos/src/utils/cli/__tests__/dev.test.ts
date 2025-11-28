import { spawn, ChildProcess } from "child_process";
import chokidar from "chokidar";
import { getUserFileExtension } from "../../helpers/fs.helpers";
import { getVersion } from "../utils/cli.helpers";
import { loadEnvironmentVariables } from "../../dotenv.helpers";
import { importModule } from "../../helpers/global.helpers";
import fs from "fs";
import sheu from "../../sheu";
import portAndHostAllocator from "../../features/port-and-host-allocator";
import smartFsWatcher from "../utils/smart-fs-watcher";
import { devCommand, killDevelopmentServerChildProcess } from "../dev";

// Mock all dependencies
jest.mock("child_process");
jest.mock("chokidar");
jest.mock("../../helpers/fs.helpers", () => ({
  ...jest.requireActual("../../helpers/fs.helpers"),
  getUserFileExtension: jest.fn(),
}));
jest.mock("../utils/cli.helpers");
jest.mock("../../dotenv.helpers");
jest.mock("../../helpers/global.helpers");
jest.mock("fs");
jest.mock("../../sheu");
jest.mock("../../features/port-and-host-allocator");
jest.mock("../utils/smart-fs-watcher");

describe("Dev Command", () => {
  let mockSpawn: jest.MockedFunction<typeof spawn>;
  let mockChildProcess: Partial<ChildProcess>;
  let mockChokidarWatch: jest.MockedFunction<typeof chokidar.watch>;
  let mockWatcher: { on: jest.Mock; close: jest.Mock; getWatched?: jest.Mock };
  let mockConsoleError: jest.SpyInstance;
  let mockConsoleInfo: jest.SpyInstance;
  let mockProcessExit: jest.SpyInstance;
  let mockProcessOn: jest.SpyInstance;
  let mockProcessCwd: jest.SpyInstance;
  let mockSetTimeout: jest.SpyInstance;
  let mockClearTimeout: jest.SpyInstance;

  beforeEach(() => {
    // Setup mock child process
    mockChildProcess = {
      kill: jest.fn(),
      on: jest.fn(),
      killed: false,
    };

    // Setup mock spawn
    mockSpawn = spawn as jest.MockedFunction<typeof spawn>;
    mockSpawn.mockReturnValue(mockChildProcess as ChildProcess);

    // Setup mock watcher
    mockWatcher = {
      on: jest.fn(),
      close: jest.fn(),
      getWatched: jest.fn().mockReturnValue({}),
    };

    // Setup mock chokidar
    mockChokidarWatch = chokidar.watch as jest.MockedFunction<
      typeof chokidar.watch
    >;
    mockChokidarWatch.mockReturnValue(mockWatcher as any);

    // Mock console methods
    mockConsoleError = jest.spyOn(console, "error").mockImplementation();
    mockConsoleInfo = jest.spyOn(console, "info").mockImplementation();

    // Mock process methods
    mockProcessExit = jest.spyOn(process, "exit").mockImplementation();
    mockProcessOn = jest.spyOn(process, "on").mockImplementation();
    mockProcessCwd = jest
      .spyOn(process, "cwd")
      .mockReturnValue("/test/project");

    // Mock timers
    mockSetTimeout = jest.spyOn(global, "setTimeout").mockImplementation(((
      cb: any
    ) => {
      cb();
      return "Timeout";
    }) as any);
    mockClearTimeout = jest.spyOn(global, "clearTimeout").mockImplementation();

    // Mock other dependencies
    (getUserFileExtension as jest.Mock).mockReturnValue("ts");
    (loadEnvironmentVariables as jest.Mock).mockImplementation(() => [
      `${process.cwd()}/.env`,
      `${process.cwd()}/.env.local`,
    ]);
    (getVersion as jest.Mock).mockReturnValue("1.0.0");
    (sheu.info as jest.Mock).mockImplementation();
    (
      portAndHostAllocator.getHostAndAvailablePort as jest.Mock
    ).mockResolvedValue({
      host: "0.0.0.0",
      port: 3000,
    });
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (importModule as jest.Mock).mockResolvedValue({
      getArkosConfig: () => ({
        available: true,
        port: 3000,
        host: "localhost",
      }),
    });

    // Mock smartFsWatcher
    (smartFsWatcher.start as jest.Mock).mockImplementation();
    (smartFsWatcher.reset as jest.Mock).mockImplementation();
    (smartFsWatcher.close as jest.Mock).mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  describe("devCommand", () => {
    it("should set NODE_ENV to development", async () => {
      await devCommand();
      expect(process.env.NODE_ENV).toBe("development");
    });

    it("should load environment variables", async () => {
      await devCommand();
      expect(loadEnvironmentVariables).toHaveBeenCalled();
    });

    it("should exit if entry point doesn't exist", async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);
      await devCommand();
      expect(mockConsoleError).toHaveBeenCalledWith(
        expect.stringContaining("Could not find application entry point")
      );
      expect(mockProcessExit).toHaveBeenCalledWith(1);
    });

    it("should start TypeScript server with correct arguments", async () => {
      (getUserFileExtension as jest.Mock).mockReturnValue("ts");
      await devCommand({ port: "3000", host: "localhost" });

      expect(mockSpawn).toHaveBeenCalledWith(
        "npx",
        ["tsx-strict", "--watch", expect.stringContaining("app.ts")],
        expect.objectContaining({
          stdio: "inherit",
          env: expect.objectContaining({
            NODE_ENV: "development",
            CLI_PORT: "3000",
            CLI_HOST: "localhost",
          }),
          shell: true,
        })
      );
    });

    it("should start JavaScript server with correct arguments", async () => {
      (getUserFileExtension as jest.Mock).mockReturnValue("js");
      await devCommand({ port: "3000" });

      expect(mockSpawn).toHaveBeenCalledWith(
        "npx",
        [
          "tsx-strict",
          "--no-type-check",
          "--watch",
          expect.stringContaining("app.js"),
        ],
        expect.objectContaining({
          stdio: "inherit",
          env: expect.objectContaining({
            NODE_ENV: "development",
            CLI_PORT: "3000",
          }),
          shell: true,
        })
      );
    });

    it("should setup environment file watcher", async () => {
      await devCommand();
      expect(mockChokidarWatch).toHaveBeenCalledWith([".env", ".env.local"], {
        ignoreInitial: true,
        persistent: true,
      });
    });

    it("should restart server when environment files change", async () => {
      await devCommand();

      const envCallback = mockWatcher.on.mock.calls.find(
        (call) => call[0] === "all"
      )[1];

      envCallback("change", ".env");

      expect(mockSetTimeout).toHaveBeenCalledWith(expect.any(Function), 1000);
    });

    it("should handle child process exit with restart", async () => {
      await devCommand();

      const exitHandler = (mockChildProcess as any)?.on?.mock?.calls.find(
        (call: any[]) => call[0] === "exit"
      )[1];

      exitHandler(1, null);

      expect(mockConsoleInfo).toHaveBeenCalledWith(
        "Server exited with code 1, restarting..."
      );
    });

    it("should setup process signal handlers", async () => {
      await devCommand();

      expect(mockProcessOn).toHaveBeenCalledWith(
        "SIGINT",
        expect.any(Function)
      );
      expect(mockProcessOn).toHaveBeenCalledWith(
        "SIGTERM",
        expect.any(Function)
      );
      expect(mockProcessOn).toHaveBeenCalledWith(
        "uncaughtException",
        expect.any(Function)
      );
    });

    it("should display config information when available", async () => {
      (portAndHostAllocator.getFirstNonLocalIp as jest.Mock).mockReturnValue(
        "192.168.1.180"
      );

      await devCommand();

      await Promise.resolve();

      expect(mockConsoleInfo).toHaveBeenCalledWith(
        expect.stringContaining("Arkos.js 1.0.0")
      );
      expect(mockConsoleInfo).toHaveBeenCalledWith(
        expect.stringContaining("http://localhost:3000")
      );
      expect(mockConsoleInfo).toHaveBeenCalledWith(
        expect.stringContaining("http://192.168.1.180:3000")
      );
      expect(mockConsoleInfo).toHaveBeenCalledWith(
        expect.stringContaining(`.env, .env.local`)
      );
    });
  });

  describe("killDevelopmentServerChildProcess", () => {
    it("should handle case when child process is null", () => {
      (devCommand as any).child = null;

      expect(() => killDevelopmentServerChildProcess()).not.toThrow();
    });
  });

  describe("error handling", () => {
    it("should handle errors during server startup", async () => {
      const testError = new Error("Startup failed");
      mockSpawn.mockImplementation(() => {
        throw testError;
      });

      await devCommand();

      expect(mockConsoleError).toHaveBeenCalledWith(
        "Development server failed to start:",
        testError
      );
      expect(mockProcessExit).toHaveBeenCalledWith(1);
    });

    it("should handle errors in environment file reloading", async () => {
      await devCommand();

      // Get the environment watcher callback
      const envCallback = mockWatcher.on.mock.calls.find(
        (call) => call[0] === "all"
      )[1];

      // Make loadEnvironmentVariables throw an error
      const testError = new Error("Env load failed");
      (loadEnvironmentVariables as jest.Mock).mockImplementation(() => {
        throw testError;
      });

      // Call the callback to simulate file change
      envCallback("change", ".env");

      expect(mockConsoleError).toHaveBeenCalledWith(
        "Error reloading .env:",
        testError
      );
    });
  });

  describe("cleanup functionality", () => {
    it("should cleanup on SIGINT", async () => {
      await devCommand();

      const sigintHandler = mockProcessOn.mock.calls.find(
        (call) => call[0] === "SIGINT"
      )[1];

      sigintHandler();

      expect(mockChildProcess.kill).toHaveBeenCalledWith("SIGTERM");
      expect(mockChokidarWatch).toHaveBeenCalled();
      expect(mockProcessExit).toHaveBeenCalledWith(0);
    });

    it("should force kill after timeout", async () => {
      await devCommand();

      const sigintHandler = mockProcessOn.mock.calls.find(
        (call) => call[0] === "SIGINT"
      )[1];

      sigintHandler();

      expect(mockSetTimeout).toHaveBeenCalledWith(expect.any(Function), 5000);
    });

    it("should cleanup on uncaughtException", async () => {
      await devCommand();

      const exceptionHandler = mockProcessOn.mock.calls.find(
        (call) => call[0] === "uncaughtException"
      )[1];
      const testError = new Error("Test exception");

      exceptionHandler(testError);

      expect(mockConsoleError).toHaveBeenCalledWith(
        "Uncaught Exception:",
        testError
      );
      expect(mockChildProcess.kill).toHaveBeenCalled();
    });
  });

  describe("Edge Cases and Missing Coverage", () => {
    beforeEach(() => {
      jest.clearAllMocks();

      (getUserFileExtension as jest.Mock).mockReturnValue("ts");
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (loadEnvironmentVariables as jest.Mock).mockReturnValue([
        ".env",
        ".env.local",
      ]);
      (importModule as jest.Mock).mockResolvedValue({
        getArkosConfig: () => ({
          available: true,
          port: 3000,
          host: "localhost",
        }),
      });
    });

    it("should handle child process error events", async () => {
      await devCommand();

      const errorHandler = (mockChildProcess as any).on.mock.calls.find(
        (call: any) => call[0] === "error"
      )[1];

      const testError = new Error("Child process error");
      errorHandler(testError);

      expect(mockConsoleError).toHaveBeenCalledWith(
        "Failed to start server:",
        testError
      );
    });

    it("should not restart server when killed by SIGTERM or SIGINT", async () => {
      await devCommand();

      const exitHandler = (mockChildProcess as any).on.mock.calls.find(
        (call: any) => call[0] === "exit"
      )[1];

      const infoSpy = jest.spyOn(console, "info");

      exitHandler(0, "SIGTERM");

      expect(infoSpy).not.toHaveBeenCalledWith(
        expect.stringContaining("restarting")
      );

      exitHandler(0, "SIGINT");

      expect(infoSpy).not.toHaveBeenCalledWith(
        expect.stringContaining("restarting")
      );
    });

    it("should handle specific module import errors without logging", async () => {
      const serverNotFoundError = new Error(
        "Cannot find module '../../server'"
      );
      const cjsServerNotFoundError = new Error(
        "Cannot find module 'cjs/server'"
      );

      (importModule as jest.Mock).mockRejectedValueOnce(serverNotFoundError);
      await devCommand();

      expect(mockConsoleInfo).not.toHaveBeenCalledWith(serverNotFoundError);

      jest.clearAllMocks();
      (importModule as jest.Mock).mockRejectedValueOnce(cjsServerNotFoundError);
      await devCommand();

      expect(mockConsoleInfo).not.toHaveBeenCalledWith(cjsServerNotFoundError);
    });

    it("should setup force kill timeout during cleanup", async () => {
      await devCommand();

      const sigintHandler = mockProcessOn.mock.calls.find(
        (call) => call[0] === "SIGINT"
      )[1];

      sigintHandler();

      expect(mockSetTimeout).toHaveBeenCalledWith(expect.any(Function), 5000);

      const forceKillFunction = mockSetTimeout.mock.calls.find(
        (call) => call[1] === 5000
      )[0];

      (mockChildProcess.killed as any) = false;

      forceKillFunction();

      expect(mockChildProcess.kill).toHaveBeenCalledWith("SIGKILL");
    });

    it("should handle missing smartFsWatcher gracefully", async () => {
      const originalReset = smartFsWatcher.reset;
      const originalClose = smartFsWatcher.close;

      (smartFsWatcher.reset as any) = undefined;
      (smartFsWatcher.close as any) = undefined;

      await devCommand();

      expect(() => devCommand()).not.toThrow();

      (smartFsWatcher.reset as any) = originalReset;
      (smartFsWatcher.close as any) = originalClose;
    });

    it("should handle killDevelopmentServerChildProcess when child is null", () => {
      (devCommand as any).child = null;

      expect(() => killDevelopmentServerChildProcess()).not.toThrow();
    });
  });
});
