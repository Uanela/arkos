import * as net from "net";
import { ArkosConfig } from "../../../exports";
import portAndHostAllocator from "../../features/port-and-host-allocator";
import sheu from "../../sheu";

// Mock dependencies
jest.mock("../../sheu", () => ({
  warn: jest.fn(),
}));

jest.mock("net", () => ({
  createConnection: jest.fn(),
}));

describe("PortAndHostAllocator", () => {
  let mockSocket: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockSocket = {
      on: jest.fn(),
      destroy: jest.fn(),
    };

    (net.createConnection as jest.Mock).mockImplementation(() => mockSocket);

    (portAndHostAllocator as any).host = undefined;
    (portAndHostAllocator as any).port = undefined;
    (portAndHostAllocator as any).prevWarnings = new Set();

    jest.spyOn(console, "info").mockImplementation(jest.fn());
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
        host: "0.0.0.0",
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
    it("should return true when port is available (error event)", async () => {
      // Mock socket event handlers - simulate connection error (port available)
      mockSocket.on.mockImplementation((event: string, callback: Function) => {
        if (event === "error") {
          setTimeout(() => callback(new Error("Connection refused")), 0);
        }
      });

      const result = await (portAndHostAllocator as any).isPortAvailable(
        "localhost",
        8000
      );

      expect(result).toBe(true);
      expect(net.createConnection).toHaveBeenCalledWith({
        host: "localhost",
        port: 8000,
        timeout: 100,
      });
      expect(mockSocket.on).toHaveBeenCalledWith(
        "connect",
        expect.any(Function)
      );
      expect(mockSocket.on).toHaveBeenCalledWith("error", expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith(
        "timeout",
        expect.any(Function)
      );
    });

    it("should return false when port is in use (connect event)", async () => {
      // Mock socket event handlers - simulate successful connection (port in use)
      mockSocket.on.mockImplementation((event: string, callback: Function) => {
        if (event === "connect") {
          setTimeout(() => callback(), 0);
        }
      });

      const result = await (portAndHostAllocator as any).isPortAvailable(
        "localhost",
        8000
      );

      expect(result).toBe(false);
      expect(net.createConnection).toHaveBeenCalledWith({
        host: "localhost",
        port: 8000,
        timeout: 100,
      });
      expect(mockSocket.destroy).toHaveBeenCalled();
    });

    it("should return true when port times out (timeout event)", async () => {
      // Mock socket event handlers - simulate timeout (port available)
      mockSocket.on.mockImplementation((event: string, callback: Function) => {
        if (event === "timeout") {
          setTimeout(() => callback(), 0);
        }
      });

      const result = await (portAndHostAllocator as any).isPortAvailable(
        "localhost",
        8000
      );

      expect(result).toBe(true);
      expect(net.createConnection).toHaveBeenCalledWith({
        host: "localhost",
        port: 8000,
        timeout: 100,
      });
      expect(mockSocket.destroy).toHaveBeenCalled();
    });

    it("should use custom host when not localhost or 127.0.0.1", async () => {
      mockSocket.on.mockImplementation((event: string, callback: Function) => {
        if (event === "error") {
          setTimeout(() => callback(new Error("Connection refused")), 0);
        }
      });

      const result = await (portAndHostAllocator as any).isPortAvailable(
        "example.com",
        8000
      );

      expect(result).toBe(true);
      expect(net.createConnection).toHaveBeenCalledWith({
        host: "example.com",
        port: 8000,
        timeout: 100,
      });
    });

    it("should convert 127.0.0.1 to localhost", async () => {
      mockSocket.on.mockImplementation((event: string, callback: Function) => {
        if (event === "error") {
          setTimeout(() => callback(new Error("Connection refused")), 0);
        }
      });

      const result = await (portAndHostAllocator as any).isPortAvailable(
        "127.0.0.1",
        3000
      );

      expect(result).toBe(true);
      expect(net.createConnection).toHaveBeenCalledWith({
        host: "localhost",
        port: 3000,
        timeout: 100,
      });
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
      expect(net.createConnection).not.toHaveBeenCalled();
      expect(sheu.warn).toHaveBeenCalledWith("port in use 1");
    });

    it("should find the first available port", async () => {
      const env = { PORT: "3000" };

      mockSocket.on.mockImplementation((event: string, callback: Function) => {
        if (event === "error") {
          setTimeout(() => callback(new Error("Connection refused")), 0);
        }
      });

      const result = await portAndHostAllocator.getHostAndAvailablePort(env);

      expect(result).toEqual({
        host: "0.0.0.0",
        port: "3000",
      });
      expect(net.createConnection).toHaveBeenCalledWith({
        host: "localhost",
        port: 3000,
        timeout: 100,
      });
    });

    it("should increment port until available port is found", async () => {
      const env = { PORT: "4000" };
      let callCount = 0;

      // Mock first two ports as unavailable (connect event), third as available (error event)
      mockSocket.on.mockImplementation((event: string, callback: Function) => {
        if (event === "connect" && callCount < 4) {
          setTimeout(() => callback(), 0);
        } else if (event === "error" && callCount >= 4) {
          setTimeout(() => callback(new Error("Connection refused")), 0);
        }
        callCount++;
      });

      const result = await portAndHostAllocator.getHostAndAvailablePort(env, {
        logWarning: true,
      });

      expect(result).toEqual({
        host: "0.0.0.0",
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

      // Mock port as available
      mockSocket.on.mockImplementation((event: string, callback: Function) => {
        if (event === "error") {
          setTimeout(() => callback(new Error("Connection refused")), 0);
        }
      });

      const result = await portAndHostAllocator.getHostAndAvailablePort(
        env,
        config
      );

      expect(result).toEqual({
        host: "0.0.0.0",
        port: "5000",
      });
      expect(net.createConnection).toHaveBeenCalledWith({
        host: "localhost",
        port: 5000,
        timeout: 100,
      });
    });

    it("should handle string ports correctly", async () => {
      const env = { PORT: "8080" };

      // Mock port as available
      mockSocket.on.mockImplementation((event: string, callback: Function) => {
        if (event === "error") {
          setTimeout(() => callback(new Error("Connection refused")), 0);
        }
      });

      const result = await portAndHostAllocator.getHostAndAvailablePort(env);

      expect(result).toEqual({
        host: "0.0.0.0",
        port: "8080",
      });
      expect(net.createConnection).toHaveBeenCalledWith({
        host: "localhost",
        port: 8080,
        timeout: 100,
      });
    });

    it("should cache the found port and host for subsequent calls", async () => {
      const env = { PORT: "6000", HOST: "127.0.0.1", ARKOS_BUILD: "true" };

      mockSocket.on.mockImplementation((event: string, callback: Function) => {
        if (event === "error") {
          setTimeout(() => callback(new Error("Connection refused")), 0);
        }
      });

      const result1 = await portAndHostAllocator.getHostAndAvailablePort(env);
      expect(result1).toEqual({ host: "127.0.0.1", port: "6000" });

      const result2 = await portAndHostAllocator.getHostAndAvailablePort(env);
      expect(result2).toEqual({ host: "127.0.0.1", port: "6000" });

      expect(net.createConnection).toHaveBeenCalledTimes(1);
    });
  });

  describe("singleton behavior", () => {
    it("should maintain state across multiple method calls", async () => {
      const env = { PORT: "7000" };

      // Mock port as available
      mockSocket.on.mockImplementation((event: string, callback: Function) => {
        if (event === "error") {
          setTimeout(() => callback(new Error("Connection refused")), 0);
        }
      });

      const result1 = await portAndHostAllocator.getHostAndAvailablePort(env);
      expect(result1).toEqual({ host: "0.0.0.0", port: "7000" });

      // Second call should use cached values
      const result2 = await portAndHostAllocator.getHostAndAvailablePort({});
      expect(result2).toEqual({ host: "0.0.0.0", port: "7000" });
    });
  });

  describe("edge cases", () => {
    it("should handle undefined config gracefully", async () => {
      const env = {};

      // Mock port as available
      mockSocket.on.mockImplementation((event: string, callback: Function) => {
        if (event === "error") {
          setTimeout(() => callback(new Error("Connection refused")), 0);
        }
      });

      const result = await portAndHostAllocator.getHostAndAvailablePort(
        env,
        undefined
      );

      expect(result).toEqual({
        host: "0.0.0.0",
        port: "8000",
      });
    });

    it("should handle empty environment object before build", async () => {
      // Mock port as available
      mockSocket.on.mockImplementation((event: string, callback: Function) => {
        if (event === "error") {
          setTimeout(() => callback(new Error("Connection refused")), 0);
        }
      });

      const result = await portAndHostAllocator.getHostAndAvailablePort({});

      expect(result).toEqual({
        host: "0.0.0.0",
        port: "8000",
      });
    });

    it("should handle empty environment object after build", async () => {
      // Mock port as available
      mockSocket.on.mockImplementation((event: string, callback: Function) => {
        if (event === "error") {
          setTimeout(() => callback(new Error("Connection refused")), 0);
        }
      });

      const result = await portAndHostAllocator.getHostAndAvailablePort({
        ARKOS_BUILD: "true",
      });

      expect(result).toEqual({
        host: "127.0.0.1",
        port: "8000",
      });
    });
  });

  describe("logWarnings()", () => {
    it("should log prev warnings", () => {
      (portAndHostAllocator as any).prevWarnings = new Set([
        "port in use 1",
        "port in use 2",
      ]);

      portAndHostAllocator.logWarnings();

      expect(sheu.warn).toHaveBeenCalledTimes(2);
      expect(sheu.warn).toHaveBeenCalledWith("port in use 1");
      expect(sheu.warn).toHaveBeenCalledWith("port in use 2");
    });
  });
});
