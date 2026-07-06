import { uuidv7 } from "uuidv7";
import {
  ArkosBroadcastOperator,
  ArkosRetryTarget,
  ArkosSocket,
  ArkosUserTarget,
} from "./types";
import { BroadcastOperator } from "socket.io";

function injectMeta<T>(
  data: T
): T & { _meta: { mid: string; timestamp: number } } {
  return {
    ...(data as any),
    _meta: { mid: uuidv7(), timestamp: Date.now() },
  };
}

function resolveUserSocketIds(
  socket: ArkosSocket,
  userId: string | string[]
): string[] {
  const ids = Array.isArray(userId) ? userId : [userId];
  const result: string[] = [];
  for (const [id, s] of socket.nsp.sockets) {
    for (const uid of ids) {
      if (s.rooms.has(`arkos::user:${uid}`)) {
        result.push(id);
        break;
      }
    }
  }
  return result;
}

export class ArkosBroadcastOperatorImpl {
  constructor(
    private readonly socket: ArkosSocket,
    private readonly operator: BroadcastOperator<any, any>
  ) {
    const instance = Object.create(operator) as this;
    instance.emit = this.emit.bind(this);
    instance.emitWithAck = this.emitWithAck.bind(this);
    instance.except = this.except.bind(this);
    instance.compress = this.compress.bind(this);
    instance.timeout = this.timeout.bind(this);
    instance.users = this.users.bind(this);
    Object.defineProperty(instance, "volatile", {
      get: () => this.volatile,
      configurable: true,
    });
    return instance;
  }

  /**
   * Returns all unique user IDs currently in the target room(s).
   * Uses the internal `arkos::user:` room convention to map sockets to users.
   *
   * @example
   * const users = await socket.to("room-123").users()
   * console.log(users) // ['user-1', 'user-2']
   */
  async users(): Promise<string[]> {
    const sockets = await this.operator.fetchSockets();
    const userIds = new Set<string>();
    for (const s of sockets) {
      for (const room of s.rooms) {
        if (room.startsWith("arkos::user:")) {
          userIds.add(room.slice("arkos::user:".length));
          break; // each socket has at most one user room
        }
      }
    }
    return Array.from(userIds);
  }

  /**
   * Excludes sockets from the broadcast.
   * Accepts a room name, socket ID, array of rooms/IDs, or `{ user: string | string[] }`
   * to exclude all sockets belonging to one or more users.
   *
   * @example
   * socket.to("room-101").except("room-102").emit("foo", data)
   * socket.broadcast.except({ user: userId }).emit("foo", data)
   * socket.broadcast.except({ user: [id1, id2] }).emit("foo", data)
   */
  except(room: string | string[] | { user: string | string[] }) {
    if (typeof room === "string" || Array.isArray(room)) {
      return new ArkosBroadcastOperatorImpl(
        this.socket,
        this.operator.except(room)
      );
    }
    const socketIds = resolveUserSocketIds(this.socket, room.user);
    let op = this.operator;
    for (const id of socketIds) op = op.except(id);
    return new ArkosBroadcastOperatorImpl(this.socket, op);
  }

  /**
   * Emits an event to the target. `_meta` (`mid` + `timestamp`) is injected automatically.
   *
   * @example
   * socket.to("room-101").emit("message", { text: "hello" })
   * socket.broadcast.emit("announcement", data)
   */
  emit(event: string, ...args: any[]): boolean {
    const [data, ...rest] = args;
    return this.operator.emit(event, injectMeta(data), ...rest);
  }

  /**
   * Sets the volatile flag — the event may be dropped if the client is not ready.
   * Useful for high-frequency non-critical events like cursor positions or typing indicators.
   *
   * @example
   * socket.to("room-101").volatile.emit("cursor", position)
   */
  get volatile() {
    return new ArkosBroadcastOperatorImpl(this.socket, this.operator.volatile);
  }

  /**
   * Sets the compress flag for the next emission.
   *
   * @example
   * socket.broadcast.compress(false).emit("ping", data)
   */
  compress(value: boolean) {
    return new ArkosBroadcastOperatorImpl(
      this.socket,
      this.operator.compress(value)
    );
  }

  /**
   * Sets a timeout in milliseconds for `emitWithAck`.
   * Rejects the promise if no client acknowledges within the given delay.
   *
   * @example
   * socket.to("room-101").timeout(3000).emitWithAck("confirm", data)
   */
  timeout(ms: number) {
    return new ArkosBroadcastOperatorImpl(
      this.socket,
      this.operator.timeout(ms)
    );
  }

