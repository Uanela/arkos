import fs from "fs";
import {
  statAsync,
  accessAsync,
  mkdirAsync,
  getUserFileExtension,
} from "../fs.helpers";
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
}));

jest.mock("path");

describe("fs.helpers", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("statAsync", () => {
    it("should resolve with stats when fs.stat succeeds", async () => {
      const mockStats = { size: 1024, isDirectory: () => false };
      (fs.stat as any as jest.Mock).mockImplementation((path, callback) => {
        callback(null, mockStats);
      });

      const result = await statAsync("test.txt");

      expect(fs.stat).toHaveBeenCalledWith("test.txt", expect.any(Function));
      expect(result).toEqual(mockStats);
    });

    it("should reject when fs.stat fails", async () => {
      const mockError = new Error("File not found");
      (fs.stat as any as jest.Mock).mockImplementation((path, callback) => {
        callback(mockError);
      });

      await expect(statAsync("nonexistent.txt")).rejects.toThrow(
        "File not found"
      );
      expect(fs.stat).toHaveBeenCalledWith(
        "nonexistent.txt",
        expect.any(Function)
      );
    });
  });

  describe("accessAsync", () => {
    it("should resolve when fs.access succeeds", async () => {
      (fs.access as any as jest.Mock).mockImplementation(
        (path, mode, callback) => {
          callback(null);
        }
      );

      await accessAsync("test.txt", fs.constants.R_OK);

      expect(fs.access).toHaveBeenCalledWith(
        "test.txt",
        fs.constants.R_OK,
        expect.any(Function)
      );
    });

    it("should reject when fs.access fails", async () => {
      const mockError = new Error("Permission denied");
      (fs.access as any as jest.Mock).mockImplementation(
        (path, mode, callback) => {
          callback(mockError);
        }
      );

      await expect(
        accessAsync("protected.txt", fs.constants.W_OK)
      ).rejects.toThrow("Permission denied");
      expect(fs.access).toHaveBeenCalledWith(
        "protected.txt",
        fs.constants.W_OK,
        expect.any(Function)
      );
    });
  });

  describe("mkdirAsync", () => {
    it("should resolve when fs.mkdir succeeds", async () => {
      (fs.mkdir as any as jest.Mock).mockImplementation(
        (path, options, callback) => {
          callback(null);
        }
      );

      await mkdirAsync("new-directory", { recursive: true });

      expect(fs.mkdir).toHaveBeenCalledWith(
        "new-directory",
        { recursive: true },
        expect.any(Function)
      );
    });

    it("should reject when fs.mkdir fails", async () => {
      const mockError = new Error("Cannot create directory");
      (fs.mkdir as any as jest.Mock).mockImplementation((path, callback) => {
        callback(mockError);
      });

      await expect(mkdirAsync("/root/forbidden")).rejects.toThrow(
        "Cannot create directory"
      );
      expect(fs.mkdir).toHaveBeenCalledWith(
        "/root/forbidden",
        expect.any(Function)
      );
    });
  });

  describe("getUserFileExtension", () => {
    // Set up mocks for path.join to return predictable paths
    const mockProjectRoot = "/mock/project/root";
    const mockTsConfigPath = "/mock/project/root/tsconfig.json";
    const mockSrcDir = "/mock/project/root/src";

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
      (fs.statSync as jest.Mock).mockReset();
      (fs.readdirSync as jest.Mock).mockReset();
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

    it('should return "ts" when tsconfig.json exists in project root', () => {
      // Mock fs.existsSync to return true for tsconfig.json
      (fs.existsSync as jest.Mock).mockImplementation((path) => {
        return path === mockTsConfigPath;
      });

      const result = getUserFileExtension();

      expect(result).toBe("ts");
      expect(fs.existsSync).toHaveBeenCalledWith(mockTsConfigPath);
      expect(fsHelpers.userFileExtension).toBe("ts");
    });

    it("should check for .ts files in src directories when tsconfig.json is not found", () => {
      // Mock no tsconfig.json
      (fs.existsSync as jest.Mock).mockImplementation((path) => {
        if (path === mockTsConfigPath) return false;
        if (path === mockSrcDir) return true;
        return false;
      });

      // Mock src as a directory
      (fs.statSync as jest.Mock).mockReturnValue({ isDirectory: () => true });

      // Mock finding a .ts file in src
      (fs.readdirSync as jest.Mock).mockReturnValue(["app.ts", "index.js"]);

      const result = getUserFileExtension();

      expect(result).toBe("ts");
      expect(fs.existsSync).toHaveBeenCalledWith(mockTsConfigPath);
      expect(fs.readdirSync).toHaveBeenCalled();
      expect(fsHelpers.userFileExtension).toBe("ts");
    });

    it("should check for .tsx files in src directories", () => {
      // Mock no tsconfig.json
      (fs.existsSync as jest.Mock).mockImplementation((path) => {
        if (path === mockTsConfigPath) return false;
        if (path === mockSrcDir) return true;
        return false;
      });

      // Mock src as a directory
      (fs.statSync as jest.Mock).mockReturnValue({ isDirectory: () => true });

      // Mock finding a .tsx file in src
      (fs.readdirSync as jest.Mock).mockReturnValue(["App.tsx", "index.js"]);

      const result = getUserFileExtension();

      expect(result).toBe("ts");
      expect(fsHelpers.userFileExtension).toBe("ts");
    });

    it('should default to "js" when no TypeScript indicators are found', () => {
      // Mock no tsconfig.json and no src directory
      (fs.existsSync as jest.Mock).mockReturnValue(false);

      const result = getUserFileExtension();

      expect(result).toBe("js");
      expect(fsHelpers.userFileExtension).toBe("js");
    });

    it('should default to "js" when directories exist but no .ts files are found', () => {
      // Mock no tsconfig.json but src directory exists
      (fs.existsSync as jest.Mock).mockImplementation((path) => {
        if (path === mockTsConfigPath) return false;
        if (path === mockSrcDir) return true;
        return false;
      });

      // Mock src as a directory
      (fs.statSync as jest.Mock).mockReturnValue({ isDirectory: () => true });

      // Mock only finding .js files
      (fs.readdirSync as jest.Mock).mockReturnValue(["app.js", "index.js"]);

      const result = getUserFileExtension();

      expect(result).toBe("js");
      expect(fsHelpers.userFileExtension).toBe("js");
    });

    it('should default to "js" when an error occurs', () => {
      // Force an error by making fs.existsSync throw
      (fs.existsSync as jest.Mock).mockImplementation(() => {
        throw new Error("Mock error");
      });

      const result = getUserFileExtension();

      expect(result).toBe("js");
      expect(fsHelpers.userFileExtension).toBe("js");
    });
  });
});
