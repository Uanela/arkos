import { Server, Socket } from "socket.io";
import { User } from "../../types";
import { DefaultEventsMap } from "socket.io";
import { Validator } from "../../types/validation/validator";
import { Options as RateLimitOptions } from "express-rate-limit";
import { ArkosPolicyRule } from "../arkos-policy/types";

/**
 * An events map is an interface that maps event names to their value, which
 * represents the type of the `on` listener.
 */
export interface EventsMap {
  [event: string]: any;
}

export interface ArkosSocket<
  ListenEvents extends EventsMap = DefaultEventsMap,
  EmitEvents extends EventsMap = ListenEvents,
  ServerSideEvents extends EventsMap = DefaultEventsMap,
  SocketData extends Validator = any,
> extends Socket<ListenEvents, EmitEvents, ServerSideEvents, SocketData> {
  /**
   * Populated by Arkos after successful authentication on connection.
   * Available in all event handlers when authentication: true on the gateway.
   */
  user?: User;

  /**
   * Populated by Arkos after successful validation.
   * Typed to the event's validation schema when using TypeScript.
   */
  data: SocketData;

  /**
   * User access token
   */
  accessToken?: string;
}

export type ArkosGatewayPipe = (
  socket: ArkosSocket,
  data: any,
  io: Server
) => void | Promise<void>;

export type ArkosGatewayEventConfig<TSchema extends Validator = any> = {
  /**
   * The Socket.io event name to listen for.
   *
   * @example
   * event: "send_message"
   */
  event: string;
  /**
   * Zod schema or class-validator DTO to validate the incoming event payload.
   * The validated data is passed as the second argument to the handler
   * and also available on socket.validatedData.
   *
   * @example
   * validation: z.object({ room: z.string(), content: z.string() })
   */
  validation?: TSchema;

  /**
   * Per-event rate limiting. Overrides gateway-level rateLimit for this event.
   * Useful for stricter limits on expensive events like send_message vs typing.
   *
   * @example
   * rateLimit: { windowMs: 10_000, max: 5 }
   */
  rateLimit?: Partial<RateLimitOptions> | false;

  /**
   * Role-based authorization for this specific event.
   *
   * Gateway must have authentication: true for this to work.
   * Arkos will throw at registration time if gateway has authentication: false.
   *
   * @example
   * authorization: { roles: ["Admin", "Moderator"] }
   */
  authorization?: ArkosPolicyRule;

  /**
   * Whether this event handler expects an acknowledgement callback.
   * When true, the handler receives ack as the fourth argument.
   *
   * @example
   * ack: true
   * // handler: (socket, data, io, ack) => { ack({ status: "ok" }) }
   */
  ack?: boolean;
  /**
   * Per-event deduplication configuration for incoming gateway handlers.
   *
   * Controls whether an incoming event should be processed only once based on its
   * unique message identifier (`_mid`).
   *
   * Deduplication is applied BEFORE the handler executes, ensuring idempotency
   * at the processing boundary (not at transport/emit level).
   *
   * This is typically used to prevent:
   * - duplicate client submissions
   * - retry-based re-delivery
   * - reconnect replay of the same logical event
   */
  dedup?:
    | {
        /**
         * Enables or disables deduplication for this event handler.
         *
         * When enabled, the gateway will check whether the incoming message ID
         * has already been processed and skip execution if so.
         *
         * Overrides the gateway-level `dedup.enabled` configuration.
         *
         * @default true
         */
        enabled?: boolean;

        /**
         * Time-to-live for the deduplication key in seconds.
         *
         * Defines how long a processed message ID is remembered to prevent
         * duplicate execution within that window.
         *
         * Overrides the gateway-level `dedup.ttl` configuration.
         *
         * @default 3600
         */
        ttl?: number;
      }
    | false;
};

export type ArkosGatewayAckFn = (response: any) => void;

export type ArkosGatewayHandler<TData = any> = (
  socket: ArkosSocket,
  data: TData,
  io: Server,
  ack?: ArkosGatewayAckFn
) => void | Promise<void>;

export type ArkosGatewayEventEntry = {
  config: ArkosGatewayEventConfig;
  handler: ArkosGatewayHandler;
  pipes: ArkosGatewayPipe[];
};

export type ArkosGatewayConnectionHandler = (
  socket: ArkosSocket,
  io: Server
) => void | Promise<void>;

export type ArkosGatewayHookHandler =
  | ArkosGatewayConnectionHandler
  | ArkosGatewayErrorHandler;

export type ArkosGatewayErrorHandler = (
  error: any,
  socket: ArkosSocket,
  io: Server
) => void | Promise<void>;

export type ArkosGatewayHookType = "connection" | "disconnect" | "error";

