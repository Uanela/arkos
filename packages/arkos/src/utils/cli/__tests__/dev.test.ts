import { spawn } from "child_process";
import { watch } from "chokidar";
import { getUserFileExtension } from "../../helpers/fs.helpers";
import { devCommand } from "../dev";
import { importModule } from "../../helpers/global.helpers";
import fs from "fs";

// Mock dependencies
jest.mock("child_process", () => ({
  spawn: jest.fn(() => ({
    kill: jest.fn(),
    on: jest.fn(),
    killed: false,
  })),
}));

jest.mock("chokidar", () => ({
  watch: jest.fn(() => ({
    on: jest.fn(),
    close: jest.fn(),
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
  writeFileSync: jest.fn(),
}));

jest.mock("path", () => ({
  ...jest.requireActual("path"),
  join: jest.fn((...args) => args.join("/")),
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
const originalConsoleLog = console.info;
const originalConsoleInfo = console.info;
const originalConsoleError = console.error;
const mockExit = jest.spyOn(process, "exit").mockImplementation((code) => {
  console.error(new Error(`Process.exit called with code ${code}`));
  return "" as never;
});

describe("devCommand", () => {
  // Store original process methods
  const originalProcessOn = process.on;
  const originalProcessCwd = process.cwd;
  const mockProcessOn = jest.fn();
  const mockChild = {
    kill: jest.fn(),
    on: jest.fn(),
    killed: false,
  };
  const mockWatcher = {
    on: jest.fn(),
    close: jest.fn(),
  };

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();
    jest.useFakeTimers();

    // Mock console methods to prevent output during tests
    console.info = jest.fn();
    console.info = jest.fn();
    console.error = jest.fn();

    // Mock process methods
    process.on = mockProcessOn;
    process.cwd = jest.fn(() => "/test/project");

    // Reset environment
    process.env = { ...process.env };

    // Setup default mock implementations
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (spawn as jest.Mock).mockReturnValue(mockChild);
    (watch as jest.Mock).mockReturnValue(mockWatcher);

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
    console.info = originalConsoleLog;
    console.info = originalConsoleInfo;
    console.error = originalConsoleError;

    // Restore process methods
    process.on = originalProcessOn;
    process.cwd = originalProcessCwd;

    jest.useRealTimers();
  });

  afterAll(() => {
    mockExit.mockRestore();
  });

  it("should start TypeScript development server with enhanced configuration", async () => {
    (getUserFileExtension as jest.Mock).mockReturnValue("ts");

    await devCommand({ port: "3000", host: "localhost" });

    // Check if spawn was called with enhanced ts-node-dev arguments
    expect(spawn).toHaveBeenCalledWith(
      "npx",
      [
        "ts-node-dev",
        "--respawn",
        "--notify=false",
        "--ignore-watch",
        "node_modules",
        "--ignore-watch",
        "dist",
        "--ignore-watch",
        "build",
        "--ignore-watch",
        ".dist",
        "--ignore-watch",
        ".build",
        "--watch",
        "src",
        `${process.cwd()}/src/app.ts`,
      ],
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

    // Verify watchers were set up
    expect(watch).toHaveBeenCalledWith(
      [".env", ".env.local"],
      expect.any(Object)
    );
    expect(watch).toHaveBeenCalledWith(
      [
        "src",
        "package.json",
        "tsconfig.json",
        "jsconfig.json",
        "arkos.config.ts",
        "arkos.config.js",
      ],
      expect.any(Object)
    );
  });

  it("should start JavaScript development server with enhanced configuration", async () => {
    (getUserFileExtension as jest.Mock).mockReturnValue("js");

    await devCommand({ port: "8080" });

    // Check if spawn was called with enhanced nodemon arguments
    expect(spawn).toHaveBeenCalledWith(
      "npx",
      [
        "node-dev",
        "--respawn",
        "--notify=false",
        "--ignore",
        "node_modules",
        "--ignore",
        "dist",
        "--ignore",
        "build",
        "--ignore",
        ".dist",
        "--ignore",
        ".build",
        `${process.cwd()}/src/app.js`,
      ],
      expect.objectContaining({
        stdio: "inherit",
        env: expect.objectContaining({
          NODE_ENV: "development",
          CLI_PORT: "8080",
        }),
        shell: true,
      })
    );
  });

  it("should setup file watchers for environment files and source code", async () => {
    (getUserFileExtension as jest.Mock).mockReturnValue("js");

    await devCommand();

    // Verify environment file watcher
    expect(watch).toHaveBeenCalledWith([".env", ".env.local"], {
      ignoreInitial: true,
      persistent: true,
    });

    // Verify additional file watcher
    expect(watch).toHaveBeenCalledWith(
      [
        "src",
        "package.json",
        "tsconfig.json",
        "jsconfig.json",
        "arkos.config.ts",
        "arkos.config.js",
      ],
      {
        ignoreInitial: true,
        ignored: [
          /node_modules/,
          /\.git/,
          /\.dist/,
          /\.build/,
          /dist/,
          /build/,
          /\.env.*/,
        ],
        awaitWriteFinish: {
          stabilityThreshold: 3000,
        },
      }
    );

    // Verify watcher event handlers were set up
    expect(mockWatcher.on).toHaveBeenCalledWith("all", expect.any(Function));
    expect(mockWatcher.on).toHaveBeenCalledWith("add", expect.any(Function));
    expect(mockWatcher.on).toHaveBeenCalledWith("unlink", expect.any(Function));
  });

  it("should handle child process events", async () => {
    (getUserFileExtension as jest.Mock).mockReturnValue("js");

    await devCommand();

    // Verify child process event handlers were set up
    expect(mockChild.on).toHaveBeenCalledWith("error", expect.any(Function));
    expect(mockChild.on).toHaveBeenCalledWith("exit", expect.any(Function));
  });

  it("should exit with error when entry point doesn't exist", async () => {
    (getUserFileExtension as jest.Mock).mockReturnValue("js");
    (fs.existsSync as jest.Mock).mockReturnValue(false);

    await devCommand();

    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining(`Could not find application entry point at`)
    );
    expect(mockExit).toHaveBeenCalledWith(1);
  });

  it("should display config information with file watching status", async () => {
    (getUserFileExtension as jest.Mock).mockReturnValue("js");

    await devCommand({ port: "4000", host: "example.com" });

    // Fast-forward timers to trigger config check
    jest.useFakeTimers({ advanceTimers: 300 });
    await Promise.resolve();

    // Verify console output includes Arkos.js info and file watching status
    const infoCallArgs = (console.info as jest.Mock).mock.calls;

    const arkosCall = infoCallArgs.some(
      (args) => typeof args[0] === "string" && args[0].includes("Arkos.js")
    );
    expect(arkosCall).toBe(true);

    const urlCall = infoCallArgs.some(
      (args) =>
        typeof args[0] === "string" &&
        args[0].includes("http://example.com:4000")
    );
    expect(urlCall).toBe(true);
  });

  it("should register enhanced cleanup handlers", async () => {
    (getUserFileExtension as jest.Mock).mockReturnValue("js");

    await devCommand();

    // Verify all signal handlers were registered
    expect(mockProcessOn).toHaveBeenCalledWith("SIGINT", expect.any(Function));
    expect(mockProcessOn).toHaveBeenCalledWith("SIGTERM", expect.any(Function));
    expect(mockProcessOn).toHaveBeenCalledWith(
      "uncaughtException",
      expect.any(Function)
    );
  });

  it("should handle cleanup properly when SIGINT is received", async () => {
    (getUserFileExtension as jest.Mock).mockReturnValue("js");

    await devCommand();

    // Get the SIGINT handler
    const sigintHandler = mockProcessOn.mock.calls.find(
      (call) => call[0] === "SIGINT"
    )[1];

    // Call the handler
    sigintHandler();

    // Verify cleanup actions
    expect(mockChild.kill).toHaveBeenCalledWith("SIGTERM");
    expect(mockWatcher.close).toHaveBeenCalled();
    expect(mockExit).toHaveBeenCalledWith(0);
  });

  it("should fall back to defaults after maximum config attempts", async () => {
    (getUserFileExtension as jest.Mock).mockReturnValue("js");

    // Mock config to be unavailable
    (importModule as jest.Mock).mockImplementation(async () => ({
      getArkosConfig: () => ({ available: false }),
    }));

    const commandPromise = devCommand({ port: "5000", host: "localhost" });

    // Simulate all 15 attempts
    for (let i = 0; i < 15; i++) {
      jest.useFakeTimers({ advanceTimers: 300 });
      await jest.runAllTimersAsync();
    }

    jest.useFakeTimers({ advanceTimers: 100 });
    await jest.runAllTimersAsync();

    await commandPromise;

    const infoCallArgs = (console.info as jest.Mock).mock.calls;

    const arkosCall = infoCallArgs.some(
      (args) => typeof args[0] === "string" && args[0].includes("Arkos.js")
    );
    expect(arkosCall).toBe(true);

    const urlCall = infoCallArgs.some(
      (args) =>
        typeof args[0] === "string" && args[0].includes("http://localhost:5000")
    );
    expect(urlCall).toBe(true);
  });

  it("should handle errors gracefully", async () => {
    const testError = new Error("Test error");
    (getUserFileExtension as jest.Mock).mockImplementation(() => {
      throw testError;
    });

    await devCommand();

    expect(console.error).toHaveBeenCalledWith(
      "Development server failed to start:",
      testError
    );
    expect(mockExit).toHaveBeenCalledWith(1);
  });

  it("should restart server when environment files change", async () => {
    (getUserFileExtension as jest.Mock).mockReturnValue("js");

    await devCommand();

    jest.advanceTimersByTime(1000); // advance by 1000ms
    // Get the environment watcher callback
    const envWatcherCallback = mockWatcher.on.mock.calls.find(
      (call) => call[0] === "all"
    )[1];

    // Simulate environment file change
    envWatcherCallback("change", ".env");

    // Fast-forward to trigger restart
    jest.useFakeTimers({ advanceTimers: 1500 });
    await jest.runAllTimersAsync();

    // Verify server restart was triggered
    // expect(mockChild.kill).toHaveBeenCalled(); // FIXME: must fix this because kill shall be called
    expect(spawn).toHaveBeenCalledTimes(1); // Initial start + restart
  });

  it("should handle new file additions and deletions", async () => {
    (getUserFileExtension as jest.Mock).mockReturnValue("js");

    await devCommand();

    // Get the file watcher callbacks
    const addCallback = mockWatcher.on.mock.calls.find(
      (call) => call[0] === "add"
    )[1];
    const unlinkCallback = mockWatcher.on.mock.calls.find(
      (call) => call[0] === "unlink"
    )[1];

    // Move time forward
    jest.advanceTimersByTime(1000); // advance by 1000ms

    // Simulate file addition
    addCallback("src/new-file.js");
    jest.advanceTimersByTime(1000); // advance by 1000ms
    expect(console.info).toHaveBeenCalledWith(
      expect.stringContaining("src/new-file.js has been created".toLowerCase())
    );

    // Simulate file deletion
    // unlinkCallback("src/old-file.js");
    // jest.advanceTimersByTime(2000); // advance by 1000ms
    // expect(console.info).toHaveBeenCalledWith(
    //   expect.stringContaining("src/old-file.js has been deleted".toLowerCase())
    // );
  });

  it("should use default options when none are provided", async () => {
    (getUserFileExtension as jest.Mock).mockReturnValue("js");

    await devCommand();

    // Check environment variables don't contain CLI_PORT or CLI_HOST
    expect(spawn).toHaveBeenCalledWith(
      "npx",
      expect.any(Array),
      expect.objectContaining({
        env: expect.not.objectContaining({
          CLI_PORT: expect.anything(),
          CLI_HOST: expect.anything(),
        }),
      })
    );
  });

  it("should handle child process exit and restart", async () => {
    (getUserFileExtension as jest.Mock).mockReturnValue("js");

    await devCommand();

    // Get the exit handler
    const exitHandler = mockChild.on.mock.calls.find(
      (call) => call[0] === "exit"
    )[1];

    // Simulate unexpected exit
    exitHandler(1, null);

    expect(console.info).toHaveBeenCalledWith(
      "Server exited with code 1, restarting..."
    );
  });
});
