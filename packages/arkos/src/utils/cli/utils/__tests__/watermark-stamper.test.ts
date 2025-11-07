import portAndHostAllocator from "../../../features/port-and-host-allocator";
import { fullCleanCwd } from "../../../helpers/fs.helpers";
import { getVersion } from "../cli.helpers";
import watermarkStamper from "../watermark-stamper";

jest.mock("../../../features/port-and-host-allocator");
jest.mock("../../../helpers/fs.helpers");
jest.mock("../cli.helpers");

const mockPortAndHostAllocator = portAndHostAllocator as jest.Mocked<
  typeof portAndHostAllocator
>;
const mockFullCleanCwd = fullCleanCwd as jest.MockedFunction<
  typeof fullCleanCwd
>;
const mockGetVersion = getVersion as jest.MockedFunction<typeof getVersion>;

describe("WatermarkStamper", () => {
  let consoleInfoSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleInfoSpy = jest.spyOn(console, "info").mockImplementation();
    mockGetVersion.mockReturnValue("1.0.0");
  });

  afterEach(() => {
    consoleInfoSpy.mockRestore();
    jest.clearAllMocks();
  });

  describe("stamp", () => {
    it("should display version in watermark", () => {
      watermarkStamper.stamp({
        envFiles: undefined,
        host: undefined,
        port: undefined,
      });

      expect(consoleInfoSpy).toHaveBeenCalledWith(
        expect.stringContaining("Arkos.js 1.0.0")
      );
    });

    it("should show local URL with localhost when host is 0.0.0.0", () => {
      watermarkStamper.stamp({ envFiles: [], host: "0.0.0.0", port: "3000" });

      expect(consoleInfoSpy).toHaveBeenCalledWith(
        expect.stringContaining("http://localhost:3000")
      );
    });

    it("should show local URL with actual host when not 0.0.0.0", () => {
      watermarkStamper.stamp({ envFiles: [], host: "127.0.0.1", port: "3000" });

      expect(consoleInfoSpy).toHaveBeenCalledWith(
        expect.stringContaining("http://localhost:3000")
      );
    });

    it("should show network URL when non-local IP is available", () => {
      mockPortAndHostAllocator.getFirstNonLocalIp.mockReturnValue(
        "192.168.1.100"
      );

      watermarkStamper.stamp({ envFiles: [], host: "0.0.0.0", port: "3000" });

      expect(consoleInfoSpy).toHaveBeenCalledWith(
        expect.stringContaining("http://192.168.1.100:3000")
      );
    });

    it("should not show network URL when no non-local IP is available", () => {
      (
        mockPortAndHostAllocator.getFirstNonLocalIp as jest.Mock
      ).mockReturnValue(null);

      watermarkStamper.stamp({ envFiles: [], host: "0.0.0.0", port: "3000" });

      const networkCall = consoleInfoSpy.mock.calls.find((call) =>
        call[0].includes("Network:")
      );
      expect(networkCall).toBeUndefined();
    });

    it("should show environments when multiple env files provided", () => {
      mockFullCleanCwd.mockReturnValue("env1, env2");

      watermarkStamper.stamp({
        envFiles: ["env1", "env2"],
        host: undefined,
        port: undefined,
      });

      expect(consoleInfoSpy).toHaveBeenCalledWith(
        expect.stringContaining("Environments: env1, env2")
      );
    });

    it("should not show environments when no env files provided", () => {
      watermarkStamper.stamp({
        envFiles: [],
        host: undefined,
        port: undefined,
      });

      const envCall = consoleInfoSpy.mock.calls.find((call) =>
        call[0].includes("Environments:")
      );
      expect(envCall).toBeUndefined();
    });

    it("should clean env file paths by removing slashes and backslashes", () => {
      mockFullCleanCwd.mockReturnValue("path/env1, path/env2");

      watermarkStamper.stamp({
        envFiles: ["path/env1", "path\\env2"],
        host: undefined,
        port: undefined,
      });

      expect(mockFullCleanCwd).toHaveBeenCalledWith("path/env1, path\\env2");
    });

    it("should handle undefined host and port without errors", () => {
      expect(() => {
        watermarkStamper.stamp({
          envFiles: [],
          host: undefined,
          port: undefined,
        });
      }).not.toThrow();
    });

    it("should handle empty string host and port", () => {
      expect(() => {
        watermarkStamper.stamp({ envFiles: [], host: "", port: "" });
      }).not.toThrow();
    });
  });

  describe("edge cases", () => {
    it("should handle null host and port", () => {
      expect(() => {
        watermarkStamper.stamp({
          envFiles: [],
          host: null as any,
          port: null as any,
        });
      }).not.toThrow();
    });

    it("should handle very long version strings", () => {
      mockGetVersion.mockReturnValue("1.0.0-beta.1+1234567890");

      watermarkStamper.stamp({
        envFiles: [],
        host: undefined,
        port: undefined,
      });

      expect(consoleInfoSpy).toHaveBeenCalledWith(
        expect.stringContaining("Arkos.js 1.0.0-beta.1+1234567890")
      );
    });

    it("should handle IPv6 addresses", () => {
      watermarkStamper.stamp({ envFiles: [], host: "::1", port: "3000" });

      expect(consoleInfoSpy).toHaveBeenCalledWith(
        expect.stringContaining("http://::1:3000")
      );
    });
  });
});
