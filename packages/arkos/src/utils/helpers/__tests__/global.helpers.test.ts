import fs from "fs";
import path from "path";
import { importModule, getPackageJson, isEsm } from "../global.helpers";

// Mock dependencies
jest.mock("fs");
jest.mock("../fs.helpers", () => ({
  getUserFileExtension: jest.fn(),
}));

const mockFs = fs as jest.Mocked<typeof fs>;
import { getUserFileExtension } from "../fs.helpers";

describe("getPackageJson", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return parsed package.json when file exists", () => {
    const mockPackageJson = { name: "test-package", type: "module" };
    mockFs.existsSync.mockReturnValue(true);
    mockFs.readFileSync.mockReturnValue(JSON.stringify(mockPackageJson));

    const result = getPackageJson();

    expect(result).toEqual(mockPackageJson);
    expect(mockFs.existsSync).toHaveBeenCalledWith(
      path.join(process.cwd(), "package.json")
    );
    expect(mockFs.readFileSync).toHaveBeenCalledWith(
      path.join(process.cwd(), "package.json"),
      "utf8"
    );
  });

  it("should return undefined when package.json does not exist", () => {
    mockFs.existsSync.mockReturnValue(false);

    const result = getPackageJson();

    expect(result).toBeUndefined();
    expect(mockFs.existsSync).toHaveBeenCalledWith(
      path.join(process.cwd(), "package.json")
    );
    expect(mockFs.readFileSync).not.toHaveBeenCalled();
  });

  it("should handle errors gracefully and return undefined", () => {
    const consoleSpy = jest.spyOn(console, "error").mockImplementation();
    mockFs.existsSync.mockImplementation(() => {
      throw new Error("File system error");
    });

    const result = getPackageJson();

    expect(result).toBeUndefined();
    expect(consoleSpy).toHaveBeenCalledWith(
      "Error checking package.json:",
      expect.any(Error)
    );

    consoleSpy.mockRestore();
  });

  it("should handle JSON parse errors", () => {
    const consoleSpy = jest.spyOn(console, "error").mockImplementation();
    mockFs.existsSync.mockReturnValue(true);
    mockFs.readFileSync.mockReturnValue("invalid json");

    const result = getPackageJson();

    expect(result).toBeUndefined();
    expect(consoleSpy).toHaveBeenCalledWith(
      "Error checking package.json:",
      expect.any(Error)
    );

    consoleSpy.mockRestore();
  });
});

describe("isEsm", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return true when package.json type is module", () => {
    mockFs.existsSync.mockReturnValue(true);
    mockFs.readFileSync.mockReturnValue(JSON.stringify({ type: "module" }));

    const result = isEsm();

    expect(result).toBe(true);
  });

  it("should return false when package.json type is not module", () => {
    mockFs.existsSync.mockReturnValue(true);
    mockFs.readFileSync.mockReturnValue(JSON.stringify({ type: "commonjs" }));

    const result = isEsm();

    expect(result).toBe(false);
  });

  it("should return false when package.json has no type field", () => {
    mockFs.existsSync.mockReturnValue(true);
    mockFs.readFileSync.mockReturnValue(JSON.stringify({ name: "test" }));

    const result = isEsm();

    expect(result).toBe(false);
  });

  it("should return false when package.json does not exist", () => {
    mockFs.existsSync.mockReturnValue(false);

    const result = isEsm();

    expect(result).toBe(false);
  });
});

