import { Command } from "commander";
import fs from "fs";
import path from "path";
import { buildCommand } from "../build";
import { devCommand } from "../dev";
import { startCommand } from "../start";

// Mock dependencies
jest.mock("commander", () => {
  const mockCommand = {
    name: jest.fn().mockReturnThis(),
    description: jest.fn().mockReturnThis(),
    version: jest.fn().mockReturnThis(),
    command: jest.fn().mockReturnThis(),
    option: jest.fn().mockReturnThis(),
    action: jest.fn().mockReturnThis(),
    parse: jest.fn().mockReturnThis(),
  };
  return {
    Command: jest.fn(() => mockCommand),
  };
});

jest.mock("fs", () => ({
  readFileSync: jest.fn(),
}));

jest.mock("path", () => ({
  join: jest.fn((...args) => args.join("/")),
}));

jest.mock("../build", () => ({
  buildCommand: jest.fn(),
}));

jest.mock("../dev", () => ({
  devCommand: jest.fn(),
}));

jest.mock("../start", () => ({
  startCommand: jest.fn(),
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

    // Mock package.json content
    (fs.readFileSync as jest.Mock).mockReturnValue(
      JSON.stringify({
        version: "2.0.0",
      })
    );

    // Reset and get mock program
    mockProgram = new Command();
  });

  afterEach(() => {
    // Restore console methods
    console.log = originalConsoleLog;
  });

  it("should load the package version from package.json", () => {
    // Import the module to trigger the CLI setup
    jest.isolateModules(() => {
      require("../index");
    });

    // Verify path.join was called with the right arguments to find package.json
    expect(path.join).toHaveBeenCalledWith(
      expect.any(String),
      "../../../../package.json"
    );

    // Verify readFileSync was called to read package.json
    expect(fs.readFileSync).toHaveBeenCalledWith(expect.any(String), "utf8");

    // Verify program was initialized with correct version
    expect(mockProgram.version).toHaveBeenCalledWith("2.0.0");
  });

  it("should fall back to version 1.0.0 if no version in package.json", () => {
    // Mock package.json without version
    (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify({}));

    // Import the module to trigger the CLI setup
    jest.isolateModules(() => {
      require("../index");
    });

    // Verify program was initialized with fallback version
    expect(mockProgram.version).toHaveBeenCalledWith("1.0.0");
  });

  it("should set up the CLI with correct name and description", () => {
    // Import the module to trigger the CLI setup
    jest.isolateModules(() => {
      require("../index");
    });

    // Verify program was initialized with correct name and description
    expect(mockProgram.name).toHaveBeenCalledWith("arkos");
    expect(mockProgram.description).toHaveBeenCalledWith("Arkos framework CLI");
  });

  it("should register the build command with correct options", () => {
    // Import the module to trigger the CLI setup
    jest.isolateModules(() => {
      require("../index");
    });

    // Verify build command was registered
    expect(mockProgram.command).toHaveBeenCalledWith("build");
    expect(mockProgram.description).toHaveBeenCalledWith(
      "Build your Arkos project"
    );

    // Verify build command options
    expect(mockProgram.option).toHaveBeenCalledWith(
      "-w, --watch",
      "Watch for changes"
    );
    expect(mockProgram.option).toHaveBeenCalledWith(
      "-c, --config <path>",
      "Path to config file"
    );
    expect(mockProgram.option).toHaveBeenCalledWith(
      "-m, --module <type>",
      "Module type (cjs or esm)",
      "cjs"
    );

    // Verify action was set to buildCommand
    expect(mockProgram.action).toHaveBeenCalledWith(buildCommand);
  });

  it("should register the dev command with correct options", () => {
    // Import the module to trigger the CLI setup
    jest.isolateModules(() => {
      require("../index");
    });

    // Verify dev command was registered
    expect(mockProgram.command).toHaveBeenCalledWith("dev");
    expect(mockProgram.description).toHaveBeenCalledWith(
      "Run development server"
    );

    // Verify dev command options
    expect(mockProgram.option).toHaveBeenCalledWith(
      "-p, --port <number>",
      "Port number"
    );
    expect(mockProgram.option).toHaveBeenCalledWith(
      "-h, --host <host>",
      "Host to bind to"
    );

    // Verify action was set to devCommand
    expect(mockProgram.action).toHaveBeenCalledWith(devCommand);
  });

  it("should register the start command with correct options", () => {
    // Import the module to trigger the CLI setup
    jest.isolateModules(() => {
      require("../index");
    });

    // Verify start command was registered
    expect(mockProgram.command).toHaveBeenCalledWith("start");
    expect(mockProgram.description).toHaveBeenCalledWith(
      "Run production server"
    );

    // Verify start command options
    expect(mockProgram.option).toHaveBeenCalledWith(
      "-p, --port <number>",
      "Port number"
    );
    expect(mockProgram.option).toHaveBeenCalledWith(
      "-h, --host <host>",
      "Host to bind to"
    );

    // Verify action was set to startCommand
    expect(mockProgram.action).toHaveBeenCalledWith(startCommand);
  });

  it("should parse process arguments", () => {
    // Import the module to trigger the CLI setup
    jest.isolateModules(() => {
      require("../index");
    });

    // Verify parse was called with process.argv
    expect(mockProgram.parse).toHaveBeenCalledWith(process.argv);
  });

  //   it("should export program and command functions", () => {
  //     // Import the module to get exports
  //     const cliModule = jest.isolateModules(() => {
  //       return require("../index");
  //     });

  //     // Verify exports
  //     expect((cliModule as any).program).toBeDefined();
  //     expect((cliModule as any).buildCommand).toBe(buildCommand);
  //     expect((cliModule as any).devCommand).toBe(devCommand);
  //     // Note: startCommand is not exported according to the original file
  //   });
});
