import { uuidv7 } from "uuidv7";
import {
  ArkosEmitOptions,
  ArkosGatewayConfig,
  ArkosGatewayStore,
  ArkosSocket,
} from "../types";
import { Server } from "socket.io";

export type ExceptTarget =
  | { socket: string }
  | { room: string }
  | { user: string };

export type HasTarget =
  | { socket: string }
  | { room: string }
  | { user: string };

function getUserIdFromSocket(
  socket: Awaited<ReturnType<ReturnType<Server["of"]>["fetchSockets"]>>[number]
): string | null {
  for (const room of socket.rooms) {
    if (room.startsWith("arkos::user:"))
      return room.slice("arkos::user:".length);
  }
  return null;
}

export class BaseEmitBuilder {
  constructor(
    protected gatewayConfig: ArkosGatewayConfig,
    protected store: ArkosGatewayStore
  ) {}

  guardMeta(event: string, data: any) {
    if ("_meta" in (data || {}))
      throw new Error(
        `Cannot emit event "${event}" with a pre-existing _meta field. ` +
          `ArkosGateway manages _meta automatically. ` +
          `Remove the _meta property from your payload.`
      );
  }

  withMeta<T>(data: T): T & { _meta: { mid: string; timestamp: number } } {
    return {
      ...(data as any),
      _meta: { mid: uuidv7(), timestamp: Date.now() },
    };
  }

  async attemptSocketEmit<TData, TAck>(
    socket: ArkosSocket,
    event: string,
    data: TData,
    options: ArkosEmitOptions
  ): Promise<{ success: boolean; data?: TAck; reason?: string }> {
    const timeout = options.timeout ?? 5000;
    const s = options.volatile
      ? socket.volatile.timeout(timeout)
      : socket.timeout(timeout);
    const sc = s.compress(options.compress ?? true);

    if (options.ack) {
      try {
        const response = (await sc.emitWithAck(event, data)) as TAck;
        return { success: true, data: response };
      } catch {
        return { success: false };
      }
    }

    return new Promise<{ success: boolean; reason?: string }>((resolve) => {
      sc.emit(event, data, (err: any) => resolve({ success: !err }));
    });
  }

  async withRetries<T extends { success: boolean; reason?: string }>(
    attempt: () => Promise<T>,
    maxRetries: number,
    fallback: T
  ): Promise<T> {
    for (let i = 0; i <= maxRetries; i++) {
      const result = await attempt();
      if (result.success) return result;
      if (i < maxRetries) {
        const delay = Math.min(Math.pow(2, i) * 1000, 5000);
        await new Promise((r) => setTimeout(r, delay));
      }
    }
    return fallback;
  }
}

export class GatewaySocketBuilder extends BaseEmitBuilder {
  private _resolvedSocket: ArkosSocket | null | undefined = undefined;

  constructor(
    private socketId: string,
    private ns: ReturnType<Server["of"]>,
    gatewayConfig: ArkosGatewayConfig,
    store: ArkosGatewayStore
  ) {
    super(gatewayConfig, store);
  }

  private resolveSocket(): ArkosSocket | null {
    if (this._resolvedSocket === undefined) {
      this._resolvedSocket =
        (this.ns.sockets.get(this.socketId) as ArkosSocket) ?? null;
    }
    return this._resolvedSocket;
  }

  /**
   * The socket's ID.
   */
  get id(): string {
    return this.socketId;
  }

  /**
   * The userId this socket belongs to, or null if unauthenticated.
   */
  get user(): string | null {
    const socket = this.resolveSocket();
    if (!socket) return null;
    for (const room of socket.rooms) {
      if (room.startsWith("arkos::user:"))
        return room.slice("arkos::user:".length);
    }
    return null;
  }

  /**
   * Returns whether this socket is still connected.
   *
   * @example
   * const connected = await gateway.socket(socketId).isConnected()
   */
  async isConnected(): Promise<boolean> {
    return this.resolveSocket() !== null;
  }

