import {
  ArkosGatewayConfig,
  ArkosGatewayErrorHandler,
  ArkosGatewayEventConfig,
  ArkosGatewayEventEntry,
  ArkosGatewayHandler,
  ArkosGatewayHookHandler,
  ArkosGatewayHookType,
  ArkosGatewayPipe,
  ArkosGatewayConnectionHandler,
  ArkosSocket,
  ArkosGatewayRegisterOptions,
} from "./types";
import { Validator } from "../../types/validation/validator";
import { Server } from "socket.io";
import { authActionService, authService } from "../../exports/services";
import { checkRateLimit, clearRateLimitForSocket } from "./utils/rate-limiter";
import {
  handleArkosGatewayErrors,
  runArkosGatewayPipes,
  handleGatewayEventLog,
  handleGatewayLifecycleLog,
} from "./utils/helpers";
import authHookManager from "../../modules/auth/utils/auth-hooks-manager";
import { getArkosConfig } from "../../server";
import validationManager from "../../types/validation/validation-manager";
import {
  BadRequestError,
  TooManyRequestsError,
} from "../../exports/error-handler";
import { loginRequiredError } from "../../modules/auth/utils/auth-error-objects";
import errorPrettifier from "../../modules/base/utils/error-prettifier";
import {
  GatewayBroadcastBuilder,
  GatewayRoomBuilder,
  GatewaySocketBuilder,
  GatewayUserBuilder,
} from "./utils/emit-builders";
import deepmerge from "../../utils/helpers/deepmerge.helper";
import { defaultGatewayStore } from "./utils/memory-gateway-store";

export class IArkosGateway {
  private config: ArkosGatewayConfig;
  private events: ArkosGatewayEventEntry[] = [];
  private pipes: ArkosGatewayPipe[] = [];
  private gateways: IArkosGateway[] = [];
  private hooks: {
    type: ArkosGatewayHookType;
    handler: ArkosGatewayHookHandler;
  }[] = [];
  private io?: Server;
  private registryOptions?: ArkosGatewayRegisterOptions;

  constructor(config: ArkosGatewayConfig) {
    this.config = config;
    this.config.name = config.name ?? "web-socket";
  }

  /**
   * Register a Socket.io connection-level middleware — runs before a socket
   * is accepted into this gateway's namespace. Also accepts a child
   * `ArkosGateway` which will inherit this gateway's name as prefix along
   * with its auth, rateLimit, and pipes.
   *
   * @example
   * chatGateway.use((socket, data) => {
   *   console.log("incoming connection", socket.id)
   * })
   *
   * // nested gateway
   * chatGateway.use(notificationsGateway)
   */
  use(...middlewareOrGateway: Array<ArkosGatewayPipe | IArkosGateway>): this {
    for (const item of middlewareOrGateway) {
      if (item instanceof IArkosGateway) {
        this.gateways.push(item);
      } else if (typeof item === "function") {
        // stored but applied as ns.use() during register()
        this.pipes.push(item as ArkosGatewayPipe);
      } else {
        throw new Error(
          `Invalid value for gateway.use() — expected an ArkosGateway instance or a middleware function but received "${typeof item}".`
        );
      }
    }
    return this;
  }

  /**
   * Register a pipe — middleware that runs before event handlers.
   *
   * When called with a function only, the pipe runs before every event
   * handler in this gateway and drills down to child gateways, identical
   * to how Express `router.use(fn)` works.
   *
   * When called with an event config object, the pipe runs only for that
   * specific event.
   *
   * @example
   * // runs before every event in this gateway
   * chatGateway.pipe((socket, data) => {
   * })
   *
   * // runs only before "send_message"
   * chatGateway.pipe({ event: "send_message" }, (socket, data) => {
   * })
   */
  pipe(fn: ArkosGatewayPipe): this;
  pipe<TSchema extends Validator = any>(
    eventConfig: { event: string },
    fn: ArkosGatewayPipe
  ): this;
  pipe<TSchema extends Validator = any>(
    fnOrConfig: ArkosGatewayPipe | ArkosGatewayEventConfig<TSchema>,
    fn?: ArkosGatewayPipe
  ): this {
    if (typeof fnOrConfig === "function") {
      this.pipes.push(fnOrConfig);
    } else if (fnOrConfig && typeof fnOrConfig === "object" && fn) {
      const entry = this.events.find(
        (e) => e.config.event === fnOrConfig.event
      );
      if (entry) {
        entry.pipes = entry.pipes ?? [];
        entry.pipes.push(fn);
      } else {
        // deferred — pipe registered before on()
        this.events.push({
          config: { event: fnOrConfig.event, _pipeOnly: true } as any,
          handler: null as any,
          pipes: [fn],
        });
      }
    } else {
      throw new Error(
        `Invalid arguments for gateway.pipe() — pass a middleware function, or an event config object followed by a middleware function.`
      );
    }
    return this;
  }