describe("importModule", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should import built-in modules without modification", async () => {
    const module = await importModule("fs", { fixExtension: false });
    expect(module).toBeDefined();
  });

  // it("should import cli.js from root", async () => {
  //   const module = await importModule("fs");
  //   expect(module).toBeDefined();
  // });

  // it("should import TypeScript files without extension modification", async () => {
  //   (getUserFileExtension as jest.Mock).mockReturnValue("ts");

  //   const module = await importModule("./test-module");
  //   expect(module).toBeDefined();
  // });

  // it("should import .ts files without extension modification", async () => {
  //   (getUserFileExtension as jest.Mock).mockReturnValue("js");

  //   const module = await importModule("./test-module.ts");
  //   expect(module).toBeDefined();
  // });

  // it("should not fix extension when fixExtension is false", async () => {
  //   mockFs.existsSync.mockReturnValue(true);
  //   mockFs.readFileSync.mockReturnValue(JSON.stringify({ type: "module" }));

  //   const module = await importModule("./test-module", { fixExtension: false });
  //   expect(module).toBeDefined();
  // });

  // it("should add .js extension for relative ESM imports without extension", async () => {
  //   mockFs.existsSync.mockReturnValue(true);
  //   mockFs.readFileSync.mockReturnValue(JSON.stringify({ type: "module" }));
  //   (getUserFileExtension as jest.Mock).mockReturnValue("js");

  //   // Mock the file system check for the direct file (not index)
  //   mockFs.existsSync.mockImplementation((filePath: any) => {
  //     if (filePath.includes("package.json")) return true;
  //     if (filePath.includes("index.js")) return false; // No index file
  //     return true; // Direct file exists
  //   });

  //   const module = await importModule("./test-module");
  //   expect(module).toBeDefined();
  // });

  // it("should add /index.js for relative ESM directory imports", async () => {
  //   mockFs.existsSync.mockReturnValue(true);
  //   mockFs.readFileSync.mockReturnValue(JSON.stringify({ type: "module" }));
  //   (getUserFileExtension as jest.Mock).mockReturnValue("js");

  //   // Mock the file system check for index file
  //   mockFs.existsSync.mockImplementation((filePath: any) => {
  //     if (filePath.includes("package.json")) return true;
  //     if (filePath.includes("index.js")) return true; // Index file exists
  //     return false;
  //   });

  //   const module = await importModule("./test-directory");
  //   expect(module).toBeDefined();
  // });

  // it("should not modify absolute paths", async () => {
  //   mockFs.existsSync.mockReturnValue(true);
  //   mockFs.readFileSync.mockReturnValue(JSON.stringify({ type: "module" }));
  //   (getUserFileExtension as jest.Mock).mockReturnValue("js");

  //   const module = await importModule("/absolute/path/module");
  //   expect(module).toBeDefined();
  // });

  // it("should not modify paths that already have .js extension", async () => {
  //   mockFs.existsSync.mockReturnValue(true);
  //   mockFs.readFileSync.mockReturnValue(JSON.stringify({ type: "module" }));
  //   (getUserFileExtension as jest.Mock).mockReturnValue("js");

  //   const module = await importModule("./test-module.js");
  //   expect(module).toBeDefined();
  // });

  // it("should not modify non-ESM imports", async () => {
  //   mockFs.existsSync.mockReturnValue(true);
  //   mockFs.readFileSync.mockReturnValue(JSON.stringify({ type: "commonjs" }));
  //   (getUserFileExtension as jest.Mock).mockReturnValue("js");

  //   const module = await importModule("./test-module");
  //   expect(module).toBeDefined();
  // });
});

describe("detectPackageManagerFromUserAgent", () => {
  const originalUserAgent = process.env.npm_config_user_agent;

  afterEach(() => {
    process.env.npm_config_user_agent = originalUserAgent;
  });

  it("should return npm as default when no user agent", () => {
    delete process.env.npm_config_user_agent;

    const { detectPackageManagerFromUserAgent } = require("../global.helpers");
    const result = detectPackageManagerFromUserAgent();

    expect(result).toBe("npm");
  });

  it("should detect pnpm from user agent", () => {
    process.env.npm_config_user_agent = "pnpm/7.0.0";

    const { detectPackageManagerFromUserAgent } = require("../global.helpers");
    const result = detectPackageManagerFromUserAgent();

    expect(result).toBe("pnpm");
  });

  it("should detect yarn from user agent", () => {
    process.env.npm_config_user_agent = "yarn/1.22.0";

    const { detectPackageManagerFromUserAgent } = require("../global.helpers");
    const result = detectPackageManagerFromUserAgent();

    expect(result).toBe("yarn");
  });

  it("should detect npm from user agent", () => {
    process.env.npm_config_user_agent = "npm/8.0.0";

    const { detectPackageManagerFromUserAgent } = require("../global.helpers");
    const result = detectPackageManagerFromUserAgent();

    expect(result).toBe("npm");
  });

  it("should detect bun from user agent", () => {
    process.env.npm_config_user_agent = "bun/1.0.0";

    const { detectPackageManagerFromUserAgent } = require("../global.helpers");
    const result = detectPackageManagerFromUserAgent();

    expect(result).toBe("bun");
  });

  it("should detect cnpm from user agent", () => {
    process.env.npm_config_user_agent = "cnpm/2.0.0";

    const { detectPackageManagerFromUserAgent } = require("../global.helpers");
    const result = detectPackageManagerFromUserAgent();

    expect(result).toBe("cnpm");
  });

  it("should detect corepack from user agent", () => {
    process.env.npm_config_user_agent = "corepack/0.15.0";

    const { detectPackageManagerFromUserAgent } = require("../global.helpers");
    const result = detectPackageManagerFromUserAgent();

    expect(result).toBe("corepack");
  });

  it("should detect deno from user agent", () => {
    process.env.npm_config_user_agent = "deno/1.30.0";

    const { detectPackageManagerFromUserAgent } = require("../global.helpers");
    const result = detectPackageManagerFromUserAgent();

    expect(result).toBe("deno");
  });

  it("should return npm for unknown user agent", () => {
    process.env.npm_config_user_agent = "unknown-package-manager/1.0.0";

    const { detectPackageManagerFromUserAgent } = require("../global.helpers");
    const result = detectPackageManagerFromUserAgent();

    expect(result).toBe("npm");
  });

  it("should return npm for empty user agent", () => {
    process.env.npm_config_user_agent = "";

    const { detectPackageManagerFromUserAgent } = require("../global.helpers");
    const result = detectPackageManagerFromUserAgent();

    expect(result).toBe("npm");
  });
});