  /**
   * Returns all rooms this socket is currently in.
   *
   * @example
   * const rooms = await gateway.socket(socketId).rooms()
   */
  async rooms(): Promise<string[]> {
    const socket = this.resolveSocket();
    if (!socket) return [];
    return [...socket.rooms];
  }

  /**
   * Returns whether this socket is in the given room.
   *
   * @example
   * const inRoom = await gateway.socket(socketId).inRoom("room-123")
   */
  async inRoom(roomId: string): Promise<boolean> {
    const socket = this.resolveSocket();
    if (!socket) return false;
    return socket.rooms.has(roomId);
  }

  /**
   * Joins this socket to a room.
   *
   * @example
   * await gateway.socket(socketId).join("room-123")
   */
  async join(roomId: string): Promise<void> {
    const socket = this.resolveSocket();
    if (!socket) return;
    await socket.join(roomId);
  }

  /**
   * Removes this socket from a room.
   *
   * @example
   * await gateway.socket(socketId).leave("room-123")
   */
  async leave(roomId: string): Promise<void> {
    const socket = this.resolveSocket();
    if (!socket) return;
    await socket.leave(roomId);
  }

  /**
   * Disconnects this socket.
   *
   * @param close - If true, closes the underlying connection. Defaults to false.
   *
   * @example
   * gateway.socket(socketId).disconnect()
   */
  disconnect(close = false): void {
    this.resolveSocket()?.disconnect(close);
  }

  /**
   * Emits an event to this socket.
   *
   * Returns `{ success: false, reason: "not_found" }` if the socket is no
   * longer connected, and `{ success: false, reason: "timeout" }` if all
   * retry attempts are exhausted.
   *
   * @example
   * await gateway.socket(socketId).emit("notification", data)
   *
   * const result = await gateway.socket(socketId).emit("confirm", data, {
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
    const socket = this.resolveSocket();
    if (!socket) return { success: false, reason: "not_found" };

    this.guardMeta(event, data);
    const dataWithMeta = this.withMeta(data);
    const maxRetries = options.retries ?? 0;

    return this.withRetries(
      () =>
        this.attemptSocketEmit<typeof dataWithMeta, TAck>(
          socket,
          event,
          dataWithMeta,
          options
        ),
      maxRetries,
      { success: false, reason: "timeout" }
    );
  }
}

export class GatewayUserBuilder extends BaseEmitBuilder {
  constructor(
    private userId: string,
    private ns: ReturnType<Server["of"]>,
    gatewayConfig: ArkosGatewayConfig,
    store: ArkosGatewayStore
  ) {
    super(gatewayConfig, store);
  }

  private getUserSockets(): ArkosSocket[] {
    return [...this.ns.sockets.values()].filter((s) =>
      s.rooms.has(`arkos::user:${this.userId}`)
    ) as ArkosSocket[];
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
    return this.getUserSockets().length > 0;
  }

  /**
   * Returns the number of active socket connections for this user.
   *
   * @example
   * const count = await gateway.user(userId).socketCount()
   */
  async socketCount(): Promise<number> {
    return this.getUserSockets().length;
  }

  /**
   * Returns all active socket IDs for this user.
   *
   * @example
   * const ids = await gateway.user(userId).socketIds()
   */
  async socketIds(): Promise<string[]> {
    return this.getUserSockets().map((s) => s.id);
  }

  /**
   * Returns the union of all rooms across all of this user's active sockets,
   * excluding the internal arkos::user: room.
   *
   * @example
   * const rooms = await gateway.user(userId).rooms()
   */
  async rooms(): Promise<string[]> {
    const sockets = this.getUserSockets();
    const roomSet = new Set<string>();
    for (const s of sockets) {
      for (const room of s.rooms) {
        if (!room.startsWith("arkos::user:")) roomSet.add(room);
      }
    }
    return [...roomSet];
  }

  /**
   * Returns whether any of this user's sockets are in the given room.
   *
   * @example
   * const inRoom = await gateway.user(userId).inRoom("room-123")
   */
  async inRoom(roomId: string): Promise<boolean> {
    return this.getUserSockets().some((s) => s.rooms.has(roomId));
  }

