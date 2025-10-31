import path from "path";
import fs from "fs";
import { spawn } from "child_process";
import { startCommand } from "../start";
import { importModule } from "../../helpers/global.helpers";
import portAndHostAllocator from "../../features/port-and-host-allocator";
import { getArkosConfig } from "../../../server";

// Mock dependencies
jest.mock("child_process", () => ({
  spawn: jest.fn(() => ({
    kill: jest.fn(),
  })),
}));

// Don't mock the index file since we're not importing from it directly
// Remove or comment out: jest.mock("../index");

jest.mock("fs", () => ({
  ...jest.requireActual("fs"),
  existsSync: jest.fn(),
  readdirSync: jest.fn(),
  readFileSync: jest.fn(() => "{}"),
}));
jest.mock("util");

jest.mock("path", () => ({
  ...jest.requireActual("path"),
  join: jest.fn((...args) => args.join("/")),
}));

jest.mock("../../../utils/features/port-and-host-allocator");

// Mock console methods
const originalConsoleInfo = console.info;
const originalConsoleError = console.error;
const mockExit = jest.spyOn(process, "exit").mockImplementation((code) => {
  console.error(new Error(`Process.exit called with code ${code}`));
  return "" as never;
});

// Mock server module
jest.mock("../../../server", () => ({
  getArkosConfig: jest.fn().mockReturnValue({
    available: true,
    port: "4000",
    host: "localhost",
  }),
}));

// Mock dotenv helpers
jest.mock("../../dotenv.helpers", () => ({
  loadEnvironmentVariables: jest.fn().mockReturnValue([".env"]),
}));

jest.mock("../../helpers/global.helpers");

jest.mock("commander", () => ({
  Command: class Command {
    name() {
      return this;
    }
    parse() {
      return this;
    }
    command() {
      return this;
    }
    description() {
      return this;
    }
    option() {
      return this;
    }
    action() {
      return this;
    }
    version() {
      return this;
    }
    requiredOption() {
      return this;
    }
    alias() {
      return this;
    }
  },
}));

