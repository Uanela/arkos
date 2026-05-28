import { Manager } from "socket.io-client";
import { GatewayClient } from "./gateway-client";
import { ClientDedupStore } from "./utils/dedup-store";

/**
 * WebsocketClient manages socket connections per namespace.
 * Lazily connects to a namespace on first `gateway()` call.
 * Reuses the same GatewayClient instance on subsequent calls.
 *
 * @example
 * const manager = new Manager("http://localhost:3000", {
 *   auth: { token },
 *   reconnection: true,
 * })
 *
 * const client = createWebsocketClient(manager)
 *
 * const chat = client.gateway("/chat")
 * const orders = client.gateway("/orders")
 */
export class WebsocketClient {
  private gateways = new Map<string, GatewayClient>();

  constructor(private manager: Manager) {}

  /**
   * Get (or lazily create) a GatewayClient for the given namespace.
   * Passing the same namespace twice returns the same instance.
   * Uses the Manager to create the socket — no new TCP connection,
   * just a new channel over the existing one.
   *
   * @example
   * const chat = client.gateway("/chat")
   * const orders = client.gateway("/orders")
   */
  gateway(namespace: string): GatewayClient {
    if (this.gateways.has(namespace)) {
      return this.gateways.get(namespace)!;
    }

    const socket = this.manager.socket(namespace);
    const dedup = new ClientDedupStore();
    const gatewayClient = new GatewayClient(socket, dedup);

    this.gateways.set(namespace, gatewayClient);
    return gatewayClient;
  }

  /**
   * Disconnect and destroy all namespace connections,
   * then close the underlying Manager (TCP connection).
   */
  destroy(): void {
    for (const gateway of this.gateways.values()) {
      gateway.rawSocket.disconnect();
      gateway.destroy();
    }
    this.gateways.clear();
  }
}

/**
 * Creates a new WebsocketClient instance from a socket.io Manager.
 * The Manager owns the connection config (url, auth, reconnection, etc).
 * Arkos owns the namespace lifecycle on top of it.
 *
 * @example
 * const client = createWebsocketClient(
 *   new Manager("http://localhost:3000", {
 *     auth: { token },
 *     reconnection: true,
 *   })
 * )
 *
 * const chat = client.gateway("/chat")
 */
export function createWebsocketClient(manager: Manager): WebsocketClient {
  return new WebsocketClient(manager);
}
