import {
  describe,
  it,
  expect,
  vi,
  beforeEach,
  afterEach,
  beforeAll,
} from "vitest";
import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import chalk from "chalk";
import Handlebars from "handlebars";

// Mock all external dependencies BEFORE any imports
vi.mock("fs");
vi.mock("path", () => ({
  default: {
    join: vi.fn(),
    dirname: vi.fn(),
  },
  dirname: vi.fn(),
  join: vi.fn(),
}));
vi.mock("child_process");
vi.mock("chalk", () => ({
  default: {
    bold: vi.fn((text: string) => text),
    cyan: vi.fn((text: string) => text),
    green: vi.fn((text: string) => text),
  },
}));
vi.mock("handlebars", () => ({
  default: {
    registerHelper: vi.fn(),
  },
}));
vi.mock("url", () => ({
  fileURLToPath: vi.fn((url: string) => url.replace("file://", "")),
}));

// Mock utility modules
vi.mock("../utils/project-config-inquirer", () => ({
  default: {
    run: vi.fn(),
  },
}));

vi.mock("../utils/template-compiler", () => ({
  default: {
    compile: vi.fn(),
  },
}));

vi.mock("../utils/helpers/package-json.helpers", () => ({
  getProcjetPackageJsonDependecies: vi.fn(),
}));

vi.mock("../utils/helpers/npm.helpers", () => ({
  detectPackageManagerFromUserAgent: vi.fn(),
}));

