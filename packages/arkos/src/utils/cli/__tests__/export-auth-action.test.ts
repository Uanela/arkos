import { ChildProcess, spawn } from "child_process";
import { loadEnvironmentVariables } from "../../dotenv.helpers";
import { getUserFileExtension } from "../../helpers/fs.helpers";
import path from "path";
import fs from "fs";
import watermarkStamper from "../utils/watermark-stamper";
import exportAuthActionCommand from "../export-auth-action";

jest.mock("child_process");
jest.mock("../../dotenv.helpers");
jest.mock("../../helpers/fs.helpers");
jest.mock("path");
jest.mock("fs");
jest.mock("../utils/watermark-stamper");

describe("exportAuthActionCommand", () => {
  const originalEnv = process.env;
  let mockExit: jest.SpyInstance;
  let mockConsoleError: jest.SpyInstance;
  let mockChild: any;
  let processOnSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };

    mockExit = jest
      .spyOn(process, "exit")
      .mockImplementation((code?: string | number | null | undefined) => {
        throw new Error(`process.exit: ${code}`);
      }) as any;

    mockConsoleError = jest.spyOn(console, "error").mockImplementation();

    mockChild = {
      kill: jest.fn(),
      killed: false,
      on: jest.fn((event, handler) => {
        if (event === "error") {
          mockChild.errorHandler = handler;
        }
        return mockChild as ChildProcess;
      }),
      errorHandler: undefined,
    };

    (spawn as jest.Mock).mockReturnValue(mockChild);
    (loadEnvironmentVariables as jest.Mock).mockReturnValue([
      ".env",
      ".env.local",
    ]);
    (getUserFileExtension as jest.Mock).mockReturnValue("ts");
    (path.resolve as jest.Mock).mockReturnValue("/project/src/app.ts");
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (watermarkStamper.stamp as jest.Mock).mockImplementation();

    processOnSpy = jest.spyOn(process, "on").mockImplementation();
  });

  afterEach(() => {
    process.env = originalEnv;
    mockExit.mockRestore();
    mockConsoleError.mockRestore();
    processOnSpy.mockRestore();
  });

  describe("environment setup", () => {
    it("sets CLI_COMMAND environment variable", async () => {
      await exportAuthActionCommand({ overwrite: false });

      expect(process.env.CLI_COMMAND).toBe("EXPORT_AUTH_ACTION");
    });

    it("sets CLI_COMMAND_OPTIONS with provided options", async () => {
      const options = { overwrite: true, path: "./exports" };

      await exportAuthActionCommand(options);

      expect(process.env.CLI_COMMAND_OPTIONS).toBe(JSON.stringify(options));
    });

    it("sets NODE_ENV to development when not set", async () => {
      delete process.env.NODE_ENV;

      await exportAuthActionCommand({});

      expect(process.env.NODE_ENV).toBe("development");
    });

    it("sets NODE_ENV to development when set to test", async () => {
      process.env.NODE_ENV = "test";

      await exportAuthActionCommand({});

      expect(process.env.NODE_ENV).toBe("development");
    });

    it("keeps existing NODE_ENV when not test", async () => {
      process.env.NODE_ENV = "production";

      await exportAuthActionCommand({});

      expect(process.env.NODE_ENV).toBe("production");
    });
  });

  describe("environment loading", () => {
    it("loads environment variables", async () => {
      await exportAuthActionCommand({});

      expect(loadEnvironmentVariables).toHaveBeenCalledTimes(1);
    });

    it("handles when no environment files are loaded", async () => {
      (loadEnvironmentVariables as jest.Mock).mockReturnValue(null);

      await exportAuthActionCommand({});

      expect(watermarkStamper.stamp).toHaveBeenCalledWith({
        envFiles: [],
      });
    });
  });

  describe("entry point validation", () => {
    it("resolves entry point path correctly", async () => {
      await exportAuthActionCommand({});

      expect(path.resolve).toHaveBeenCalledWith(process.cwd(), "src/app.ts");
    });

    it("uses correct file extension for entry point", async () => {
      (getUserFileExtension as jest.Mock).mockReturnValue("js");
      (path.resolve as jest.Mock).mockReturnValue("/project/src/app.js");

      await exportAuthActionCommand({});

      expect(getUserFileExtension).toHaveBeenCalledTimes(1);
      expect(path.resolve).toHaveBeenCalledWith(process.cwd(), "src/app.js");
    });

    it("exits with error when entry point does not exist", async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);

      await expect(exportAuthActionCommand({})).rejects.toThrow(
        "process.exit: 1"
      );

      expect(mockConsoleError).toHaveBeenCalledWith(
        "Could not find application entry point at /project/src/app.ts"
      );
    });
  });

  describe("server spawning", () => {
    it("spawns server with correct command", async () => {
      await exportAuthActionCommand({});

      expect(spawn).toHaveBeenCalledWith(
        "npx",
        ["tsx-strict", "--no-type-check", "/project/src/app.ts"],
        expect.objectContaining({
          stdio: "inherit",
          shell: true,
        })
      );
    });

    it("spawns server with correct environment variables", async () => {
      process.env.CUSTOM_VAR = "custom_value";

      await exportAuthActionCommand({});

      expect(spawn).toHaveBeenCalledWith(
        "npx",
        expect.any(Array),
        expect.objectContaining({
          env: expect.objectContaining({
            NODE_ENV: "development",
            CLI: "false",
            CUSTOM_VAR: "custom_value",
          }),
        })
      );
    });

    it("registers error handler on child process", async () => {
      await exportAuthActionCommand({});

      expect(mockChild.on).toHaveBeenCalledWith("error", expect.any(Function));
    });

    it("handles child process error", async () => {
      await exportAuthActionCommand({});

      const error = new Error("Spawn error");
      mockChild.errorHandler?.(error);

      expect(mockConsoleError).toHaveBeenCalledWith(
        "Failed to start server:",
        error
      );
    });

    it("does not register error handler when child is null", async () => {
      (spawn as jest.Mock).mockReturnValue(null);

      await exportAuthActionCommand({});

      expect(mockChild.on).not.toHaveBeenCalled();
    });
  });

  describe("watermark stamping", () => {
    it("stamps watermark with environment files", async () => {
      const envFiles = [".env", ".env.local", ".env.development"];
      (loadEnvironmentVariables as jest.Mock).mockReturnValue(envFiles);

      await exportAuthActionCommand({});

      expect(watermarkStamper.stamp).toHaveBeenCalledWith({
        envFiles,
      });
    });
  });

  describe("process signal handlers", () => {
    it("registers SIGINT handler", async () => {
      await exportAuthActionCommand({});

      expect(processOnSpy).toHaveBeenCalledWith("SIGINT", expect.any(Function));
    });

    it("registers SIGTERM handler", async () => {
      await exportAuthActionCommand({});

      expect(processOnSpy).toHaveBeenCalledWith(
        "SIGTERM",
        expect.any(Function)
      );
    });

    it("registers uncaughtException handler", async () => {
      await exportAuthActionCommand({});

      expect(processOnSpy).toHaveBeenCalledWith(
        "uncaughtException",
        expect.any(Function)
      );
    });

    it("kills child process on SIGINT", async () => {
      await exportAuthActionCommand({});

      const sigintHandler = processOnSpy.mock.calls.find(
        (call) => call[0] === "SIGINT"
      )?.[1] as Function;

      expect(() => sigintHandler()).toThrow("process.exit: 0");
      expect(mockChild.kill).toHaveBeenCalledWith("SIGTERM");
    });

    it("kills child process on SIGTERM", async () => {
      await exportAuthActionCommand({});

      const sigtermHandler = processOnSpy.mock.calls.find(
        (call) => call[0] === "SIGTERM"
      )?.[1] as Function;

      expect(() => sigtermHandler()).toThrow("process.exit: 0");
      expect(mockChild.kill).toHaveBeenCalledWith("SIGTERM");
    });

    it("handles uncaught exception and cleans up", async () => {
      await exportAuthActionCommand({});

      const uncaughtHandler = processOnSpy.mock.calls.find(
        (call) => call[0] === "uncaughtException"
      )?.[1] as Function;

      const error = new Error("Uncaught error");

      expect(() => uncaughtHandler(error)).toThrow("process.exit: 0");
      expect(mockConsoleError).toHaveBeenCalledWith(
        "Uncaught Exception:",
        error
      );
      expect(mockChild.kill).toHaveBeenCalledWith("SIGTERM");
    });

    it("does not kill child if child is null during cleanup", async () => {
      (spawn as jest.Mock).mockReturnValue(null);

      await exportAuthActionCommand({});

      const sigintHandler = processOnSpy.mock.calls.find(
        (call) => call[0] === "SIGINT"
      )?.[1] as Function;

      expect(() => sigintHandler()).toThrow("process.exit: 0");
    });

    it("force kills child with SIGKILL after timeout", async () => {
      jest.useFakeTimers();

      await exportAuthActionCommand({});

      const sigintHandler = processOnSpy.mock.calls.find(
        (call) => call[0] === "SIGINT"
      )?.[1] as Function;

      try {
        sigintHandler();
      } catch (e) {}

      expect(mockChild.kill).toHaveBeenCalledWith("SIGTERM");

      jest.advanceTimersByTime(5000);

      expect(mockChild.kill).toHaveBeenCalledWith("SIGKILL");

      jest.useRealTimers();
    });

    it("does not force kill if child already killed", async () => {
      jest.useFakeTimers();

      await exportAuthActionCommand({});

      const sigintHandler = processOnSpy.mock.calls.find(
        (call) => call[0] === "SIGINT"
      )?.[1] as Function;

      mockChild.killed = true;

      try {
        sigintHandler();
      } catch (e) {}

      jest.advanceTimersByTime(5000);

      expect(mockChild.kill).toHaveBeenCalledTimes(1);
      expect(mockChild.kill).toHaveBeenCalledWith("SIGTERM");

      jest.useRealTimers();
    });

    it("does not force kill if child is null after timeout", async () => {
      jest.useFakeTimers();

      let capturedChild = mockChild;
      (spawn as jest.Mock).mockReturnValue(mockChild);

      await exportAuthActionCommand({});

      const sigintHandler = processOnSpy.mock.calls.find(
        (call) => call[0] === "SIGINT"
      )?.[1] as Function;

      capturedChild = null as any;

      try {
        sigintHandler();
      } catch (e) {}

      jest.advanceTimersByTime(5000);

      jest.useRealTimers();
    });
  });

  describe("error handling", () => {
    it("handles synchronous errors during execution", async () => {
      (spawn as jest.Mock).mockImplementation(() => {
        throw new Error("Spawn failed");
      });

      await expect(exportAuthActionCommand({})).rejects.toThrow(
        "process.exit: 1"
      );

      expect(mockConsoleError).toHaveBeenCalledWith(
        "Development server failed to start:",
        expect.any(Error)
      );
    });

    it("kills child process on error", async () => {
      (watermarkStamper.stamp as jest.Mock).mockImplementation(() => {
        throw new Error("Stamp failed");
      });

      await expect(exportAuthActionCommand({})).rejects.toThrow(
        "process.exit: 1"
      );

      expect(mockChild.kill).toHaveBeenCalled();
    });

    it("handles when child has no kill method", async () => {
      (watermarkStamper.stamp as jest.Mock).mockImplementation(() => {
        throw new Error("Stamp failed");
      });

      (spawn as jest.Mock).mockReturnValue({});

      await expect(exportAuthActionCommand({})).rejects.toThrow(
        "process.exit: 1"
      );
    });

    it("handles when getUserFileExtension throws error", async () => {
      (getUserFileExtension as jest.Mock).mockImplementation(() => {
        throw new Error("Extension error");
      });

      await expect(exportAuthActionCommand({})).rejects.toThrow(
        "process.exit: 1"
      );

      expect(mockConsoleError).toHaveBeenCalledWith(
        "Development server failed to start:",
        expect.any(Error)
      );
    });
  });

  describe("options handling", () => {
    it("handles overwrite option", async () => {
      await exportAuthActionCommand({ overwrite: true });

      expect(process.env.CLI_COMMAND_OPTIONS).toBe(
        JSON.stringify({ overwrite: true })
      );
    });

    it("handles path option", async () => {
      await exportAuthActionCommand({ path: "./custom-path" });

      expect(process.env.CLI_COMMAND_OPTIONS).toBe(
        JSON.stringify({ path: "./custom-path" })
      );
    });

    it("handles both options together", async () => {
      await exportAuthActionCommand({
        overwrite: true,
        path: "./custom-path",
      });

      expect(process.env.CLI_COMMAND_OPTIONS).toBe(
        JSON.stringify({ overwrite: true, path: "./custom-path" })
      );
    });

    it("handles empty options object", async () => {
      await exportAuthActionCommand({});

      expect(process.env.CLI_COMMAND_OPTIONS).toBe(JSON.stringify({}));
    });
  });
});
