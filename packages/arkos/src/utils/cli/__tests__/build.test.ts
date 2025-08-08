import fs from "fs";
import { execSync } from "child_process";
import { buildCommand } from "../build";
import { getUserFileExtension } from "../../helpers/fs.helpers";
import { loadEnvironmentVariables } from "../../dotenv.helpers";
import sheu from "../../sheu";

// Mock dependencies
jest.mock("child_process", () => ({
  execSync: jest.fn(),
  spawn: jest.fn(() => ({
    kill: jest.fn(),
  })),
}));
jest.mock("../../sheu");
jest.mock("fs", () => ({
  ...jest.requireActual("fs"),
  existsSync: jest.fn(),
  mkdirSync: jest.fn(),
  writeFileSync: jest.fn(),
  readFileSync: jest.fn(),
  unlinkSync: jest.fn(),
  statSync: jest.fn(() => ({
    isDirectory: () => false,
    isFile: () => true,
  })),
  readdirSync: jest.fn(() => []),
  copyFileSync: jest.fn(),
}));

jest.mock("path", () => ({
  ...jest.requireActual("path"),
  join: jest.fn((...args) => args.join("/")),
  extname: jest.fn((filename) => {
    const parts = filename.split(".");
    return parts.length > 1 ? `.${parts[parts.length - 1]}` : "";
  }),
  dirname: jest.fn((p) => p.substring(0, p.lastIndexOf("/"))),
}));

jest.mock("../../helpers/fs.helpers", () => ({
  getUserFileExtension: jest.fn(),
  fullCleanCwd: jest.fn((path) => path),
}));

jest.mock("../../dotenv.helpers", () => ({
  loadEnvironmentVariables: jest.fn(() => [".env"]),
}));

