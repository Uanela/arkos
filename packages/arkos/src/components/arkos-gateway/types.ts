import { BroadcastOperator, Socket } from "socket.io";
import { User } from "../../types";
import { DefaultEventsMap } from "socket.io";
import { Validator } from "../../types/validation/validator";
import { Options as RateLimitOptions } from "express-rate-limit";
import { DetailedAccessControlRule } from "../../types/auth";
///@ts-ignore
import {
  AllButLast,
  DecorateAcknowledgements,
  DecorateAcknowledgementsWithMultipleResponses,
  EventNames,
  EventNamesWithAck,
  EventNamesWithError,
  EventParams,
  FirstNonErrorArg,
  Last,
  ///@ts-ignore
} from "socket.io/dist/typed-events";

export interface EventsMap {
  [event: string]: any;
}

export interface ArkosSocket<
  ListenEvents extends EventsMap = DefaultEventsMap,
  EmitEvents extends EventsMap = ListenEvents,
  ServerSideEvents extends EventsMap = DefaultEventsMap,
  SocketData extends Validator = any,
  SocketLocals extends Record<string, any> = Record<string, any>,
> extends Socket<ListenEvents, EmitEvents, ServerSideEvents, SocketData> {
  /**
   * Populated by Arkos after successful authentication on connection.
   * Available in all event handlers when `authentication: true` on the gateway.
   */
  currentUser?: User;

  /**
   * Populated by Arkos after successful validation.
   * Typed to the event's validation schema when using TypeScript.
   */
  data: SocketData;

  /** User access token. */
  accessToken?: string;

  /**
   * Metadata from the incoming message, extracted from `_meta` by Arkos.
   *
   * - `mid`: Unique message ID used for deduplication.
   * - `timestamp`: When the message was sent by the client.
   */
  meta?: {
    mid?: string;
    timestamp?: string | number | Date;
  };

  /**
   * Per-event local storage, scoped to the current event pipeline.
   * Use to pass data between pipes and the event handler — like Express's `res.locals`.
   * Reset automatically on each event.
   *
   * @example
   * chatGateway.pipe((socket, data) => {
   *   socket.locals.enriched = enrichUser(socket.currentUser)
   * })
   *
   * chatGateway.on({ event: "send_message" }, (socket, data) => {
   *   console.log(socket.locals.enriched)
   * })
   */
  locals?: SocketLocals;

  /**
   * Internal Arkos context injected by the gateway at connection time.
   *
   * @internal
   */
  _arkos: {
    store: ArkosGatewayStore;
    gatewayConfig: ArkosGatewayConfig;
  };

  /**
   * Targets all active socket connections of a user by their user ID.
   * Uses the internal `arkos::user:{userId}` room convention.
   *
   * Supports emit, management, and exclusion operations across all of the
   * user's active connections.
   *
   * @example
   * socket.user(userId).emit("notification", data)
   * socket.user(userId).except({ user: otherUserId }).emit("sync", data)
   * const sockets = await socket.user(userId).fetchSockets()
   * const online = await socket.user(userId).isOnline()
   *
   * @since 1.7.0-canary.29
   */
  user(userId: string): ArkosUserTarget;

  /**
   * Returns the socket instance for a given socket ID.
   * Throws if the socket is not found or has disconnected.
   *
   * Use native Socket.io chaining on the returned socket:
   * `socket.peer(id).emit()`, `socket.peer(id).timeout(ms).emitWithAck()`, etc.
   *
   * @example
   * socket.peer(socketId).emit("event", data)
   * socket.peer(socketId).timeout(3000).emitWithAck("event", data)
   * socket.peer(socketId).retry(3).emit("event", data)
   *
   * @since 1.7.0-canary.29
   */
  peer(socketId: string): ArkosSocket | undefined;

  /**
   * Wraps the next `emit` or `emitWithAck` with exponential backoff retry logic.
   * Chain `.timeout(ms)` before `.emitWithAck()` as usual.
   *
   * @example
   * socket.retry(3).emit("event", data)
   * socket.retry(3).timeout(5000).emitWithAck("event", data)
   *
   * @since 1.7.0-canary.29
   */
  retry(
    times: number,
    initialDelay?: number,
    multiplier?: number
  ): ArkosRetryTarget;

  /**
   * Emits an event to this client.
   * Arkos automatically injects `_meta` (`mid` + `timestamp`) into every outgoing payload
   * for client-side deduplication and freshness checks.
   *
   * @example
   * socket.emit("message", { text: "hello" })
   * socket.emit("notification", { title: "New order" })
   */
  emit<Ev extends EventNames<EmitEvents>>(
    ev: Ev,
    ...args: EventParams<EmitEvents, Ev>
  ): true;

  /**
   * Emits an event and waits for an acknowledgement from the client.
   * Arkos injects `_meta` automatically. Use `.timeout(ms)` to avoid hanging indefinitely.
   *
   * @example
   * const response = await socket.timeout(5000).emitWithAck("confirm", data)
   */
  emitWithAck<Ev extends EventNamesWithAck<EmitEvents>>(
    ev: Ev,
    ...args: AllButLast<EventParams<EmitEvents, Ev>>
  ): Promise<FirstNonErrorArg<Last<EventParams<EmitEvents, Ev>>>>;

  /**
   * Targets a room when broadcasting — excludes the sender.
   * Returns an {@link ArkosBroadcastOperator} with enhanced `.except({ user })` support
   * and automatic `_meta` injection on every `.emit()`.
   *
   * @example
   * socket.to("room-101").emit("message", data)
   * socket.to("room-101").except({ user: userId }).emit("message", data)
   * socket.to("room-101").volatile.emit("typing", data)
   * await socket.to("room-101").timeout(3000).emitWithAck("confirm", data)
   *
   * @since 1.7.0-canary.29
   */
  to(
    room: string | string[]
  ): ArkosBroadcastOperator<
    DecorateAcknowledgementsWithMultipleResponses<EmitEvents>,
    SocketData
  > &
    BroadcastOperator<EmitEvents, SocketData>;
  /**
   * Broadcasts to all connected clients except the sender.
   * Returns an {@link ArkosBroadcastOperator} with enhanced `.except({ user })` support
   * and automatic `_meta` injection on every `.emit()`.
   *
   * @example
   * socket.broadcast.emit("announcement", data)
   * socket.broadcast.except({ user: userId }).emit("announcement", data)
   * socket.broadcast.volatile.emit("ping", data)
   *
   * @since 1.7.0-canary.29
   */
  get broadcast(): ArkosBroadcastOperator<
    DecorateAcknowledgementsWithMultipleResponses<EmitEvents>,
    SocketData
  > &
    BroadcastOperator<EmitEvents, SocketData>;
}

