import { spawn } from "child_process";
import { getUserFileExtension } from "../../helpers/fs.helpers";
import { devCommand } from "../dev";
import { importModule } from "../../helpers/global.helpers";

// Mock dependencies
jest.mock("child_process", () => ({
  spawn: jest.fn(() => ({
    kill: jest.fn(),
  })),
}));

jest.mock("../../helpers/fs.helpers", () => ({
  ...jest.requireActual("../../helpers/fs.helpers"),
  getUserFileExtension: jest.fn(),
}));

jest.mock("../../helpers/global.helpers", () => ({
  importModule: jest.fn(),
}));

jest.mock("../../../server", () => ({
  getArkosConfig: jest.fn(),
}));

jest.mock("fs", () => ({
  ...jest.requireActual("fs"),
  existsSync: jest.fn(),
  readdirSync: jest.fn(),
  readFileSync: jest.fn(() => "{}"),
}));

jest.mock("util");
jest.mock("../../dotenv.helpers", () => ({
  loadEnvironmentVariables: jest.fn(() => ["/.env", "/.env.local"]),
}));

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
    alias() {
      return this;
    }
    requiredOption() {
      return this;
    }
  },
}));

// Mock console methods
const originalConsoleLog = console.log;
const originalConsoleInfo = console.info;
const originalConsoleError = console.error;
const mockExit = jest.spyOn(process, "exit").mockImplementation((code) => {
  console.error(new Error(`Process.exit called with code ${code}`));
  return "" as never;
});

