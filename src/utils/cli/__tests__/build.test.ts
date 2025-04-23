import path from "path";
import fs from "fs";
import { execSync, spawn } from "child_process";
import { buildCommand } from "../build";
import { getUserFileExtension } from "../../helpers/fs.helpers";

// Mock dependencies
jest.mock("child_process", () => ({
  execSync: jest.fn(),
  spawn: jest.fn(() => ({
    kill: jest.fn(),
  })),
}));

jest.mock("fs", () => ({
  ...jest.requireActual("fs"),
  existsSync: jest.fn(),
  mkdirSync: jest.fn(),
  writeFileSync: jest.fn(),
  readFileSync: jest.fn(),
  unlinkSync: jest.fn(),
}));

jest.mock("path", () => ({
  join: jest.fn((...args) => args.join("/")),
}));

jest.mock("../../helpers/fs.helpers", () => ({
  getUserFileExtension: jest.fn(),
}));

// Mock process.exit
const mockExit = jest.spyOn(process, "exit").mockImplementation((code) => {
  throw new Error(`Process.exit called with code ${code}`);
});

describe("buildCommand", () => {
  // Store original process.on and console methods
  const originalProcessOn = process.on;
  const originalConsole = {
    log: console.log,
    info: console.info,
    error: console.error,
    warn: console.warn,
  };

  // Setup mocks
  const mockProcessOn = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock console methods
    console.log = jest.fn();
    console.info = jest.fn();
    console.error = jest.fn();
    console.warn = jest.fn();

    // Mock process methods
    process.on = mockProcessOn;
    jest.spyOn(process, "cwd").mockReturnValue("/mock/project");

    // Default fs.existsSync behavior
    (fs.existsSync as jest.Mock).mockImplementation((path: string) => {
      if (path.includes("tsconfig.json")) return true;
      return false;
    });
  });

  afterEach(() => {
    // Restore console methods
    console.log = originalConsole.log;
    console.info = originalConsole.info;
    console.error = originalConsole.error;
    console.warn = originalConsole.warn;

    // Restore process.on
    process.on = originalProcessOn;
  });

  afterAll(() => {
    mockExit.mockRestore();
  });

  describe("TypeScript projects", () => {
    beforeEach(() => {
      // Setup TypeScript project mocks
      (getUserFileExtension as jest.Mock).mockReturnValue("ts");
      (fs.readFileSync as jest.Mock).mockReturnValue(
        JSON.stringify({
          compilerOptions: { target: "es2020" },
        })
      );
    });

    it("should build TypeScript project with default options", () => {
      // Execute build command
      buildCommand();

      // Verify build directory creation
      expect(fs.mkdirSync).toHaveBeenCalledWith(".build", { recursive: true });
      expect(fs.mkdirSync).toHaveBeenCalledWith(".build/cjs", {
        recursive: true,
      });
      expect(fs.mkdirSync).toHaveBeenCalledWith(".build/esm", {
        recursive: true,
      });

      // Verify temporary tsconfig creation
      expect(fs.writeFileSync).toHaveBeenCalledWith(
        "/mock/project/tsconfig.arkos-build.json",
        expect.stringContaining("./.build")
      );

      // Verify TypeScript compilation executed
      expect(execSync).toHaveBeenCalledWith(
        "npx tsc -p /mock/project/tsconfig.arkos-build.json",
        expect.objectContaining({
          stdio: "inherit",
          cwd: "/mock/project",
        })
      );

      //   // Verify temporary config cleanup
      //   expect(fs.unlinkSync).toHaveBeenCalledWith(
      //     "/mock/project/tsconfig.arkos-build.json"
      //   );

      // Verify completion message
      expect(console.info).toHaveBeenCalledWith(
        expect.stringContaining("Build complete")
      );
    });

    it("should use custom tsconfig path when specified", () => {
      // Execute build with custom config
      buildCommand({ config: "custom-tsconfig.json" });

      // Verify custom config was read
      expect(fs.readFileSync).toHaveBeenCalledWith(
        "/mock/project/custom-tsconfig.json",
        "utf8"
      );

      // Verify temporary config was created with appropriate name
      expect(fs.writeFileSync).toHaveBeenCalledWith(
        "/mock/project/tsconfig.arkos-build.json",
        expect.any(String)
      );
    });

    it("should handle watch mode correctly", () => {
      // Mock spawn return value for kill verification
      const mockTscProcess = { kill: jest.fn() };
      (spawn as jest.Mock).mockReturnValue(mockTscProcess);

      // Execute build in watch mode
      buildCommand({ watch: true });

      // Verify watch command execution
      expect(spawn).toHaveBeenCalledWith(
        "npx",
        ["tsc", "-p", "/mock/project/tsconfig.arkos-build.json", "--watch"],
        expect.objectContaining({ stdio: "inherit" })
      );

      // Verify SIGINT handler registration
      expect(mockProcessOn).toHaveBeenCalledWith(
        "SIGINT",
        expect.any(Function)
      );

      // Execute the registered SIGINT handler
      const sigintHandler = mockProcessOn.mock.calls.find(
        (call) => call[0] === "SIGINT"
      )[1];
      sigintHandler();

      // Verify process cleanup on SIGINT
      expect(mockTscProcess.kill).toHaveBeenCalled();
      expect(fs.unlinkSync).toHaveBeenCalled();
      expect(mockExit).toHaveBeenCalledWith(0);
    });

    it("should handle tsconfig reading errors gracefully", () => {
      // Setup tsconfig read error
      (fs.readFileSync as jest.Mock).mockImplementation(() => {
        throw new Error("Failed to read tsconfig");
      });

      // Execute build command
      buildCommand();

      // Verify error was logged but build continued
      expect(console.error).toHaveBeenCalledWith(
        "❌ Error reading tsconfig.json:",
        expect.any(Error)
      );

      // Verify build still proceeded with default config
      expect(fs.writeFileSync).toHaveBeenCalled();
      expect(execSync).toHaveBeenCalled();
    });

    it("should handle compiler errors and exit with code 1", () => {
      // Setup compiler error
      (execSync as jest.Mock).mockImplementation(() => {
        throw new Error("Compilation failed");
      });

      // Execute build command and expect it to throw
      expect(() => buildCommand()).toThrow();

      // Verify error handling
      expect(console.error).toHaveBeenCalledWith(
        "❌ Build failed:",
        expect.any(Error)
      );

      // Verify process exit attempt
      expect(mockExit).toHaveBeenCalledWith(1);

      // Verify temp config was cleaned up
      expect(fs.unlinkSync).toHaveBeenCalled();
    });

    it("should handle temporary config cleanup errors gracefully", () => {
      // Setup cleanup error
      (fs.unlinkSync as jest.Mock).mockImplementation(() => {
        throw new Error("Cleanup failed");
      });

      // Execute build command
      buildCommand();

      // Verify warning was logged but build completed
      expect(console.warn).toHaveBeenCalledWith(
        "Warning: Error cleaning up temporary config:",
        expect.any(Error)
      );

      // Verify build still completed successfully
      expect(console.info).toHaveBeenCalledWith(
        expect.stringContaining("Build complete")
      );
    });
  });

  describe("JavaScript projects", () => {
    beforeEach(() => {
      // Setup JavaScript project mocks
      (getUserFileExtension as jest.Mock).mockReturnValue(null);
    });

    it("should build JavaScript project with default options", () => {
      // Execute build command
      buildCommand();

      // Verify build directory creation
      expect(fs.mkdirSync).toHaveBeenCalledWith(".build", { recursive: true });

      // Verify JavaScript files copy command
      expect(execSync).toHaveBeenCalledWith(
        expect.stringMatching(/copyfiles.*\.js.*\.jsx.*\.mjs.*\.cjs/),
        expect.any(Object)
      );

      // Verify asset files copy command
      expect(execSync).toHaveBeenCalledWith(
        expect.stringMatching(/copyfiles.*\.json.*\.html.*\.css.*\.svg.*\.png/),
        expect.any(Object)
      );

      // Verify completion message
      expect(console.info).toHaveBeenCalledWith(
        expect.stringContaining("Build complete")
      );
    });

    it("should handle watch mode correctly", () => {
      // Mock spawn return value for kill verification
      const mockWatcherProcess = { kill: jest.fn() };
      (spawn as jest.Mock).mockReturnValue(mockWatcherProcess);

      // Execute build in watch mode
      buildCommand({ watch: true });

      // Verify file watcher execution
      expect(spawn).toHaveBeenCalledWith(
        "npx",
        [
          "chokidar",
          expect.any(String),
          "-c",
          expect.stringContaining("copyfiles"),
        ],
        expect.objectContaining({ stdio: "inherit" })
      );

      // Verify SIGINT handler registration
      expect(mockProcessOn).toHaveBeenCalledWith(
        "SIGINT",
        expect.any(Function)
      );

      // Execute the registered SIGINT handler
      const sigintHandler = mockProcessOn.mock.calls.find(
        (call) => call[0] === "SIGINT"
      )[1];
      sigintHandler();

      // Verify process cleanup on SIGINT
      expect(mockWatcherProcess.kill).toHaveBeenCalled();
      expect(mockExit).toHaveBeenCalledWith(0);
    });

    it("should handle asset copy errors gracefully", () => {
      // Setup copy errors for asset files only
      (execSync as jest.Mock)
        .mockImplementationOnce(() => {}) // JS files copy succeeds
        .mockImplementationOnce(() => {
          // Asset files copy fails
          throw new Error("Asset copy failed");
        });

      // Execute build command
      buildCommand();

      // Verify warning was logged but build completed
      expect(console.warn).toHaveBeenCalledWith(
        "Warning: Error copying asset files:",
        expect.any(Error)
      );

      // Verify build still completed successfully
      expect(console.info).toHaveBeenCalledWith(
        expect.stringContaining("Build complete")
      );
    });
  });

  describe("Module type validation", () => {
    beforeEach(() => {
      // Setup JavaScript project for module tests
      (getUserFileExtension as jest.Mock).mockReturnValue(null);
    });

    it("should recognize ESM module variations", () => {
      const esmTypes = ["esm", "es", "es2020", "esnext", "module"];

      for (const moduleType of esmTypes) {
        jest.clearAllMocks();
        buildCommand({ module: moduleType });

        // Verify correct output directory
        expect(execSync).toHaveBeenCalledWith(
          expect.stringMatching(/copyfiles.*\.build/),
          expect.any(Object)
        );
      }
    });

    it("should recognize CommonJS module variations", () => {
      const cjsTypes = ["cjs", "commonjs"];

      for (const moduleType of cjsTypes) {
        jest.clearAllMocks();
        buildCommand({ module: moduleType });

        // Verify correct output directory
        expect(execSync).toHaveBeenCalledWith(
          expect.stringMatching(/copyfiles.*\.build/),
          expect.any(Object)
        );
      }
    });

    it("should default to CJS for unrecognized module types", () => {
      // Execute build with invalid module type
      buildCommand({ module: "invalid" });

      // Verify warning and default to CJS
      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining('Unrecognized module type "invalid"')
      );

      // Verify build proceeds with default module type
      expect(execSync).toHaveBeenCalledWith(
        expect.stringMatching(/copyfiles.*\.build/),
        expect.any(Object)
      );
    });
  });
});
