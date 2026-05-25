import { uuidv7 } from "uuidv7";
import { ArkosEmitOptions, ArkosGatewayConfig } from "../types";
import gatewayDedupManager from "./gateway-dedup-manager";
import { Server } from "socket.io";

export class GatewayUserBuilder {
  constructor(
    private userId: string,
    private userSockets: Map<string, Set<string>>
  ) {}

  /**
   * Returns whether the user has at least one active socket connection.
   *
   * @example
   * if (gateway.user(userId).isOnline()) {
   *   // user is connected
   * }
   */
  isOnline(): boolean {
    return (this.userSockets.get(this.userId)?.size ?? 0) > 0;
  }

  /**
   * Returns the number of active socket connections for this user.
   * A user can have multiple connections (e.g. multiple tabs/devices).
   *
   * @example
   * const count = gateway.user(userId).socketCount()
   */
  socketCount(): number {
    return this.userSockets.get(this.userId)?.size ?? 0;
  }

  /**
   * Returns all active socket IDs for this user.
   *
   * @example
   * const socketIds = gateway.user(userId).socketIds()
   */
  socketIds(): string[] {
    return [...(this.userSockets.get(this.userId) ?? [])];
  }
}

export class GatewayRoomBuilder {
  constructor(
    private roomId: string,
    private ns: ReturnType<Server["of"]>
  ) {}

  /**
   * Returns the number of sockets currently in this room.
   *
   * @example
   * const count = await gateway.room("room-123").size()
   */
  async size(): Promise<number> {
    const sockets = await this.ns.in(this.roomId).fetchSockets();
    return sockets.length;
  }

  /**
   * Returns all socket IDs currently in this room.
   *
   * @example
   * const socketIds = await gateway.room("room-123").sockets()
   */
  async sockets(): Promise<string[]> {
    const sockets = await this.ns.in(this.roomId).fetchSockets();
    return sockets.map((s) => s.id);
  }

  /**
   * Returns whether the room has no active sockets.
   *
   * @example
   * if (await gateway.room("room-123").isEmpty()) {
   *   // clean up room
   * }
   */
  async isEmpty(): Promise<boolean> {
    return (await this.size()) === 0;
  }
}



export class GatewayEmitBuilder {
  constructor(
    protected target: { emit: (event: string, ...args: any[]) => any },
    protected gatewayConfig: ArkosGatewayConfig
  ) {}

  /**
   * Emits an event to the target (room or all sockets in namespace).
   * Supports deduplication via gateway or per-call config.
   *
   * @example
   * await gateway.toRoom("room-123").emit("update", data)
   * await gateway.toAll().emit("announcement", data, {
   *   dedup: { enabled: true, ttl: 60 }
   * })
   */
  async emit<TData = any>(
    event: string,
    data: TData,
    options: ArkosEmitOptions = {}
  ): Promise<void | any> {
    const { isDuplicate, messageId } = await this.resolveEmitDedup(
      event,
      options,
      this.gatewayConfig
    );

    if (isDuplicate) return;

    this.target.emit(event, { ...data, _mid: messageId });
  }

  async resolveEmitDedup(
    event: string,
    options: ArkosEmitOptions,
    gatewayConfig: ArkosGatewayConfig
  ): Promise<{ isDuplicate: boolean; messageId: string }> {
    const messageId = uuidv7();

    const isDuplicate = await gatewayDedupManager.checkAndMarkDuplicate(
      event,
      messageId,
      {
        enabled: options.dedup?.enabled ?? gatewayConfig.dedup?.enabled,
        ttl: options.dedup?.ttl ?? gatewayConfig.dedup?.ttl,
        gatewayConfig,
      }
    );

    return { isDuplicate, messageId };
  }
}

export class GatewayUserEmitBuilder extends GatewayEmitBuilder {
  constructor(
    private userId: string,
    private userSockets: Map<string, Set<string>>,
    private io: Server,
    gatewayConfig: ArkosGatewayConfig
  ) {
    // target is a no-op here, we handle emit ourselves
    super({ emit: () => {} }, gatewayConfig);
  }

  /**
   * Emits an event to all active socket connections of a specific user.
   * Supports deduplication, timeout, and exponential backoff retries.
   *
   * Returns `{ success: false, reason: "offline" }` if the user has no
   * active connections, and `{ success: false, reason: "timeout" }` if
   * all retry attempts are exhausted.
   *
   * @example
   * await gateway.toUser(userId).emit("notification", data)
   * await gateway.toUser(userId).emit("order_update", data, {
   *   timeout: 5000,
   *   retries: 3,
   *   dedup: { enabled: true, ttl: 60 }
   * })
   */
  async emit<TData = any>(
    event: string,
    data: TData,
    options: ArkosEmitOptions = {}
  ): Promise<{ success: boolean; reason?: string }> {
    const socketIds = this.userSockets.get(this.userId);

    if (!socketIds?.size) {
      return { success: false, reason: "offline" };
    }

    const { isDuplicate, messageId } = await this.resolveEmitDedup(
      event,
      options,
      this.gatewayConfig
    );

    if (isDuplicate) return { success: true };

    const dataWithId = { ...data, _mid: messageId };
    const timeout = options.timeout ?? 5000;
    const maxRetries = options.retries ?? 0;

    const attemptEmit = async (): Promise<boolean> => {
      const results = await Promise.allSettled(
        [...socketIds].map((socketId) => {
          const socket = this.io.sockets.sockets.get(socketId);
          if (!socket) return Promise.resolve(false);

          return new Promise<boolean>((resolve) => {
            socket.timeout(timeout).emit(event, dataWithId, (err: any) => {
              resolve(!err);
            });
          });
        })
      );

      return results.some((r) => r.status === "fulfilled" && r.value === true);
    };

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      const success = await attemptEmit();
      if (success) return { success: true };

      if (attempt < maxRetries) {
        const delay = Math.min(Math.pow(2, attempt) * 1000, 5000);
        await new Promise((r) => setTimeout(r, delay));
      }
    }

    return { success: false, reason: "timeout" };
  }
}