  /**
   * Joins all of this user's sockets to a room.
   *
   * @example
   * await gateway.user(userId).join("room-123")
   */
  async join(roomId: string): Promise<void> {
    await Promise.all(this.getUserSockets().map((s) => s.join(roomId)));
  }

  /**
   * Removes all of this user's sockets from a room.
   *
   * @example
   * await gateway.user(userId).leave("room-123")
   */
  async leave(roomId: string): Promise<void> {
    await Promise.all(this.getUserSockets().map((s) => s.leave(roomId)));
  }

  /**
   * Disconnects all of this user's sockets.
   *
   * @param close - If true, closes the underlying connections. Defaults to false.
   *
   * @example
   * await gateway.user(userId).disconnect()
   */
  async disconnect(close = false): Promise<void> {
    this.getUserSockets().forEach((s) => s.disconnect(close));
  }

  /**
   * Returns an emit builder scoped to this user, excluding a specific socket.
   *
   * @example
   * // emit to all of this user's tabs except the one that triggered the event
   * await gateway.user(userId).except({ socket: socket.id }).emit("sync", data)
   */
  except(target: { socket: string }): GatewayUserExceptBuilder {
    return new GatewayUserExceptBuilder(
      this.userId,
      this.ns,
      target.socket,
      this.gatewayConfig,
      this.store
    );
  }

  /**
   * Emits an event to all active socket connections of this user.
   *
   * Returns `{ success: false, reason: "offline" }` if the user has no
   * active connections, and `{ success: false, reason: "timeout" }` if
   * all retry attempts are exhausted.
   *
   * When `ack: true`, any single socket acknowledging counts as success.
   *
   * @example
   * await gateway.user(userId).emit("notification", data)
   *
   * const result = await gateway.user(userId).emit("order:confirm", data, {
   *   ack: true,
   *   timeout: 8000,
   * })
   */
  async emit<TData = any, TAck = any>(
    event: string,
    data: TData,
    options: ArkosEmitOptions = {}
  ): Promise<{ success: boolean; reason?: string; data?: TAck }> {
    return emitToSockets(
      this.getUserSockets(),
      event,
      data,
      options,
      this,
      "offline"
    );
  }
}

export class GatewayUserExceptBuilder extends BaseEmitBuilder {
  constructor(
    private userId: string,
    private ns: ReturnType<Server["of"]>,
    private excludedSocketId: string,
    gatewayConfig: ArkosGatewayConfig,
    store: ArkosGatewayStore
  ) {
    super(gatewayConfig, store);
  }

  /**
   * Emits an event to all of this user's sockets except the excluded one.
   *
   * @example
   * await gateway.user(userId).except({ socket: socket.id }).emit("sync", data)
   */
  async emit<TData = any, TAck = any>(
    event: string,
    data: TData,
    options: ArkosEmitOptions = {}
  ): Promise<{ success: boolean; reason?: string; data?: TAck }> {
    const sockets = [...this.ns.sockets.values()].filter(
      (s) =>
        s.rooms.has(`arkos::user:${this.userId}`) &&
        s.id !== this.excludedSocketId
    ) as ArkosSocket[];

    return emitToSockets(sockets, event, data, options, this, "offline");
  }
}

export class GatewayRoomBuilder extends BaseEmitBuilder {
  constructor(
    private roomId: string,
    private ns: ReturnType<Server["of"]>,
    gatewayConfig: ArkosGatewayConfig,
    store: ArkosGatewayStore
  ) {
    super(gatewayConfig, store);
  }

  private async fetchSockets() {
    return this.ns.in(this.roomId).fetchSockets();
  }

  /**
   * Returns the number of sockets currently in this room.
   *
   * @example
   * const count = await gateway.room("room-123").size()
   */
  async size(): Promise<number> {
    return (await this.fetchSockets()).length;
  }

  /**
   * Returns whether this room has no active sockets.
   *
   * @example
   * if (await gateway.room("room-123").isEmpty()) { ... }
   */
  async isEmpty(): Promise<boolean> {
    return (await this.size()) === 0;
  }

