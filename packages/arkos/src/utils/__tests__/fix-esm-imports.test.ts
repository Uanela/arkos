import fs from "fs";
import path from "path";
import { fixImports } from "../fix-esm-imports";

// Mock fs and path modules
jest.mock("fs");
jest.mock("path");

const mockedFs = fs as jest.Mocked<typeof fs>;
const mockedPath = path as jest.Mocked<typeof path>;

describe("fixImports", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedPath.join.mockImplementation((...args) => args.join("/"));
    mockedPath.resolve.mockImplementation((...args) => args.join("/"));
  });

  describe("directory traversal", () => {
    it("should recursively process subdirectories", () => {
      const subDir = {
        name: "subdir",
        isDirectory: () => true,
        isFile: () => false,
      } as unknown as fs.Dirent;
      const jsFile = {
        name: "file.js",
        isDirectory: () => false,
        isFile: () => true,
      } as unknown as fs.Dirent;

      mockedFs.readdirSync
        .mockReturnValueOnce([subDir] as any)
        .mockReturnValueOnce([jsFile] as any);

      mockedFs.readFileSync.mockReturnValue('import "./foo"' as any);
      mockedFs.existsSync.mockReturnValue(false);

      fixImports("./dist");

      expect(mockedFs.readdirSync).toHaveBeenCalledTimes(2);
      expect(mockedFs.readdirSync).toHaveBeenCalledWith("./dist", {
        withFileTypes: true,
      });
      expect(mockedFs.readdirSync).toHaveBeenCalledWith("./dist/subdir", {
        withFileTypes: true,
      });
    });

    it("should skip non-.js files", () => {
      const tsFile = {
        name: "file.ts",
        isDirectory: () => false,
        isFile: () => true,
      } as unknown as fs.Dirent;

      mockedFs.readdirSync.mockReturnValueOnce([tsFile] as any);

      fixImports("./dist");

      expect(mockedFs.readFileSync).not.toHaveBeenCalled();
      expect(mockedFs.writeFileSync).not.toHaveBeenCalled();
    });

    it("should process .js files", () => {
      const jsFile = {
        name: "index.js",
        isDirectory: () => false,
        isFile: () => true,
      } as unknown as fs.Dirent;

      mockedFs.readdirSync.mockReturnValueOnce([jsFile] as any);
      mockedFs.readFileSync.mockReturnValue("const x = 1;" as any);
      mockedFs.existsSync.mockReturnValue(false);

      fixImports("./dist");

      expect(mockedFs.readFileSync).toHaveBeenCalledWith(
        "./dist/index.js",
        "utf8"
      );
      expect(mockedFs.writeFileSync).toHaveBeenCalledWith(
        "./dist/index.js",
        "const x = 1;"
      );
    });
  });

  describe("from '...' imports", () => {
    it("should add .js to bare relative from imports", () => {
      const jsFile = {
        name: "index.js",
        isDirectory: () => false,
      } as unknown as fs.Dirent;
      mockedFs.readdirSync.mockReturnValueOnce([jsFile] as any);
      mockedFs.readFileSync.mockReturnValue('import x from "./utils"' as any);
      mockedFs.existsSync.mockReturnValue(false);

      fixImports("./dist");

      expect(mockedFs.writeFileSync).toHaveBeenCalledWith(
        "./dist/index.js",
        'import x from "./utils.js"'
      );
    });

    it("should use index.js when directory with index exists for from imports", () => {
      const jsFile = {
        name: "index.js",
        isDirectory: () => false,
      } as unknown as fs.Dirent;
      mockedFs.readdirSync.mockReturnValueOnce([jsFile] as any);
      mockedFs.readFileSync.mockReturnValue('import x from "./utils"' as any);
      mockedFs.existsSync.mockReturnValue(true);

      fixImports("./dist");

      expect(mockedFs.writeFileSync).toHaveBeenCalledWith(
        "./dist/index.js",
        'import x from "./utils/index.js"'
      );
    });

    it("should not modify from imports already ending in .js", () => {
      const jsFile = {
        name: "index.js",
        isDirectory: () => false,
      } as unknown as fs.Dirent;
      mockedFs.readdirSync.mockReturnValueOnce([jsFile] as any);
      mockedFs.readFileSync.mockReturnValue(
        'import x from "./utils.js"' as any
      );
      mockedFs.existsSync.mockReturnValue(false);

      fixImports("./dist");

      expect(mockedFs.writeFileSync).toHaveBeenCalledWith(
        "./dist/index.js",
        'import x from "./utils.js"'
      );
    });

    it("should not modify non-relative from imports", () => {
      const jsFile = {
        name: "index.js",
        isDirectory: () => false,
      } as unknown as fs.Dirent;
      mockedFs.readdirSync.mockReturnValueOnce([jsFile] as any);
      mockedFs.readFileSync.mockReturnValue('import x from "lodash"' as any);
      mockedFs.existsSync.mockReturnValue(false);

      fixImports("./dist");

      expect(mockedFs.writeFileSync).toHaveBeenCalledWith(
        "./dist/index.js",
        'import x from "lodash"'
      );
    });

    it("should handle export ... from imports", () => {
      const jsFile = {
        name: "index.js",
        isDirectory: () => false,
      } as unknown as fs.Dirent;
      mockedFs.readdirSync.mockReturnValueOnce([jsFile] as any);
      mockedFs.readFileSync.mockReturnValue('export { x } from "./foo"' as any);
      mockedFs.existsSync.mockReturnValue(false);

      fixImports("./dist");

      expect(mockedFs.writeFileSync).toHaveBeenCalledWith(
        "./dist/index.js",
        'export { x } from "./foo.js"'
      );
    });

    it("should handle single-quoted from imports", () => {
      const jsFile = {
        name: "index.js",
        isDirectory: () => false,
      } as unknown as fs.Dirent;
      mockedFs.readdirSync.mockReturnValueOnce([jsFile] as any);
      mockedFs.readFileSync.mockReturnValue("import x from './utils'" as any);
      mockedFs.existsSync.mockReturnValue(false);

      fixImports("./dist");

      expect(mockedFs.writeFileSync).toHaveBeenCalledWith(
        "./dist/index.js",
        "import x from './utils.js'"
      );
    });

    it("should handle multiple from imports in one file", () => {
      const jsFile = {
        name: "index.js",
        isDirectory: () => false,
      } as unknown as fs.Dirent;
      mockedFs.readdirSync.mockReturnValueOnce([jsFile] as any);
      mockedFs.readFileSync.mockReturnValue(
        'import a from "./a"\nimport b from "./b"' as any
      );
      mockedFs.existsSync.mockReturnValue(false);

      fixImports("./dist");

      expect(mockedFs.writeFileSync).toHaveBeenCalledWith(
        "./dist/index.js",
        'import a from "./a.js"\nimport b from "./b.js"'
      );
    });
  });

  describe("side-effect import '...' statements", () => {
    it("should add .js to side-effect relative imports", () => {
      const jsFile = {
        name: "index.js",
        isDirectory: () => false,
      } as unknown as fs.Dirent;
      mockedFs.readdirSync.mockReturnValueOnce([jsFile] as any);
      mockedFs.readFileSync.mockReturnValue('import "./polyfill"' as any);
      mockedFs.existsSync.mockReturnValue(false);

      fixImports("./dist");

      expect(mockedFs.writeFileSync).toHaveBeenCalledWith(
        "./dist/index.js",
        'import "./polyfill.js"'
      );
    });

    it("should use index.js when directory with index exists for side-effect imports", () => {
      const jsFile = {
        name: "index.js",
        isDirectory: () => false,
      } as unknown as fs.Dirent;
      mockedFs.readdirSync.mockReturnValueOnce([jsFile] as any);
      mockedFs.readFileSync.mockReturnValue('import "./polyfill"' as any);
      mockedFs.existsSync.mockReturnValue(true);

      fixImports("./dist");

      expect(mockedFs.writeFileSync).toHaveBeenCalledWith(
        "./dist/index.js",
        'import "./polyfill/index.js"'
      );
    });

    it("should not modify side-effect imports already ending in .js", () => {
      const jsFile = {
        name: "index.js",
        isDirectory: () => false,
      } as unknown as fs.Dirent;
      mockedFs.readdirSync.mockReturnValueOnce([jsFile] as any);
      mockedFs.readFileSync.mockReturnValue('import "./polyfill.js"' as any);
      mockedFs.existsSync.mockReturnValue(false);

      fixImports("./dist");

      expect(mockedFs.writeFileSync).toHaveBeenCalledWith(
        "./dist/index.js",
        'import "./polyfill.js"'
      );
    });

    it("should not modify non-relative side-effect imports", () => {
      const jsFile = {
        name: "index.js",
        isDirectory: () => false,
      } as unknown as fs.Dirent;
      mockedFs.readdirSync.mockReturnValueOnce([jsFile] as any);
      mockedFs.readFileSync.mockReturnValue('import "reflect-metadata"' as any);
      mockedFs.existsSync.mockReturnValue(false);

      fixImports("./dist");

      expect(mockedFs.writeFileSync).toHaveBeenCalledWith(
        "./dist/index.js",
        'import "reflect-metadata"'
      );
    });
  });

  describe("edge cases", () => {
    it("should handle empty directory", () => {
      mockedFs.readdirSync.mockReturnValueOnce([] as any);
      fixImports("./dist");
      expect(mockedFs.readFileSync).not.toHaveBeenCalled();
    });

    it("should handle file with no imports", () => {
      const jsFile = {
        name: "index.js",
        isDirectory: () => false,
      } as unknown as fs.Dirent;
      mockedFs.readdirSync.mockReturnValueOnce([jsFile] as any);
      mockedFs.readFileSync.mockReturnValue("const x = 42;" as any);
      mockedFs.existsSync.mockReturnValue(false);

      fixImports("./dist");

      expect(mockedFs.writeFileSync).toHaveBeenCalledWith(
        "./dist/index.js",
        "const x = 42;"
      );
    });

    it("should handle mixed imports in one file", () => {
      const jsFile = {
        name: "index.js",
        isDirectory: () => false,
      } as unknown as fs.Dirent;
      mockedFs.readdirSync.mockReturnValueOnce([jsFile] as any);
      mockedFs.readFileSync.mockReturnValue(
        'import "./side-effect"\nimport x from "./module"\nimport y from "external"' as any
      );
      mockedFs.existsSync.mockReturnValue(false);

      fixImports("./dist");

      expect(mockedFs.writeFileSync).toHaveBeenCalledWith(
        "./dist/index.js",
        'import "./side-effect.js"\nimport x from "./module.js"\nimport y from "external"'
      );
    });

    it("should handle deeply nested paths", () => {
      const jsFile = {
        name: "index.js",
        isDirectory: () => false,
      } as unknown as fs.Dirent;
      mockedFs.readdirSync.mockReturnValueOnce([jsFile] as any);
      mockedFs.readFileSync.mockReturnValue(
        'import x from "../../deep/path"' as any
      );
      mockedFs.existsSync.mockReturnValue(false);

      fixImports("./dist");

      expect(mockedFs.writeFileSync).toHaveBeenCalledWith(
        "./dist/index.js",
        'import x from "../../deep/path.js"'
      );
    });
  });

  describe("dynamic import(...) statements", () => {
    it("should add extension to dynamic imports", () => {
      const jsFile = {
        name: "index.js",
        isDirectory: () => false,
      } as unknown as fs.Dirent;
      mockedFs.readdirSync.mockReturnValueOnce([jsFile] as any);
      mockedFs.readFileSync.mockReturnValue(
        'const m = import("./module")' as any
      );
      mockedFs.existsSync.mockReturnValue(false);

      fixImports("./dist");

      expect(mockedFs.writeFileSync).toHaveBeenCalledWith(
        "./dist/index.js",
        'const m = import("./module.js")'
      );
    });

    it("should use index.js when directory exists for dynamic imports", () => {
      const jsFile = {
        name: "index.js",
        isDirectory: () => false,
      } as unknown as fs.Dirent;
      mockedFs.readdirSync.mockReturnValueOnce([jsFile] as any);
      mockedFs.readFileSync.mockReturnValue(
        'const m = import("./module")' as any
      );
      mockedFs.existsSync.mockReturnValue(true);

      fixImports("./dist");

      expect(mockedFs.writeFileSync).toHaveBeenCalledWith(
        "./dist/index.js",
        'const m = import("./module/index.js")'
      );
    });

    it("should not modify dynamic imports already ending in .js", () => {
      const jsFile = {
        name: "index.js",
        isDirectory: () => false,
      } as unknown as fs.Dirent;
      mockedFs.readdirSync.mockReturnValueOnce([jsFile] as any);
      mockedFs.readFileSync.mockReturnValue(
        'const m = import("./module.js")' as any
      );
      mockedFs.existsSync.mockReturnValue(false);

      fixImports("./dist");

      expect(mockedFs.writeFileSync).toHaveBeenCalledWith(
        "./dist/index.js",
        'const m = import("./module.js")'
      );
    });
  });

  describe("require(...) statements", () => {
    it("should add extension to require calls", () => {
      const jsFile = {
        name: "index.js",
        isDirectory: () => false,
      } as unknown as fs.Dirent;
      mockedFs.readdirSync.mockReturnValueOnce([jsFile] as any);
      mockedFs.readFileSync.mockReturnValue(
        'const x = require("./utils")' as any
      );
      mockedFs.existsSync.mockReturnValue(false);

      fixImports("./dist");

      expect(mockedFs.writeFileSync).toHaveBeenCalledWith(
        "./dist/index.js",
        'const x = require("./utils.js")'
      );
    });

    it("should use index.js when directory exists for require", () => {
      const jsFile = {
        name: "index.js",
        isDirectory: () => false,
      } as unknown as fs.Dirent;
      mockedFs.readdirSync.mockReturnValueOnce([jsFile] as any);
      mockedFs.readFileSync.mockReturnValue(
        'const x = require("./utils")' as any
      );
      mockedFs.existsSync.mockReturnValue(true);

      fixImports("./dist");

      expect(mockedFs.writeFileSync).toHaveBeenCalledWith(
        "./dist/index.js",
        'const x = require("./utils/index.js")'
      );
    });

    it("should not modify require calls already ending in .js", () => {
      const jsFile = {
        name: "index.js",
        isDirectory: () => false,
      } as unknown as fs.Dirent;
      mockedFs.readdirSync.mockReturnValueOnce([jsFile] as any);
      mockedFs.readFileSync.mockReturnValue(
        'const x = require("./utils.js")' as any
      );
      mockedFs.existsSync.mockReturnValue(false);

      fixImports("./dist");

      expect(mockedFs.writeFileSync).toHaveBeenCalledWith(
        "./dist/index.js",
        'const x = require("./utils.js")'
      );
    });
  });

  describe("file extension handling", () => {
    it("should process .cjs files and use .cjs extension", () => {
      const cjsFile = {
        name: "index.cjs",
        isDirectory: () => false,
      } as unknown as fs.Dirent;
      mockedFs.readdirSync.mockReturnValueOnce([cjsFile] as any);
      mockedFs.readFileSync.mockReturnValue(
        'const x = require("./utils")' as any
      );
      mockedFs.existsSync.mockReturnValue(false);
      mockedPath.extname.mockReturnValue(".cjs");

      fixImports("./dist");

      expect(mockedFs.writeFileSync).toHaveBeenCalledWith(
        "./dist/index.cjs",
        'const x = require("./utils.cjs")'
      );
    });

    it("should process .mjs files and use .mjs extension", () => {
      const mjsFile = {
        name: "index.mjs",
        isDirectory: () => false,
      } as unknown as fs.Dirent;
      mockedFs.readdirSync.mockReturnValueOnce([mjsFile] as any);
      mockedFs.readFileSync.mockReturnValue('import x from "./utils"' as any);
      mockedFs.existsSync.mockReturnValue(false);
      mockedPath.extname.mockReturnValue(".mjs");

      fixImports("./dist");

      expect(mockedFs.writeFileSync).toHaveBeenCalledWith(
        "./dist/index.mjs",
        'import x from "./utils.mjs"'
      );
    });

    it("should skip non-.js/.cjs/.mjs files", () => {
      const tsFile = {
        name: "file.ts",
        isDirectory: () => false,
      } as unknown as fs.Dirent;
      mockedFs.readdirSync.mockReturnValueOnce([tsFile] as any);

      fixImports("./dist");

      expect(mockedFs.readFileSync).not.toHaveBeenCalled();
    });
  });
});