  /**
   * Register an event handler.
   *
   * @example
   * chatGateway.on(
   *   { event: "send_message", validation: MessageSchema, ack: true },
   *   (socket, data, ack) => {
   *     socket.to(data.room).emit("receive_message", data)
   *     ack?.({ status: "ok" })
   *   }
   * )
   */
  on<TSchema extends Validator = any>(
    eventConfig: ArkosGatewayEventConfig<TSchema>,
    handler: ArkosGatewayHandler
  ): this {
    if (eventConfig.disabled) return this;

    if (eventConfig.authorization && this.config.authentication === false) {
      throw new Error(
        `Event "${eventConfig.event}" on "${this.config.name}" gateway defines authorization rules ` +
          `but the gateway has authentication: false. Enable authentication on the gateway to use per-event authentication.`
      );
    }

    const deferred = this.events.find(
      (e) => (e.config as any)._pipeOnly && e.config.event === eventConfig.event
    );

    const entry: ArkosGatewayEventEntry = {
      config: eventConfig,
      handler,
      // snapshot global pipes at registration time + any deferred scoped pipes
      pipes: [...this.pipes, ...(deferred?.pipes ?? [])],
    };

    if (deferred) {
      const idx = this.events.indexOf(deferred);
      this.events.splice(idx, 1, entry);
    } else {
      this.events.push(entry);
    }

    if (typeof eventConfig?.authorization == "object")
      authActionService.add(
        eventConfig.authorization!.action,
        eventConfig.authorization!.resource,
        {
          [eventConfig.event]: eventConfig.authorization?.rule,
        }
      );

    return this;
  }

  /**
   * Register a lifecycle hook.
   *
   * - `"connection"` — called after a socket successfully connects and passes authentication.
   * - `"disconnect"` — called when a socket disconnects.
   * - `"error"` — called when an error is thrown inside any event handler.
   *   If not registered, Arkos emits a default `"error"` event to the socket.
   *
   * @example
   * chatGateway.hook("connection", (socket) => {
   *   console.log("connected", socket.user.id)
   * })
   *
   * chatGateway.hook("disconnect", (socket) => {
   *   console.log("disconnected", socket.id)
   * })
   *
   * chatGateway.hook("error", (err, socket) => {
   *   socket.emit("error", { message: err.message })
   * })
   */
  hook(type: "connection", handler: ArkosGatewayConnectionHandler): this;
  hook(type: "disconnect", handler: ArkosGatewayConnectionHandler): this;
  hook(type: "error", handler: ArkosGatewayErrorHandler): this;
  hook(
    type: ArkosGatewayHookType,
    handler: ArkosGatewayConnectionHandler | ArkosGatewayErrorHandler
  ): this {
    this.hooks.push({ type, handler });
    return this;
  }

  /**
   * Wire this gateway into a Socket.io `Server` instance.
   * Registers the namespace, auth middleware, rate limiting, pipes,
   * and all event handlers — then recurses into child gateways.
   *
   * @example
   * const io = new Server(server)
   * chatGateway.register(io)
   */
  register(io: Server, options: ArkosGatewayRegisterOptions = {}): void {
    if ((io as any)._arkosGatewayRegistered)
      throw new Error(
        `The method gateway.register() can only be called once per io server instance. Use gateway.use() to compose gateways, see https://www.arkosjs.com/docs/components/advanced-guides/web-sockets/setup.`
      );
    (io as any)._arkosGatewayRegistered = true;
    this._register(io, undefined, this.hooks || [], this.pipes || [], options);
  }