  /**
   * Returns all socket IDs currently in this room.
   *
   * @example
   * const socketIds = await gateway.room("room-123").sockets()
   */
  async sockets(): Promise<string[]> {
    return (await this.fetchSockets()).map((s) => s.id);
  }

  /**
   * Returns all unique user IDs currently in this room.
   * Only includes authenticated users (those with an arkos::user: room).
   *
   * @example
   * const userIds = await gateway.room("room-123").users()
   */
  async users(): Promise<string[]> {
    const sockets = await this.fetchSockets();
    const userIds = new Set<string>();
    for (const s of sockets) {
      const userId = getUserIdFromSocket(s);
      if (userId) userIds.add(userId);
    }
    return [...userIds];
  }

  /**
   * Checks whether a socket, user, or room is present in this room.
   *
   * @example
   * await gateway.room("room-123").has({ socket: socketId })
   * await gateway.room("room-123").has({ user: userId })
   * await gateway.room("room-123").has({ room: "other-room" }) // any overlap?
   */
  async has(target: HasTarget): Promise<boolean> {
    const sockets = await this.fetchSockets();

    if ("socket" in target) {
      return sockets.some((s) => s.id === target.socket);
    }

    if ("user" in target) {
      return sockets.some((s) => getUserIdFromSocket(s) === target.user);
    }

    // room: any socket that is also in the other room
    const otherSockets = await this.ns.in(target.room).fetchSockets();
    const otherIds = new Set(otherSockets.map((s) => s.id));
    return sockets.some((s) => otherIds.has(s.id));
  }

  /**
   * Returns an emit builder for this room with an exclusion applied.
   *
   * @example
   * await gateway.room("room-123").except({ socket: socketId }).emit("update", data)
   * await gateway.room("room-123").except({ room: "other-room" }).emit("update", data)
   * await gateway.room("room-123").except({ user: userId }).emit("update", data)
   */
  except(target: ExceptTarget): GatewayRoomExceptBuilder {
    return new GatewayRoomExceptBuilder(
      this.roomId,
      this.ns,
      target,
      this.gatewayConfig,
      this.store
    );
  }

  /**
   * Emits an event to all sockets in this room.
   *
   * @example
   * await gateway.room("room-123").emit("update", data)
   * await gateway.room("room-123").emit("update", data, { volatile: true })
   */
  async emit<TData = any, TAck = any>(
    event: string,
    data: TData,
    options: ArkosEmitOptions = {}
  ): Promise<void> {
    this.guardMeta(event, data);
    const dataWithMeta = this.withMeta(data);
    let target: any = this.ns.to(this.roomId);
    if (options.volatile) target = target.volatile;
    target.compress(options.compress ?? true).emit(event, dataWithMeta);
  }
}

export class GatewayRoomExceptBuilder extends BaseEmitBuilder {
  constructor(
    private roomId: string,
    private ns: ReturnType<Server["of"]>,
    private target: ExceptTarget,
    gatewayConfig: ArkosGatewayConfig,
    store: ArkosGatewayStore
  ) {
    super(gatewayConfig, store);
  }

  private resolveExclusion(): ReturnType<ReturnType<Server["of"]>["to"]> {
    const base = this.ns.to(this.roomId);

    if ("socket" in this.target) return base.except(this.target.socket);
    if ("room" in this.target) return base.except(this.target.room);

    // user: resolve all their socket IDs and exclude each
    const userSockets = [...this.ns.sockets.values()].filter((s) =>
      s.rooms.has(`arkos::user:${(this.target as { user: string }).user}`)
    );
    let result: any = base;
    for (const s of userSockets) result = result.except(s.id);
    return result;
  }

  /**
   * Emits to this room excluding the specified socket, room, or user.
   *
   * @example
   * await gateway.room("room-123").except({ socket: socketId }).emit("update", data)
   * await gateway.room("room-123").except({ user: userId }).emit("update", data)
   * await gateway.room("room-123").except({ room: "other-room" }).emit("update", data)
   */
  async emit<TData = any>(
    event: string,
    data: TData,
    options: ArkosEmitOptions = {}
  ): Promise<void> {
    this.guardMeta(event, data);
    const dataWithMeta = this.withMeta(data);
    let target: any = this.resolveExclusion();
    if (options.volatile) target = target.volatile;
    target.compress(options.compress ?? true).emit(event, dataWithMeta);
  }
}