/**
 * Enhanced broadcast/room target returned by `socket.to()` and `socket.broadcast`.
 * Extends the native `BroadcastOperator` with `{ user }` exclusion support
 * and automatic `_meta` injection on emit.
 *
 * @since 1.7.0-canary.29
 */
export interface ArkosBroadcastOperator<
  EmitEvents extends EventsMap = DefaultEventsMap,
  SocketData extends Validator = any,
> extends BroadcastOperator<EmitEvents, SocketData> {
  /**
   * Exclude sockets from the broadcast.
   * Accepts a room name, socket ID, or `{ user: string | string[] }` to exclude
   * all sockets belonging to one or more users.
   *
   * @example
   * socket.to("room-101").except("room-102").emit("foo", data)
   * socket.broadcast.except({ user: userId }).emit("foo", data)
   * socket.broadcast.except({ user: [userId1, userId2] }).emit("foo", data)
   */
  except(
    room: string | string[] | { user: string | string[] }
  ): ArkosBroadcastOperator<EmitEvents, SocketData>;

  /**
   * Emits to all clients,`_meta` is injected automatically.
   *
   * @example
   * // the “foo” event will be broadcast to all connected clients
   * io.emit("foo", "bar");
   *
   * // the “foo” event will be broadcast to all connected clients in the “room-101” room
   * io.to("room-101").emit("foo", "bar");
   *
   * // with an acknowledgement expected from all connected clients
   * io.timeout(1000).emit("some-event", (err, responses) => {
   *   if (err) {
   *     // some clients did not acknowledge the event in the given delay
   *   } else {
   *     console.log(responses); // one response per client
   *   }
   * });
   *
   * @return Always true
   */
  emit<Ev extends EventNames<EmitEvents>>(
    ev: Ev,
    ...args: EventParams<EmitEvents, Ev>
  ): true;

  /** Chain volatile flag — event may be lost if client is not ready. */
  get volatile(): ArkosBroadcastOperator<EmitEvents, SocketData>;

  /** Chain compress flag. */
  compress(value: boolean): ArkosBroadcastOperator<EmitEvents, SocketData>;

  /** Chain timeout for `emitWithAck`. */
  timeout(
    ms: number
  ): ArkosBroadcastOperator<DecorateAcknowledgements<EmitEvents>, SocketData>;

  /**
   * Emits an event and waits for an acknowledgement from all clients.
   * `_meta` is injected automatically
   * @example
   * try {
   *   const responses = await io.timeout(1000).emitWithAck("some-event");
   *   console.log(responses); // one response per client
   * } catch (e) {
   *   // some clients did not acknowledge the event in the given delay
   * }
   *
   * @return a Promise that will be fulfilled when all clients have acknowledged the event
   */
  emitWithAck<Ev extends EventNamesWithError<EmitEvents>>(
    ev: Ev,
    ...args: AllButLast<EventParams<EmitEvents, Ev>>
  ): Promise<FirstNonErrorArg<Last<EventParams<EmitEvents, Ev>>>>;
  /**
   * Returns all unique user IDs currently in the target room(s).
   *
   * @example
   * const users = await socket.to("room-123").users()
   */
  users(): Promise<string[]>;
}

