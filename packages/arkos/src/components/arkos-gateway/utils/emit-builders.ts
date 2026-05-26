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

  private cachedSockets: Awaited<
    ReturnType<ReturnType<Server["of"]>["fetchSockets"]>
  > | null = null;

  private async fetchSockets() {
    if (!this.cachedSockets) {
      this.cachedSockets = await this.ns
        .in(`arkos::user:${this.userId}`)
        .fetchSockets();
    }
    return this.cachedSockets;
  }

  /**
   * Returns whether the user has at least one active socket connection.
   *
   * @example
   * if (await gateway.user(userId).isOnline()) {
   *   // user is connected
   * }
   */
  async isOnline(): Promise<boolean> {
    return (await this.fetchSockets()).length > 0;
  }

  /**
   * Returns the number of active socket connections for this user.
   * A user can have multiple connections (e.g. multiple tabs/devices).
   *
   * @example
   * const count = await gateway.user(userId).socketCount()
   */
  async socketCount(): Promise<number> {
    return (await this.fetchSockets()).length;
  }

  /**
   * Returns all active socket IDs for this user.
   *
   * @example
   * const socketIds = await gateway.user(userId).socketIds()
   */
  async socketIds(): Promise<string[]> {
    return (await this.fetchSockets()).map((s) => s.id);
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

export class GatewayEmitBuilder<
  T extends
    | ReturnType<ReturnType<Server["of"]>["to"]>
    | ReturnType<Server["of"]>
    | ArkosSocket = ReturnType<ReturnType<Server["of"]>["to"]>,
> {
  constructor(
    protected target: T,
    protected gatewayConfig: ArkosGatewayConfig,
    protected store: ArkosGatewayStore,
    protected room?: string
  ) {}

  /**
   * Returns the raw Socket.IO namespace target, allowing full access to
   * native Socket.IO chaining (e.g. `volatile`, `compress`, `to`, `except`).
   *
   * Use this as an escape hatch when the builder's `emit` options are not
   * sufficient for your use case.
   *
   * @example
   * const target = gateway.toRoom("room-123").resolve()
   * target.volatile.emit("cursor", data)
   * target.compress(false).emit("ping", data)
   */
  resolve(): T | ArkosSocket {
    return this.target;
  }

  /**
   * Emits an event to the target (room or all sockets in namespace).
   *
   * @example
   * await gateway.toRoom("room-123").emit("update", data)
   * await gateway.toAll().emit("announcement", data)
   * await gateway.toRoom("room-123").emit("update", data, { volatile: true })
   * await gateway.toRoom("room-123").emit("update", data, { compress: false })
   */
  async emit<TData = any>(
    event: string,
    data: TData,
    options: ArkosEmitOptions = {}
  ): Promise<any> {
    let target = this.target;
    if (options.volatile) target = target.volatile as any;
    target.compress(options.compress ?? true).emit(event, { ...data });
  }
}

export class GatewayUserEmitBuilder extends GatewayEmitBuilder {
  constructor(
    private userId: string,
    private ns: ReturnType<Server["of"]>,
    gatewayConfig: ArkosGatewayConfig,
    store: ArkosGatewayStore
  ) {
    super(ns.in(`arkos::user:${userId}`), gatewayConfig, store);
  }

  /**
   * Returns the raw Socket.IO room target for this user, allowing full access
   * to native Socket.IO chaining (e.g. `volatile`, `compress`, `except`).
   *
   * Note: this does not check whether the user is online. Use
   * `gateway.user(userId).isOnline()` first if needed.
   *
   * @example
   * const target = gateway.toUser(userId).resolve()
   * target.volatile.emit("cursor", data)
   */
  resolve(): ReturnType<ReturnType<Server["of"]>["in"]> {
    return this.ns.in(`arkos::user:${this.userId}`);
  }

  /**
   * Emits an event to all active socket connections of a specific user.
   *
   * Returns `{ success: false, reason: "offline" }` if the user has no
   * active connections, and `{ success: false, reason: "timeout" }` if
   * all retry attempts are exhausted.
   *
   * When `ack: true`, waits for the client to acknowledge the event and
   * returns the ack payload in `result.data`. Uses `emitWithAck` under
   * the hood — throws internally on timeout and retries accordingly.
   *
   * @example
   * await gateway.toUser(userId).emit("notification", data)
   *
   * await gateway.toUser(userId).emit("order:update", data, {
   *   timeout: 5000,
   *   retries: 3,
   * })
   *
   * const result = await gateway.toUser(userId).emit("order:confirm", data, {
   *   ack: true,
   *   timeout: 8000,
   * })
   * if (result.success) console.log(result.data)
   */
  async emit<TData = any, TAck = any>(
    event: string,
    data: TData,
    options: ArkosEmitOptions = {}
  ): Promise<{ success: boolean; reason?: string; data?: TAck }> {
    const sockets = [...this.ns.sockets.values()].filter((s) =>
      s.rooms.has(`arkos::user:${this.userId}`)
    );
    if (!sockets.length) return { success: false, reason: "offline" };

    const timeout = options.timeout ?? 5000;
    const maxRetries = options.retries ?? 0;
    const dataWithMeta = {
      ...data,
      _meta: { mid: uuidv7(), timestamp: Date.now() },
    };

    const attemptEmit = async (): Promise<{
      success: boolean;
      data?: TAck;
    }> => {
      if (options.ack) {
        const results = await Promise.allSettled(
          sockets.map((socket) => {
            const s = options.volatile
              ? socket.volatile.timeout(timeout)
              : socket.timeout(timeout);
            return s
              .compress(options.compress ?? true)
              .emitWithAck(event, dataWithMeta) as Promise<TAck>;
          })
        );
        const first = results.find((r) => r.status === "fulfilled");
        if (first && first.status === "fulfilled")
          return { success: true, data: first.value };
        return { success: false };
      } else {
        const results = await Promise.allSettled(
          sockets.map(
            (socket) =>
              new Promise<boolean>((resolve) => {
                const s = options.volatile
                  ? socket.volatile.timeout(timeout)
                  : socket.timeout(timeout);
                s.compress(options.compress ?? true).emit(
                  event,
                  dataWithMeta,
                  (err: any) => resolve(!err)
                );
              })
          )
        );
        const ok = results.some(
          (r) => r.status === "fulfilled" && r.value === true
        );
        return { success: ok };
      }
    };

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      const result = await attemptEmit();
      if (result.success) return result;
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
    store: ArkosGatewayStore
  ) {
    // no-op
    super({ emit: () => {} } as any, gatewayConfig, store);
  }

  /**
   * Returns the raw `ArkosSocket` instance, allowing full access to native
   * Socket.IO methods (e.g. `volatile`, `compress`, `emitWithAck`, `join`).
   *
   * @example
   * const socket = gateway.toSocket(socket).resolve()
   * socket.volatile.emit("ping", data)
   * const ack = await socket.timeout(3000).emitWithAck("handshake", data)
   */
  override resolve() {
    return this.socket;
  }

  /**
   * Emits an event to a specific socket connection.
   *
   * Returns `{ success: false, reason: "timeout" }` if all retry attempts
   * are exhausted without an acknowledgement.
   *
   * When `ack: true`, waits for the client to acknowledge and returns the
   * ack payload in `result.data`.
   *
   * @example
   * await gateway.toSocket(socket).emit("notification", data)
   *
   * const result = await gateway.toSocket(socket).emit("confirm", data, {
   *   ack: true,
   *   timeout: 4000,
   *   retries: 2,
   * })
   */
  async emit<TData = any, TAck = any>(
    event: string,
    data: TData,
    options: ArkosEmitOptions = {}
  ): Promise<{ success: boolean; reason?: string; data?: TAck }> {
    const timeout = options.timeout ?? 5000;
    const maxRetries = options.retries ?? 0;
    const dataWithMeta = {
      ...data,
      _meta: { mid: uuidv7(), timestamp: Date.now() },
    };

    const attemptEmit = async (): Promise<{
      success: boolean;
      data?: TAck;
    }> => {
      const s = options.volatile
        ? this.socket.volatile.timeout(timeout)
        : this.socket.timeout(timeout);
      const sc = s.compress(options.compress ?? true);

      if (options.ack) {
        try {
          const response = (await sc.emitWithAck(event, dataWithMeta)) as TAck;
          return { success: true, data: response };
        } catch {
          return { success: false };
        }
      } else {
        return new Promise<{ success: boolean }>((resolve) => {
          sc.emit(event, dataWithMeta, (err: any) =>
            resolve({ success: !err })
          );
        });
      }
    };

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      const result = await attemptEmit();
      if (result.success) return result;
      if (attempt < maxRetries) {
        const delay = Math.min(Math.pow(2, attempt) * 1000, 5000);
        await new Promise((r) => setTimeout(r, delay));
      }
    }

    return { success: false, reason: "timeout" };
  }
}