describe("devCommand", () => {
  // Store original process.on implementation
  const originalProcessOn = process.on;
  const mockProcessOn = jest.fn();

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();
    jest.useFakeTimers();

    // Mock console methods to prevent output during tests
    console.log = jest.fn();
    console.info = jest.fn();
    console.error = jest.fn();

    // Mock process.on
    process.on = mockProcessOn;

    // Reset environment
    process.env = { ...process.env };

    // Setup default mock implementation for importModule
    (importModule as jest.Mock).mockResolvedValue({
      getArkosConfig: () => ({
        available: true,
        host: "localhost",
        port: "3000",
      }),
    });
  });

  afterEach(() => {
    // Restore console methods
    console.log = originalConsoleLog;
    console.info = originalConsoleInfo;
    console.error = originalConsoleError;

    // Restore process.on
    process.on = originalProcessOn;

    jest.useRealTimers();
  });

  afterAll(() => {
    mockExit.mockRestore();
  });

  it("should start TypeScript development server when fileExt is ts", async () => {
    // Mock getUserFileExtension to return 'ts'

    (getUserFileExtension as jest.Mock).mockReturnValue("ts");

    // Call the dev command
    await devCommand({ port: "3000", host: "localhost" });

    // Check if spawn was called with correct arguments for TypeScript
    expect(spawn).toHaveBeenCalledWith(
      "npx",
      ["ts-node-dev", "--respawn", "src/app.ts"],
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

    // Fast-forward timers to trigger config check
    jest.useFakeTimers({ advanceTimers: 300 });

    // Wait for all promises to resolve
    await Promise.resolve();

    // Verify config was checked
    expect(importModule).toHaveBeenCalled();

    // Verify SIGINT handler was registered
    expect(mockProcessOn).toHaveBeenCalledWith("SIGINT", expect.any(Function));
  });

  it("should start JavaScript development server when fileExt is js", async () => {
    // Mock getUserFileExtension to return 'js'
    (getUserFileExtension as jest.Mock).mockReturnValue("js");

    // Call the dev command
    await devCommand({ port: "8080" });

    // Check if spawn was called with correct arguments for JavaScript
    expect(spawn).toHaveBeenCalledWith(
      "npx",
      ["nodemon", "src/app.js"],
      expect.objectContaining({
        stdio: "inherit",
        env: expect.objectContaining({
          NODE_ENV: "development",
          CLI_PORT: "8080",
        }),
        shell: true,
      })
    );

    // Advance timers and resolve promises
    jest.useFakeTimers({ advanceTimers: 300 });
    await Promise.resolve();

    expect(importModule).toHaveBeenCalled();
  });

  it("should use default options when none are provided", async () => {
    // Mock getUserFileExtension to return 'js'
    (getUserFileExtension as jest.Mock).mockReturnValue("js");

    // Call the dev command with no options
    await devCommand();

    // Check environment variables don't contain CLI_PORT or CLI_HOST
    expect(spawn).toHaveBeenCalledWith(
      "npx",
      ["nodemon", "src/app.js"],
      expect.objectContaining({
        env: expect.not.objectContaining({
          CLI_PORT: expect.anything(),
          CLI_HOST: expect.anything(),
        }),
      })
    );

    // Advance timers to trigger config check
    jest.useFakeTimers({ advanceTimers: 300 });
    await Promise.resolve();

    // Verify importModule was called
    expect(importModule).toHaveBeenCalled();
  });

  it("should display config information when config is available", async () => {
    // Mock getUserFileExtension
    (getUserFileExtension as jest.Mock).mockReturnValue("js");

    // Call the dev command
    await devCommand({ port: "4000", host: "example.com" });

    // Fast-forward timers to trigger config check
    jest.useFakeTimers({ advanceTimers: 300 });
    await Promise.resolve();

    // Verify console output includes Arkos.js info
    expect(console.info).toHaveBeenCalledWith(
      expect.stringContaining("Arkos.js")
    );
    expect(console.info).toHaveBeenCalledWith(
      expect.stringContaining("http://example.com:4000")
    );
  });

  it("should fall back to defaults after maximum attempts", async () => {
    // Mock getUserFileExtension
    (getUserFileExtension as jest.Mock).mockReturnValue("js");

    // Create a mock implementation that consistently returns unavailable config
    (importModule as jest.Mock).mockImplementation(async () => ({
      getArkosConfig: () => ({ available: false }),
    }));

    // Call the dev command but don't await it yet
    const commandPromise = devCommand({ port: "5000", host: "localhost" });

    // We need to simulate the entire waitForConfig function execution
    // First, let's run through all 15 attempts
    for (let i = 0; i < 15; i++) {
      // Advance timer by 300ms (the timeout between attempts)
      jest.useFakeTimers({ advanceTimers: 300 });
      // Make sure all pending promises are resolved
      await jest.runAllTimersAsync();
    }

    // Now let's advance a bit more to let the fallback logic execute
    jest.useFakeTimers({ advanceTimers: 100 });
    await jest.runAllTimersAsync();

    // Now await the command to make sure it completes
    await commandPromise;

    // Now check if the fallback info was displayed
    const infoCallArgs = (console.info as jest.Mock).mock.calls;

    // Debug the actual calls
    console.log("Debug - console.info calls:", infoCallArgs);

    // Check for Arkos.js in any call to console.info
    const arkosCall = infoCallArgs.some(
      (args) => typeof args[0] === "string" && args[0].includes("Arkos.js")
    );

    expect(arkosCall).toBe(true);

    // Check for URL in any call
    const urlCall = infoCallArgs.some(
      (args) =>
        typeof args[0] === "string" && args[0].includes("http://localhost:5000")
    );

    expect(urlCall).toBe(true);
  });

  it("should register a SIGINT handler that kills the child process", async () => {
    // Mock getUserFileExtension
    (getUserFileExtension as jest.Mock).mockReturnValue("js");

    // Mock child process
    const mockChild = { kill: jest.fn() };
    (spawn as jest.Mock).mockReturnValue(mockChild);

    // Call the dev command
    await devCommand();

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

  it("should exit with code 1 when an error occurs", async () => {
    // Mock getUserFileExtension to throw an error
    const testError = new Error("Test error");
    (getUserFileExtension as jest.Mock).mockImplementation(() => {
      throw testError;
    });

    await devCommand();

    // Verify error message
    expect(console.error).toHaveBeenCalledWith(
      "❌ Development server failed to start:",
      testError
    );
    expect(mockExit).toHaveBeenCalledWith(1);
  });
});
