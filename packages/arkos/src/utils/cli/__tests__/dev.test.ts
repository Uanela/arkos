import { spawn, ChildProcess } from "child_process";
import { getUserFileExtension } from "../../helpers/fs.helpers";
import { getVersion } from "../utils/cli.helpers";
import { loadEnvironmentVariables } from "../../dotenv.helpers";
import { importModule } from "../../helpers/global.helpers";
import fs from "fs";
import sheu from "../../sheu";
import portAndHostAllocator from "../../features/port-and-host-allocator";
import { devCommand, killDevelopmentServerChildProcess } from "../dev";
import path from "path";

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

describe("Dev Command", () => {
  let mockSpawn: jest.MockedFunction<typeof spawn>;
  let mockChildProcess: Partial<ChildProcess>;
  let mockConsoleError: jest.SpyInstance;
  let mockConsoleInfo: jest.SpyInstance;
  let mockProcessExit: jest.SpyInstance;
  let mockProcessOn: jest.SpyInstance;
  let mockProcessCwd: jest.SpyInstance;
  let mockSetTimeout: jest.SpyInstance;
  let mockClearTimeout: jest.SpyInstance;

  beforeEach(() => {
    process.env.NODE_ENV = "development";
    // Setup mock child process
    mockChildProcess = {
      kill: jest.fn(),
      on: jest.fn(),
      killed: false,
    };

    // Setup mock spawn
    mockSpawn = spawn as jest.MockedFunction<typeof spawn>;
    mockSpawn.mockReturnValue(mockChildProcess as ChildProcess);

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
            __PORT: "3000",
            __HOST: "0.0.0.0",
          }),
          shell: true,
        })
      );
    });

    // it("should handle child process exit with restart", async () => {
    //   await devCommand();

    //   const exitHandler = (mockChildProcess as any)?.on?.mock?.calls.find(
    //     (call: any[]) => call[0] === "exit"
    //   )[1];

    //   exitHandler(1, null);

    //   expect(mockConsoleInfo).toHaveBeenCalledWith(
    //     "Server exited with code 1, restarting..."
    //   );
    // });

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

      expect(mockConsoleError).toHaveBeenCalledWith(testError);
      expect(mockProcessExit).toHaveBeenCalledWith(1);
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

    it("should handle killDevelopmentServerChildProcess when child is null", () => {
      (devCommand as any).child = null;

      expect(() => killDevelopmentServerChildProcess()).not.toThrow();
    });
  });

  describe("TypeScript Types Missing Scenario", () => {
    let mockStdoutWrite: jest.SpyInstance;
    let mockStdinOnce: jest.SpyInstance;
    let mockStdinPause: jest.SpyInstance;
    let mockExecSync: jest.SpyInstance;

    beforeEach(() => {
      jest.clearAllMocks();

      // Setup stdin/stdout mocks
      mockStdoutWrite = jest
        .spyOn(process.stdout, "write")
        .mockImplementation();
      mockStdinOnce = jest.spyOn(process.stdin, "once").mockImplementation();
      mockStdinPause = jest.spyOn(process.stdin, "pause").mockImplementation();
      mockExecSync = jest
        .spyOn(require("child_process"), "execSync")
        .mockImplementation();

      // Default mocks
      (getUserFileExtension as jest.Mock).mockReturnValue("ts");
      (loadEnvironmentVariables as jest.Mock).mockReturnValue([".env"]);
      (
        portAndHostAllocator.getHostAndAvailablePort as jest.Mock
      ).mockResolvedValue({
        host: "0.0.0.0",
        port: 3000,
      });
    });

    describe("when base service types are missing", () => {
      beforeEach(() => {
        // Mock existsSync to return false for base.service.d.ts
        (fs.existsSync as jest.Mock).mockImplementation((path: string) => {
          if (path.includes("base.service.d.ts")) {
            return false;
          }
          return true; // app.ts exists
        });
      });

      it("should warn user about missing base service types", async () => {
        mockStdinOnce.mockImplementation((event, callback) => {
          callback(Buffer.from("y\n"));
          return process.stdin;
        });

        await devCommand();

        expect(sheu.warn).toHaveBeenCalledWith(
          'Missing base services types please run "npx arkos prisma generate" to generate and sync the types from @prisma/client'
        );
      });

      it("should prompt user with Y/n question", async () => {
        mockStdinOnce.mockImplementation((event, callback) => {
          callback(Buffer.from("y\n"));
          return process.stdin;
        });

        await devCommand();

        expect(mockStdoutWrite).toHaveBeenCalledWith(
          expect.stringContaining(
            'Would you like to run "npx arkos prisma generate"? (Y/n):'
          )
        );
      });

      it("should execute prisma generate when user answers 'y'", async () => {
        mockStdinOnce.mockImplementation((event, callback) => {
          callback(Buffer.from("y\n"));
          return process.stdin;
        });

        await devCommand();

        expect(mockConsoleInfo).toHaveBeenCalledWith(
          "\nSyncing base service with @prisma/client..."
        );
        expect(mockExecSync).toHaveBeenCalledWith("npx arkos prisma generate");
      });

      it("should execute prisma generate when user answers 'Y' (uppercase)", async () => {
        mockStdinOnce.mockImplementation((event, callback) => {
          callback(Buffer.from("Y\n"));
          return process.stdin;
        });

        await devCommand();

        expect(mockExecSync).toHaveBeenCalledWith("npx arkos prisma generate");
      });

      it("should execute prisma generate when user presses Enter (empty input)", async () => {
        mockStdinOnce.mockImplementation((event, callback) => {
          callback(Buffer.from("\n"));
          return process.stdin;
        });

        await devCommand();

        expect(mockExecSync).toHaveBeenCalledWith("npx arkos prisma generate");
      });

      it("should throw error when user answers 'n'", async () => {
        mockStdinOnce.mockImplementation((event, callback) => {
          callback(Buffer.from("n\n"));
          return process.stdin;
        });

        await devCommand();

        expect(mockProcessExit).toHaveBeenCalledWith(1);
        expect(mockConsoleError).toHaveBeenCalledWith(
          expect.objectContaining({
            message: expect.stringContaining(
              'Missing BaseService types please run "npx arkos prisma generate"'
            ),
          })
        );
      });

      it("should throw error when user answers 'N' (uppercase)", async () => {
        mockStdinOnce.mockImplementation((event, callback) => {
          callback(Buffer.from("N\n"));
          return process.stdin;
        });

        await devCommand();

        expect(mockProcessExit).toHaveBeenCalledWith(1);
      });

      it("should throw error when user answers 'no'", async () => {
        mockStdinOnce.mockImplementation((event, callback) => {
          callback(Buffer.from("no\n"));
          return process.stdin;
        });

        await devCommand();

        expect(mockProcessExit).toHaveBeenCalledWith(1);
      });

      it("should include documentation URL in error message", async () => {
        mockStdinOnce.mockImplementation((event, callback) => {
          callback(Buffer.from("n\n"));
          return process.stdin;
        });

        await devCommand();

        expect(mockConsoleError).toHaveBeenCalledWith(
          expect.objectContaining({
            message: expect.stringContaining(
              "https://www.arkosjs.com/docs/cli/built-in-cli#typescript-types-generation"
            ),
          })
        );
      });

      it("should pause stdin after receiving input", async () => {
        mockStdinOnce.mockImplementation((event, callback) => {
          callback(Buffer.from("y\n"));
          return process.stdin;
        });

        await devCommand();

        expect(mockStdinPause).toHaveBeenCalled();
      });

      it("should trim and lowercase user input", async () => {
        mockStdinOnce.mockImplementation((event, callback) => {
          callback(Buffer.from("  Y  \n"));
          return process.stdin;
        });

        await devCommand();

        expect(mockExecSync).toHaveBeenCalledWith("npx arkos prisma generate");
      });

      it("should log empty line before syncing message", async () => {
        mockStdinOnce.mockImplementation((event, callback) => {
          callback(Buffer.from("y\n"));
          return process.stdin;
        });

        const mockConsoleLog = jest.spyOn(console, "log").mockImplementation();

        await devCommand();

        expect(mockConsoleLog).toHaveBeenCalledWith("");
      });

      it("should handle stdin data event correctly", async () => {
        let dataCallback: ((data: Buffer) => void) | undefined;
        mockStdinOnce.mockImplementation((event, callback) => {
          dataCallback = callback;
          return process.stdin;
        });

        const devPromise = devCommand();

        // Wait for prompt to be set up
        await new Promise((resolve) => setTimeout(resolve, 0));

        expect(dataCallback).toBeDefined();
        dataCallback!(Buffer.from("y\n"));

        await devPromise;

        expect(mockExecSync).toHaveBeenCalled();
      });

      it("should not check for base service types when using JavaScript", async () => {
        (getUserFileExtension as jest.Mock).mockReturnValue("js");
        (fs.existsSync as jest.Mock).mockReturnValue(true);

        await devCommand();

        expect(sheu.warn).not.toHaveBeenCalledWith(
          expect.stringContaining("Missing base services types")
        );
        expect(mockStdoutWrite).not.toHaveBeenCalledWith(
          expect.stringContaining("npx arkos prisma generate")
        );
      });

      it("should skip type check when base service types exist", async () => {
        (fs.existsSync as jest.Mock).mockReturnValue(true);

        await devCommand();

        expect(sheu.warn).not.toHaveBeenCalled();
        expect(mockStdoutWrite).not.toHaveBeenCalledWith(
          expect.stringContaining("npx arkos prisma generate")
        );
      });

      it("should handle execSync throwing an error", async () => {
        mockStdinOnce.mockImplementation((event, callback) => {
          callback(Buffer.from("y\n"));
          return process.stdin;
        });

        const execError = new Error("Failed to execute prisma generate");
        mockExecSync.mockImplementation(() => {
          throw execError;
        });

        await devCommand();

        expect(mockProcessExit).toHaveBeenCalledWith(1);
        expect(mockConsoleError).toHaveBeenCalledWith(execError);
      });

      it("should handle multiple whitespace variations in user input", async () => {
        const testCases = ["y\n", " y\n", "y \n", " y \n", "\ty\n", "y\t\n"];

        for (const input of testCases) {
          jest.clearAllMocks();
          mockStdinOnce.mockImplementation((event, callback) => {
            callback(Buffer.from(input));
            return process.stdin;
          });

          await devCommand();

          expect(mockExecSync).toHaveBeenCalledWith(
            "npx arkos prisma generate"
          );
        }
      });

      it("should handle promise resolution correctly", async () => {
        const promise = new Promise<boolean>((resolve) => {
          mockStdinOnce.mockImplementation((event, callback) => {
            callback(Buffer.from("y\n"));
            resolve(true);
            return process.stdin;
          });
        });

        await devCommand();
        const result = await promise;

        expect(result).toBe(true);
      });

      it("should maintain correct execution order", async () => {
        const executionOrder: string[] = [];

        mockStdinOnce.mockImplementation((event, callback) => {
          executionOrder.push("stdin-setup");
          callback(Buffer.from("y\n"));
          return process.stdin;
        });

        (sheu.warn as jest.Mock).mockImplementation(() => {
          executionOrder.push("warn");
        });

        mockStdoutWrite.mockImplementation(() => {
          executionOrder.push("prompt");
        });

        mockStdinPause.mockImplementation(() => {
          executionOrder.push("pause");
        });

        mockExecSync.mockImplementation(() => {
          executionOrder.push("execSync");
        });

        await devCommand();

        expect(executionOrder).toEqual([
          "warn",
          "prompt",
          "stdin-setup",
          "pause",
          "execSync",
        ]);
      });
    });

    describe("edge cases for type checking", () => {
      it("should check correct path for base.service.d.ts file", async () => {
        const expectedPath = path.resolve(
          process.cwd(),
          "node_modules/@arkosjs/types/base.service.d.ts"
        );

        (fs.existsSync as jest.Mock).mockImplementation((checkPath: string) => {
          if (checkPath === expectedPath) {
            return false;
          }
          return true;
        });

        mockStdinOnce.mockImplementation((event, callback) => {
          callback(Buffer.from("n\n"));
          return process.stdin;
        });

        await devCommand();

        expect(fs.existsSync).toHaveBeenCalledWith(expectedPath);
      });

      it("should only check for TypeScript types when fileExt is 'ts'", async () => {
        (getUserFileExtension as jest.Mock).mockReturnValue("tsx");
        (fs.existsSync as jest.Mock).mockReturnValue(true);

        await devCommand();

        expect(sheu.warn).not.toHaveBeenCalled();
      });
    });
  });
});
