import { spawn } from "child_process";
import { getUserFileExtension } from "../../helpers/fs.helpers";
import { devCommand } from "../dev";

// Mock dependencies
jest.mock("child_process", () => ({
  spawn: jest.fn(() => ({
    kill: jest.fn(),
  })),
}));

jest.mock("../../helpers/fs.helpers", () => ({
  getUserFileExtension: jest.fn(),
}));

// Mock console methods
const originalConsoleLog = console.log;
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

    // Mock console methods to prevent output during tests
    console.log = jest.fn();
    console.info = jest.fn();
    console.error = jest.fn();

    // Mock process.on
    process.on = mockProcessOn;

    // Reset environment
    process.env = { ...process.env };
  });

  afterEach(() => {
    // Restore console methods
    console.log = originalConsoleLog;
    console.error = originalConsoleError;

    // Restore process.on
    process.on = originalProcessOn;
  });

  afterAll(() => {
    mockExit.mockRestore();
  });

  it("should start TypeScript development server when fileExt is ts", () => {
    // Mock getUserFileExtension to return 'ts'
    (getUserFileExtension as jest.Mock).mockReturnValue("ts");

    // Call the dev command
    devCommand({ port: "3000", host: "localhost" });

    // Check if spawn was called with correct arguments for TypeScript
    expect(spawn).toHaveBeenCalledWith(
      "npx",
      ["ts-node-dev", "--respawn", "src/app.ts"],
      expect.objectContaining({
        stdio: "inherit",
        env: expect.objectContaining({
          NODE_ENV: "test",
          PORT: "3000",
          HOST: "localhost",
        }),
        shell: true,
      })
    );

    // Verify console messages
    expect(console.info).toHaveBeenCalledWith(
      "🚀 Starting development server on localhost:3000..."
    );
    expect(console.info).toHaveBeenCalledWith(
      "📂 Using entry point: src/app.ts"
    );
    expect(console.info).toHaveBeenCalledWith(
      "👀 Watch mode enabled. Changes will trigger restart."
    );

    // Verify SIGINT handler was registered
    expect(mockProcessOn).toHaveBeenCalledWith("SIGINT", expect.any(Function));
  });

  it("should start JavaScript development server when fileExt is js", () => {
    // Mock getUserFileExtension to return 'js'
    (getUserFileExtension as jest.Mock).mockReturnValue("js");

    // Call the dev command
    devCommand({ port: "8080" });

    // Check if spawn was called with correct arguments for JavaScript
    expect(spawn).toHaveBeenCalledWith(
      "npx",
      ["nodemon", "src/app.js"],
      expect.objectContaining({
        stdio: "inherit",
        env: expect.objectContaining({
          NODE_ENV: "test",
          PORT: "8080",
        }),
        shell: true,
      })
    );

    // Verify no TypeScript-specific log message
    expect(console.log).not.toHaveBeenCalledWith(
      "👀 Watch mode enabled. Changes will trigger restart."
    );
  });

  it("should use default options when none are provided", () => {
    // Mock getUserFileExtension to return 'js'
    (getUserFileExtension as jest.Mock).mockReturnValue("js");

    // Call the dev command with no options
    devCommand();

    // Check environment variables don't contain PORT or HOST
    expect(spawn).toHaveBeenCalledWith(
      "npx",
      ["nodemon", "src/app.js"],
      expect.objectContaining({
        env: expect.not.objectContaining({
          PORT: expect.anything(),
          HOST: expect.anything(),
        }),
      })
    );

    // Verify console message has undefined values
    expect(console.info).toHaveBeenCalledWith(
      "🚀 Starting development server on undefined:undefined..."
    );
  });

  it("should register a SIGINT handler that kills the child process", () => {
    // Mock getUserFileExtension
    (getUserFileExtension as jest.Mock).mockReturnValue("js");

    // Mock child process
    const mockChild = { kill: jest.fn() };
    (spawn as jest.Mock).mockReturnValue(mockChild);

    // Call the dev command
    devCommand();

    // Get the SIGINT handler that was registered
    const sigintHandler = mockProcessOn.mock.calls.find(
      (call) => call[0] === "SIGINT"
    )[1];

    // Call the handler
    sigintHandler();

    try {
      // Verify the child process was killed
      expect(mockChild.kill).toHaveBeenCalled();
      expect(mockExit).toHaveBeenCalledWith(0);
    } catch (err) {
      console.log(err);
    }
  });

  it("should exit with code 1 when an error occurs", () => {
    // Mock getUserFileExtension to throw an error
    const err = new Error("Test error");
    (getUserFileExtension as jest.Mock).mockImplementation(() => {
      throw err;
    });

    devCommand();

    // Call the dev command and expect it to exit
    expect(console.error).toHaveBeenCalledWith(
      "❌ Development server failed to start:",
      err
    );

    // Verify error message
    expect(console.error).toHaveBeenCalledWith(
      "❌ Development server failed to start:",
      expect.any(Error)
    );
    expect(mockExit).toHaveBeenCalledWith(1);
  });
});
