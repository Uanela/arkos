import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { execSync } from "child_process";
import {
  getNpmPackageVersion,
  detectPackageManagerFromUserAgent,
} from "../npm.helpers";

vi.mock("child_process");

const mockExecSync = vi.mocked(execSync);

describe("NPM Utils", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("getNpmPackageVersion", () => {
    it('should return version for default package "arkos"', () => {
      mockExecSync.mockReturnValue(Buffer.from("1.2.3\n"));

      const result = getNpmPackageVersion();

      expect(mockExecSync).toHaveBeenCalledWith("npm view arkos version");
      expect(result).toBe("1.2.3");
    });

    it("should return version for specified package", () => {
      mockExecSync.mockReturnValue(Buffer.from("2.4.6\n"));

      const result = getNpmPackageVersion("react");

      expect(mockExecSync).toHaveBeenCalledWith("npm view react version");
      expect(result).toBe("2.4.6");
    });

    it("should trim whitespace from version output", () => {
      mockExecSync.mockReturnValue(Buffer.from("  1.0.0  \n\t"));

      const result = getNpmPackageVersion("test-package");

      expect(result).toBe("1.0.0");
    });

    it("should handle version with pre-release tags", () => {
      mockExecSync.mockReturnValue(Buffer.from("1.0.0-beta.1\n"));

      const result = getNpmPackageVersion("beta-package");

      expect(result).toBe("1.0.0-beta.1");
    });

    it("should handle empty package name by using default", () => {
      mockExecSync.mockReturnValue(Buffer.from("1.0.0\n"));

      const result = getNpmPackageVersion("");

      expect(mockExecSync).toHaveBeenCalledWith("npm view  version");
      expect(result).toBe("1.0.0");
    });

    it("should throw error when execSync fails", () => {
      mockExecSync.mockImplementation(() => {
        throw new Error("Package not found");
      });

      expect(() => getNpmPackageVersion("nonexistent")).toThrow(
        "Package not found"
      );
    });

    it("should handle version output with build metadata", () => {
      mockExecSync.mockReturnValue(Buffer.from("1.0.0+build.123\n"));

      const result = getNpmPackageVersion("build-package");

      expect(result).toBe("1.0.0+build.123");
    });
  });

  describe("detectPackageManagerFromUserAgent", () => {
    const originalEnv = process.env;

    beforeEach(() => {
      process.env = { ...originalEnv };
    });

    afterEach(() => {
      process.env = originalEnv;
    });

    it('should return "npm" when no user agent is set', () => {
      delete process.env.npm_config_user_agent;

      const result = detectPackageManagerFromUserAgent();

      expect(result).toBe("npm");
    });

    it('should return "npm" when user agent is empty string', () => {
      process.env.npm_config_user_agent = "";

      const result = detectPackageManagerFromUserAgent();

      expect(result).toBe("npm");
    });

    it("should detect pnpm from user agent", () => {
      process.env.npm_config_user_agent =
        "pnpm/8.0.0 npm/? node/v18.0.0 darwin x64";

      const result = detectPackageManagerFromUserAgent();

      expect(result).toBe("pnpm");
    });

    it("should detect yarn from user agent", () => {
      process.env.npm_config_user_agent =
        "yarn/1.22.0 npm/? node/v18.0.0 darwin x64";

      const result = detectPackageManagerFromUserAgent();

      expect(result).toBe("yarn");
    });

    it("should detect npm from user agent", () => {
      process.env.npm_config_user_agent =
        "npm/9.0.0 node/v18.0.0 darwin x64 workspaces/false";

      const result = detectPackageManagerFromUserAgent();

      expect(result).toBe("npm");
    });

    it("should detect bun from user agent", () => {
      process.env.npm_config_user_agent =
        "bun/1.0.0 npm/? node/v18.0.0 darwin x64";

      const result = detectPackageManagerFromUserAgent();

      expect(result).toBe("bun");
    });

    it("should detect cnpm from user agent", () => {
      process.env.npm_config_user_agent =
        "cnpm/8.0.0 npm/? node/v18.0.0 darwin x64";

      const result = detectPackageManagerFromUserAgent();

      expect(result).toBe("cnpm");
    });

    it("should detect corepack from user agent", () => {
      process.env.npm_config_user_agent =
        "corepack/0.15.0 npm/? node/v18.0.0 darwin x64";

      const result = detectPackageManagerFromUserAgent();

      expect(result).toBe("corepack");
    });

    it("should detect deno from user agent", () => {
      process.env.npm_config_user_agent =
        "deno/1.30.0 npm/? node/v18.0.0 darwin x64";

      const result = detectPackageManagerFromUserAgent();

      expect(result).toBe("deno");
    });

    it("should prioritize pnpm over npm when both are present", () => {
      process.env.npm_config_user_agent =
        "pnpm/8.0.0 npm/9.0.0 node/v18.0.0 darwin x64";

      const result = detectPackageManagerFromUserAgent();

      expect(result).toBe("pnpm");
    });

    it("should prioritize yarn over npm when both are present", () => {
      process.env.npm_config_user_agent =
        "yarn/1.22.0 npm/9.0.0 node/v18.0.0 darwin x64";

      const result = detectPackageManagerFromUserAgent();

      expect(result).toBe("yarn");
    });

    it("should prioritize bun over npm when both are present", () => {
      process.env.npm_config_user_agent =
        "bun/1.0.0 npm/9.0.0 node/v18.0.0 darwin x64";

      const result = detectPackageManagerFromUserAgent();

      expect(result).toBe("bun");
    });

    it("should return npm for unknown package manager", () => {
      process.env.npm_config_user_agent =
        "unknown-pm/1.0.0 node/v18.0.0 darwin x64";

      const result = detectPackageManagerFromUserAgent();

      expect(result).toBe("npm");
    });

    it("should handle case-sensitive matching", () => {
      process.env.npm_config_user_agent =
        "PNPM/8.0.0 npm/? node/v18.0.0 darwin x64";

      const result = detectPackageManagerFromUserAgent();

      expect(result).toBe("npm");
    });

    it("should handle partial matches correctly", () => {
      process.env.npm_config_user_agent =
        "some-pnpm-wrapper/1.0.0 node/v18.0.0";

      const result = detectPackageManagerFromUserAgent();

      expect(result).toBe("pnpm");
    });

    it("should handle multiple package managers with priority order", () => {
      process.env.npm_config_user_agent = "yarn/1.22.0 pnpm/8.0.0 npm/9.0.0";

      const result = detectPackageManagerFromUserAgent();

      expect(result).toBe("pnpm");
    });
  });

  describe("integration scenarios", () => {
    const originalEnv = process.env;

    afterEach(() => {
      process.env = originalEnv;
    });

    it("should work with typical pnpm user agent and package version", () => {
      process.env.npm_config_user_agent =
        "pnpm/8.6.0 npm/? node/v18.16.0 linux x64";
      mockExecSync.mockReturnValue(Buffer.from("2.1.0\n"));

      const packageManager = detectPackageManagerFromUserAgent();
      const version = getNpmPackageVersion("my-package");

      expect(packageManager).toBe("pnpm");
      expect(version).toBe("2.1.0");
    });

    it("should work with typical yarn user agent and default package", () => {
      process.env.npm_config_user_agent =
        "yarn/1.22.19 npm/? node/v16.20.0 darwin arm64";
      mockExecSync.mockReturnValue(Buffer.from("1.0.0-alpha.1\n"));

      const packageManager = detectPackageManagerFromUserAgent();
      const version = getNpmPackageVersion();

      expect(packageManager).toBe("yarn");
      expect(version).toBe("1.0.0-alpha.1");
    });
  });

  describe("edge cases and error handling", () => {
    it("should handle execSync returning non-string buffer", () => {
      const buffer = Buffer.from("1.0.0\n");
      mockExecSync.mockReturnValue(buffer);

      const result = getNpmPackageVersion("test");

      expect(result).toBe("1.0.0");
    });

    it("should handle empty version output", () => {
      mockExecSync.mockReturnValue(Buffer.from(""));

      const result = getNpmPackageVersion("empty");

      expect(result).toBe("");
    });

    it("should handle version with only whitespace", () => {
      mockExecSync.mockReturnValue(Buffer.from("   \n\t  "));

      const result = getNpmPackageVersion("whitespace");

      expect(result).toBe("");
    });

    it("should handle undefined npm_config_user_agent", () => {
      delete process.env.npm_config_user_agent;

      const result = detectPackageManagerFromUserAgent();

      expect(result).toBe("npm");
    });

    it("should handle user agent with special characters", () => {
      process.env.npm_config_user_agent =
        "pnpm/8.0.0-rc.1+build.123 npm/? node/v18.0.0";

      const result = detectPackageManagerFromUserAgent();

      expect(result).toBe("pnpm");
    });
  });
});
