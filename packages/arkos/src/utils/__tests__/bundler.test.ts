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

  describe("config loading", () => {
    it("should auto-detect tsconfig.json when no configPath provided", () => {
      mockFs.existsSync.mockImplementation((p) =>
        String(p).endsWith("tsconfig.json")
      );
      mockFs.readFileSync.mockReturnValue(TSCONFIG);

      expect(() =>
        new Bundler().bundle({ ext: ".js", outDir: "./dist", rootDir: "./" })
      ).not.toThrow();
    });

    it("should fall back to jsconfig.json when tsconfig.json not found", () => {
      mockFs.existsSync.mockImplementation((p) =>
        String(p).endsWith("jsconfig.json")
      );
      mockFs.readFileSync.mockReturnValue(TSCONFIG);

      expect(() =>
        new Bundler().bundle({ ext: ".js", outDir: "./dist", rootDir: "./" })
      ).not.toThrow();
    });

    it("should use empty paths when no config found", () => {
      mockFs.existsSync.mockReturnValue(false);

      expect(() =>
        new Bundler().bundle({ ext: ".js", outDir: "./dist", rootDir: "./" })
      ).not.toThrow();
    });

    it("should use explicit configPath when provided", () => {
      mockFs.existsSync.mockImplementation((p) =>
        String(p).endsWith("custom.tsconfig.json")
      );
      mockFs.readFileSync.mockReturnValue(TSCONFIG);

      expect(() =>
        new Bundler().bundle({
          ext: ".js",
          outDir: "./dist",
          rootDir: "./",
          configPath: "./custom.tsconfig.json",
        })
      ).not.toThrow();
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

      expect(() =>
        new Bundler().bundle({
          ext: ".js",
          outDir: "./dist",
          rootDir: "./",
          configPath: "./tsconfig.json",
        })
      ).not.toThrow();
    });

    it("should handle tsconfig with comments and trailing commas", () => {
      const configWithComments = `{
        // this is a comment
        "compilerOptions": {
          "target": "ES6",
          // Uanela
          "module": "es2020",
          "moduleResolution": "bundler",
          "rootDir": ".",
          "baseUrl": ".",
          "esModuleInterop": true,
          "isolatedModules": true,
          "skipLibCheck": true,
          "forceConsistentCasingInFileNames": true,
          "strict": true,
          "experimentalDecorators": true,
          "emitDecoratorMetadata": true,
          "lib": ["es6", "dom"],
          "noImplicitAny": false,
          "paths": {
          "@src/*": ["./src/*"]
        }
        },
        "include": ["src/**/*.ts", "packages/**/*.ts", "arkos.config.ts"],
        "exclude": [
          "node_modules",
          ".build",
          "build",
          "generated-schemas.ts",
          "uml",
          "uploads"
        ]
      }`;

      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(configWithComments);

      expect(() =>
        new Bundler().bundle({
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

      new Bundler().bundle({ ext: ".js", outDir: "./dist" });

      expect(mockFs.writeFileSync).toHaveBeenCalledTimes(2);
    });

    it("should skip non-js files", () => {
      mockFs.existsSync.mockReturnValue(false);
      mockFs.readdirSync.mockReturnValue([
        makeDirent("index.ts", false),
        makeDirent("styles.css", false),
        makeDirent("readme.md", false),
      ] as any);

      new Bundler().bundle({ ext: ".js", outDir: "./dist" });

      expect(mockFs.writeFileSync).not.toHaveBeenCalled();
    });

    it("should process .cjs files", () => {
      mockFs.existsSync.mockReturnValue(false);
      mockFs.readdirSync.mockReturnValue([
        makeDirent("index.cjs", false),
      ] as any);
      mockFs.readFileSync.mockReturnValue(`const x = require("./foo");`);

      new Bundler().bundle({ ext: ".cjs", outDir: "./dist" });

      expect(mockFs.writeFileSync).toHaveBeenCalledTimes(1);
    });

    it("should process .mjs files", () => {
      mockFs.existsSync.mockReturnValue(false);
      mockFs.readdirSync.mockReturnValue([
        makeDirent("index.mjs", false),
      ] as any);
      mockFs.readFileSync.mockReturnValue(`import foo from "./foo";`);

      new Bundler().bundle({ ext: ".mjs", outDir: "./dist" });

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

      new Bundler().bundle({ ext: ".js", outDir: "./dist" });

      // Content is unchanged so writeFileSync should not be called
      expect(mockFs.writeFileSync).not.toHaveBeenCalled();
    });

    it("should rewrite relative imports", () => {
      mockFs.existsSync.mockReturnValue(false);
      mockFs.readdirSync.mockReturnValue([
        makeDirent("index.js", false),
      ] as any);
      mockFs.readFileSync.mockReturnValue(`import { foo } from "./utils";`);

      new Bundler().bundle({ ext: ".js", outDir: "./dist" });

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

      new Bundler().bundle({ ext: ".js", outDir: "./dist" });

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

      new Bundler().bundle({ ext: ".js", outDir: "./dist" });

      const written = (mockFs.writeFileSync as jest.Mock).mock.calls[0][1];
      expect(written).toContain(`"./helpers/index.js"`);
    });

    it("should not double-add extension when already present", () => {
      mockFs.existsSync.mockReturnValue(false);
      mockFs.readdirSync.mockReturnValue([
        makeDirent("index.js", false),
      ] as any);
      mockFs.readFileSync.mockReturnValue(`import { a } from "./helpers.js";`);

      new Bundler().bundle({ ext: ".js", outDir: "./dist" });

      // Content is unchanged so writeFileSync should not be called
      expect(mockFs.writeFileSync).not.toHaveBeenCalled();
    });
  });

  describe("import statement types", () => {
    it("should rewrite named imports", () => {
      mockFs.existsSync.mockReturnValue(false);
      mockFs.readdirSync.mockReturnValue([
        makeDirent("index.js", false),
      ] as any);
      mockFs.readFileSync.mockReturnValue(`import { foo } from "./foo";`);

      new Bundler().bundle({ ext: ".js", outDir: "./dist" });

      const written = (mockFs.writeFileSync as jest.Mock).mock.calls[0][1];
      expect(written).toContain(`from "./foo.js"`);
    });

    it("should rewrite default imports", () => {
      mockFs.existsSync.mockReturnValue(false);
      mockFs.readdirSync.mockReturnValue([
        makeDirent("index.js", false),
      ] as any);
      mockFs.readFileSync.mockReturnValue(`import foo from "./foo";`);

      new Bundler().bundle({ ext: ".js", outDir: "./dist" });

      const written = (mockFs.writeFileSync as jest.Mock).mock.calls[0][1];
      expect(written).toContain(`from "./foo.js"`);
    });

    it("should rewrite side-effect imports", () => {
      mockFs.existsSync.mockReturnValue(false);
      mockFs.readdirSync.mockReturnValue([
        makeDirent("index.js", false),
      ] as any);
      mockFs.readFileSync.mockReturnValue(`import "./setup";`);

      new Bundler().bundle({ ext: ".js", outDir: "./dist" });

      const written = (mockFs.writeFileSync as jest.Mock).mock.calls[0][1];
      expect(written).toContain(`import "./setup.js"`);
    });

    it("should rewrite dynamic imports", () => {
      mockFs.existsSync.mockReturnValue(false);
      mockFs.readdirSync.mockReturnValue([
        makeDirent("index.js", false),
      ] as any);
      mockFs.readFileSync.mockReturnValue(`const m = import("./module");`);

      new Bundler().bundle({ ext: ".js", outDir: "./dist" });

      const written = (mockFs.writeFileSync as jest.Mock).mock.calls[0][1];
      expect(written).toContain(`import("./module.js")`);
    });

    it("should rewrite require calls", () => {
      mockFs.existsSync.mockReturnValue(false);
      mockFs.readdirSync.mockReturnValue([
        makeDirent("index.js", false),
      ] as any);
      mockFs.readFileSync.mockReturnValue(`const x = require("./config");`);

      new Bundler().bundle({ ext: ".js", outDir: "./dist" });

      const written = (mockFs.writeFileSync as jest.Mock).mock.calls[0][1];
      expect(written).toContain(`require("./config.js")`);
    });

    it("should rewrite re-exports", () => {
      mockFs.existsSync.mockReturnValue(false);
      mockFs.readdirSync.mockReturnValue([
        makeDirent("index.js", false),
      ] as any);
      mockFs.readFileSync.mockReturnValue(`export { foo } from "./foo";`);

      new Bundler().bundle({ ext: ".js", outDir: "./dist" });

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

      new Bundler().bundle({
        ext: ".js",
        outDir: "/project/dist",
        rootDir: "/project",
        configPath: "/project/tsconfig.json",
      });

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

      new Bundler().bundle({
        ext: ".js",
        outDir: "/project/dist",
        rootDir: "/project",
        configPath: "/project/tsconfig.json",
      });

      // Content is unchanged so writeFileSync should not be called
      expect(mockFs.writeFileSync).not.toHaveBeenCalled();
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

      new Bundler().bundle({
        ext: ".js",
        outDir: "/project/dist",
        rootDir: "/project",
        configPath: "/project/tsconfig.json",
      });

      const written = (mockFs.writeFileSync as jest.Mock).mock.calls[0][1];
      expect(written).not.toContain(`from "@root"`);
    });

    describe("alias resolution with @/* -> ./* (root mapping)", () => {
      const ROOT_TSCONFIG = JSON.stringify({
        compilerOptions: {
          baseUrl: ".",
          paths: {
            "@/*": ["./*"],
          },
        },
      });

      it("should resolve @/src/... to relative path when file is under src/", () => {
        mockFs.existsSync.mockImplementation((p) =>
          String(p).endsWith("tsconfig.json")
        );
        mockFs.readFileSync.mockImplementation((p) => {
          if (String(p).endsWith("tsconfig.json")) return ROOT_TSCONFIG;
          return `import fileUploadPolicy from "@/src/modules/file-upload/file-upload.policy";`;
        });
        mockFs.readdirSync.mockReturnValue([
          makeDirent("file-upload.router.js", false),
        ] as any);

        new Bundler().bundle({
          ext: ".js",
          outDir: "/project/dist/src/modules/file-upload",
          rootDir: "/project",
          configPath: "/project/tsconfig.json",
        });

        const written = (mockFs.writeFileSync as jest.Mock).mock.calls[0][1];
        expect(written).not.toContain(
          `"@/src/modules/file-upload/file-upload.policy"`
        );
        expect(written).not.toContain(
          `"./src/modules/file-upload/file-upload.policy`
        );
        expect(written).toContain(`"./file-upload.policy.js"`);
      });

      it("should resolve @/src/utils/... correctly from a deeply nested file", () => {
        mockFs.existsSync.mockImplementation((p) =>
          String(p).endsWith("tsconfig.json")
        );
        mockFs.readFileSync.mockImplementation((p) => {
          if (String(p).endsWith("tsconfig.json")) return ROOT_TSCONFIG;
          return `import { helper } from "@/src/utils/helpers";`;
        });
        mockFs.readdirSync.mockReturnValue([
          makeDirent("some.service.js", false),
        ] as any);

        new Bundler().bundle({
          ext: ".js",
          outDir: "/project/dist/src/modules/auth",
          rootDir: "/project",
          configPath: "/project/tsconfig.json",
        });

        const written = (mockFs.writeFileSync as jest.Mock).mock.calls[0][1];
        expect(written).not.toContain(`"@/src/utils/helpers"`);
        expect(written).not.toContain(`"./src/utils/helpers`);
        expect(written).toContain(`"../../utils/helpers.js"`);
      });

      it("should resolve @/src/... from a file at src root level", () => {
        mockFs.existsSync.mockImplementation((p) =>
          String(p).endsWith("tsconfig.json")
        );
        mockFs.readFileSync.mockImplementation((p) => {
          if (String(p).endsWith("tsconfig.json")) return ROOT_TSCONFIG;
          return `import { something } from "@/src/modules/base/base.controller";`;
        });
        mockFs.readdirSync.mockReturnValue([
          makeDirent("server.js", false),
        ] as any);

        new Bundler().bundle({
          ext: ".js",
          outDir: "/project/dist/src",
          rootDir: "/project",
          configPath: "/project/tsconfig.json",
        });

        const written = (mockFs.writeFileSync as jest.Mock).mock.calls[0][1];
        expect(written).not.toContain(`"@/src/modules/base/base.controller"`);
        expect(written).toContain(`"./modules/base/base.controller.js"`);
      });
    });

    describe("alias resolution with @src/* -> src/* mapping", () => {
      const ATSRC_TSCONFIG = JSON.stringify({
        compilerOptions: {
          baseUrl: ".",
          paths: {
            "@src/*": ["src/*"],
          },
        },
      });

      it("should resolve @src/utils/... to relative path", () => {
        mockFs.existsSync.mockImplementation((p) =>
          String(p).endsWith("tsconfig.json")
        );
        mockFs.readFileSync.mockImplementation((p) => {
          if (String(p).endsWith("tsconfig.json")) return ATSRC_TSCONFIG;
          return `import { helper } from "@src/utils/helpers";`;
        });
        mockFs.readdirSync.mockReturnValue([
          makeDirent("index.js", false),
        ] as any);

        new Bundler().bundle({
          ext: ".js",
          outDir: "/project/dist/src/modules/auth",
          rootDir: "/project",
          configPath: "/project/tsconfig.json",
        });

        const written = (mockFs.writeFileSync as jest.Mock).mock.calls[0][1];
        expect(written).not.toContain(`"@src/utils/helpers"`);
        expect(written).toContain(`"../../utils/helpers.js"`);
      });
    });

    describe("alias resolution edge cases", () => {
      it("should handle multiple aliases in the same file", () => {
        mockFs.existsSync.mockImplementation((p) =>
          String(p).endsWith("tsconfig.json")
        );
        mockFs.readFileSync.mockImplementation((p) => {
          if (String(p).endsWith("tsconfig.json")) return TSCONFIG;
          return `
        import { foo } from "@/helpers/foo";
        import { bar } from "@utils/bar";
        import baz from "./baz";
      `;
        });
        mockFs.readdirSync.mockReturnValue([
          makeDirent("index.js", false),
        ] as any);

        new Bundler().bundle({
          ext: ".js",
          outDir: "/project/dist",
          rootDir: "/project",
          configPath: "/project/tsconfig.json",
        });

        const written = (mockFs.writeFileSync as jest.Mock).mock.calls[0][1];
        expect(written).not.toContain(`"@/helpers/foo"`);
        expect(written).not.toContain(`"@utils/bar"`);
        expect(written).toContain(".js");
      });

      it("should handle alias in dynamic import", () => {
        const ROOT_TSCONFIG = JSON.stringify({
          compilerOptions: { baseUrl: ".", paths: { "@/*": ["./*"] } },
        });

        mockFs.existsSync.mockImplementation((p) =>
          String(p).endsWith("tsconfig.json")
        );
        mockFs.readFileSync.mockImplementation((p) => {
          if (String(p).endsWith("tsconfig.json")) return ROOT_TSCONFIG;
          return `const m = import("@/src/modules/some.module");`;
        });
        mockFs.readdirSync.mockReturnValue([
          makeDirent("index.js", false),
        ] as any);

        new Bundler().bundle({
          ext: ".js",
          outDir: "/project/dist/src",
          rootDir: "/project",
          configPath: "/project/tsconfig.json",
        });

        const written = (mockFs.writeFileSync as jest.Mock).mock.calls[0][1];
        expect(written).not.toContain(`"@/src/modules/some.module"`);
        expect(written).toContain(".js");
      });

      it("should handle alias in re-export", () => {
        const ROOT_TSCONFIG = JSON.stringify({
          compilerOptions: { baseUrl: ".", paths: { "@/*": ["./*"] } },
        });

        mockFs.existsSync.mockImplementation((p) =>
          String(p).endsWith("tsconfig.json")
        );
        mockFs.readFileSync.mockImplementation((p) => {
          if (String(p).endsWith("tsconfig.json")) return ROOT_TSCONFIG;
          return `export { foo } from "@/src/utils/foo";`;
        });
        mockFs.readdirSync.mockReturnValue([
          makeDirent("index.js", false),
        ] as any);

        new Bundler().bundle({
          ext: ".js",
          outDir: "/project/dist/src/modules/file-upload",
          rootDir: "/project",
          configPath: "/project/tsconfig.json",
        });

        const written = (mockFs.writeFileSync as jest.Mock).mock.calls[0][1];
        expect(written).not.toContain(`"@/src/utils/foo"`);
        expect(written).toContain(`"../../utils/foo.js"`);
      });

      it("should not rewrite alias that matches a node_modules package", () => {
        const ROOT_TSCONFIG = JSON.stringify({
          compilerOptions: { baseUrl: ".", paths: { "@/*": ["./*"] } },
        });

        mockFs.existsSync.mockImplementation((p) =>
          String(p).endsWith("tsconfig.json")
        );
        mockFs.readFileSync.mockImplementation((p) => {
          if (String(p).endsWith("tsconfig.json")) return ROOT_TSCONFIG;
          return `import { PrismaClient } from "@prisma/client";`;
        });
        mockFs.readdirSync.mockReturnValue([
          makeDirent("index.js", false),
        ] as any);

        new Bundler().bundle({
          ext: ".js",
          outDir: "/project/dist/src",
          rootDir: "/project",
          configPath: "/project/tsconfig.json",
        });

        expect(mockFs.writeFileSync).not.toHaveBeenCalled();
      });
    });
  });
});
