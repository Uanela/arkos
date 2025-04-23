import path from "path";
import fs from "fs";
import { spawn } from "child_process";
import { startCommand } from "../start";

// Mock dependencies
jest.mock("child_process", () => ({
  spawn: jest.fn(() => ({
    kill: jest.fn(),
  })),
}));

jest.mock("fs", () => ({
  existsSync: jest.fn(),
}));

jest.mock("path", () => ({
  join: jest.fn((...args) => args.join("/")),
}));

// Mock console methods
const originalConsoleLog = console.log;
const originalConsoleInfo = console.info;
const originalConsoleError = console.error;
const mockExit = jest.spyOn(process, "exit").mockImplementation((code) => {
  console.error(new Error(`Process.exit called with code ${code}`));
  return "" as never;
});

describe("startCommand", () => {
  // Store original process.on implementation
  const originalProcessOn = process.on;
  const mockProcessOn = jest.fn();

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();

    // Mock console methods to prevent output during tests
    console.log = jest.fn();
    console.info = jest.fn();
    console.error = jest.fn();

    // Mock process.on
    process.on = mockProcessOn;

    // Reset environment
    process.env = { ...process.env };

    // Mock process.cwd
    jest.spyOn(process, "cwd").mockReturnValue("/mock/project/root");
  });

  afterEach(() => {
    // Restore console methods
    console.log = originalConsoleLog;
    console.info = originalConsoleInfo;
    console.error = originalConsoleError;

    // Restore process.on
    process.on = originalProcessOn;
  });

  afterAll(() => {
    mockExit.mockRestore();
  });

  it("should start production server when built app file exists", () => {
    // Mock fs.existsSync to return true for entry point
    (fs.existsSync as jest.Mock).mockReturnValue(true);

    // Call the start command with port and host
    startCommand({ port: "3000", host: "localhost" });

    // Check path.join was called correctly
    expect(path.join).toHaveBeenCalledWith(".build", "src", "app.js");

    // Check fs.existsSync was called with full path
    expect(fs.existsSync).toHaveBeenCalledWith(
      "/mock/project/root/.build/src/app.js"
    );

    // Check if spawn was called with correct arguments
    expect(spawn).toHaveBeenCalledWith(
      "node",
      [".build/src/app.js"],
      expect.objectContaining({
        stdio: "inherit",
        env: expect.objectContaining({
          NODE_ENV: "production",
          ARKOS_BUILD: "true",
          PORT: "3000",
          HOST: "localhost",
        }),
        shell: true,
      })
    );

    // Verify console messages
    expect(console.info).toHaveBeenCalledWith(
      "🚀 Starting production server on localhost:3000..."
    );
    expect(console.info).toHaveBeenCalledWith(
      "📂 Using entry point: .build/src/app.js"
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

  it("should use default options when none are provided", () => {
    // Mock fs.existsSync to return true for entry point
    (fs.existsSync as jest.Mock).mockReturnValue(true);

    // Call the start command with no options
    startCommand();

    // Check environment variables don't contain PORT or HOST
    expect(spawn).toHaveBeenCalledWith(
      "node",
      [".build/src/app.js"],
      expect.objectContaining({
        env: expect.objectContaining({
          NODE_ENV: "production",
          ARKOS_BUILD: "true",
        }),
      })
    );

    // Verify console message has undefined values
    expect(console.info).toHaveBeenCalledWith(
      "🚀 Starting production server on undefined:undefined..."
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
      [".build/src/app.js"],
      expect.objectContaining({
        env: expect.objectContaining({
          PORT: "5000",
          HOST: "0.0.0.0",
        }),
      })
    );
  });
});
