import path from "path";
import fs from "fs";
import { spawn } from "child_process";
import { startCommand } from "../start";
import { importModule } from "../../helpers/global.helpers";
import portAndHostAllocator from "../../features/port-and-host-allocator";

jest.mock("child_process", () => ({
  spawn: jest.fn(() => ({
    kill: jest.fn(),
  })),
}));

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

const originalConsoleInfo = console.info;
const originalConsoleError = console.error;
const mockExit = jest.spyOn(process, "exit").mockImplementation((code) => {
  console.error(new Error(`Process.exit called with code ${code}`));
  return "" as never;
});

jest.mock("../../../server", () => ({
  getArkosConfig: jest.fn().mockReturnValue({
    available: true,
    port: "4000",
    host: "localhost",
  }),
}));

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
  const originalProcessOn = process.on;
  const mockProcessOn = jest.fn();

  beforeEach(() => {
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

    expect(mockProcessOn).toHaveBeenCalledWith("SIGINT", expect.any(Function));
  });

  it("should exit with code 1 when built app file does not exist", () => {
    (fs.existsSync as jest.Mock).mockReturnValue(false);

    startCommand();

    expect(fs.existsSync).toHaveBeenCalled();

    expect(mockExit).toHaveBeenCalledWith(1);

    expect(console.error).toHaveBeenCalledWith(
      "❌ Could not find built application entry point at .build/src/app.js"
    );
  });

  it("should use default options when none are provided", async () => {
    jest
      .spyOn(require("../../../server"), "getArkosConfig")
      .mockResolvedValue({ getArkosConfig: () => ({ available: true }) });

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

    (fs.existsSync as jest.Mock).mockReturnValue(true);

    await startCommand();

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

    jest.useFakeTimers({ advanceTimers: 500 });

    await new Promise((resolve) => setImmediate(resolve));

    expect(console.info).toHaveBeenCalledWith(
      expect.stringContaining("Arkos.js")
    );
  });

  it("should register a SIGINT handler that kills the child process", () => {
    (fs.existsSync as jest.Mock).mockReturnValue(true);

    const mockChild = { kill: jest.fn() };
    (spawn as jest.Mock).mockReturnValue(mockChild);

    startCommand();

    const sigintHandler = mockProcessOn.mock.calls.find(
      (call) => call[0] === "SIGINT"
    )[1];

    sigintHandler();

    expect(mockChild.kill).toHaveBeenCalled();
    expect(mockExit).toHaveBeenCalledWith(0);
  });

  it("should exit with code 1 when an error occurs", () => {
    const err = new Error("Test error");
    (fs.existsSync as jest.Mock).mockImplementation(() => {
      throw err;
    });

    startCommand();

    expect(console.error).toHaveBeenCalledWith(
      "❌ Production server failed to start:",
      err
    );
    expect(mockExit).toHaveBeenCalledWith(1);
  });

  it("should include custom port and host in environment variables", () => {
    (fs.existsSync as jest.Mock).mockReturnValue(true);

    startCommand({ port: "5000", host: "0.0.0.0" });

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

  it("should correctly display configuration when getArkosConfig is successful", async () => {
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

    startCommand();

    jest.useFakeTimers({ advanceTimers: 500 });

    await new Promise((resolve) => setImmediate(resolve));

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
});