describe("startCommand", () => {
  // Rest of your test remains the same...
  // Store original process.on implementation
  const originalProcessOn = process.on;
  const mockProcessOn = jest.fn();

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();

    // Mock console methods to prevent output during tests
    console.info = jest.fn();
    console.error = jest.fn();

    // Mock process.on
    process.on = mockProcessOn;

    // Reset environment
    process.env = { ...process.env, NODE_ENV: "test" };

    // Mock process.cwd
    jest.spyOn(process, "cwd").mockReturnValue("/mock/project/root");
  });

  afterEach(() => {
    // Restore console methods
    console.info = originalConsoleInfo;
    console.error = originalConsoleError;

    // Restore process.on
    process.on = originalProcessOn;
  });

  afterAll(() => {
    mockExit.mockRestore();
  });

  // Your test cases remain the same...
  it("should start production server when built app file exists", () => {
    // Mock fs.existsSync to return true for entry point
    (fs.existsSync as jest.Mock).mockReturnValue(true);

    // Call the start command with port and host
    startCommand({ port: "3000", host: "localhost" });

    // Check path.join was called correctly
    expect(path.join).toHaveBeenCalledWith(
      process.cwd(),
      ".build",
      "src",
      "app.js"
    );

    // Check fs.existsSync was called with full path
    expect(fs.existsSync).toHaveBeenCalledWith(
      "/mock/project/root/.build/src/app.js"
    );

    // Check if spawn was called with correct arguments
    expect(spawn).toHaveBeenCalledWith(
      "node",
      [`${process.cwd()}/.build/src/app.js`],
      expect.objectContaining({
        stdio: "inherit",
        env: expect.objectContaining({
          NODE_ENV: "production",
          ARKOS_BUILD: "true",
          CLI_PORT: "3000",
          CLI_HOST: "localhost",
        }),
        shell: true,
      })
    );

    // Verify SIGINT handler was registered
    expect(mockProcessOn).toHaveBeenCalledWith("SIGINT", expect.any(Function));
  });

  it("should start production server when built app file exists", () => {
    // Mock fs.existsSync to return true for entry point
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    process.env.NODE_ENV = "staging";

    // Call the start command with port and host
    startCommand({ port: "3000", host: "localhost" });

    // Check path.join was called correctly
    expect(path.join).toHaveBeenCalledWith(
      process.cwd(),
      ".build",
      "src",
      "app.js"
    );

    // Check fs.existsSync was called with full path
    expect(fs.existsSync).toHaveBeenCalledWith(
      "/mock/project/root/.build/src/app.js"
    );

    // Check if spawn was called with correct arguments
    expect(spawn).toHaveBeenCalledWith(
      "node",
      [`${process.cwd()}/.build/src/app.js`],
      expect.objectContaining({
        stdio: "inherit",
        env: expect.objectContaining({
          NODE_ENV: "staging",
          ARKOS_BUILD: "true",
          CLI_PORT: "3000",
          CLI_HOST: "localhost",
        }),
        shell: true,
      })
    );

    // Verify SIGINT handler was registered
    expect(mockProcessOn).toHaveBeenCalledWith("SIGINT", expect.any(Function));
  });

  it("should exit with code 1 when built app file does not exist", () => {
    // Mock fs.existsSync to return false for entry point
    (fs.existsSync as jest.Mock).mockReturnValue(false);

    // Call the start command
    startCommand();

    // Check fs.existsSync was called
    expect(fs.existsSync).toHaveBeenCalled();

    // Check that the process tried to exit with code 1
    expect(mockExit).toHaveBeenCalledWith(1);

    // Verify error message
    expect(console.error).toHaveBeenCalledWith(
      "❌ Could not find built application entry point at .build/src/app.js"
    );
  });

  it("should use default options when none are provided", async () => {
    // Set up all mocks before calling the function
    jest
      .spyOn(require("../../../server"), "getArkosConfig")
      .mockResolvedValue({ getArkosConfig: () => ({ available: true }) });

    // Setup mock for importModule to return a resolved promise
    (importModule as jest.Mock).mockImplementation(async (path) => {
      return {
        getArkosConfig: () => ({ available: true }),
      };
    });

    (
      portAndHostAllocator.getHostAndAvailablePort as jest.Mock
    ).mockImplementationOnce(() => {
      return {
        port: 8000,
        host: "localhost",
      };
    });

    // Mock fs.existsSync to return true for entry point
    (fs.existsSync as jest.Mock).mockReturnValue(true);

    // Call the start command with no options
    await startCommand();

    // Check environment variables were set correctly
    expect(spawn).toHaveBeenCalledWith(
      "node",
      [`${process.cwd()}/.build/src/app.js`],
      expect.objectContaining({
        env: expect.objectContaining({
          NODE_ENV: "production",
          ARKOS_BUILD: "true",
        }),
      })
    );

    // Fast-forward timers to allow waitForConfig to complete
    jest.useFakeTimers({ advanceTimers: 500 });

    // Wait for promises to resolve
    await new Promise((resolve) => setImmediate(resolve));
    // To check a function was called with specific args:
    expect(importModule).toHaveBeenCalled();

    // To verify console output:
    expect(console.info).toHaveBeenCalledWith(
      expect.stringContaining("Arkos.js")
    );
  });

  it("should register a SIGINT handler that kills the child process", () => {
    // Mock fs.existsSync to return true
    (fs.existsSync as jest.Mock).mockReturnValue(true);

    // Mock child process
    const mockChild = { kill: jest.fn() };
    (spawn as jest.Mock).mockReturnValue(mockChild);

    // Call the start command
    startCommand();

    // Get the SIGINT handler that was registered
    const sigintHandler = mockProcessOn.mock.calls.find(
      (call) => call[0] === "SIGINT"
    )[1];

    // Call the handler
    sigintHandler();

    // Verify the child process was killed
    expect(mockChild.kill).toHaveBeenCalled();
    expect(mockExit).toHaveBeenCalledWith(0);
  });

  it("should exit with code 1 when an error occurs", () => {
    // Mock fs.existsSync to throw an error
    const err = new Error("Test error");
    (fs.existsSync as jest.Mock).mockImplementation(() => {
      throw err;
    });

    // Call the start command
    startCommand();

    // Verify error message
    expect(console.error).toHaveBeenCalledWith(
      "❌ Production server failed to start:",
      err
    );
    expect(mockExit).toHaveBeenCalledWith(1);
  });

  it("should include custom port and host in environment variables", () => {
    // Mock fs.existsSync to return true
    (fs.existsSync as jest.Mock).mockReturnValue(true);

    // Call with custom port and host
    startCommand({ port: "5000", host: "0.0.0.0" });

    // Check environment variables contain custom PORT and HOST
    expect(spawn).toHaveBeenCalledWith(
      "node",
      [`${process.cwd()}/.build/src/app.js`],
      expect.objectContaining({
        env: expect.objectContaining({
          CLI_PORT: "5000",
          CLI_HOST: "0.0.0.0",
        }),
      })
    );
  });

  // Additional tests to add to your start.test.ts file

  it("should correctly display configuration when getArkosConfig is successful", async () => {
    // Mock fs.existsSync to return true
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    jest
      .spyOn(require("../../helpers/global.helpers"), "importModule")
      .mockReturnValue({
        getArkosConfig: () => ({
          available: true,
          port: "8080",
          host: "example.com",
        }),
      });

    // Mock environment variables loading
    const loadEnvMock = jest.requireMock(
      "../../dotenv.helpers"
    ).loadEnvironmentVariables;
    loadEnvMock.mockReturnValue([
      "/mock/project/root/.env",
      "/mock/project/root/.env.production",
    ]);

    (
      portAndHostAllocator.getHostAndAvailablePort as jest.Mock
    ).mockImplementationOnce(() => {
      return {
        port: 8000,
        host: "example.com",
      };
    });

    // Call the start command
    startCommand();

    // Fast-forward timers to allow waitForConfig to complete
    jest.useFakeTimers({ advanceTimers: 500 });

    // Wait for promises to resolve
    await new Promise((resolve) => setImmediate(resolve));

    // Check console output contains the correct information
    expect(console.info).toHaveBeenCalledWith(
      expect.stringContaining("Arkos.js")
    );
    expect(console.info).toHaveBeenCalledWith(
      expect.stringContaining("http://")
    );
    expect(console.info).toHaveBeenCalledWith(
      expect.stringContaining(".env, .env.production")
    );
  });

  it("should fall back to default config (cli values or env) display when getArkosConfig repeatedly fails", async () => {
    jest
      .spyOn(require("../../helpers/global.helpers"), "importModule")
      .mockResolvedValue({
        getArkosConfig: () => ({
          available: false,
        }),
      });

    (
      portAndHostAllocator.getHostAndAvailablePort as jest.Mock
    ).mockImplementationOnce(() => {
      return {
        port: 5678,
        host: "test-host",
      };
    });

    startCommand({ port: "5678", host: "test-host" });

    await jest.advanceTimersByTimeAsync(2000);

    expect(console.info).toHaveBeenCalledWith(
      expect.stringContaining("http://test-host:5678")
    );
  });

  it("should not display host nor port when arkos config is not available and no cli values and env values are passed.", async () => {
    jest
      .spyOn(require("../../helpers/global.helpers"), "importModule")
      .mockResolvedValue({
        getArkosConfig: () => ({
          available: false,
        }),
      });

    startCommand();

    await jest.advanceTimersByTimeAsync(2000);

    expect(console.info).not.toHaveBeenCalledWith(
      expect.stringContaining("- Local:")
    );
  });

  // it("should handle errors during config retrieval gracefully", async () => {
  //   // Mock fs.existsSync to return true
  //   (fs.existsSync as jest.Mock).mockReturnValue(true);

  //   // Mock getArkosConfig to throw an error
  //   const getArkosConfigMock =
  //     jest.requireMock("../../../server").getArkosConfig;
  //   getArkosConfigMock.mockImplementation(() => {
  //     throw new Error("Module not found");
  //   });

  //   // Use jest.spyOn to track console.info calls
  //   const infoSpy = jest.spyOn(console, "info");

  //   // This should complete without errors
  //   startCommand();

  //   // Fast-forward timers
  //   jest.useFakeTimers(10000);

  //   // Wait for any promises to resolve

  //   // Should fall back to default config display
  //   expect(infoSpy).toHaveBeenCalledWith(
  //     expect.stringMatching(/Local:.+http:/)
  //   );
  // }, 10000); // Increase timeout to avoid timeout errors

  // it("should correctly handle environment file path display", () => {
  //   // Mock fs.existsSync to return true
  //   (fs.existsSync as jest.Mock).mockReturnValue(true);

  //   // Mock a variety of environment files
  //   const loadEnvMock = jest.requireMock(
  //     "../../dotenv.helpers"
  //   ).loadEnvironmentVariables;
  //   loadEnvMock.mockReturnValue([
  //     "/mock/project/root/.env",
  //     "/mock/project/root/.env.local",
  //     "/mock/project/root/.env.production",
  //   ]);

  //   // Use jest.spyOn to track console.info calls
  //   const infoSpy = jest.spyOn(console, "info");

  //   // Call the start command
  //   startCommand();

  //   // Run any pending timers
  //   jest.useFakeTimers(1000);

  //   // Check that paths are displayed without the project root prefix
  //   expect(infoSpy).toHaveBeenCalledWith(
  //     expect.stringContaining(".env, .env.local, .env.production")
  //   );
  // });
});