  private _register(
    io: Server,
    parentConfig?: ArkosGatewayConfig,
    inheritedHooks: {
      type: ArkosGatewayHookType;
      handler: ArkosGatewayHookHandler;
    }[] = [],
    inheritedPipes: ArkosGatewayPipe[] = [],
    options: ArkosGatewayRegisterOptions = {}
  ): void {
    options.store = options.store ?? defaultGatewayStore;
    const { store } = options;
    this.registryOptions = options;

    const parentName = parentConfig?.name;
    const ownName = this.config.name;
    this.io = io;
    this.config = deepmerge(parentConfig || {}, this.config, {
      arrayMerge: (_, sourceArray) => sourceArray,
    });
    this.config.name = ownName;
    const localConfig = this.config;

    const namespaceName = parentName
      ? `${parentName.replace(/\/$/, "")}/${ownName.replace(/^\//, "")}`
      : (ownName ?? "");

    const ns = io.of(namespaceName);

    const resolvedAuth =
      this.config.authentication !== false &&
      parentConfig?.authentication !== false;

    const resolvedRateLimit = this.config.rateLimit ?? parentConfig?.rateLimit;
    const resolvedHooks = [...inheritedHooks, ...this.hooks];

    const connectHandlers = resolvedHooks
      .filter((h) => h.type === "connection")
      .map((h) => h.handler as ArkosGatewayConnectionHandler);

    const disconnectHandlers = resolvedHooks
      .filter((h) => h.type === "disconnect")
      .map((h) => h.handler as ArkosGatewayConnectionHandler);

    const errorHandlers = resolvedHooks
      .filter((h) => h.type === "error")
      .map((h) => h.handler as ArkosGatewayErrorHandler);

    if (resolvedAuth) {
      ns.use(async (socket: ArkosSocket, next) => {
        const startTime = new Date().getTime();
        try {
          await authHookManager.runAuthenticate(
            {
              context: socket,
              done: (err?: any) => {
                if (err) throw err;
                next();
              },
            },
            async (socket) => {
              const user = await authService.getAuthenticatedUser(socket);
              if (!user) throw loginRequiredError;
              return user;
            }
          );
        } catch (err: any) {
          handleArkosGatewayErrors(err, socket, errorHandlers, {
            startTime,
            namespace: this.config.name,
            event: "authentication",
          });
          next(err);
        }
      });
    }

    ns.on("connection", async (socket: ArkosSocket) => {
      socket.locals = {};
      handleGatewayLifecycleLog(this.config.name, "connected", socket.id);
      const connectionStartTime = new Date().getTime();

      if (socket.user?.id) socket.join(`arkos::user:${socket.user.id}`);

      try {
        for (const handler of connectHandlers) await handler(socket);
      } catch (err: any) {
        handleArkosGatewayErrors(err, socket, [], {
          startTime: connectionStartTime,
          namespace: this.config.name,
          event: "connection",
        });
        return;
      }

      socket.on("disconnect", async () => {
        handleGatewayLifecycleLog(this.config.name, "disconnected", socket.id);

        await clearRateLimitForSocket(socket.id, store);
        try {
          for (const handler of disconnectHandlers) await handler(socket);
        } catch (err) {
          handleArkosGatewayErrors(err, socket, [], {
            startTime: connectionStartTime,
            namespace: this.config.name,
            event: "disconnection",
          });
        }
      });

      for (const entry of this.events) {
        if ((entry.config as any)._pipeOnly || !entry.handler) continue;

        const { config: eventConfig, handler, pipes: eventPipes = [] } = entry;

        socket.on(eventConfig.event, async (...args: any[]) => {
          socket.locals = {};
          const startTime = new Date().getTime();
          let data = args[0];

          const ack =
            typeof args[args.length - 1] === "function"
              ? args[args.length - 1]
              : undefined;

          let ackCalled = false;
          const wrappedAck = ack
            ? (...response: any) => {
                ackCalled = true;
                ack(...response);
              }
            : undefined;

          function resolveDedup() {
            if (
              eventConfig.dedup === false ||
              localConfig.dedup === false ||
              parentConfig?.dedup === false
            )
              return null;

            return {
              enabled: true,
              ttl: 3600,
              ...parentConfig?.dedup,
              ...localConfig?.dedup,
              ...eventConfig?.dedup,
            };
          }

          const dedupOpt = resolveDedup();

          try {
            const meta = data?._meta || {};
            const resolvedMaxAge =
              eventConfig.maxAge ?? localConfig.maxAge ?? parentConfig?.maxAge;

            if (resolvedMaxAge && !meta.timestamp)
              throw new BadRequestError(
                "Missing _meta.timestamp for maxAge deduplication"
              );

            if (meta.timestamp !== undefined) {
              const timestamp = new Date(meta.timestamp);

              if (isNaN(timestamp.getTime())) {
                throw new BadRequestError(
                  "Invalid data._meta.timestamp",
                  "InvalidTimestamp"
                );
              }

              const age = Date.now() - timestamp.getTime();

              if (age < 0) {
                throw new BadRequestError(
                  "Timestamp is in the future",
                  "FutureTimestamp"
                );
              }

              if (resolvedMaxAge && age > resolvedMaxAge) {
                throw new BadRequestError("Message is too old", "StaleMessage");
              }
            }

            if (dedupOpt && dedupOpt?.enabled !== false) {
              if (!meta?.mid)
                throw new BadRequestError(
                  "Missing data._meta.mid in your payload for deduplication",
                  "MissingDedupMessageId",
                  { data }
                );

              if (typeof meta.mid !== "string" || meta.mid.trim() === "")
                throw new BadRequestError(
                  "Invalid data._meta.mid, it must be a non-empty string",
                  "InvalidMessageId"
                );

              const key = `arkos::dedup:${eventConfig.event}:${meta.mid}`;
              const ttl = dedupOpt?.ttl ?? 3600;

              const acquired = await store.setIfNotExists(key, ttl);

              if (acquired === false)
                return wrappedAck?.({
                  success: true,
                  duplicate: true,
                });

              const { _meta, ...payload } = data;
              data = payload;

              socket.meta = meta;
            }

            const rateLimitOptions = eventConfig.rateLimit ?? resolvedRateLimit;
            if (rateLimitOptions !== false) {
              const { allowed, retryAfter } = await checkRateLimit(
                socket.id,
                eventConfig.event,
                rateLimitOptions || {},
                options.store!
              );
              if (!allowed) {
                throw new TooManyRequestsError(undefined, undefined, {
                  retryAfter,
                });
              }
            }

            if (typeof eventConfig.authorization === "object" && resolvedAuth) {
              await authHookManager.runAuthorize(
                { context: socket, done: () => {} },
                eventConfig.event,
                this.config.name!,
                eventConfig.authorization!.rule
              );
            }

            if (eventConfig.validation) {
              const arkosConfig = getArkosConfig();
              const {
                validationFn,
                isValidValidator,
                validatorName,
                validatorNameType,
              } = validationManager;

              if (!isValidValidator(eventConfig.validation))
                throw new Error(
                  `Your validation resolver is set to ${arkosConfig.validation!.resolver}, ` +
                    `please provide a valid ${validatorName} in order to use { validation: ${validatorNameType} } ` +
                    `under event handler "${eventConfig.event}" in "${this.config.name}" gateway.`
                );

              const shouldValidate = validationManager.shouldValidate(
                eventConfig.validation,
                data
              );

              if (shouldValidate === "prohibit")
                throw new BadRequestError(
                  "Event data is not allowed for this event.",
                  "EventDataNotAllowed",
                  { data }
                );
              else if (shouldValidate === "passthrough") data = data;
              else {
                try {
                  data = await (validationFn as any)(
                    eventConfig.validation,
                    data
                  );
                } catch (err: any) {
                  const { validationConfig } = validationManager;

                  const resolver = validationConfig?.resolver;
                  const isZod = validationConfig?.resolver === "zod";

                  const prettifiedError = errorPrettifier.prettify(
                    resolver as any,
                    err
                  );
                  const error = prettifiedError[0];

                  throw new BadRequestError(
                    error.message,
                    `InvalidData`,
                    isZod ? err.format() : err
                  );
                }
              }
            }

            socket.data = data;

            await runArkosGatewayPipes(
              [...inheritedPipes, ...eventPipes],
              socket,
              data
            );

            await handler(socket, data, wrappedAck);

            handleGatewayEventLog(
              this.config.name,
              eventConfig.event,
              200,
              startTime
            );

            if (eventConfig.ack && ack && !ackCalled) {
              ack({ success: true });
            }
          } catch (err: any) {
            handleArkosGatewayErrors(
              err,
              socket,
              errorHandlers,
              {
                startTime,
                namespace: this.config.name,
                event: eventConfig.event,
              },
              ack
            );
          }
        });
      }
    });

    for (const child of this.gateways) {
      child._register(
        io,
        {
          name: namespaceName,
          authentication: resolvedAuth,
          rateLimit: resolvedRateLimit,
        },
        resolvedHooks,
        inheritedPipes,
        options
      );
    }
  }

