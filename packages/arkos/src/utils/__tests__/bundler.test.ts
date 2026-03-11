import { Bundler } from "../bundler";
import fs from "fs";

jest.mock("fs");
jest.mock("path", () => {
  const actual = jest.requireActual("path");
  return { ...actual };
});

const mockFs = fs as jest.Mocked<typeof fs>;

function makeDirent(name: string, isDir: boolean): fs.Dirent {
  return {
    name,
    isDirectory: () => isDir,
    isFile: () => !isDir,
    isBlockDevice: () => false,
    isCharacterDevice: () => false,
    isSymbolicLink: () => false,
    isFIFO: () => false,
    isSocket: () => false,
  } as fs.Dirent;
}

const TSCONFIG = JSON.stringify({
  compilerOptions: {
    baseUrl: ".",
    paths: {
      "@/*": ["src/*"],
      "@utils/*": ["src/utils/*"],
    },
  },
});

describe("Bundler", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFs.existsSync.mockReturnValue(false);
    mockFs.readdirSync.mockReturnValue([]);
    mockFs.readFileSync.mockReturnValue("");
    mockFs.writeFileSync.mockImplementation(() => {});
  });

  describe("constructor / config loading", () => {
    it("should auto-detect tsconfig.json when no configPath provided", () => {
      mockFs.existsSync.mockImplementation((p) =>
        String(p).endsWith("tsconfig.json")
      );
      mockFs.readFileSync.mockReturnValue(TSCONFIG);

      const bundler = new Bundler({
        ext: ".js",
        outDir: "./dist",
        rootDir: "./",
      });

      expect(bundler).toBeDefined();
    });

    it("should fall back to jsconfig.json when tsconfig.json not found", () => {
      mockFs.existsSync.mockImplementation((p) =>
        String(p).endsWith("jsconfig.json")
      );
      mockFs.readFileSync.mockReturnValue(TSCONFIG);

      const bundler = new Bundler({
        ext: ".js",
        outDir: "./dist",
        rootDir: "./",
      });

      expect(bundler).toBeDefined();
    });

    it("should use empty paths when no config found", () => {
      mockFs.existsSync.mockReturnValue(false);

      const bundler = new Bundler({
        ext: ".js",
        outDir: "./dist",
        rootDir: "./",
      });

      expect(bundler).toBeDefined();
    });

    it("should use explicit configPath when provided", () => {
      mockFs.existsSync.mockImplementation((p) =>
        String(p).endsWith("custom.tsconfig.json")
      );
      mockFs.readFileSync.mockReturnValue(TSCONFIG);

      const bundler = new Bundler({
        ext: ".js",
        outDir: "./dist",
        rootDir: "./",
        configPath: "./custom.tsconfig.json",
      });

      expect(bundler).toBeDefined();
    });

    it("should handle tsconfig with extends", () => {
      const parentConfig = JSON.stringify({
        compilerOptions: {
          baseUrl: ".",
          paths: { "@base/*": ["base/*"] },
        },
      });

      const childConfig = JSON.stringify({
        extends: "./tsconfig.base.json",
        compilerOptions: {
          paths: { "@child/*": ["child/*"] },
        },
      });

      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockImplementation((p) => {
        if (String(p).includes("base")) return parentConfig;
        return childConfig;
      });

      const bundler = new Bundler({
        ext: ".js",
        outDir: "./dist",
        rootDir: "./",
        configPath: "./tsconfig.json",
      });

      expect(bundler).toBeDefined();
    });

    it("should handle tsconfig with comments and trailing commas", () => {
      const configWithComments = `{
        // this is a comment
        "compilerOptions": {
          "baseUrl": "." /* block comment */,
          "paths": {
            "@/*": ["src/*"], 
          },
        },
      }`;

      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(configWithComments);

      expect(
        () =>
          new Bundler({
            ext: ".js",
            outDir: "./dist",
            rootDir: "./",
            configPath: "./tsconfig.json",
          })
      ).not.toThrow();
    });
  });

  describe("bundle", () => {
    it("should recursively process directories", () => {
      mockFs.existsSync.mockReturnValue(false);
      mockFs.readdirSync.mockImplementation((dir) => {
        if (String(dir).endsWith("dist")) {
          return [
            makeDirent("sub", true),
            makeDirent("index.js", false),
          ] as any;
        }
        if (String(dir).endsWith("sub")) {
          return [makeDirent("helper.js", false)] as any;
        }
        return [] as any;
      });
      mockFs.readFileSync.mockReturnValue(`import { foo } from "./foo";`);

      const bundler = new Bundler({ ext: ".js", outDir: "./dist" });
      bundler.bundle();

      expect(mockFs.writeFileSync).toHaveBeenCalledTimes(2);
    });

    it("should skip non-js files", () => {
      mockFs.existsSync.mockReturnValue(false);
      mockFs.readdirSync.mockReturnValue([
        makeDirent("index.ts", false),
        makeDirent("styles.css", false),
        makeDirent("readme.md", false),
      ] as any);

      const bundler = new Bundler({ ext: ".js", outDir: "./dist" });
      bundler.bundle();

      expect(mockFs.writeFileSync).not.toHaveBeenCalled();
    });

    it("should process .cjs files", () => {
      mockFs.existsSync.mockReturnValue(false);
      mockFs.readdirSync.mockReturnValue([
        makeDirent("index.cjs", false),
      ] as any);
      mockFs.readFileSync.mockReturnValue(`const x = require("./foo");`);

      const bundler = new Bundler({ ext: ".cjs", outDir: "./dist" });
      bundler.bundle();

      expect(mockFs.writeFileSync).toHaveBeenCalledTimes(1);
    });

    it("should process .mjs files", () => {
      mockFs.existsSync.mockReturnValue(false);
      mockFs.readdirSync.mockReturnValue([
        makeDirent("index.mjs", false),
      ] as any);
      mockFs.readFileSync.mockReturnValue(`import foo from "./foo";`);

      const bundler = new Bundler({ ext: ".mjs", outDir: "./dist" });
      bundler.bundle();

      expect(mockFs.writeFileSync).toHaveBeenCalledTimes(1);
    });
  });

  describe("bare specifier detection", () => {
    it("should not rewrite node_modules imports", () => {
      mockFs.existsSync.mockReturnValue(false);
      mockFs.readdirSync.mockReturnValue([
        makeDirent("index.js", false),
      ] as any);

      const content = `
        import express from "express";
        import { PrismaClient } from "@prisma/client";
        import merge from "lodash/merge";
        import zod from "zod";
      `;
      mockFs.readFileSync.mockReturnValue(content);

      const bundler = new Bundler({ ext: ".js", outDir: "./dist" });
      bundler.bundle();

      const written = (mockFs.writeFileSync as jest.Mock).mock.calls[0][1];
      expect(written).toContain(`from "express"`);
      expect(written).toContain(`from "@prisma/client"`);
      expect(written).toContain(`from "lodash/merge"`);
      expect(written).toContain(`from "zod"`);
    });

    it("should rewrite relative imports", () => {
      mockFs.existsSync.mockReturnValue(false);
      mockFs.readdirSync.mockReturnValue([
        makeDirent("index.js", false),
      ] as any);
      mockFs.readFileSync.mockReturnValue(`import { foo } from "./utils";`);

      const bundler = new Bundler({ ext: ".js", outDir: "./dist" });
      bundler.bundle();

      const written = (mockFs.writeFileSync as jest.Mock).mock.calls[0][1];
      expect(written).toContain(`from "./utils.js"`);
    });
  });

  describe("extension handling", () => {
    it("should add extension to relative imports without one", () => {
      mockFs.existsSync.mockReturnValue(false);
      mockFs.readdirSync.mockReturnValue([
        makeDirent("index.js", false),
      ] as any);
      mockFs.readFileSync.mockReturnValue(`import { a } from "./helpers";`);

      const bundler = new Bundler({ ext: ".js", outDir: "./dist" });
      bundler.bundle();

      const written = (mockFs.writeFileSync as jest.Mock).mock.calls[0][1];
      expect(written).toContain(`"./helpers.js"`);
    });

    it("should use /index.js when import resolves to a directory", () => {
      mockFs.existsSync.mockImplementation((p) =>
        String(p).endsWith("/index.js")
      );
      mockFs.readdirSync.mockReturnValue([
        makeDirent("index.js", false),
      ] as any);
      mockFs.readFileSync.mockReturnValue(`import { a } from "./helpers";`);

      const bundler = new Bundler({ ext: ".js", outDir: "./dist" });
      bundler.bundle();

      const written = (mockFs.writeFileSync as jest.Mock).mock.calls[0][1];
      expect(written).toContain(`"./helpers/index.js"`);
    });

    it("should not double-add extension when already present", () => {
      mockFs.existsSync.mockReturnValue(false);
      mockFs.readdirSync.mockReturnValue([
        makeDirent("index.js", false),
      ] as any);
      mockFs.readFileSync.mockReturnValue(`import { a } from "./helpers.js";`);

      const bundler = new Bundler({ ext: ".js", outDir: "./dist" });
      bundler.bundle();

      const written = (mockFs.writeFileSync as jest.Mock).mock.calls[0][1];
      expect(written).toContain(`"./helpers.js"`);
      expect(written).not.toContain(`"./helpers.js.js"`);
    });
  });

  describe("import statement types", () => {
    it("should rewrite named imports", () => {
      mockFs.existsSync.mockReturnValue(false);
      mockFs.readdirSync.mockReturnValue([
        makeDirent("index.js", false),
      ] as any);
      mockFs.readFileSync.mockReturnValue(`import { foo } from "./foo";`);

      const bundler = new Bundler({ ext: ".js", outDir: "./dist" });
      bundler.bundle();

      const written = (mockFs.writeFileSync as jest.Mock).mock.calls[0][1];
      expect(written).toContain(`from "./foo.js"`);
    });

    it("should rewrite default imports", () => {
      mockFs.existsSync.mockReturnValue(false);
      mockFs.readdirSync.mockReturnValue([
        makeDirent("index.js", false),
      ] as any);
      mockFs.readFileSync.mockReturnValue(`import foo from "./foo";`);

      const bundler = new Bundler({ ext: ".js", outDir: "./dist" });
      bundler.bundle();

      const written = (mockFs.writeFileSync as jest.Mock).mock.calls[0][1];
      expect(written).toContain(`from "./foo.js"`);
    });

    it("should rewrite side-effect imports", () => {
      mockFs.existsSync.mockReturnValue(false);
      mockFs.readdirSync.mockReturnValue([
        makeDirent("index.js", false),
      ] as any);
      mockFs.readFileSync.mockReturnValue(`import "./setup";`);

      const bundler = new Bundler({ ext: ".js", outDir: "./dist" });
      bundler.bundle();

      const written = (mockFs.writeFileSync as jest.Mock).mock.calls[0][1];
      expect(written).toContain(`import "./setup.js"`);
    });

    it("should rewrite dynamic imports", () => {
      mockFs.existsSync.mockReturnValue(false);
      mockFs.readdirSync.mockReturnValue([
        makeDirent("index.js", false),
      ] as any);
      mockFs.readFileSync.mockReturnValue(`const m = import("./module");`);

      const bundler = new Bundler({ ext: ".js", outDir: "./dist" });
      bundler.bundle();

      const written = (mockFs.writeFileSync as jest.Mock).mock.calls[0][1];
      expect(written).toContain(`import("./module.js")`);
    });

    it("should rewrite require calls", () => {
      mockFs.existsSync.mockReturnValue(false);
      mockFs.readdirSync.mockReturnValue([
        makeDirent("index.js", false),
      ] as any);
      mockFs.readFileSync.mockReturnValue(`const x = require("./config");`);

      const bundler = new Bundler({ ext: ".js", outDir: "./dist" });
      bundler.bundle();

      const written = (mockFs.writeFileSync as jest.Mock).mock.calls[0][1];
      expect(written).toContain(`require("./config.js")`);
    });

    it("should rewrite re-exports", () => {
      mockFs.existsSync.mockReturnValue(false);
      mockFs.readdirSync.mockReturnValue([
        makeDirent("index.js", false),
      ] as any);
      mockFs.readFileSync.mockReturnValue(`export { foo } from "./foo";`);

      const bundler = new Bundler({ ext: ".js", outDir: "./dist" });
      bundler.bundle();

      const written = (mockFs.writeFileSync as jest.Mock).mock.calls[0][1];
      expect(written).toContain(`from "./foo.js"`);
    });
  });

  describe("alias resolution", () => {
    it("should resolve wildcard alias to relative path", () => {
      mockFs.existsSync.mockImplementation((p) =>
        String(p).endsWith("tsconfig.json")
      );
      mockFs.readFileSync.mockImplementation((p) => {
        if (String(p).endsWith("tsconfig.json")) return TSCONFIG;
        return `import { helper } from "@/helpers/utils";`;
      });
      mockFs.readdirSync.mockReturnValue([
        makeDirent("index.js", false),
      ] as any);

      const bundler = new Bundler({
        ext: ".js",
        outDir: "/project/dist",
        rootDir: "/project",
        configPath: "/project/tsconfig.json",
      });
      bundler.bundle();

      const written = (mockFs.writeFileSync as jest.Mock).mock.calls[0][1];
      expect(written).not.toContain(`"@/helpers/utils"`);
      expect(written).toContain(".js");
    });

    it("should not rewrite aliased imports that match node_modules packages", () => {
      mockFs.existsSync.mockImplementation((p) =>
        String(p).endsWith("tsconfig.json")
      );
      mockFs.readFileSync.mockImplementation((p) => {
        if (String(p).endsWith("tsconfig.json")) return TSCONFIG;
        return `import { PrismaClient } from "@prisma/client";`;
      });
      mockFs.readdirSync.mockReturnValue([
        makeDirent("index.js", false),
      ] as any);

      const bundler = new Bundler({
        ext: ".js",
        outDir: "/project/dist",
        rootDir: "/project",
        configPath: "/project/tsconfig.json",
      });
      bundler.bundle();

      const written = (mockFs.writeFileSync as jest.Mock).mock.calls[0][1];
      expect(written).toContain(`from "@prisma/client"`);
    });

    it("should resolve exact alias (non-wildcard)", () => {
      const config = JSON.stringify({
        compilerOptions: {
          baseUrl: ".",
          paths: { "@root": ["src/index"] },
        },
      });

      mockFs.existsSync.mockImplementation((p) =>
        String(p).endsWith("tsconfig.json")
      );
      mockFs.readFileSync.mockImplementation((p) => {
        if (String(p).endsWith("tsconfig.json")) return config;
        return `import root from "@root";`;
      });
      mockFs.readdirSync.mockReturnValue([
        makeDirent("index.js", false),
      ] as any);

      const bundler = new Bundler({
        ext: ".js",
        outDir: "/project/dist",
        rootDir: "/project",
        configPath: "/project/tsconfig.json",
      });
      bundler.bundle();

      const written = (mockFs.writeFileSync as jest.Mock).mock.calls[0][1];
      expect(written).not.toContain(`from "@root"`);
    });
  });
});
