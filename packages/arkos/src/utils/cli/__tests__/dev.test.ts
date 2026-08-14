import { spawn, ChildProcess } from "child_process";
import { getUserFileExtension } from "../../helpers/fs.helpers";
import { getVersion } from "../utils/cli.helpers";
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
jest.mock("../../dotenv.helpers", () => ({
  lastLoadedEnvFiles:
    [
      `/test/project/.env`,
      `/test/project/.env.local`,
    ]
}));
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
  let mockSetTimeout: jest.SpyInstance;

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
    jest
      .spyOn(process, "cwd")
      .mockReturnValue("/test/project");

    // Mock timers
    mockSetTimeout = jest.spyOn(global, "setTimeout").mockImplementation(((
      cb: any
    ) => {
      cb();
      return "Timeout";
    }) as any);
    jest.spyOn(global, "clearTimeout").mockImplementation();

    // Mock other dependencies
    (getUserFileExtension as jest.Mock).mockReturnValue("ts");
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
          stdio: ["inherit", "inherit", "inherit", "ipc"],
          env: expect.objectContaining({
            NODE_ENV: "development",
            CLI_PORT: "3000",
            CLI_HOST: "localhost",
          }),
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
          stdio: ["inherit", "inherit", "inherit", "ipc"],
          env: expect.objectContaining({
            NODE_ENV: "development",
            CLI_PORT: "3000",
            __PORT: "3000",
            __HOST: "0.0.0.0",
          }),
        })
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
    let mockExecSync: jest.SpyInstance;

    beforeEach(() => {
      jest.clearAllMocks();

      // Setup stdin/stdout mocks
      mockStdoutWrite = jest
        .spyOn(process.stdout, "write")
        .mockImplementation();
      mockStdinOnce = jest.spyOn(process.stdin, "once").mockImplementation();
      jest.spyOn(process.stdin, "pause").mockImplementation();
      mockExecSync = jest
        .spyOn(require("child_process"), "execSync")
        .mockImplementation();

      // Default mocks
      (getUserFileExtension as jest.Mock).mockReturnValue("ts");
      // (loadEnvironmentVariables as jest.Mock).mockReturnValue([".env"]);
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
          if (path.includes(".arkos")) {
            return false;
          }
          return true; // app.ts exists
        });
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
        mockStdinOnce.mockImplementation((_, callback) => {
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

    });

    describe("edge cases for type checking", () => {
      it("should check correct path for base.service.d.ts file", async () => {
        const expectedPath = path.resolve(
          process.cwd(),
          ".arkos/index.d.ts"
        );

        (fs.existsSync as jest.Mock).mockImplementation((checkPath: string) => {
          if (checkPath === expectedPath) {
            return false;
          }
          return true;
        });

        mockStdinOnce.mockImplementation((_, callback) => {
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
