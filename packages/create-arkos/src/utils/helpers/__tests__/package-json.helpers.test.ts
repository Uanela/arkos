import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import fs from "fs";
import {
  getLatestVersion,
  getProcjetPackageJsonDependecies,
} from "../package-json.helpers";

vi.mock("fs");

const mockFs = vi.mocked(fs);
const mockFetch = vi.fn();

global.fetch = mockFetch;

describe("Package JSON Utils", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("getLatestVersion", () => {
    it("should fetch and return latest version for a package", async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          "dist-tags": {
            latest: "1.2.3",
            beta: "1.3.0-beta.1",
          },
        }),
      };
      mockFetch.mockResolvedValue(mockResponse);

      const result = await getLatestVersion("react");

      expect(mockFetch).toHaveBeenCalledWith(
        "https://registry.npmjs.org/react"
      );
      expect(result).toBe("1.2.3");
    });

    it("should handle scoped packages", async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          "dist-tags": {
            latest: "5.0.4",
          },
        }),
      };
      mockFetch.mockResolvedValue(mockResponse);

      const result = await getLatestVersion("@types/node");

      expect(mockFetch).toHaveBeenCalledWith(
        "https://registry.npmjs.org/@types/node"
      );
      expect(result).toBe("5.0.4");
    });

    it("should handle packages with special characters in name", async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          "dist-tags": {
            latest: "2.1.0",
          },
        }),
      };
      mockFetch.mockResolvedValue(mockResponse);

      const result = await getLatestVersion(
        "package-with-dashes_and_underscores"
      );

      expect(mockFetch).toHaveBeenCalledWith(
        "https://registry.npmjs.org/package-with-dashes_and_underscores"
      );
      expect(result).toBe("2.1.0");
    });

    it("should throw error when response is not ok (404)", async () => {
      const mockResponse = {
        ok: false,
        status: 404,
      };
      mockFetch.mockResolvedValue(mockResponse);

      await expect(getLatestVersion("nonexistent-package")).rejects.toThrow(
        "Failed to fetch: 404"
      );
    });

    it("should throw error when response is not ok (500)", async () => {
      const mockResponse = {
        ok: false,
        status: 500,
      };
      mockFetch.mockResolvedValue(mockResponse);

      await expect(getLatestVersion("server-error-package")).rejects.toThrow(
        "Failed to fetch: 500"
      );
    });

    it("should handle network failures", async () => {
      mockFetch.mockRejectedValue(new Error("Network error"));

      await expect(getLatestVersion("package")).rejects.toThrow(
        "Network error"
      );
    });

    it("should handle JSON parse errors", async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockRejectedValue(new Error("Unexpected token")),
      };
      mockFetch.mockResolvedValue(mockResponse);

      await expect(getLatestVersion("malformed-response")).rejects.toThrow(
        "Unexpected token"
      );
    });

    it("should handle response with missing dist-tags", async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          name: "package",
          versions: {},
        }),
      };
      mockFetch.mockResolvedValue(mockResponse);

      await expect(getLatestVersion("no-dist-tags")).rejects.toThrow();
    });

    it("should handle response with null dist-tags", async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          "dist-tags": null,
        }),
      };
      mockFetch.mockResolvedValue(mockResponse);

      await expect(getLatestVersion("null-dist-tags")).rejects.toThrow();
    });

    it("should handle pre-release versions as latest", async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          "dist-tags": {
            latest: "1.0.0-rc.1",
          },
        }),
      };
      mockFetch.mockResolvedValue(mockResponse);

      const result = await getLatestVersion("prerelease-package");

      expect(result).toBe("1.0.0-rc.1");
    });
  });

  describe("getProcjetPackageJsonDependecies", () => {
    it("should read and parse package.json dependencies", () => {
      const packageJsonContent = JSON.stringify({
        dependencies: {
          react: "^18.0.0",
          express: "^4.18.0",
          lodash: "^4.17.21",
        },
        devDependencies: {
          vitest: "^1.0.0",
          typescript: "^5.0.0",
        },
      });

      mockFs.readFileSync.mockReturnValue(packageJsonContent);

      const result = getProcjetPackageJsonDependecies("/project/path");

      expect(mockFs.readFileSync).toHaveBeenCalledWith(
        "/project/path/package.json",
        {
          encoding: "utf8",
        }
      );
      expect(result).toEqual({
        dependencies: ["react", "express", "lodash"],
        devDependencies: ["vitest", "typescript"],
      });
    });

    it("should handle empty dependencies and devDependencies", () => {
      const packageJsonContent = JSON.stringify({
        dependencies: {},
        devDependencies: {},
      });

      mockFs.readFileSync.mockReturnValue(packageJsonContent);

      const result = getProcjetPackageJsonDependecies("/empty/project");

      expect(result).toEqual({
        dependencies: [],
        devDependencies: [],
      });
    });

    it("should handle scoped packages", () => {
      const packageJsonContent = JSON.stringify({
        dependencies: {
          "@types/node": "^18.0.0",
          "@angular/core": "^15.0.0",
          react: "^18.0.0",
        },
        devDependencies: {
          "@vitest/ui": "^1.0.0",
          "@testing-library/react": "^13.0.0",
        },
      });

      mockFs.readFileSync.mockReturnValue(packageJsonContent);

      const result = getProcjetPackageJsonDependecies("/scoped/project");

      expect(result.dependencies).toContain("@types/node");
      expect(result.dependencies).toContain("@angular/core");
      expect(result.devDependencies).toContain("@vitest/ui");
      expect(result.devDependencies).toContain("@testing-library/react");
    });

    it("should throw error when package.json file does not exist", () => {
      mockFs.readFileSync.mockImplementation(() => {
        const error = new Error("ENOENT: no such file or directory");
        (error as any).code = "ENOENT";
        throw error;
      });

      expect(() =>
        getProcjetPackageJsonDependecies("/nonexistent/path")
      ).toThrow("ENOENT: no such file or directory");
    });

    it("should throw error when package.json contains invalid JSON", () => {
      mockFs.readFileSync.mockReturnValue('{ "name": "test", invalid }');

      expect(() => getProcjetPackageJsonDependecies("/invalid/json")).toThrow();
    });

    it("should throw error when dependencies section is missing", () => {
      const packageJsonContent = JSON.stringify({
        name: "test-package",
        devDependencies: {
          vitest: "^1.0.0",
        },
      });

      mockFs.readFileSync.mockReturnValue(packageJsonContent);

      expect(() => getProcjetPackageJsonDependecies("/missing/deps")).toThrow();
    });

    it("should throw error when devDependencies section is missing", () => {
      const packageJsonContent = JSON.stringify({
        name: "test-package",
        dependencies: {
          react: "^18.0.0",
        },
      });

      mockFs.readFileSync.mockReturnValue(packageJsonContent);

      expect(() =>
        getProcjetPackageJsonDependecies("/missing/devdeps")
      ).toThrow();
    });

    it("should handle package.json with additional properties", () => {
      const packageJsonContent = JSON.stringify({
        name: "my-package",
        version: "1.0.0",
        description: "A test package",
        scripts: {
          test: "vitest",
          build: "tsc",
        },
        dependencies: {
          react: "^18.0.0",
        },
        devDependencies: {
          typescript: "^5.0.0",
        },
        peerDependencies: {
          "react-dom": "^18.0.0",
        },
      });

      mockFs.readFileSync.mockReturnValue(packageJsonContent);

      const result = getProcjetPackageJsonDependecies("/full/package");

      expect(result).toEqual({
        dependencies: ["react"],
        devDependencies: ["typescript"],
      });
    });

    it("should handle different path separators", () => {
      const packageJsonContent = JSON.stringify({
        dependencies: { test: "^1.0.0" },
        devDependencies: { "test-dev": "^1.0.0" },
      });

      mockFs.readFileSync.mockReturnValue(packageJsonContent);

      getProcjetPackageJsonDependecies("C:\\Windows\\Project");

      expect(mockFs.readFileSync).toHaveBeenCalledWith(
        "C:\\Windows\\Project/package.json",
        {
          encoding: "utf8",
        }
      );
    });

    it("should preserve dependency order from package.json", () => {
      const packageJsonContent = JSON.stringify({
        dependencies: {
          "z-package": "^1.0.0",
          "a-package": "^2.0.0",
          "m-package": "^3.0.0",
        },
        devDependencies: {
          "z-dev": "^1.0.0",
          "a-dev": "^2.0.0",
        },
      });

      mockFs.readFileSync.mockReturnValue(packageJsonContent);

      const result = getProcjetPackageJsonDependecies("/ordered/project");

      expect(result.dependencies).toEqual([
        "z-package",
        "a-package",
        "m-package",
      ]);
      expect(result.devDependencies).toEqual(["z-dev", "a-dev"]);
    });
  });

  describe("integration scenarios", () => {
    it("should work together for checking outdated dependencies", async () => {
      const packageJsonContent = JSON.stringify({
        dependencies: {
          react: "^17.0.0",
          lodash: "^4.17.0",
        },
        devDependencies: {
          vitest: "^0.28.0",
        },
      });

      mockFs.readFileSync.mockReturnValue(packageJsonContent);

      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          "dist-tags": { latest: "18.2.0" },
        }),
      };
      mockFetch.mockResolvedValue(mockResponse);

      const { dependencies } = getProcjetPackageJsonDependecies("/project");
      const latestReactVersion = await getLatestVersion("react");

      expect(dependencies).toContain("react");
      expect(latestReactVersion).toBe("18.2.0");
    });

    it("should handle checking multiple package versions", async () => {
      const packageJsonContent = JSON.stringify({
        dependencies: {
          react: "^17.0.0",
          vue: "^3.0.0",
        },
        devDependencies: {},
      });

      mockFs.readFileSync.mockReturnValue(packageJsonContent);

      const mockReactResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          "dist-tags": { latest: "18.2.0" },
        }),
      };

      const mockVueResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          "dist-tags": { latest: "3.3.4" },
        }),
      };

      mockFetch.mockResolvedValueOnce(mockReactResponse);
      mockFetch.mockResolvedValueOnce(mockVueResponse);

      const { dependencies } =
        getProcjetPackageJsonDependecies("/multi/project");
      const reactVersion = await getLatestVersion("react");
      const vueVersion = await getLatestVersion("vue");

      expect(dependencies).toEqual(["react", "vue"]);
      expect(reactVersion).toBe("18.2.0");
      expect(vueVersion).toBe("3.3.4");
    });
  });

  describe("error handling", () => {
    it("should handle file system permission errors", () => {
      mockFs.readFileSync.mockImplementation(() => {
        const error = new Error("EACCES: permission denied");
        (error as any).code = "EACCES";
        throw error;
      });

      expect(() => getProcjetPackageJsonDependecies("/forbidden/path")).toThrow(
        "EACCES: permission denied"
      );
    });

    it("should handle network timeout for version fetch", async () => {
      mockFetch.mockRejectedValue(new Error("fetch timeout"));

      await expect(getLatestVersion("slow-package")).rejects.toThrow(
        "fetch timeout"
      );
    });

    it("should handle package registry returning unexpected structure", async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          "something-else": {
            latest: "1.0.0",
          },
        }),
      };
      mockFetch.mockResolvedValue(mockResponse);

      await expect(getLatestVersion("weird-package")).rejects.toThrow();
    });

    it("should handle empty package name", async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          "dist-tags": { latest: "1.0.0" },
        }),
      };
      mockFetch.mockResolvedValue(mockResponse);

      const result = await getLatestVersion("");

      expect(mockFetch).toHaveBeenCalledWith("https://registry.npmjs.org/");
      expect(result).toBe("1.0.0");
    });

    it("should handle package.json with null values", () => {
      const packageJsonContent = JSON.stringify({
        dependencies: null,
        devDependencies: undefined,
      });

      mockFs.readFileSync.mockReturnValue(packageJsonContent);

      expect(() => getProcjetPackageJsonDependecies("/null/project")).toThrow();
    });
  });

  describe("edge cases", () => {
    it("should handle very large package.json files", () => {
      const largeDependencies: Record<string, string> = {};
      const largeDevDependencies: Record<string, string> = {};

      for (let i = 0; i < 100; i++) {
        largeDependencies[`package-${i}`] = "^1.0.0";
        largeDevDependencies[`dev-package-${i}`] = "^1.0.0";
      }

      const packageJsonContent = JSON.stringify({
        dependencies: largeDependencies,
        devDependencies: largeDevDependencies,
      });

      mockFs.readFileSync.mockReturnValue(packageJsonContent);

      const result = getProcjetPackageJsonDependecies("/large/project");

      expect(result.dependencies).toHaveLength(100);
      expect(result.devDependencies).toHaveLength(100);
      expect(result.dependencies[0]).toBe("package-0");
      expect(result.devDependencies[99]).toBe("dev-package-99");
    });

    it("should handle package names with unicode characters", async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          "dist-tags": { latest: "1.0.0" },
        }),
      };
      mockFetch.mockResolvedValue(mockResponse);

      const result = await getLatestVersion("пакет-тест");

      expect(mockFetch).toHaveBeenCalledWith(
        "https://registry.npmjs.org/пакет-тест"
      );
      expect(result).toBe("1.0.0");
    });

    it("should handle package.json with mixed case property names", () => {
      const packageJsonContent = JSON.stringify({
        Dependencies: {
          react: "^18.0.0",
        },
        DevDependencies: {
          vitest: "^1.0.0",
        },
        dependencies: {
          lodash: "^4.17.21",
        },
        devDependencies: {
          typescript: "^5.0.0",
        },
      });

      mockFs.readFileSync.mockReturnValue(packageJsonContent);

      const result = getProcjetPackageJsonDependecies("/mixed/case");

      expect(result).toEqual({
        dependencies: ["lodash"],
        devDependencies: ["typescript"],
      });
    });

    it("should handle version strings with complex semver ranges", async () => {
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue({
          "dist-tags": {
            latest: "1.2.3-beta.4+build.5",
          },
        }),
      };
      mockFetch.mockResolvedValue(mockResponse);

      const result = await getLatestVersion("complex-version");

      expect(result).toBe("1.2.3-beta.4+build.5");
    });

    it("should handle absolute and relative project paths", () => {
      const packageJsonContent = JSON.stringify({
        dependencies: { test: "^1.0.0" },
        devDependencies: { "test-dev": "^1.0.0" },
      });

      mockFs.readFileSync.mockReturnValue(packageJsonContent);

      getProcjetPackageJsonDependecies("./relative/path");
      expect(mockFs.readFileSync).toHaveBeenCalledWith(
        "./relative/path/package.json",
        {
          encoding: "utf8",
        }
      );

      getProcjetPackageJsonDependecies("/absolute/path");
      expect(mockFs.readFileSync).toHaveBeenCalledWith(
        "/absolute/path/package.json",
        {
          encoding: "utf8",
        }
      );
    });
  });
});