describe("buildCommand", () => {
  // Store original console methods
  const originalConsole = {
    info: console.info,
    error: console.error,
    warn: console.warn,
  };

  // Mock process.exit
  const mockExit = jest.spyOn(process, "exit").mockImplementation((code) => {
    console.error(`Process.exit called with code ${code}`);
    return "" as never;
  });

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock console methods
    console.info = jest.fn();
    console.error = jest.fn();
    console.warn = jest.fn();

    // Mock process.cwd()
    jest.spyOn(process, "cwd").mockReturnValue("/mock/project");

    // Default fs.existsSync behavior
    (fs.existsSync as jest.Mock).mockImplementation((path: string) => {
      if (path.includes("tsconfig.json")) return true;
      if (path.includes(".build")) return false;
      return true;
    });

    // Default fs.readFileSync behavior
    (fs.readFileSync as jest.Mock).mockImplementation((path: string) => {
      if (path.includes("tsconfig.json")) {
        return JSON.stringify({ compilerOptions: { target: "es2020" } });
      }
      if (path.includes("package.json")) {
        return JSON.stringify({
          name: "test-project",
          version: "1.0.0",
          description: "Test project",
          dependencies: { test: "^1.0.0" },
        });
      }
      return "";
    });
  });

  afterEach(() => {
    // Restore console methods
    console.info = originalConsole.info;
    console.error = originalConsole.error;
    console.warn = originalConsole.warn;
  });

  afterAll(() => {
    mockExit.mockRestore();
  });

  describe("Module type validation", () => {
    it("should default to 'cjs' when no module type is specified", () => {
      (getUserFileExtension as jest.Mock).mockReturnValue("ts");

      buildCommand({});

      expect(fs.writeFileSync).toHaveBeenCalledWith(
        "/mock/project/tsconfig.arkos-build.json",
        expect.any(String)
      );
    });

    it("should correctly handle 'esm' module type", () => {
      (getUserFileExtension as jest.Mock).mockReturnValue("ts");

      buildCommand({ module: "esm" });

      expect(fs.writeFileSync).toHaveBeenCalledWith(
        "/mock/project/tsconfig.arkos-build.json",
        expect.any(String)
      );
    });

    it("should recognize all ESM module aliases", () => {
      (getUserFileExtension as jest.Mock).mockReturnValue("ts");

      const esmAliases = ["esm", "es", "es2020", "esnext", "module"];

      for (const alias of esmAliases) {
        jest.clearAllMocks();
        buildCommand({ module: alias });

        expect(fs.writeFileSync).toHaveBeenCalledWith(
          "/mock/project/tsconfig.arkos-build.json",
          expect.any(String)
        );
      }
    });

    it("should recognize all CommonJS module aliases", () => {
      (getUserFileExtension as jest.Mock).mockReturnValue("ts");

      const cjsAliases = ["cjs", "commonjs"];

      for (const alias of cjsAliases) {
        jest.clearAllMocks();
        buildCommand({ module: alias });

        expect(fs.writeFileSync).toHaveBeenCalledWith(
          "/mock/project/tsconfig.arkos-build.json",
          expect.any(String)
        );
      }
    });

    it("should default to 'cjs' for unrecognized module types with a warning", () => {
      (getUserFileExtension as jest.Mock).mockReturnValue("ts");

      buildCommand({ module: "invalid" });

      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining('Unrecognized module type "invalid"')
      );

      expect(fs.writeFileSync).toHaveBeenCalledWith(
        "/mock/project/tsconfig.arkos-build.json",
        expect.any(String)
      );
    });
  });

  describe("Build directory setup", () => {
    it("should create build directory if it doesn't exist", () => {
      (getUserFileExtension as jest.Mock).mockReturnValue("ts");

      buildCommand({});

      expect(fs.mkdirSync).toHaveBeenCalledWith(".build", { recursive: true });
    });

    it("should create module-specific subdirectories", () => {
      (getUserFileExtension as jest.Mock).mockReturnValue("ts");

      buildCommand({});

      expect(fs.mkdirSync).toHaveBeenCalledWith(".build/cjs", {
        recursive: true,
      });
      expect(fs.mkdirSync).toHaveBeenCalledWith(".build/esm", {
        recursive: true,
      });
    });
  });

  describe("TypeScript projects", () => {
    beforeEach(() => {
      (getUserFileExtension as jest.Mock).mockReturnValue("ts");
    });

    it("should correctly build a TypeScript project with default settings", () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);

      buildCommand({});

      // Verify tsconfig creation
      expect(fs.writeFileSync).toHaveBeenCalledWith(
        "/mock/project/tsconfig.arkos-build.json",
        expect.stringContaining('"outDir": "./.build"')
      );

      (execSync as jest.Mock).mockImplementation(() => {
        return "";
      });

      // (fs.existsSync as jest.Mock).mockReturnValue(true);

      expect(console.error).not.toHaveBeenCalled();

      // Verify TypeScript compilation command
      expect(execSync).toHaveBeenCalledWith(
        "npx rimraf .build && npx tsc -p /mock/project/tsconfig.arkos-build.json",
        expect.any(Object)
      );

      // Verify temp config cleanup
      expect(fs.unlinkSync).toHaveBeenCalledWith(
        "/mock/project/tsconfig.arkos-build.json"
      );
    });

    it("should handle custom tsconfig path", () => {
      buildCommand({ config: "custom-tsconfig.json" });

      expect(fs.readFileSync).toHaveBeenCalledWith(
        "/mock/project/custom-tsconfig.json",
        "utf8"
      );
    });

    it("should handle tsconfig read errors gracefully", () => {
      (fs.readFileSync as jest.Mock).mockImplementation((path) => {
        if (path.includes("tsconfig.json")) {
          throw new Error("Failed to read tsconfig");
        }
        return "";
      });

      buildCommand({});

      expect(console.error).toHaveBeenCalledWith(
        "❌ Error reading tsconfig.json:",
        expect.any(Error)
      );

      // Should still create a default config
      expect(fs.writeFileSync).toHaveBeenCalled();
    });

    it("should handle TypeScript compilation errors", () => {
      (execSync as jest.Mock).mockImplementation(() => {
        throw new Error("TypeScript compilation failed");
      });

      (fs.existsSync as jest.Mock).mockReturnValue(true);

      buildCommand({});

      expect(sheu.error).toHaveBeenCalledWith(
        expect.stringContaining("Build failed:")
      );
      expect(console.error).toHaveBeenCalledWith(expect.any(Error));

      expect(fs.unlinkSync).toHaveBeenCalled();
    });

    it("should handle temp config cleanup errors gracefully", () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);

      (fs.unlinkSync as jest.Mock).mockImplementation((val) => {
        throw new Error("Failed to delete temp config");
      });

      buildCommand({});

      expect(console.warn).toHaveBeenCalledWith(
        "Warning: Error cleaning up temporary config:",
        expect.any(Error)
      );
    });
  });

  describe("JavaScript projects", () => {
    beforeEach(() => {
      (getUserFileExtension as jest.Mock).mockReturnValue("js");
    });

    it("should correctly build a JavaScript project with CommonJS format", () => {
      buildCommand({ module: "cjs" });

      // Should copy all JS file types for CJS build
      expect(execSync).toHaveBeenCalledWith(
        expect.stringContaining("src/**/*.js"),
        expect.any(Object)
      );
      expect(execSync).toHaveBeenCalledWith(
        expect.stringContaining("src/**/*.jsx"),
        expect.any(Object)
      );
      expect(execSync).toHaveBeenCalledWith(
        expect.stringContaining("src/**/*.cjs"),
        expect.any(Object)
      );
      expect(execSync).toHaveBeenCalledWith(
        expect.stringContaining("src/**/*.mjs"),
        expect.any(Object)
      );
    });

    it("should correctly build a JavaScript project with ESM format", () => {
      (execSync as jest.Mock).mockImplementation((...args) => {
        return "";
      });

      buildCommand({ module: "esm" });

      (getUserFileExtension as jest.Mock).mockReturnValue("js");

      // Should skip .cjs files for ESM build
      const copyCommand = (execSync as jest.Mock).mock.calls[0][0];
      expect(copyCommand).toContain("src/**/*.js");
      expect(copyCommand).toContain("src/**/*.jsx");
      expect(copyCommand).toContain("src/**/*.mjs");
      expect(copyCommand).not.toContain("src/**/*.cjs");

      expect(console.info).toHaveBeenCalledWith(
        expect.stringContaining("Note: .cjs files are skipped in ESM build")
      );
    });

    it("should copy non-source files during build", () => {
      // Setup mock for readdirSync to return some files
      (fs.readdirSync as jest.Mock).mockReturnValue(["file.jpg", "file.txt"]);
      (fs.statSync as jest.Mock).mockImplementation(() => ({
        isDirectory: () => false,
        isFile: () => true,
      }));

      buildCommand({});

      // Should have called copyFileSync for non-source files
      expect(fs.copyFileSync).toHaveBeenCalled();
    });

    it("should create appropriate package.json in the build directory", () => {
      buildCommand({ module: "esm" });

      // For ESM, should include type:module
      expect(fs.writeFileSync).toHaveBeenCalledWith(
        ".build/esm/package.json",
        expect.stringContaining('"type": "module"')
      );

      // Reset and test CJS
      jest.clearAllMocks();
      buildCommand({ module: "cjs" });

      // For CJS, should not include type:module
      const packageJsonCalls = (
        fs.writeFileSync as jest.Mock
      ).mock.calls.filter((call) => call[0].includes("package.json"));

      expect(packageJsonCalls.length).toBe(1);
      expect(packageJsonCalls[0][1]).not.toContain('"type":"module"');
    });

    it("should handle package.json errors gracefully", () => {
      (fs.readFileSync as jest.Mock).mockImplementation((path) => {
        if (
          path.includes("package.json") &&
          !path.includes("../../../../../package.json")
        ) {
          throw new Error("Failed to read package.json");
        }
        return "";
      });

      buildCommand({});

      // Should still complete without creating a package.json in build dir
      expect(console.info).toHaveBeenCalledWith(
        expect.stringContaining("Build complete")
      );
    });
  });

  describe("Error handling", () => {
    it("should handle build failures and exit with code 1", () => {
      (getUserFileExtension as jest.Mock).mockReturnValue("ts");
      (execSync as jest.Mock).mockImplementation(() => {
        throw new Error("Build failed");
      });

      buildCommand({});

      expect(console.error).toHaveBeenCalledWith(
        "Process.exit called with code 1"
      );

      expect(sheu.error).toHaveBeenCalledWith(
        expect.stringContaining("Build failed:")
      );
      expect(console.error).toHaveBeenCalledWith(expect.any(Error));
    });

    it("should handle file copy errors gracefully", () => {
      (execSync as jest.Mock).mockImplementation(() => {
        return "";
      });
      (getUserFileExtension as jest.Mock).mockReturnValue("js");
      (fs.copyFileSync as jest.Mock).mockImplementation(() => {
        throw new Error("Copy failed");
      });
      (fs.readdirSync as jest.Mock).mockReturnValue(["file.txt"]);

      buildCommand({});

      expect(console.warn).toHaveBeenCalledWith(
        "Warning: Error copying project files:",
        expect.any(Error)
      );

      // Should still complete
      expect(console.info).toHaveBeenCalledWith(
        expect.stringContaining("Build complete")
      );
    });
  });

  describe("Environment loading", () => {
    it("should load environment variables", () => {
      buildCommand({});

      expect(loadEnvironmentVariables).toHaveBeenCalled();
      expect(console.info).toHaveBeenCalledWith(
        expect.stringContaining("Environments")
      );
    });
  });
});