/**
 * Returned by `socket.retry(n)`. Wraps `emit` and `emitWithAck`
 * with exponential backoff. Chain `.timeout(ms)` before `.emitWithAck()` as usual.
 *
 * @since 1.7.0-canary.29
 */
export interface ArkosRetryTarget {
  /** Emit with ack and retry. `_meta` is injected automatically. */
  emitWithAck(event: string, data: any, ...rest: any[]): Promise<any>;

  /**
   * Chain a timeout before `emitWithAck`.
   *
   * @example
   * socket.retry(3).timeout(5000).emitWithAck("event", data)
   */
  timeout(ms: number): ArkosRetryTarget;
}

/**
 * Returned by `socket.user(userId)`.
 * Targets all active socket connections of a user.
 *
 * @since 1.7.0-canary.29
 */
export interface ArkosUserTarget {
  /**
   * Emit to all of this user's sockets. `_meta` is injected automatically.
   *
   * @example
   * socket.user(userId).emit("notification", data)
   */
  emit(event: string, ...args: any[]): true;

  /**
   * Exclude sockets from the emit.
   * Accepts a room name, socket ID, or `{ user: string | string[] }`.
   *
   * @example
   * socket.user(userId).except({ user: otherUserId }).emit("sync", data)
   * socket.user(userId).except({ user: [id1, id2] }).emit("sync", data)
   * socket.user(userId).except(socketId).emit("sync", data)
   */
  except(
    target: string | string[] | { user: string | string[] }
  ): ArkosUserTarget;

  /**
   * Returns whether the user has at least one active socket connection.
   *
   * @example
   * if (await socket.user(userId).isOnline()) { ... }
   */
  isOnline(): Promise<boolean>;

  /**
   * Returns all active socket instances for this user.
   * Mirrors `ns.to(room).fetchSockets()`.
   *
   * @example
   * const sockets = await socket.user(userId).fetchSockets()
   */
  fetchSockets(): Promise<ArkosSocket[]>;

  /**
   * Returns whether any of this user's sockets are in the given room.
   * Mirrors native `.in(room)` semantics.
   *
   * @example
   * const inside = await socket.user(userId).in("room-123")
   */
  in(roomId: string): Promise<boolean>;

  /**
   * Joins all of this user's sockets to a room.
   *
   * @example
   * await socket.user(userId).join("room-123")
   */
  join(roomId: string): Promise<void>;

  /**
   * Removes all of this user's sockets from a room.
   *
   * @example
   * await socket.user(userId).leave("room-123")
   */
  leave(roomId: string): Promise<void>;

  /**
   * Disconnects all of this user's sockets.
   *
   * @param close - If `true`, closes the underlying connections. Defaults to `false`.
   *
   * @example
   * await socket.user(userId).disconnect()
   */
  disconnect(close?: boolean): Promise<void>;
  /**
   * Returns all active rooms for this user.
   *
   * @example
   * const rooms = await socket.user(userId).rooms()
   * console.log(rooms.length) // number of active tabs/connections
   */
  rooms(): string[];
}

export type ArkosGatewayPipe = (
  socket: ArkosSocket,
  data: any
) => void | Promise<void>;

