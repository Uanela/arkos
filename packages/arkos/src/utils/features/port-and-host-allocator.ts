import { ArkosConfig } from "../../exports";
import * as net from "net";
import sheu from "../sheu";

class PortAndHostAllocator {
  private host: string | undefined;
  private port: string | undefined;
  private prevWarnings = new Set<string>();

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
    const host = env?.CLI_HOST || config?.host || env?.HOST || "localhost";
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

      if (config?.logWarning) {
        console.info("");
        sheu.warn(`${msg}`);
      }

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
      const server = net.createServer();
      const hostAndPort = [
        port,
        !["localhost", "127.0.0.1"].includes(host) ? host : undefined,
      ].filter((val) => !!val) as any;

      server.listen(...hostAndPort, () => {
        server.close(() => {
          resolve(true);
        });
      });

      server.on("error", () => {
        resolve(false);
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
