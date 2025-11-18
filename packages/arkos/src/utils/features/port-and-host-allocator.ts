import { ArkosConfig } from "../../exports";
import * as net from "net";
import sheu from "../sheu";
import os from "os";

class PortAndHostAllocator {
  host: string | undefined;
  private networkHost: string | undefined;
  port: string | undefined;
  private prevWarnings = new Set<string>();

  getFirstNonLocalIp() {
    const networkInterfaces = os.networkInterfaces();
    let localIpAddress;
    if (this.networkHost) return this.networkHost;

    for (const interfaceName in networkInterfaces) {
      const netInterface = networkInterfaces[interfaceName];
      if (!netInterface) break;
      for (const alias of netInterface) {
        if (alias.family === "IPv4" && !alias.internal) {
          localIpAddress = alias.address;
          break;
        }
      }
      if (localIpAddress) break;
    }

    this.networkHost = localIpAddress;
    return localIpAddress;
  }

  /**
   * Helps in correcting getting the right host and port to be used according to cli params, arkos config, env and default host and port.
   *
   * Is worth mentioning that this will be preserved along the application until it restarts.
   *
   * @param config {ArkosConfig} - your application configuraiton
   * @param env {Record<string,any>} - current env, may pass process.env
   */
  getCorrectHostAndPortToUse(
    env: Record<string, any>,
    config?: ArkosConfig
  ): { port: string; host: string } {
    const host =
      env?.CLI_HOST ||
      config?.host ||
      env?.HOST ||
      (env.ARKOS_BUILD !== "true" ? "0.0.0.0" : "127.0.0.1");
    const port = env?.CLI_PORT || config?.port || env?.PORT || "8000";

    return { host: String(host), port: String(port) };
  }

  /**
   * Finds an available port starting from the configured port and incrementing until one is found
   *
   * @param env {Record<string,any>} - current env, may pass process.env
   * @param config {ArkosConfig} - your application configuration
   * @returns Promise<{port: string; host: string}> - available port and host
   */
  async getHostAndAvailablePort(
    env: Record<string, any>,
    config?: ArkosConfig & { logWarning?: boolean; caller?: string }
  ): Promise<{ port: string; host: string }> {
    if (this.port && this.host) {
      if (config?.logWarning && this.prevWarnings.size > 0) {
        console.info("");
        Array.from(this.prevWarnings).forEach((msg) => sheu.warn(msg));
      }
      return { port: this.port, host: this.host };
    }

    const { host, port: initialPort } = this.getCorrectHostAndPortToUse(
      env,
      config
    );
    let currentPort = parseInt(initialPort, 10);

    while (true) {
      const isAvailable = await this.isPortAvailable(host, currentPort);

      if (isAvailable) {
        this.port = currentPort.toString();
        this.host = host;
        return { host, port: currentPort.toString() };
      }

      const msg = `Port ${currentPort} is in use, trying port ${currentPort + 1} instead...`;
      this.prevWarnings.add(msg);

      if (config?.logWarning) sheu.warn(`${msg}`);

      currentPort++;
    }
  }

  /**
   * Checks if a port is available on the given host
   *
   * @param host {string} - host to check
   * @param port {number} - port to check
   * @returns Promise<boolean> - true if port is available, false otherwise
   */
  private async isPortAvailable(host: string, port: number): Promise<boolean> {
    return new Promise((resolve) => {
      const actualHost = !["localhost", "127.0.0.1", "0.0.0.0"].includes(host)
        ? host
        : "localhost";
      const socket = net.createConnection({
        host: actualHost,
        port,
        timeout: 100,
      });

      socket.on("connect", () => {
        socket.destroy();
        resolve(false);
      });

      socket.on("error", () => {
        resolve(true);
      });

      socket.on("timeout", () => {
        socket.destroy();
        resolve(true);
      });
    });
  }

  logWarnings() {
    console.info("");
    Array.from(this.prevWarnings).forEach((msg) => sheu.warn(msg));
  }
}

const portAndHostAllocator = new PortAndHostAllocator();

export default portAndHostAllocator;