  /**
   * Returns a builder for querying and managing a specific socket connection.
   * Accepts a socket ID. If the socket is no longer connected, operations
   * no-op or return `{ success: false, reason: "not_found" }`.
   *
   * @example
   * await gateway.socket(socketId).join("room-123")
   * await gateway.socket(socketId).leave("room-123")
   * gateway.socket(socketId).disconnect()
   * const rooms = await gateway.socket(socketId).rooms()
   * const connected = await gateway.socket(socketId).isConnected()
   * await gateway.socket(socketId).emit("notification", data)
   *
   * @since 1.7.0-canary.28
   */
  socket(socketId: string) {
    return new GatewaySocketBuilder(
      socketId,
      this.io!.of(this.config.name!),
      this.config,
      this.registryOptions?.store!
    );
  }

  /**
   * Returns a builder for querying and managing a specific user across
   * all their active socket connections.
   *
   * @example
   * await gateway.user(userId).join("room-123")
   * await gateway.user(userId).leave("room-123")
   * await gateway.user(userId).disconnect()
   * const rooms = await gateway.user(userId).rooms()
   * const online = await gateway.user(userId).isOnline()
   * await gateway.user(userId).emit("notification", data)
   * await gateway.user(userId).except({ socket: socketId }).emit("sync", data)
   *
   * @since 1.7.0-canary.28
   */
  user(userId: string) {
    return new GatewayUserBuilder(
      userId,
      this.io!.of(this.config.name!),
      this.config,
      this.registryOptions?.store!
    );
  }