export type ArkosGatewayEventConfig<TSchema extends Validator = any> = {
  /** The Socket.io event name to listen for. */
  event: string;

  /** Zod schema or class-validator DTO to validate the incoming event payload. */
  validation?: TSchema;

  /** Per-event rate limiting. Overrides gateway-level `rateLimit` for this event. */
  rateLimit?: Partial<RateLimitOptions> | false;

  /**
   * Authorization configuration.
   *
   * @remarks Gateway `authentication` must NOT be `false` or this throws at registration time.
   */
  authorization?: {
    resource: string;
    action: string;
    rule?: DetailedAccessControlRule | string[] | "*";
  };

  /**
   * When `true`, Arkos automatically calls `ack({ success: true })` after the handler
   * finishes, unless the handler already called ack manually.
   */
  ack?: boolean;

  /** Disables this event handler without removing it. */
  disabled?: boolean;

  /**
   * Maximum age in milliseconds for incoming messages.
   * Requires `data._meta.timestamp`. Events older than this are rejected.
   */
  maxAge?: number;

  /** Per-event deduplication. Overrides gateway-level `dedup`. */
  dedup?:
    | {
        /** @default true */
        enabled?: boolean;
        /** Time-to-live in seconds for the dedup key. @default 3600 */
        ttl?: number;
      }
    | false;
};

export type ArkosGatewayAckFn = (response: any) => void;

export type ArkosGatewayHandler<TData = any> = (
  socket: ArkosSocket,
  data: TData,
  ack?: ArkosGatewayAckFn
) => void | Promise<void>;

export type ArkosGatewayEventEntry = {
  config: ArkosGatewayEventConfig;
  handler: ArkosGatewayHandler;
  pipes: ArkosGatewayPipe[];
};

export type ArkosGatewayConnectionHandler = (
  socket: ArkosSocket
) => void | Promise<void>;

export type ArkosGatewayHookHandler =
  | ArkosGatewayConnectionHandler
  | ArkosGatewayErrorHandler;

export type ArkosGatewayErrorHandler = (
  error: any,
  socket: ArkosSocket
) => void | Promise<void>;

export type ArkosGatewayHookType = "connection" | "disconnect" | "error";

export type ArkosGatewayConfig = {
  /**
   * Socket.io namespace for this gateway.
   *
   * @example
   * name: "/chat"
   */
  name: string;

  /**
   * When `true`, Arkos runs auth middleware on connection and populates `socket.currentUser`.
   * Unauthenticated sockets are rejected.
   *
   * @default false
   */
  authentication?: boolean;

  /** Gateway-level rate limiting, applied per socket. Can be overridden per event. */
  rateLimit?: Partial<RateLimitOptions>;

  /**
   * Gateway-level deduplication. Drills down to child gateways and can be overridden
   * per child or per event listener.
   */
  dedup?:
    | {
        /** @default true */
        enabled?: boolean;
        /** @default 3600 */
        ttl?: number;
      }
    | false;

  /**
   * Maximum age in milliseconds for incoming messages.
   * Can be overridden per event via `maxAge` in `gateway.on()`.
   */
  maxAge?: number;
};

/**
 * Options for `gateway.register()`.
 * Passed once at the root — applies to all child gateways.
 */
export type ArkosGatewayRegisterOptions = {
  /**
   * Unified store for rate limiting and deduplication.
   * Defaults to an in-memory store — zero config for single-instance deployments.
   * For distributed deployments plug in a Redis-backed store.
   *
   * @example
   * store: new RedisArkosStore(redis)
   */
  store?: ArkosGatewayStore;
};

/**
 * Unified store interface for rate limiting and deduplication.
 * Implement this to plug in Redis, Valkey, or any distributed store.
 *
 * @example
 * class RedisArkosStore implements ArkosGatewayStore {
 *   async increment(key, windowMs) { ... }
 *   async clear(prefix) { ... }
 *   async has(key) { ... }
 *   async set(key, ttl) { ... }
 *   async setIfNotExists(key, ttl) { ... }
 * }
 */
export interface ArkosGatewayStore {
  /** Increment a rate limit counter. Key format: `arkos::rl:{socketId}:{event}` */
  increment(
    key: string,
    windowMs: number
  ): Promise<{ count: number; resetAt: number }>;

  /** Clear all rate limit entries matching a prefix. Key format: `arkos::rl:{socketId}` */
  clear(prefix: string): Promise<void>;

  /** Check if a dedup key exists. */
  has(key: string): Promise<boolean>;

  /** Store a dedup key with TTL in seconds. */
  set(key: string, ttl: number): Promise<void>;

  /**
   * Atomically store a dedup key only if it does not already exist.
   * Returns `true` if created (process the message), `false` if duplicate (skip).
   */
  setIfNotExists(key: string, ttl: number): Promise<boolean>;
}

export class ArkosGatewayController {}