  /**
   * Emits an event and waits for acknowledgements from all matched clients.
   * `_meta` is injected automatically. Use `.timeout(ms)` to avoid hanging indefinitely.
   *
   * @example
   * const responses = await socket.to("room-101").timeout(3000).emitWithAck("confirm", data)
   */
  async emitWithAck(event: string, ...args: any[]): Promise<any[]> {
    const [data, ...rest] = args;
    return this.operator.emitWithAck(event, injectMeta(data), ...rest);
  }
}

class ArkosRetryTargetImpl implements ArkosRetryTarget {
  private timeoutMs?: number;

  constructor(
    private readonly socket: ArkosSocket,
    private readonly maxRetries: number,
    private readonly baseDelay: number,
    private readonly multiplier: number
  ) {}

  /**
   * Sets a timeout in milliseconds applied on each `emitWithAck` attempt.
   *
   * @example
   * socket.retry(3).timeout(5000).emitWithAck("event", data)
   */
  timeout(ms: number) {
    this.timeoutMs = ms;
    return this;
  }

  /**
   * Emits with ack and exponential backoff retry. `_meta` is injected automatically.
   * Each attempt respects the `.timeout(ms)` if set.
   *
   * @example
   * const ack = await socket.retry(3).timeout(5000).emitWithAck("confirm", data)
   */
  async emitWithAck(event: string, data: any, ...rest: any[]): Promise<any> {
    const patched = injectMeta(data);
    return this.attemptEmitWithAck(event, patched, rest, 0);
  }

  private async attemptEmitWithAck(
    event: string,
    data: any,
    rest: any[],
    attempt: number
  ): Promise<any> {
    try {
      const s = this.timeoutMs
        ? this.socket.timeout(this.timeoutMs)
        : this.socket;
      return await s.emitWithAck(event, data, ...rest);
    } catch (err) {
      if (attempt < this.maxRetries) {
        const delay = Math.pow(this.multiplier, attempt) * this.baseDelay;
        await new Promise((r) => setTimeout(r, delay));
        return this.attemptEmitWithAck(event, data, rest, attempt + 1);
      }
      throw err;
    }
  }
}

/**
 * Mounts Arkos socket extensions and patches emit methods for automatic `_meta` injection.
 * Called once by the gateway at connection time, right after injecting `_arkos`.
 *
 * Patches: `emit`, `emitWithAck`, `to()`, `timeout()`, `broadcast`
 * Mounts: `user()`, `peer()`, `retry()`
 *
 * @internal
 * @since 1.7.0-canary.29
 */
export function mountArkosSocketExtensions(socket: ArkosSocket): void {
  const originalEmit = socket.emit.bind(socket);
  const originalEmitWithAck = socket.emitWithAck.bind(socket);
  const originalTo = socket.to.bind(socket);
  const originalTimeout = socket.timeout.bind(socket);

  socket.emit = function (event: string, data?: any, ...rest: any[]) {
    return originalEmit(event, injectMeta(data), ...rest);
  };

  socket.emitWithAck = function (event: string, data?: any, ...rest: any[]) {
    return originalEmitWithAck(event, injectMeta(data), ...rest);
  };

  socket.to = function (room: string | string[]) {
    return new ArkosBroadcastOperatorImpl(
      socket,
      originalTo(room)
    ) as any as ArkosBroadcastOperator;
  };

  socket.timeout = function (ms: number) {
    const timedSocket = originalTimeout(ms);
    const originalTimedEmitWithAck = timedSocket.emitWithAck.bind(timedSocket);
    timedSocket.emitWithAck = function (
      event: string,
      data?: any,
      ...rest: any[]
    ) {
      const result = originalTimedEmitWithAck(event, injectMeta(data), ...rest);
      return result;
    };
    return timedSocket;
  };

  const broadcastDescriptor = Object.getOwnPropertyDescriptor(
    Object.getPrototypeOf(socket),
    "broadcast"
  );

  Object.defineProperty(socket, "broadcast", {
    get() {
      const operator = broadcastDescriptor!.get!.call(socket);
      return new ArkosBroadcastOperatorImpl(socket, operator);
    },
    configurable: true,
  });

  socket.user = function (userId: string): ArkosUserTarget {
    const target = new ArkosBroadcastOperatorImpl(
      socket,
      socket.nsp.to(`arkos::user:${userId}`)
    ) as any as ArkosUserTarget;

    target.activeRooms = async () => {
      const sockets = await (
        target as unknown as ArkosBroadcastOperator
      ).fetchSockets();
      const roomsSet = new Set<string>();
      for (const s of sockets as any[]) {
        for (const room of s.rooms) {
          if (!room.startsWith("arkos::user:")) roomsSet.add(room);
        }
      }
      return Array.from(roomsSet);
    };

    return target;
  };
  socket.retry = function (
    times: number,
    baseDelay: number = 1000,
    multiplier: number = 2
  ): ArkosRetryTarget {
    return new ArkosRetryTargetImpl(socket, times, baseDelay, multiplier);
  };
}