  /**
   * Returns a builder for querying and emitting to a specific room.
   *
   * @example
   * await gateway.room("room-123").emit("update", data)
   * await gateway.room("room-123").except({ socket: socketId }).emit("update", data)
   * await gateway.room("room-123").except({ user: userId }).emit("update", data)
   * await gateway.room("room-123").except({ room: "other-room" }).emit("update", data)
   * const size = await gateway.room("room-123").size()
   * const users = await gateway.room("room-123").users()
   * const hasUser = await gateway.room("room-123").has({ user: userId })
   *
   * @since 1.7.0-canary.28
   */
  room(roomId: string) {
    return new GatewayRoomBuilder(
      roomId,
      this.io!.of(this.config.name!),
      this.config,
      this.registryOptions?.store!
    );
  }

  /**
   * Returns a builder for broadcasting events to all sockets in this
   * gateway's namespace, with optional exclusions.
   *
   * @example
   * await gateway.broadcast().emit("announcement", data)
   * await gateway.broadcast().except({ socket: socketId }).emit("announcement", data)
   * await gateway.broadcast().except({ room: roomId }).emit("announcement", data)
   * await gateway.broadcast().except({ user: userId }).emit("announcement", data)
   *
   * @since 1.7.0-canary.28
   */
  broadcast() {
    return new GatewayBroadcastBuilder(
      this.io!.of(this.config.name!),
      this.config,
      this.registryOptions?.store!
    );
  }
}

/**
 * Creates an Arkos WebSocket Gateway backed by Socket.io.
 *
 * Handles authentication, validation, rate limiting, middleware,
 * error handling, and nested gateways — all declaratively.
 *
 * @example
 * ```ts
 * // chat.gateway.ts
 * const chatGateway = ArkosGateway({
 *   name: "chat",
 *   authentication: true,
 *   rateLimit: { windowMs: 60_000, max: 200 },
 * })
 *
 * chatGateway.use((socket, data, next) => {
 *   console.log(`[${socket.user.id}] event received`)
 *   next()
 * })
 *
 * chatGateway.on(
 *   { event: "send_message", validation: MessageSchema, ack: true },
 *   (socket, data, ack) => {
 *     socket.to(data.room).emit("receive_message", data)
 *     ack?.({ status: "ok" })
 *   }
 * )
 *
 * // app.ts
 * const app = arkos()
 * await app.build()
 *
 * const server = http.createServer(app)
 * const io = new Server(server)
 *
 * chatGateway.register(io)
 *
 * app.listen(server)
 * ```
 * @since 1.7.0-canary.18
 * @see {@link https://www.arkosjs.com/docs/core-concepts/components/gateways} for full documentation
 */
function ArkosGateway(config: ArkosGatewayConfig) {
  return new IArkosGateway(config);
}

export default ArkosGateway;
