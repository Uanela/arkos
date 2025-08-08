import * as net from "net";
import { ArkosConfig } from "../../../exports";
import portAndHostAllocator from "../../features/port-and-host-allocator";
import sheu from "../../sheu";

// Mock dependencies
jest.mock("../../sheu", () => ({
  warn: jest.fn(),
}));

jest.mock("net");

describe("PortAndHostAllocator", () => {
  let mockServer: jest.Mocked<net.Server>;
  let mockCreateServer: jest.MockedFunction<typeof net.createServer>;

  beforeEach(() => {
    jest.clearAllMocks();

    (portAndHostAllocator as any).host = undefined;
    (portAndHostAllocator as any).port = undefined;

    jest.spyOn(console, "info").mockImplementation(jest.fn());

    // Create mock server
    mockServer = {
      listen: jest.fn(),
      close: jest.fn(),
      on: jest.fn(),
    } as any;

    mockCreateServer = net.createServer as jest.MockedFunction<
      typeof net.createServer
    >;
    mockCreateServer.mockReturnValue(mockServer);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe("getCorrectHostAndPortToUse", () => {
    it("should use CLI parameters with highest precedence", () => {
      const env = {
        CLI_HOST: "cli-host",
        CLI_PORT: "9000",
        HOST: "env-host",
        PORT: "8080",
      };
      const config: ArkosConfig = {
        host: "config-host",
        port: 7000,
      };

      const result = (portAndHostAllocator as any).getCorrectHostAndPortToUse(
        env,
        config
      );

      expect(result).toEqual({
        host: "cli-host",
        port: "9000",
      });
    });

    it("should use config parameters when CLI params are not available", () => {
      const env = {
        HOST: "env-host",
        PORT: "8080",
      };
      const config: ArkosConfig = {
        host: "config-host",
        port: 7000,
      };

      const result = (portAndHostAllocator as any).getCorrectHostAndPortToUse(
        env,
        config
      );

      expect(result).toEqual({
        host: "config-host",
        port: "7000",
      });
    });

    it("should use environment variables when CLI and config are not available", () => {
      const env = {
        HOST: "env-host",
        PORT: "8080",
      };

      const result = (portAndHostAllocator as any).getCorrectHostAndPortToUse(
        env
      );

      expect(result).toEqual({
        host: "env-host",
        port: "8080",
      });
    });

    it("should use default values when nothing else is available", () => {
      const env = {};

      const result = (portAndHostAllocator as any).getCorrectHostAndPortToUse(
        env
      );

      expect(result).toEqual({
        host: "localhost",
        port: "8000",
      });
    });

    it("should handle partial configuration", () => {
      const env = {
        CLI_HOST: "custom-host",
        PORT: "9090",
      };
      const config: ArkosConfig = {
        port: 7777,
      };

      const result = (portAndHostAllocator as any).getCorrectHostAndPortToUse(
        env,
        config
      );

      expect(result).toEqual({
        host: "custom-host",
        port: "7777",
      });
    });
  });

  describe("isPortAvailable", () => {
    it("should return true when port is available", async () => {
      mockServer.listen.mockImplementation(((_: any, callback: any) => {
        if (callback) callback?.();
        return "" as any;
      }) as any);
      mockServer.close.mockImplementation((callback) => {
        if (callback) callback();
        return "" as any;
      });

      const result = await (portAndHostAllocator as any).isPortAvailable(
        "localhost",
        8000
      );

      expect(result).toBe(true);
      expect(mockServer.listen).toHaveBeenCalledWith(
        8000,
        expect.any(Function)
      );
      expect(mockServer.close).toHaveBeenCalledWith(expect.any(Function));
    });

    it("should return false when port is not available", async () => {
      mockServer.on.mockImplementation((event, callback) => {
        if (event === ("error" as any)) {
          callback(new Error("Port in use") as any);
        }
        return "" as any;
      });

      const result = await (portAndHostAllocator as any).isPortAvailable(
        "localhost",
        8000
      );

      expect(result).toBe(false);
      expect(mockServer.on).toHaveBeenCalledWith("error", expect.any(Function));
    });

    it("should handle server creation properly", async () => {
      mockServer.listen.mockImplementation(((_: any, callback: any) => {
        if (callback) callback?.();
        return "" as any;
      }) as any);
      mockServer.close.mockImplementation((callback) => {
        if (callback) callback();
        return "" as any;
      });

      await (portAndHostAllocator as any).isPortAvailable("127.0.0.1", 3000);

      expect(net.createServer).toHaveBeenCalledTimes(1);
      expect(mockServer.listen).toHaveBeenCalledWith(
        3000,
        expect.any(Function)
      );
    });
  });

  describe("getHostAndAvailablePort", () => {
    it("should return cached values if already set", async () => {
      (portAndHostAllocator as any).host = "cached-host";
      (portAndHostAllocator as any).port = "9999";
      (portAndHostAllocator as any).prevWarnings = new Set(["port in use 1"]);

      const result = await portAndHostAllocator.getHostAndAvailablePort(
        {},
        { logWarning: true }
      );

      expect(result).toEqual({
        host: "cached-host",
        port: "9999",
      });
      expect(net.createServer).not.toHaveBeenCalled();
    });

    it("should find the first available port", async () => {
      const env = { PORT: "3000" };

      // Mock port availability - first port is available
      mockServer.listen.mockImplementation(((_: any, callback: any) => {
        if (callback) callback?.();
        return "" as any;
      }) as any);
      mockServer.close.mockImplementation((callback) => {
        if (callback) callback();
        return "" as any;
      });

      const result = await portAndHostAllocator.getHostAndAvailablePort(env);

      expect(result).toEqual({
        host: "localhost",
        port: "3000",
      });
      expect(mockServer.listen).toHaveBeenCalledWith(
        3000,
        expect.any(Function)
      );
    });

    it("should increment port until available port is found", async () => {
      const env = { PORT: "4000" };
      let callCount = 0;

      // Mock first two ports as unavailable, third as available
      mockServer.on.mockImplementation((event, callback) => {
        if (event === ("error" as any) && callCount < 3) {
          callback(new Error("Port in use") as any);
        }
        return "" as any;
      });

      mockServer.listen.mockImplementation(((_: any, callback: any) => {
        if (callCount <= 1) {
          // Simulate port not available for first two calls
          setTimeout(() => {
            const errorCallback = mockServer.on.mock.calls.find(
              (call) => call[0] === ("error" as any)
            )?.[1];
            if (errorCallback) errorCallback(new Error("Port in use") as any);
          }, 0);
        } else {
          // Third call succeeds
          if (callback) callback();
        }
        callCount++;
      }) as any);

      mockServer.close.mockImplementation((callback) => {
        if (callback) callback();
        return "" as any;
      });

      const result = await portAndHostAllocator.getHostAndAvailablePort(env, {
        logWarning: true,
      });

      expect(result).toEqual({
        host: "localhost",
        port: "4002",
      });
      expect(sheu.warn).toHaveBeenCalledWith(
        "Port 4000 is in use, trying port 4001 instead..."
      );
      expect(sheu.warn).toHaveBeenCalledWith(
        "Port 4001 is in use, trying port 4002 instead..."
      );
      expect(sheu.warn).toHaveBeenCalledTimes(2);
    });

    it("should use configuration with custom host", async () => {
      const env = {};
      const config: ArkosConfig = {
        host: "0.0.0.0",
        port: 5000,
      };

      mockServer.listen.mockImplementation(((
        _: any,
        _1: any,
        callback: any
      ) => {
        if (callback) callback?.();
        return "" as any;
      }) as any);
      mockServer.close.mockImplementation((callback) => {
        if (callback) callback();
        return "" as any;
      });

      const result = await portAndHostAllocator.getHostAndAvailablePort(
        env,
        config
      );

      expect(result).toEqual({
        host: "0.0.0.0",
        port: "5000",
      });
      expect(mockServer.listen).toHaveBeenCalledWith(
        5000,
        "0.0.0.0",
        expect.any(Function)
      );
    });

    it("should handle string ports correctly", async () => {
      const env = { PORT: "8080" };

      mockServer.listen.mockImplementation(((_: any, callback: any) => {
        if (callback) callback?.();
        return "" as any;
      }) as any);
      mockServer.close.mockImplementation((callback) => {
        if (callback) callback();
        return "" as any;
      });

      const result = await portAndHostAllocator.getHostAndAvailablePort(env);

      expect(result).toEqual({
        host: "localhost",
        port: "8080",
      });
      expect(mockServer.listen).toHaveBeenCalledWith(
        8080,
        expect.any(Function)
      );
    });

    it("should cache the found port and host for subsequent calls", async () => {
      const env = { PORT: "6000", HOST: "127.0.0.1" };

      mockServer.listen.mockImplementation(((_: any, callback: any) => {
        if (callback) callback?.();
        return "" as any;
      }) as any);
      mockServer.close.mockImplementation((callback) => {
        if (callback) callback();
        return "" as any;
      });

      // First call
      const result1 = await portAndHostAllocator.getHostAndAvailablePort(env);
      expect(result1).toEqual({ host: "127.0.0.1", port: "6000" });

      // Second call should return cached values
      const result2 = await portAndHostAllocator.getHostAndAvailablePort(env);
      expect(result2).toEqual({ host: "127.0.0.1", port: "6000" });

      // net.createServer should only be called once (for the first call)
      expect(net.createServer).toHaveBeenCalledTimes(1);
    });
  });

  describe("singleton behavior", () => {
    it("should maintain state across multiple method calls", async () => {
      const env = { PORT: "7000" };

      mockServer.listen.mockImplementation(((_: any, callback: any) => {
        if (callback) callback?.();
        return "" as any;
      }) as any);
      mockServer.close.mockImplementation((callback) => {
        if (callback) callback();
        return "" as any;
      });

      const result1 = await portAndHostAllocator.getHostAndAvailablePort(env);
      expect(result1).toEqual({ host: "localhost", port: "7000" });

      // Second call should use cached values
      const result2 = await portAndHostAllocator.getHostAndAvailablePort({});
      expect(result2).toEqual({ host: "localhost", port: "7000" });
    });
  });

  describe("edge cases", () => {
    it("should handle undefined config gracefully", async () => {
      const env = {};

      mockServer.listen.mockImplementation(((_: any, callback: any) => {
        if (callback) callback?.();
        return "" as any;
      }) as any);
      mockServer.close.mockImplementation((callback) => {
        if (callback) callback();
        return "" as any;
      });

      const result = await portAndHostAllocator.getHostAndAvailablePort(
        env,
        undefined
      );

      expect(result).toEqual({
        host: "localhost",
        port: "8000",
      });
    });

    it("should handle empty environment object", async () => {
      mockServer.listen.mockImplementation(((_: any, callback: any) => {
        if (callback) callback?.();
        return "" as any;
      }) as any);
      mockServer.close.mockImplementation((callback) => {
        if (callback) callback();
        return "" as any;
      });

      const result = await portAndHostAllocator.getHostAndAvailablePort({});

      expect(result).toEqual({
        host: "localhost",
        port: "8000",
      });
    });
  });

  describe("logWarnings()", () => {
    it("should log prev warnings", () => {
      (portAndHostAllocator as any).prevWarnings = [
        "port in use 1",
        "port in use 2",
      ];

      portAndHostAllocator.logWarnings();

      expect(sheu.warn).toHaveBeenCalledTimes(2);
    });
  });
});
