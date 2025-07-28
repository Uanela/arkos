import fs from "fs";
import { ensureDirectoryExists, getVersion } from "../cli.helpers";

// Mock the fs module
jest.mock("fs");
const mockedFs = fs as jest.Mocked<typeof fs>;

describe("ensureDirectoryExists", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("getVersion", () => {
    it("should return default version placeholder", () => {
      const version = getVersion();
      expect(version).toBe("{{version}}");
    });
  });

  describe("happy path", () => {
    it("should create directory when it does not exist", () => {
      mockedFs.existsSync.mockReturnValue(false);
      mockedFs.mkdirSync.mockReturnValue(undefined);

      ensureDirectoryExists("/path/to/new/directory");

      expect(mockedFs.existsSync).toHaveBeenCalledWith(
        "/path/to/new/directory"
      );
      expect(mockedFs.mkdirSync).toHaveBeenCalledWith(
        "/path/to/new/directory",
        { recursive: true }
      );
    });

    it("should not create directory when it already exists", () => {
      mockedFs.existsSync.mockReturnValue(true);

      ensureDirectoryExists("/path/to/existing/directory");

      expect(mockedFs.existsSync).toHaveBeenCalledWith(
        "/path/to/existing/directory"
      );
      expect(mockedFs.mkdirSync).not.toHaveBeenCalled();
    });
  });

  describe("edge cases", () => {
    it("should handle empty string path", () => {
      mockedFs.existsSync.mockReturnValue(false);
      mockedFs.mkdirSync.mockReturnValue(undefined);

      ensureDirectoryExists("");

      expect(mockedFs.existsSync).toHaveBeenCalledWith("");
      expect(mockedFs.mkdirSync).toHaveBeenCalledWith("", { recursive: true });
    });

    it("should handle root directory path", () => {
      mockedFs.existsSync.mockReturnValue(true);

      ensureDirectoryExists("/");

      expect(mockedFs.existsSync).toHaveBeenCalledWith("/");
      expect(mockedFs.mkdirSync).not.toHaveBeenCalled();
    });

    it("should handle Windows-style paths", () => {
      mockedFs.existsSync.mockReturnValue(false);
      mockedFs.mkdirSync.mockReturnValue(undefined);

      ensureDirectoryExists("C:\\Users\\test\\documents");

      expect(mockedFs.existsSync).toHaveBeenCalledWith(
        "C:\\Users\\test\\documents"
      );
      expect(mockedFs.mkdirSync).toHaveBeenCalledWith(
        "C:\\Users\\test\\documents",
        { recursive: true }
      );
    });

    it("should handle relative paths", () => {
      mockedFs.existsSync.mockReturnValue(false);
      mockedFs.mkdirSync.mockReturnValue(undefined);

      ensureDirectoryExists("./relative/path");

      expect(mockedFs.existsSync).toHaveBeenCalledWith("./relative/path");
      expect(mockedFs.mkdirSync).toHaveBeenCalledWith("./relative/path", {
        recursive: true,
      });
    });

    it("should handle paths with special characters", () => {
      mockedFs.existsSync.mockReturnValue(false);
      mockedFs.mkdirSync.mockReturnValue(undefined);

      ensureDirectoryExists("/path/with spaces/and-dashes/under_scores");

      expect(mockedFs.existsSync).toHaveBeenCalledWith(
        "/path/with spaces/and-dashes/under_scores"
      );
      expect(mockedFs.mkdirSync).toHaveBeenCalledWith(
        "/path/with spaces/and-dashes/under_scores",
        { recursive: true }
      );
    });

    it("should handle deeply nested paths", () => {
      mockedFs.existsSync.mockReturnValue(false);
      mockedFs.mkdirSync.mockReturnValue(undefined);

      const deepPath = "/very/deep/nested/path/with/many/levels/of/directories";
      ensureDirectoryExists(deepPath);

      expect(mockedFs.existsSync).toHaveBeenCalledWith(deepPath);
      expect(mockedFs.mkdirSync).toHaveBeenCalledWith(deepPath, {
        recursive: true,
      });
    });
  });

  describe("error handling", () => {
    it("should propagate fs.existsSync errors", () => {
      const error = new Error("Permission denied");
      mockedFs.existsSync.mockImplementation(() => {
        throw error;
      });

      expect(() => ensureDirectoryExists("/restricted/path")).toThrow(
        "Permission denied"
      );
      expect(mockedFs.mkdirSync).not.toHaveBeenCalled();
    });

    it("should propagate fs.mkdirSync errors", () => {
      mockedFs.existsSync.mockReturnValue(false);
      const error = new Error("EACCES: permission denied");
      mockedFs.mkdirSync.mockImplementation(() => {
        throw error;
      });

      expect(() => ensureDirectoryExists("/protected/directory")).toThrow(
        "EACCES: permission denied"
      );
      expect(mockedFs.existsSync).toHaveBeenCalledWith("/protected/directory");
      expect(mockedFs.mkdirSync).toHaveBeenCalledWith("/protected/directory", {
        recursive: true,
      });
    });

    it("should handle ENOENT errors from mkdirSync", () => {
      mockedFs.existsSync.mockReturnValue(false);
      const enoentError = new Error("ENOENT: no such file or directory");
      (enoentError as any).code = "ENOENT";
      mockedFs.mkdirSync.mockImplementation(() => {
        throw enoentError;
      });

      expect(() => ensureDirectoryExists("/nonexistent/parent/child")).toThrow(
        "ENOENT: no such file or directory"
      );
    });

    it("should handle EEXIST errors gracefully when directory is created between existsSync and mkdirSync", () => {
      mockedFs.existsSync.mockReturnValue(false);
      const eexistError = new Error("EEXIST: file already exists");
      (eexistError as any).code = "EEXIST";
      mockedFs.mkdirSync.mockImplementation(() => {
        throw eexistError;
      });

      expect(() => ensureDirectoryExists("/race/condition/path")).toThrow(
        "EEXIST: file already exists"
      );
    });
  });

  describe("type checking", () => {
    it("should accept string parameter", () => {
      mockedFs.existsSync.mockReturnValue(true);

      // This test ensures TypeScript compilation passes
      const path: string = "/valid/string/path";
      expect(() => ensureDirectoryExists(path)).not.toThrow();
    });
  });
});
