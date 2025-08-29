import fs from "fs";
import { getUserFileExtension } from "../fs.helpers";
import * as fsHelpers from "../fs.helpers";
import path from "path";

// Mock the fs module
jest.mock("fs", () => ({
  ...jest.requireActual("fs"),
  stat: jest.fn(),
  access: jest.fn(),
  mkdir: jest.fn(),
  existsSync: jest.fn(),
  statSync: jest.fn(),
  readdirSync: jest.fn(),
  promises: {
    stat: jest.fn(),
    access: jest.fn(),
    mkdir: jest.fn(),
  },
}));

jest.mock("path");

describe("fs.helpers", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("getUserFileExtension", () => {
    // Set up mocks for path.join to return predictable paths
    const mockProjectRoot = "/mock/project/root";
    const mockTsConfigPath = "/mock/project/root/tsconfig.json";

    beforeEach(() => {
      // Reset the module's userFileExtension before each test
      (fsHelpers as any).userFileExtension = undefined;

      // Mock process.cwd()
      jest.spyOn(process, "cwd").mockReturnValue(mockProjectRoot);

      // Mock path.join to return predictable paths
      (path.join as jest.Mock).mockImplementation((...args) =>
        args.join("/").replace(/\/+/g, "/")
      );

      // Reset all fs mocks
      (fs.existsSync as jest.Mock).mockReset();

      // Reset environment variables
      delete process.env.ARKOS_BUILD;
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it("should return cached value if userFileExtension is already set", () => {
      // Set up the cached value
      (fsHelpers as any).userFileExtension = "ts";

      const result = getUserFileExtension();

      expect(result).toBe("ts");
      // Verify no file system checks were made
      expect(fs.existsSync).not.toHaveBeenCalled();
    });

    it('should return "ts" when tsconfig.json exists and ARKOS_BUILD is not "true"', () => {
      // Mock fs.existsSync to return true for tsconfig.json
      (fs.existsSync as jest.Mock).mockReturnValue(true);

      const result = getUserFileExtension();

      expect(result).toBe("ts");
      expect(fs.existsSync).toHaveBeenCalledWith(mockTsConfigPath);
      expect(fsHelpers.userFileExtension).toBe("ts");
    });

    it('should return "js" when tsconfig.json exists but ARKOS_BUILD is "true"', () => {
      // Mock fs.existsSync to return true for tsconfig.json
      (fs.existsSync as jest.Mock).mockReturnValue(true);

      // Set the ARKOS_BUILD environment variable
      process.env.ARKOS_BUILD = "true";

      const result = getUserFileExtension();

      expect(result).toBe("js");
      expect(fs.existsSync).toHaveBeenCalledWith(mockTsConfigPath);
      expect(fsHelpers.userFileExtension).toBe("js");
    });

    it('should return "js" when tsconfig.json does not exist', () => {
      // Mock fs.existsSync to return false for tsconfig.json
      (fs.existsSync as jest.Mock).mockReturnValue(false);

      const result = getUserFileExtension();

      expect(result).toBe("js");
      expect(fs.existsSync).toHaveBeenCalledWith(mockTsConfigPath);
      expect(fsHelpers.userFileExtension).toBe("js");
    });

    it('should return "js" when has src/app.js', () => {
      // Mock fs.existsSync to return false for tsconfig.json
      (fs.existsSync as jest.Mock).mockImplementation((path: string) => {
        if (path.includes("src/app.js")) return true;
        return false;
      });

      const result = getUserFileExtension();

      expect(result).toBe("js");
      expect(fs.existsSync).toHaveBeenCalledWith(mockTsConfigPath);
      expect(fsHelpers.userFileExtension).toBe("js");
    });

    it('should return "ts" when has src/app.ts', () => {
      // Mock fs.existsSync to return false for tsconfig.json
      (fs.existsSync as jest.Mock).mockImplementation((path: string) => {
        console.log(path);
        if (path.includes("src/app.ts")) return true;
        return false;
      });

      const result = getUserFileExtension();

      expect(result).toBe("ts");
      expect(fs.existsSync).toHaveBeenCalledWith(mockTsConfigPath);
      expect(fsHelpers.userFileExtension).toBe("ts");
    });

    it('should return "js" when an error occurs during file system checks', () => {
      // Force an error by making fs.existsSync throw
      (fs.existsSync as jest.Mock).mockImplementation(() => {
        throw new Error("Mock error");
      });

      const result = getUserFileExtension();

      expect(result).toBe("js");
      expect(fsHelpers.userFileExtension).toBe("js");
    });
  });

  describe("crd", () => {
    it("should return the correct the build folder when project is built through arkos build", () => {
      process.env.ARKOS_BUILD = "true";

      expect(fsHelpers.crd()).toContain("/.build/");
    });

    it("should return only the process.cwd when project not built", () => {
      process.env.ARKOS_BUILD = "true";

      expect(fsHelpers.crd()).not.toContain("./build/");
    });
  });

  describe("checkFileExists", () => {
    beforeEach(() => {
      (path.resolve as jest.Mock).mockImplementation((...args) =>
        args.join("/").replace(/\/+/g, "/")
      );
    });

    it("should return true when file exists", () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);

      const result = fsHelpers.checkFileExists("existing-file.ts");

      expect(result).toBe(true);
      expect(fs.existsSync).toHaveBeenCalledWith("existing-file.ts");
    });

    it("should return false when file does not exist", () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);

      const result = fsHelpers.checkFileExists("non-existent-file.ts");

      expect(result).toBe(false);
      expect(fs.existsSync).toHaveBeenCalledWith("non-existent-file.ts");
    });

    it("should return false when fs.existsSync throws an error", () => {
      (fs.existsSync as jest.Mock).mockImplementation(() => {
        throw new Error("File system error");
      });

      const result = fsHelpers.checkFileExists("error-file.ts");

      expect(result).toBe(false);
    });
  });

  describe("fullCleanCwd", () => {
    const originalCwd = process.cwd();
    const cwd = originalCwd.replace(/\/+$/, "");

    it("should remove the cwd from the start of a path", () => {
      const input = `${cwd}/src/index.ts`;
      const expected = "src/index.ts";
      expect(fsHelpers.fullCleanCwd(input)).toBe(expected);
    });

    it("should return empty string when path is exactly cwd", () => {
      const input = cwd;
      expect(fsHelpers.fullCleanCwd(input)).toBe("");
    });

    it("should return empty string when path is cwd with trailing slash", () => {
      const input = cwd + "/";
      expect(fsHelpers.fullCleanCwd(input)).toBe("");
    });

    it("should not alter a path that does not start with cwd", () => {
      const input = "/some/other/path/file.ts";
      expect(fsHelpers.fullCleanCwd(input)).toBe(input);
    });

    it("should throw if path is not a string", () => {
      expect(() => fsHelpers.fullCleanCwd(null as any)).toThrow(
        "Path must be a string"
      );
      expect(() => fsHelpers.fullCleanCwd(undefined as any)).toThrow(
        "Path must be a string"
      );
      expect(() => fsHelpers.fullCleanCwd(123 as any)).toThrow(
        "Path must be a string"
      );
    });

    it("should handle mixed trailing slashes", () => {
      const withSlash = cwd + "/";
      const input = withSlash + "folder/file.ts";
      const expected = "folder/file.ts";
      expect(fsHelpers.fullCleanCwd(input)).toBe(expected);
    });
  });
});
