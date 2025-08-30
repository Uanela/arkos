import smartFsWatcher from "../smart-fs-watcher";
import chokidar from "chokidar";
// import path from "path";
// import fs from "fs";

// Mock chokidar
jest.mock("chokidar");

describe("SmartFSWather", () => {
  let mockWatcher: any;
  let onNewFileCallback: jest.Mock;

  beforeEach(() => {
    // Create a mock watcher
    mockWatcher = {
      on: jest.fn().mockReturnThis(),
      close: jest.fn(),
      getWatched: jest.fn().mockReturnValue({}),
    };

    (chokidar.watch as jest.Mock).mockReturnValue(mockWatcher);
    onNewFileCallback = jest.fn();

    // Reset the singleton instance for each test
    // Since it's a singleton, we need to reset it manually
    smartFsWatcher.close();
  });

  afterEach(() => {
    jest.clearAllMocks();
    smartFsWatcher.close();
  });

  describe("start()", () => {
    it("should initialize with default watched directories and files", () => {
      smartFsWatcher.start(onNewFileCallback);

      expect(chokidar.watch).toHaveBeenCalledWith(
        [
          "src",
          "package.json",
          "tsconfig.json",
          "jsconfig.json",
          "arkos.config.ts",
          "arkos.config.js",
        ],
        expect.objectContaining({
          ignoreInitial: true,
          ignored: expect.arrayContaining([
            /node_modules/,
            /\.git/,
            /\.dist/,
            /\.build/,
            /dist/,
            /build/,
            /\.env.*/,
          ]),
          awaitWriteFinish: {
            stabilityThreshold: 1000,
          },
        })
      );
    });

    it("should set up event listeners", () => {
      smartFsWatcher.start(onNewFileCallback);

      expect(mockWatcher.on).toHaveBeenCalledWith("add", expect.any(Function));
      expect(mockWatcher.on).toHaveBeenCalledWith(
        "ready",
        expect.any(Function)
      );
      expect(mockWatcher.on).toHaveBeenCalledWith(
        "unlink",
        expect.any(Function)
      );
    });

    it("should throw error if called multiple times without closing", () => {
      smartFsWatcher.start(onNewFileCallback);

      // Should not throw when calling start again (should handle gracefully)
      expect(() => {
        smartFsWatcher.start(onNewFileCallback);
      }).not.toThrow();
    });
  });

  describe("event handling", () => {
    let addHandler: any;
    let readyHandler: any;
    let unlinkHandler: any;

    beforeEach(() => {
      smartFsWatcher.start(onNewFileCallback);

      // Extract the event handlers
      addHandler = mockWatcher.on.mock.calls.find(
        (call: any[]) => call[0] === "add"
      )[1];
      readyHandler = mockWatcher.on.mock.calls.find(
        (call: any[]) => call[0] === "ready"
      )[1];
      unlinkHandler = mockWatcher.on.mock.calls.find(
        (call: any[]) => call[0] === "unlink"
      )[1];
    });

    describe("add event", () => {
      it("should call onNewFile callback for new files", () => {
        const filePath = "/test/file.js";
        addHandler(filePath);

        expect(onNewFileCallback).toHaveBeenCalledWith(filePath);
        expect(onNewFileCallback).toHaveBeenCalledTimes(1);
      });

      it("should not call onNewFile callback for already watched files", () => {
        const filePath = "/test/file.js";

        // First call - should trigger callback
        addHandler(filePath);
        expect(onNewFileCallback).toHaveBeenCalledTimes(1);

        // Second call - should NOT trigger callback
        addHandler(filePath);
        expect(onNewFileCallback).toHaveBeenCalledTimes(1);
      });

      it("should handle multiple different files", () => {
        const files = ["/test/file1.js", "/test/file2.ts", "/test/file3.json"];

        files.forEach((file, index) => {
          addHandler(file);
          expect(onNewFileCallback).toHaveBeenCalledWith(file);
          expect(onNewFileCallback).toHaveBeenCalledTimes(index + 1);
        });
      });

      it("should handle files with special characters", () => {
        const specialFiles = [
          "/test/file with spaces.js",
          "/test/file-with-dashes.ts",
          "/test/file_with_underscores.json",
          "/test/file@special#chars!.ts",
        ];

        specialFiles.forEach((file, index) => {
          addHandler(file);
          expect(onNewFileCallback).toHaveBeenCalledWith(file);
          expect(onNewFileCallback).toHaveBeenCalledTimes(index + 1);
        });
      });
    });

    describe("ready event", () => {
      it("should initialize watched files from getWatched()", () => {
        const mockWatchedFiles = {
          "/test": ["file1.js", "file2.ts"],
          "/another": ["config.json"],
        };

        mockWatcher.getWatched.mockReturnValue(mockWatchedFiles);

        readyHandler();

        // Verify that all files are tracked
        expect(smartFsWatcher["watchedFiles"].has("/test/file1.js")).toBe(true);
        expect(smartFsWatcher["watchedFiles"].has("/test/file2.ts")).toBe(true);
        expect(smartFsWatcher["watchedFiles"].has("/another/config.json")).toBe(
          true
        );
      });

      it("should handle empty watched files", () => {
        mockWatcher.getWatched.mockReturnValue({});
        readyHandler();

        expect(smartFsWatcher["watchedFiles"].size).toBe(0);
      });

      it("should handle nested directory structures", () => {
        const mockWatchedFiles = {
          "/test": ["file1.js"],
          "/test/nested": ["file2.ts"],
          "/test/nested/deep": ["file3.json"],
        };

        mockWatcher.getWatched.mockReturnValue(mockWatchedFiles);
        readyHandler();

        expect(smartFsWatcher["watchedFiles"].has("/test/file1.js")).toBe(true);
        expect(
          smartFsWatcher["watchedFiles"].has("/test/nested/file2.ts")
        ).toBe(true);
        expect(
          smartFsWatcher["watchedFiles"].has("/test/nested/deep/file3.json")
        ).toBe(true);
      });
    });

    describe("unlink event", () => {
      it("should remove files from tracking when unlinked", () => {
        const filePath = "/test/file.js";

        // Add file first
        addHandler(filePath);
        expect(smartFsWatcher["watchedFiles"].has(filePath)).toBe(true);

        // Remove file
        unlinkHandler(filePath);
        expect(smartFsWatcher["watchedFiles"].has(filePath)).toBe(false);
      });

      it("should handle unlink for non-tracked files gracefully", () => {
        const filePath = "/test/nonexistent.js";

        // Try to remove file that was never tracked
        expect(() => {
          unlinkHandler(filePath);
        }).not.toThrow();

        expect(smartFsWatcher["watchedFiles"].has(filePath)).toBe(false);
      });

      it("should handle multiple unlink events", () => {
        const files = ["/test/file1.js", "/test/file2.ts", "/test/file3.json"];

        // Add all files
        files.forEach((file) => addHandler(file));
        expect(smartFsWatcher["watchedFiles"].size).toBe(3);

        // Remove all files
        files.forEach((file) => unlinkHandler(file));
        expect(smartFsWatcher["watchedFiles"].size).toBe(0);
      });
    });
  });

  describe("reset()", () => {
    it("should clear all tracked files", () => {
      smartFsWatcher.start(onNewFileCallback);

      // Add some files
      const addHandler = mockWatcher.on.mock.calls.find(
        (call: any[]) => call[0] === "add"
      )[1];
      addHandler("/test/file1.js");
      addHandler("/test/file2.ts");

      expect(smartFsWatcher["watchedFiles"].size).toBe(2);

      // Reset
      smartFsWatcher.reset();

      expect(smartFsWatcher["watchedFiles"].size).toBe(0);
    });

    it("should allow new files to trigger onNewFile after reset", () => {
      smartFsWatcher.start(onNewFileCallback);
      const addHandler = mockWatcher.on.mock.calls.find(
        (call: any[]) => call[0] === "add"
      )[1];

      const filePath = "/test/file.js";

      // First add
      addHandler(filePath);
      expect(onNewFileCallback).toHaveBeenCalledTimes(1);

      // Reset
      smartFsWatcher.reset();

      // Add same file again - should trigger callback
      addHandler(filePath);
      expect(onNewFileCallback).toHaveBeenCalledTimes(2);
    });
  });

  describe("close()", () => {
    it("should close the watcher and clear tracked files", () => {
      smartFsWatcher.start(onNewFileCallback);

      // Add some files
      const addHandler = mockWatcher.on.mock.calls.find(
        (call: any[]) => call[0] === "add"
      )[1];
      addHandler("/test/file1.js");

      expect(smartFsWatcher["watchedFiles"].size).toBe(1);
      expect(mockWatcher.close).not.toHaveBeenCalled();

      // Close
      smartFsWatcher.close();

      expect(mockWatcher.close).toHaveBeenCalled();
      expect(smartFsWatcher["watchedFiles"].size).toBe(0);
      expect(smartFsWatcher["watcher"]).toBeNull();
    });

    it("should handle multiple close calls gracefully", () => {
      smartFsWatcher.start(onNewFileCallback);

      // First close
      expect(() => smartFsWatcher.close()).not.toThrow();

      // Second close
      expect(() => smartFsWatcher.close()).not.toThrow();
    });

    it("should handle close when watcher is not initialized", () => {
      // Close without starting
      expect(() => smartFsWatcher.close()).not.toThrow();
    });
  });

  describe("edge cases", () => {
    it("should handle null watcher in setupListeners", () => {
      // Force watcher to be null
      smartFsWatcher["watcher"] = null;

      // This should not throw
      expect(() => smartFsWatcher["setupListeners"]()).not.toThrow();
    });

    it("should handle very long file paths", () => {
      smartFsWatcher.start(onNewFileCallback);
      const addHandler = mockWatcher.on.mock.calls.find(
        (call: any[]) => call[0] === "add"
      )[1];

      const longPath = "/" + "a".repeat(1000) + "/file.js";

      expect(() => addHandler(longPath)).not.toThrow();
      expect(onNewFileCallback).toHaveBeenCalledWith(longPath);
    });

    it("should handle empty file paths", () => {
      smartFsWatcher.start(onNewFileCallback);
      const addHandler = mockWatcher.on.mock.calls.find(
        (call: any[]) => call[0] === "add"
      )[1];

      expect(() => addHandler("")).not.toThrow();
    });
  });

  describe("integration scenarios", () => {
    it("should handle complete file lifecycle: add -> reset -> add -> unlink", () => {
      smartFsWatcher.start(onNewFileCallback);
      const addHandler = mockWatcher.on.mock.calls.find(
        (call: any[]) => call[0] === "add"
      )[1];
      const unlinkHandler = mockWatcher.on.mock.calls.find(
        (call: any[]) => call[0] === "unlink"
      )[1];

      const filePath = "/test/file.js";

      // Step 1: Add file
      addHandler(filePath);
      expect(onNewFileCallback).toHaveBeenCalledTimes(1);
      expect(smartFsWatcher["watchedFiles"].has(filePath)).toBe(true);

      // Step 2: Reset
      smartFsWatcher.reset();
      expect(smartFsWatcher["watchedFiles"].has(filePath)).toBe(false);

      // Step 3: Add same file again
      addHandler(filePath);
      expect(onNewFileCallback).toHaveBeenCalledTimes(2);
      expect(smartFsWatcher["watchedFiles"].has(filePath)).toBe(true);

      // Step 4: Unlink file
      unlinkHandler(filePath);
      expect(smartFsWatcher["watchedFiles"].has(filePath)).toBe(false);
    });

    it("should handle multiple files with same name in different directories", () => {
      smartFsWatcher.start(onNewFileCallback);
      const addHandler = mockWatcher.on.mock.calls.find(
        (call: any[]) => call[0] === "add"
      )[1];

      const files = ["/dir1/file.js", "/dir2/file.js", "/dir3/file.js"];

      files.forEach((file, index) => {
        addHandler(file);
        expect(onNewFileCallback).toHaveBeenCalledWith(file);
        expect(onNewFileCallback).toHaveBeenCalledTimes(index + 1);
        expect(smartFsWatcher["watchedFiles"].has(file)).toBe(true);
      });
    });
  });
});