describe("CLI Main Function", () => {
  let originalConsoleInfo: typeof console.info;
  let originalConsoleError: typeof console.error;
  let consoleInfoSpy: ReturnType<typeof vi.fn>;
  let consoleErrorSpy: ReturnType<typeof vi.fn>;
  let originalProcessChdir: typeof process.chdir;
  let processChdirSpy: ReturnType<typeof vi.fn>;

  // Import mocked modules
  const mockedFs = vi.mocked(fs);
  const mockedPath = vi.mocked(path);
  const mockedExecSync = vi.mocked(execSync);
  const mockedChalk = vi.mocked(chalk);
  const mockedHandlebars = vi.mocked(Handlebars);

  beforeAll(() => {
    // Set up all mocks before any tests run
    vi.clearAllMocks();
  });

  beforeEach(async () => {
    // Store original functions
    originalConsoleInfo = console.info;
    originalConsoleError = console.error;
    originalProcessChdir = process.chdir;

    // Create spies
    consoleInfoSpy = vi.fn();
    consoleErrorSpy = vi.fn();
    processChdirSpy = vi.fn();

    // Replace global functions
    console.info = consoleInfoSpy;
    console.error = consoleErrorSpy;
    process.chdir = processChdirSpy;

    // Reset all mocks
    vi.clearAllMocks();

    // Setup path mocks
    mockedPath.join.mockImplementation((...args: string[]) => args.join("/"));
    mockedPath.dirname.mockImplementation((p: string) =>
      p.split("/").slice(0, -1).join("/")
    );

    // Setup fs mocks
    mockedFs.mkdirSync.mockImplementation(() => undefined);

    // Setup execSync mock
    mockedExecSync.mockImplementation(() => Buffer.from(""));

    // Setup chalk mocks
    (mockedChalk.bold as any).mockImplementation((text: string) => text);
    (mockedChalk.cyan as any).mockImplementation((text: string) => text);
    (mockedChalk.green as any).mockImplementation((text: string) => text);

    // Setup Handlebars mock
    mockedHandlebars.registerHelper.mockImplementation(() => {});
  });

  afterEach(() => {
    // Restore original functions
    console.info = originalConsoleInfo;
    console.error = originalConsoleError;
    process.chdir = originalProcessChdir;
  });

  it("should successfully create a project with regular project name", async () => {
    // Setup mocks for this specific test
    const { default: projectConfigInquirer } = await import(
      "../utils/project-config-inquirer"
    );
    const { default: templateCompiler } = await import(
      "../utils/template-compiler"
    );
    const { getProcjetPackageJsonDependecies } = await import(
      "../utils/helpers/package-json.helpers"
    );
    const { detectPackageManagerFromUserAgent } = await import(
      "../utils/helpers/npm.helpers"
    );

    vi.mocked(projectConfigInquirer.run).mockResolvedValue({
      argProjectName: "test-project",
      projectName: "test-project",
      projectPath: "/path/to/test-project",
    } as any);

    vi.mocked(getProcjetPackageJsonDependecies).mockReturnValue({
      dependencies: ["express", "prisma"],
      devDependencies: ["vitest", "@types/node"],
    });

    vi.mocked(detectPackageManagerFromUserAgent).mockReturnValue("npm");
    vi.mocked(templateCompiler.compile).mockResolvedValue(undefined);

    // Import and run the main function
    const mainModule = await import("../");
    await mainModule.main();

    // Verify project config inquirer was called
    // expect(projectConfigInquirer.run).toHaveBeenCalledOnce();

    // Verify directory creation
    expect(mockedFs.mkdirSync).toHaveBeenCalledWith("/path/to/test-project", {
      recursive: true,
    });

    // Verify console output for project creation
    expect(consoleInfoSpy).toHaveBeenCalledWith(
      expect.stringContaining("Creating a new")
    );

    // Verify template compilation
    expect(templateCompiler.compile).toHaveBeenCalledWith(
      expect.stringContaining("templates/basic"),
      expect.objectContaining({
        argProjectName: "test-project",
        projectName: "test-project",
        projectPath: "/path/to/test-project",
      })
    );

    // Verify process.chdir was called
    expect(processChdirSpy).toHaveBeenCalledWith("/path/to/test-project");

    // Verify dependencies listing
    expect(consoleInfoSpy).toHaveBeenCalledWith(
      expect.stringContaining("dependencies:")
    );
    expect(consoleInfoSpy).toHaveBeenCalledWith("- express");
    expect(consoleInfoSpy).toHaveBeenCalledWith("- prisma");

    // Verify package installation
    expect(consoleInfoSpy).toHaveBeenCalledWith(
      expect.stringContaining("Installing dependencies...")
    );
    expect(mockedExecSync).toHaveBeenCalledWith("npm install", {
      stdio: "inherit",
    });

    // Verify prisma generate
    expect(mockedExecSync).toHaveBeenCalledWith("npx prisma generate", {
      stdio: "inherit",
    });
  }, 10000); // Increase timeout to 10 seconds

  it('should handle project creation in current directory (argProjectName = ".")', async () => {
    const { default: projectConfigInquirer } = await import(
      "../utils/project-config-inquirer"
    );
    const { default: templateCompiler } = await import(
      "../utils/template-compiler"
    );
    const { getProcjetPackageJsonDependecies } = await import(
      "../utils/helpers/package-json.helpers"
    );
    const { detectPackageManagerFromUserAgent } = await import(
      "../utils/helpers/npm.helpers"
    );

    vi.mocked(projectConfigInquirer.run).mockResolvedValue({
      argProjectName: ".",
      projectName: "current-dir",
      projectPath: "/current/path",
    } as any);

    vi.mocked(getProcjetPackageJsonDependecies).mockReturnValue({
      dependencies: [],
      devDependencies: [],
    });

    vi.mocked(detectPackageManagerFromUserAgent).mockReturnValue("npm");
    vi.mocked(templateCompiler.compile).mockResolvedValue(undefined);

    const mainModule = await import("../");
    await mainModule.main();

    // Verify success message without cd step
    expect(consoleInfoSpy).toHaveBeenCalledWith(
      expect.stringContaining("1. setup your DATABASE_URL")
    );
    // Should not contain cd instruction for current directory
    const allCalls = consoleInfoSpy.mock.calls.map((call) => call[0]);
    const hasCurrentDirInstructions = allCalls.some(
      (call) =>
        typeof call === "string" &&
        call.includes("1. setup your") &&
        !call.includes("1. cd")
    );
    expect(hasCurrentDirInstructions).toBe(true);
  }, 10000);

  it("should handle different package managers", async () => {
    const { default: projectConfigInquirer } = await import(
      "../utils/project-config-inquirer"
    );
    const { default: templateCompiler } = await import(
      "../utils/template-compiler"
    );
    const { getProcjetPackageJsonDependecies } = await import(
      "../utils/helpers/package-json.helpers"
    );
    const { detectPackageManagerFromUserAgent } = await import(
      "../utils/helpers/npm.helpers"
    );

    vi.mocked(projectConfigInquirer.run).mockResolvedValue({
      argProjectName: "test-project",
      projectName: "test-project",
      projectPath: "/path/to/test-project",
    } as any);

    vi.mocked(getProcjetPackageJsonDependecies).mockReturnValue({
      dependencies: [],
      devDependencies: [],
    });

    vi.mocked(detectPackageManagerFromUserAgent).mockReturnValue("yarn");
    vi.mocked(templateCompiler.compile).mockResolvedValue(undefined);

    const mainModule = await import("../");
    await mainModule.main();

    expect(consoleInfoSpy).toHaveBeenCalledWith("Using yarn.\n");
    expect(mockedExecSync).toHaveBeenCalledWith("yarn install", {
      stdio: "inherit",
    });
  }, 10000);

  it("should handle pnpm package manager", async () => {
    const { default: projectConfigInquirer } = await import(
      "../utils/project-config-inquirer"
    );
    const { default: templateCompiler } = await import(
      "../utils/template-compiler"
    );
    const { getProcjetPackageJsonDependecies } = await import(
      "../utils/helpers/package-json.helpers"
    );
    const { detectPackageManagerFromUserAgent } = await import(
      "../utils/helpers/npm.helpers"
    );

    vi.mocked(projectConfigInquirer.run).mockResolvedValue({
      argProjectName: "test-project",
      projectName: "test-project",
      projectPath: "/path/to/test-project",
    } as any);

    vi.mocked(getProcjetPackageJsonDependecies).mockReturnValue({
      dependencies: [],
      devDependencies: [],
    });

    vi.mocked(detectPackageManagerFromUserAgent).mockReturnValue("pnpm");
    vi.mocked(templateCompiler.compile).mockResolvedValue(undefined);

    const mainModule = await import("../");
    await mainModule.main();

    expect(consoleInfoSpy).toHaveBeenCalledWith("Using pnpm.\n");
    expect(mockedExecSync).toHaveBeenCalledWith("pnpm install", {
      stdio: "inherit",
    });
  }, 10000);

  it("should handle empty dependencies and devDependencies arrays", async () => {
    const { default: projectConfigInquirer } = await import(
      "../utils/project-config-inquirer"
    );
    const { default: templateCompiler } = await import(
      "../utils/template-compiler"
    );
    const { getProcjetPackageJsonDependecies } = await import(
      "../utils/helpers/package-json.helpers"
    );
    const { detectPackageManagerFromUserAgent } = await import(
      "../utils/helpers/npm.helpers"
    );

    vi.mocked(projectConfigInquirer.run).mockResolvedValue({
      argProjectName: "test-project",
      projectName: "test-project",
      projectPath: "/path/to/test-project",
    } as any);

    vi.mocked(getProcjetPackageJsonDependecies).mockReturnValue({
      dependencies: [],
      devDependencies: [],
    });

    vi.mocked(detectPackageManagerFromUserAgent).mockReturnValue("npm");
    vi.mocked(templateCompiler.compile).mockResolvedValue(undefined);

    const mainModule = await import("../");
    await mainModule.main();

    // Should still show the headers but no dependency items
    expect(consoleInfoSpy).toHaveBeenCalledWith(
      expect.stringContaining("dependencies:")
    );
    expect(consoleInfoSpy).toHaveBeenCalledWith(
      expect.stringContaining("devDependencies:")
    );
  });

  it("should handle errors from project config inquirer", async () => {
    const { default: projectConfigInquirer } = await import(
      "../utils/project-config-inquirer"
    );

    const testError = new Error("Test error");
    vi.mocked(projectConfigInquirer.run).mockRejectedValue(testError);

    const mainModule = await import("../");

    await expect(mainModule.main()).rejects.toThrow("Test error");
  });

  it("should handle template compilation errors", async () => {
    const { default: projectConfigInquirer } = await import(
      "../utils/project-config-inquirer"
    );
    const { default: templateCompiler } = await import(
      "../utils/template-compiler"
    );
    await import("../utils/helpers/package-json.helpers");
    await import("../utils/helpers/npm.helpers");

    vi.mocked(projectConfigInquirer.run).mockResolvedValue({
      argProjectName: "test-project",
      projectName: "test-project",
      projectPath: "/path/to/test-project",
    } as any);

    const templateError = new Error("Template compilation failed");
    vi.mocked(templateCompiler.compile).mockRejectedValue(templateError);

    const mainModule = await import("../");

    await expect(mainModule.main()).rejects.toThrow(
      "Template compilation failed"
    );
  });

  it("should handle execSync errors during npm install", async () => {
    const { default: projectConfigInquirer } = await import(
      "../utils/project-config-inquirer"
    );
    const { default: templateCompiler } = await import(
      "../utils/template-compiler"
    );
    const { getProcjetPackageJsonDependecies } = await import(
      "../utils/helpers/package-json.helpers"
    );
    const { detectPackageManagerFromUserAgent } = await import(
      "../utils/helpers/npm.helpers"
    );

    vi.mocked(projectConfigInquirer.run).mockResolvedValue({
      argProjectName: "test-project",
      projectName: "test-project",
      projectPath: "/path/to/test-project",
    } as any);

    vi.mocked(getProcjetPackageJsonDependecies).mockReturnValue({
      dependencies: [],
      devDependencies: [],
    });

    vi.mocked(detectPackageManagerFromUserAgent).mockReturnValue("npm");
    vi.mocked(templateCompiler.compile).mockResolvedValue(undefined);

    const execError = new Error("npm install failed");
    mockedExecSync.mockImplementation((command: string) => {
      if (typeof command === "string" && command.includes("install")) {
        throw execError;
      }
      return Buffer.from("");
    });

    const mainModule = await import("../");

    await expect(mainModule.main()).rejects.toThrow("npm install failed");
  });

  it("should handle execSync errors during prisma generate", async () => {
    const { default: projectConfigInquirer } = await import(
      "../utils/project-config-inquirer"
    );
    const { default: templateCompiler } = await import(
      "../utils/template-compiler"
    );
    const { getProcjetPackageJsonDependecies } = await import(
      "../utils/helpers/package-json.helpers"
    );
    const { detectPackageManagerFromUserAgent } = await import(
      "../utils/helpers/npm.helpers"
    );

    vi.mocked(projectConfigInquirer.run).mockResolvedValue({
      argProjectName: "test-project",
      projectName: "test-project",
      projectPath: "/path/to/test-project",
    } as any);

    vi.mocked(getProcjetPackageJsonDependecies).mockReturnValue({
      dependencies: [],
      devDependencies: [],
    });

    vi.mocked(detectPackageManagerFromUserAgent).mockReturnValue("npm");
    vi.mocked(templateCompiler.compile).mockResolvedValue(undefined);

    const prismaError = new Error("prisma generate failed");
    mockedExecSync.mockImplementation((command: string) => {
      if (typeof command === "string" && command.includes("prisma generate")) {
        throw prismaError;
      }
      return Buffer.from("");
    });

    const mainModule = await import("../");

    await expect(mainModule.main()).rejects.toThrow("prisma generate failed");
  });

  it("should handle file system errors during directory creation", async () => {
    const { default: projectConfigInquirer } = await import(
      "../utils/project-config-inquirer"
    );

    vi.mocked(projectConfigInquirer.run).mockResolvedValue({
      argProjectName: "test-project",
      projectName: "test-project",
      projectPath: "/path/to/test-project",
    } as any);

    const fsError = new Error("Permission denied");
    mockedFs.mkdirSync.mockImplementation(() => {
      throw fsError;
    });

    const mainModule = await import("../");

    await expect(mainModule.main()).rejects.toThrow("Permission denied");
  });

  it("should call process.chdir multiple times as expected", async () => {
    const { default: projectConfigInquirer } = await import(
      "../utils/project-config-inquirer"
    );
    const { default: templateCompiler } = await import(
      "../utils/template-compiler"
    );
    const { getProcjetPackageJsonDependecies } = await import(
      "../utils/helpers/package-json.helpers"
    );
    const { detectPackageManagerFromUserAgent } = await import(
      "../utils/helpers/npm.helpers"
    );

    vi.mocked(projectConfigInquirer.run).mockResolvedValue({
      argProjectName: "test-project",
      projectName: "test-project",
      projectPath: "/path/to/test-project",
    } as any);

    vi.mocked(getProcjetPackageJsonDependecies).mockReturnValue({
      dependencies: [],
      devDependencies: [],
    });

    vi.mocked(detectPackageManagerFromUserAgent).mockReturnValue("npm");
    vi.mocked(templateCompiler.compile).mockResolvedValue(undefined);

    const mainModule = await import("../");
    await mainModule.main();

    // Should be called twice - once after template compilation, once before prisma generate
    expect(processChdirSpy).toHaveBeenCalledTimes(2);
    expect(processChdirSpy).toHaveBeenNthCalledWith(1, "/path/to/test-project");
    expect(processChdirSpy).toHaveBeenNthCalledWith(2, "/path/to/test-project");
  });
});
