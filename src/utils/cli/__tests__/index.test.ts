import { Command } from "commander";
import fs from "fs";
import path from "path";
import { buildCommand } from "../build";
import { devCommand } from "../dev";
import { startCommand } from "../start";
import { getVersion, program } from "../index";

// Mock dependencies
jest.mock("commander", () => {
  const mockCommand: any = {
    name: jest.fn().mockReturnThis(),
    description: jest.fn().mockReturnThis(),
    version: jest.fn().mockReturnThis(),
    command: jest.fn(() => mockCommand),
    option: jest.fn().mockReturnThis(),
    action: jest.fn().mockReturnThis(),
    parse: jest.fn().mockReturnThis(),
    requiredOption: jest.fn().mockReturnThis(),
  };
  return {
    Command: jest.fn().mockImplementation(() => mockCommand),
  };
});

jest.mock("../build", () => ({
  buildCommand: jest.fn(),
}));

jest.mock("../dev", () => ({
  devCommand: jest.fn(),
}));

jest.mock("../start", () => ({
  startCommand: jest.fn(),
}));

jest.mock("fs", () => ({
  readFileSync: jest.fn(() => '{ "version": "1.2.3"}'),
}));

jest.mock("path", () => ({
  join: jest.fn().mockReturnValue("/mocked/path/to/package.json"),
}));

// Mock console methods
const originalConsoleLog = console.log;

describe("CLI Index", () => {
  let mockProgram: any;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();

    // Mock console methods to prevent output during tests
    console.log = jest.fn();

    // Get mock program from Commander
    mockProgram = new Command();
  });

  afterEach(() => {
    // Restore console methods
    console.log = originalConsoleLog;
  });

  describe("getVersion", () => {
    it("should return version from package.json", () => {
      const version = getVersion();

      expect(fs.readFileSync).toHaveBeenCalledWith(
        "/mocked/path/to/package.json",
        "utf8"
      );
      expect(path.join).toHaveBeenCalledWith(
        expect.any(String),
        "../../../../package.json"
      );
      expect(version).toBe("1.2.3");
    });

    it("should return default version if no version in package.json", () => {
      (fs.readFileSync as jest.Mock).mockReturnValueOnce("{ }");
      const version = getVersion();
      expect(version).toBe("1.0.0");
    });
  });

  describe("program configuration", () => {
    it("should configure program with correct name, description and version", () => {
      // Import to trigger the program setup code
      jest.isolateModules(() => {
        require("../index");
      });

      expect(mockProgram.name).toHaveBeenCalledWith("arkos");
      expect(mockProgram.description).toHaveBeenCalledWith("Arkos.js CLI");
      expect(mockProgram.version).toHaveBeenCalledWith(getVersion());
    });

    it("should register the build command with correct options", () => {
      jest.isolateModules(() => {
        require("../index");
      });

      expect(mockProgram.command).toHaveBeenCalledWith("build");
      expect(mockProgram.description).toHaveBeenCalledWith(
        "Build your Arkos project"
      );
      expect(mockProgram.option).toHaveBeenCalledWith(
        "-m, --module <type>",
        "Module type (cjs or esm)",
        "cjs"
      );

      // Verify action was registered
      const buildAction = mockProgram.action.mock.calls[0][0];
      expect(buildAction).toBe(buildCommand);
    });

    it("should register the dev command with correct options", () => {
      jest.isolateModules(() => {
        require("../index");
      });

      expect(mockProgram.command).toHaveBeenCalledWith("dev");
      expect(mockProgram.description).toHaveBeenCalledWith(
        "Run development server"
      );
      expect(mockProgram.option).toHaveBeenCalledWith(
        "-p, --port <number>",
        "Port number"
      );
      expect(mockProgram.option).toHaveBeenCalledWith(
        "-h, --host <host>",
        "Host to bind to"
      );

      // Verify action was registered
      const devAction = mockProgram.action.mock.calls[1][0];
      expect(devAction).toBe(devCommand);
    });

    it("should register the start command with correct options", () => {
      jest.isolateModules(() => {
        require("../index");
      });

      expect(mockProgram.command).toHaveBeenCalledWith("start");
      expect(mockProgram.description).toHaveBeenCalledWith(
        "Run production server"
      );
      expect(mockProgram.option).toHaveBeenCalledWith(
        "-p, --port <number>",
        "Port number"
      );
      expect(mockProgram.option).toHaveBeenCalledWith(
        "-h, --host <host>",
        "Host to bind to"
      );

      // Verify action was registered
      const startAction = mockProgram.action.mock.calls[2][0];
      expect(startAction).toBe(startCommand);
    });

    it("should parse process.argv", () => {
      jest.isolateModules(() => {
        require("../index");
      });

      expect(mockProgram.parse).toHaveBeenCalledWith(process.argv);
    });
  });

  describe("exports", () => {
    it("should export the required functions and objects", () => {
      const exports = jest.requireActual("../index");

      expect(exports).toHaveProperty("program");
      expect(exports).toHaveProperty("buildCommand");
      expect(exports).toHaveProperty("devCommand");
      expect(exports).toHaveProperty("startCommand");
      expect(exports).toHaveProperty("getVersion");
    });
  });
});