export type ArkosGatewayConfig = {
  /**
   * Socket.io namespace for this gateway.
   *
   * @example
   * name: "/chat"
   * // connects at: http://localhost:3000/chat
   */
  name: string;

  /**
   * Whether this gateway requires authentication on connection.
   * When true, Arkos runs the auth middleware on socket connection,
   * populating socket.user. Unauthenticated sockets are rejected.
   *
   * @default false
   */
  authentication?: boolean;

  /**
   * Gateway-level rate limiting applied per socket connection.
   * Can be overridden per event using rateLimit in chatGateway.on().
   *
   * @example
   * rateLimit: { windowMs: 60_000, max: 200 }
   */
  rateLimit?: Partial<RateLimitOptions>;
  /**
   * Configuration for the deduplication system on this gateway.
   * Deduplication prevents the same event from being processed
   * multiple times within a given time window.
   *
   * All settings drill down to child gateways and can be overridden per child
   * or per listener (`gateway.on`)
   *
   * @example
   * ArkosGateway({
   *   name: "/chat",
   *   dedup: {
   *     enabled: true,
   *     ttl: 3600,
   *   }
   * })
   */
  dedup?:
    | {
        /**
         * Whether deduplication is enabled for this gateway.
         * Defaults to `true` — opt out explicitly if you need duplicate events.
         *
         * @default true
         */
        enabled?: boolean;

        /**
         * Time-to-live in seconds for deduplication keys.
         * After this period the same message ID can be processed again.
         *
         * @default 3600
         */
        ttl?: number;
      }
    | false;
};

/**
 * Interface for a custom deduplication store.
 * Implement this to plug in Redis, bento-cache, or any other
 * distributed store for deduplication across multiple server instances.
 *
 * @example
 * class RedisDeduplicationStore implements ArkosGatewayDedupStore {
 *   constructor(private redis: RedisClientType) {}
 *
 *   async has(key: string): Promise<boolean> {
 *     return (await this.redis.exists(key)) === 1
 *   }
 *
 *   async set(key: string, ttl: number): Promise<void> {
 *     await this.redis.setEx(key, ttl, "1")
 *   }
 * }
 */
export interface ArkosGatewayDedupStore {
  /**
   * Returns whether the key exists in the store.
   * Used to detect duplicate messages.
   */
  has(key: string): Promise<boolean>;

  /**
   * Stores a key with a TTL in seconds.
   * Called after a message is processed to mark it as seen.
   */
  set(key: string, ttl: number): Promise<void>;
}

/**
 * Options available on every Arkos-owned emit method.
 * All fields are optional — defaults are applied at the gateway level.
 *
 * @example
 * gateway.toUser(userId).emit("notification", data, {
 *   timeout: 5000,
 *   retries: 3,
 * })
 */
export interface ArkosEmitOptions {
  /**
   * Timeout in milliseconds to wait for an acknowledgement from the client.
   * Only applies to `toUser()` and `toSocket()` — broadcasts have no ack.
   *
   * @default 5000
   */
  timeout?: number;

  /**
   * Number of retry attempts if the emit times out or fails.
   * Uses exponential backoff between attempts, capped at 5 seconds.
   * Only applies to `toUser()` and `toSocket()`.
   *
   * @default 0
   */
  retries?: number;
}

/**
 * Options for `gateway.register()`.
 * Passed once at the root gateway registration — applies to all child gateways.
 *
 * @example
 * gateway.register(io, {
 *   store: new MultiTierStore([
 *     new MemoryStore(),
 *     new RedisStore(redis)
 *   ])
 * })
 */
export type ArkosGatewayRegisterOptions = {
  /**
   * Unified store for rate limiting and deduplication across all gateways.
   * Defaults to an in-memory store — zero config required for single-instance deployments.
   *
   * For distributed deployments (multiple Node processes / instances), plug in a
   * Redis store or a multi-tier store to share state across instances.
   *
   * @example
   * store: new RedisArkosStore(redis)
   * store: new MultiTierStore([new MemoryStore(), new RedisStore(redis)])
   */
  store?: ArkosGatewayStore;
};

/**
 * Unified store interface for rate limiting and deduplication.
 * Implement this to plug in Redis, Valkey, or any distributed store.
 *
 * @example
 * class RedisArkosStore implements ArkosGatewayStore {
 *   constructor(private redis: RedisClientType) {}
 *
 *   async increment(key: string, windowMs: number) {
 *     const count = await this.redis.incr(key)
 *     if (count === 1) await this.redis.pExpire(key, windowMs)
 *     const ttl = await this.redis.pTtl(key)
 *     return { count, resetAt: Date.now() + ttl }
 *   }
 *
 *   async clear(prefix: string) {
 *     const keys = await this.redis.keys(`${prefix}*`)
 *     if (keys.length) await this.redis.del(keys)
 *   }
 *
 *   async has(key: string) {
 *     return (await this.redis.exists(key)) === 1
 *   }
 *
 *   async set(key: string, ttl: number) {
 *     await this.redis.setEx(key, ttl, "1")
 *   }
 * }
 */
export interface ArkosGatewayStore {
  /**
   * Increment a rate limit counter for a given key and window.
   * Called on every event to track request counts.
   * Key format: `arkos::rl:{socketId}:{event}`
   */
  increment(
    key: string,
    windowMs: number
  ): Promise<{ count: number; resetAt: number }>;

  /**
   * Clear all rate limit entries matching a prefix.
   * Called on socket disconnect.
   * Prefix format: `arkos::rl:{socketId}`
   */
  clear(prefix: string): Promise<void>;

  /**
   * Check if a dedup key exists.
   * Called before emitting to detect duplicate messages.
   */
  has(key: string): Promise<boolean>;

  /**
   * Store a dedup key with a TTL in seconds.
   * Called after emitting to mark a message as seen.
   */
  set(key: string, ttl: number): Promise<void>;
}

export class ArkosGatewayController {}
