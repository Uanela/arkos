import { uuidv7 } from "uuidv7";
import {
  ArkosEmitOptions,
  ArkosGatewayConfig,
  ArkosGatewayStore,
  ArkosSocket,
} from "../types";
import { Server } from "socket.io";

export class GatewayUserBuilder {
  constructor(
    private userId: string,
    private ns: ReturnType<Server["of"]>
  ) {}

  /**
   * Returns whether the user has at least one active socket connection.
   *
   * @example
   * if (await gateway.user(userId).isOnline()) {
   *   // user is connected
   * }
   */
  async isOnline(): Promise<boolean> {
    const sockets = await this.ns
      .in(`arkos::user:${this.userId}`)
      .fetchSockets();
    return sockets.length > 0;
  }
  /**
   * Returns the number of active socket connections for this user.
   * A user can have multiple connections (e.g. multiple tabs/devices).
   *
   * @example
   * const count = await gateway.user(userId).socketCount()
   */
  async socketCount() {
    const sockets = await this.ns
      .in(`arkos::user:${this.userId}`)
      .fetchSockets();
    return sockets.length;
  }

  /**
   * Returns all active socket IDs for this user.
   *
   * @example
   * const socketIds = gateway.user(userId).socketIds()
   */
  async socketIds() {
    const sockets = await this.ns
      .in(`arkos::user:${this.userId}`)
      .fetchSockets();
    return sockets.map((s) => s.id);
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
    protected gatewayConfig: ArkosGatewayConfig,
    protected store: ArkosGatewayStore
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

  async checkAndMarkDuplicate(
    eventType: string,
    messageId: string,
    options: ArkosEmitOptions["dedup"] & { store: ArkosGatewayStore }
  ): Promise<boolean> {
    if (options?.enabled !== true) return false;

    const key = `arkos::dedup:${eventType}:${messageId}`;
    const ttl = options.ttl ?? 3600;

    if (await options.store.has(key)) return true;
    await options.store.set(key, ttl);
    return false;
  }

  async resolveEmitDedup(
    event: string,
    options: ArkosEmitOptions,
    gatewayConfig: ArkosGatewayConfig
  ): Promise<{ isDuplicate: boolean; messageId: string }> {
    const messageId = uuidv7();

    const isDuplicate = await this.checkAndMarkDuplicate(event, messageId, {
      enabled: options.dedup?.enabled ?? gatewayConfig.dedup?.enabled,
      ttl: options.dedup?.ttl ?? gatewayConfig.dedup?.ttl,
      store: this.store,
    });

    return { isDuplicate, messageId };
  }
}

export class GatewayUserEmitBuilder extends GatewayEmitBuilder {
  constructor(
    private userId: string,
    private ns: ReturnType<Server["of"]>,
    gatewayConfig: ArkosGatewayConfig,
    protected store: ArkosGatewayStore
  ) {
    // target is a no-op here, we handle emit ourselves
    super({ emit: () => {} }, gatewayConfig, store);
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
    const sockets = await this.ns
      .in(`arkos::user:${this.userId}`)
      .fetchSockets();

    if (!sockets.length) return { success: false, reason: "offline" };

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
        sockets.map(
          (socket) =>
            new Promise<boolean>((resolve) => {
              socket.timeout(timeout).emit(event, dataWithId, (err: any) => {
                resolve(!err);
              });
            })
        )
      );
      return results.some((r) => r.status === "fulfilled" && r.value === true);
    };

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      if (await attemptEmit()) return { success: true };
      if (attempt < maxRetries) {
        const delay = Math.min(Math.pow(2, attempt) * 1000, 5000);
        await new Promise((r) => setTimeout(r, delay));
      }
    }

    return { success: false, reason: "timeout" };
  }
}

export class GatewaySocketEmitBuilder extends GatewayEmitBuilder {
  constructor(
    private socket: ArkosSocket,
    gatewayConfig: ArkosGatewayConfig,
    protected store: ArkosGatewayStore
  ) {
    // target is a no-op here, we handle emit ourselves
    super({ emit: () => {} }, gatewayConfig, store);
  }

  async emit<TData = any>(
    event: string,
    data: TData,
    options: ArkosEmitOptions = {}
  ): Promise<{ success: boolean; reason?: string }> {
    const { isDuplicate, messageId } = await this.resolveEmitDedup(
      event,
      options,
      this.gatewayConfig
    );

    if (isDuplicate) return { success: true };

    const timeout = options.timeout ?? 5000;
    const maxRetries = options.retries ?? 0;

    const attemptEmit = () =>
      new Promise<boolean>((resolve) => {
        this.socket
          .timeout(timeout)
          .emit(event, { ...data, _mid: messageId }, (err: any) => {
            resolve(!err);
          });
      });

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      if (await attemptEmit()) return { success: true };
      if (attempt < maxRetries) {
        const delay = Math.min(Math.pow(2, attempt) * 1000, 5000);
        await new Promise((r) => setTimeout(r, delay));
      }
    }

    return { success: false, reason: "timeout" };
  }
}