export class GatewayBroadcastBuilder extends BaseEmitBuilder {
  constructor(
    private ns: ReturnType<Server["of"]>,
    gatewayConfig: ArkosGatewayConfig,
    store: ArkosGatewayStore
  ) {
    super(gatewayConfig, store);
  }

  /**
   * Returns a broadcast builder with an exclusion applied.
   *
   * @example
   * await gateway.broadcast().except({ socket: socketId }).emit("announcement", data)
   * await gateway.broadcast().except({ room: roomId }).emit("announcement", data)
   * await gateway.broadcast().except({ user: userId }).emit("announcement", data)
   */
  except(target: ExceptTarget): GatewayBroadcastExceptBuilder {
    return new GatewayBroadcastExceptBuilder(
      this.ns,
      target,
      this.gatewayConfig,
      this.store
    );
  }

  /**
   * Emits an event to all sockets in this namespace.
   *
   * @example
   * await gateway.broadcast().emit("announcement", data)
   */
  async emit<TData = any>(
    event: string,
    data: TData,
    options: ArkosEmitOptions = {}
  ): Promise<void> {
    this.guardMeta(event, data);
    const dataWithMeta = this.withMeta(data);
    let target: any = this.ns;
    if (options.volatile) target = target.volatile;
    target.compress(options.compress ?? true).emit(event, dataWithMeta);
  }
}

export class GatewayBroadcastExceptBuilder extends BaseEmitBuilder {
  constructor(
    private ns: ReturnType<Server["of"]>,
    private target: ExceptTarget,
    gatewayConfig: ArkosGatewayConfig,
    store: ArkosGatewayStore
  ) {
    super(gatewayConfig, store);
  }

  private resolveExclusion() {
    if ("socket" in this.target) return this.ns.except(this.target.socket);
    if ("room" in this.target) return this.ns.except(this.target.room);

    const userSockets = [...this.ns.sockets.values()].filter((s) =>
      s.rooms.has(`arkos::user:${(this.target as { user: string }).user}`)
    );
    let result: any = this.ns;
    for (const s of userSockets) result = result.except(s.id);

    return result;
  }

  /**
   * Emits to all sockets in the namespace excluding the specified target.
   *
   * @example
   * await gateway.broadcast().except({ socket: socketId }).emit("announcement", data)
   */
  async emit<TData = any>(
    event: string,
    data: TData,
    options: ArkosEmitOptions = {}
  ): Promise<void> {
    this.guardMeta(event, data);
    const dataWithMeta = this.withMeta(data);
    let target: any = this.resolveExclusion();
    if (options.volatile) target = target.volatile;
    target.compress(options.compress ?? true).emit(event, dataWithMeta);
  }
}

async function emitToSockets<TData, TAck>(
  sockets: ArkosSocket[],
  event: string,
  data: TData,
  options: ArkosEmitOptions,
  builder: BaseEmitBuilder,
  offlineReason: string
): Promise<{ success: boolean; reason?: string; data?: TAck }> {
  if (!sockets.length) return { success: false, reason: offlineReason };

  builder.guardMeta(event, data);
  const dataWithMeta = builder.withMeta(data);
  const maxRetries = options.retries ?? 0;

  return builder.withRetries(
    async (): Promise<{ success: boolean; reason?: string; data?: TAck }> => {
      const results = await Promise.allSettled(
        sockets.map((socket) =>
          builder.attemptSocketEmit<typeof dataWithMeta, TAck>(
            socket,
            event,
            dataWithMeta,
            options
          )
        )
      );

      if (options.ack) {
        const first = results.find(
          (r) => r.status === "fulfilled" && r.value.success
        );
        if (first && first.status === "fulfilled")
          return { success: true, data: first.value.data };
        return { success: false };
      }

      const ok = results.some(
        (r) => r.status === "fulfilled" && r.value.success
      );
      return { success: ok };
    },
    maxRetries,
    { success: false, reason: "timeout" }
  );
}
