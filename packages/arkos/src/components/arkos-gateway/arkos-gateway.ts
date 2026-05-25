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
  GatewayEmitBuilder,
  GatewayRoomBuilder,
  GatewayUserBuilder,
  GatewayUserEmitBuilder,
} from "./utils/gateway-builders";
import deepmerge from "../../utils/helpers/deepmerge.helper";

const usersSockets = new Map<string, Set<string>>();

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
   * chatGateway.use((socket, data, io) => {
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
   * chatGateway.pipe((socket, data, io) => {
   * })
   *
   * // runs only before "send_message"
   * chatGateway.pipe({ event: "send_message" }, (socket, data, io) => {
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
   *   (socket, data, io, ack) => {
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
          `but the gateway has authentication: false. Enable authentication on the gateway to use per-event authorization.`
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

    authActionService.add(eventConfig.event, this.config.name!, {
      [eventConfig.event]: eventConfig.authorization,
    });

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
   * chatGateway.hook("connection", (socket, io) => {
   *   console.log("connected", socket.user.id)
   * })
   *
   * chatGateway.hook("disconnect", (socket, io) => {
   *   console.log("disconnected", socket.id)
   * })
   *
   * chatGateway.hook("error", (err, socket, io) => {
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
  register(io: Server): void {
    this._register(io);
  }

  _register(
    io: Server,
    parentConfig?: ArkosGatewayConfig,
    inheritedHooks: {
      type: ArkosGatewayHookType;
      handler: ArkosGatewayHookHandler;
    }[] = [],
    inheritedPipes: ArkosGatewayPipe[] = []
  ): void {
    const parentName = parentConfig?.name;
    const ownName = this.config.name;
    this.io = io;
    this.config = deepmerge(parentConfig || {}, this.config, {
      arrayMerge: (_, sourceArray) => sourceArray,
    });
    this.config.name = ownName;

    const namespaceName = parentName
      ? `${parentName}${ownName ?? ""}`
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
        try {
          await authHookManager.runAuthenticate(
            { context: socket, done: next },
            async (socket) => {
              const user = await authService.getAuthenticatedUser(socket);
              if (!user) throw loginRequiredError;
              return user;
            }
          );
        } catch (err: any) {
          next(err);
        }
      });
    }

    ns.on("connection", async (socket: ArkosSocket) => {
      handleGatewayLifecycleLog(this.config.name, "connected", socket.id);
      const connectionStartTime = new Date().getTime();

      if (socket.user?.id) {
        if (!usersSockets.has(socket.user.id))
          usersSockets.set(socket.user.id, new Set());

        usersSockets.get(socket.user.id)!.add(socket.id);
      }

      socket.on("disconnect", async () => {
        handleGatewayLifecycleLog(this.config.name, "disconnected", socket.id);

        if (socket.user?.id) {
          usersSockets.get(socket.user.id)?.delete(socket.id);
          if (usersSockets.get(socket.user.id)?.size === 0) {
            usersSockets.delete(socket.user.id);
          }
        }

        clearRateLimitForSocket(socket.id);
        try {
          for (const handler of disconnectHandlers) await handler(socket, io);
        } catch (err) {
          handleArkosGatewayErrors(err, socket, io, [], {
            startTime: connectionStartTime,
            namespace: this.config.name,
            event: "disconnection",
          });
        }
      });

      try {
        for (const handler of connectHandlers) await handler(socket, io);
      } catch (err: any) {
        handleArkosGatewayErrors(err, socket, io, [], {
          startTime: connectionStartTime,
          namespace: this.config.name,
          event: "connection",
        });
        return;
      }

      for (const entry of this.events) {
        if ((entry.config as any)._pipeOnly || !entry.handler) continue;

        const { config: eventConfig, handler, pipes: eventPipes = [] } = entry;

        socket.on(eventConfig.event, async (...args: any[]) => {
          const startTime = new Date().getTime();
          let data = args[0];

          const ack =
            eventConfig.ack && typeof args[args.length - 1] === "function"
              ? args[args.length - 1]
              : undefined;

          try {
            const rateLimitOptions = eventConfig.rateLimit ?? resolvedRateLimit;
            if (rateLimitOptions) {
              const { allowed, retryAfter } = checkRateLimit(
                socket.id,
                eventConfig.event,
                rateLimitOptions
              );
              if (!allowed) {
                throw new TooManyRequestsError(undefined, undefined, {
                  retryAfter,
                });
              }
            }

            if (eventConfig.authorization && resolvedAuth) {
              await authHookManager.runAuthorize(
                { context: socket, done: () => {} },
                eventConfig.event,
                this.config.name!,
                eventConfig.authorization
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
              data,
              io
            );

            await handler(socket, data, io, ack);

            handleGatewayEventLog(
              this.config.name,
              eventConfig.event,
              200,
              startTime
            );
          } catch (err: any) {
            handleArkosGatewayErrors(
              err,
              socket,
              io,
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
        inheritedPipes
      );
    }
  }

  /**
   * Returns a builder for sending events to a specific user across all
   * their active socket connections.
   *
   * Supports deduplication, timeout, and retries.
   *
   * @example
   * await gateway.toUser(userId).emit("notification", data)
   * await gateway.toUser(userId).emit("order_update", data, {
   *   timeout: 5000,
   *   retries: 3,
   *   dedup: { enabled: true, ttl: 60 }
   * })
   *
   * @since 1.7.0-canary.19
   */
  toUser(userId: string) {
    return new GatewayUserEmitBuilder(
      userId,
      usersSockets,
      this.io!,
      this.config
    );
  }

  /**
   * Returns a builder for sending events to all sockets in a room.
   *
   * Supports deduplication.
   *
   * @example
   * await gateway.toRoom("room-123").emit("update", data)
   *
   * @since 1.7.0-canary.19
   */
  toRoom(room: string) {
    return new GatewayEmitBuilder(
      this.io!.of(this.config.name).to(room),
      this.config
    );
  }

  /**
   * Returns a builder for broadcasting events to all sockets
   * connected to this gateway's namespace.
   *
   * Supports deduplication.
   *
   * @example
   * await gateway.toAll().emit("announcement", data)
   *
   * @since 1.7.0-canary.19
   */
  toAll() {
    return new GatewayEmitBuilder(this.io!.of(this.config.name), this.config);
  }

  /**
   * Returns a handle for querying state and managing a specific user.
   *
   * @example
   * gateway.user(userId).isOnline()
   * gateway.user(userId).socketCount()
   *
   * @since 1.7.0-canary.19
   */
  user(userId: string) {
    return new GatewayUserBuilder(userId, usersSockets);
  }

  /**
   * Returns a handle for querying state of a specific room.
   *
   * @example
   * gateway.room("room-123").sockets()
   * gateway.room("room-123").size()
   *
   * @since 1.7.0-canary.19
   */
  room(roomId: string) {
    return new GatewayRoomBuilder(roomId, this.io!.of(this.config.name));
  }

  /**
   * Returns a builder for sending events to a specific socket connection.
   * Use this when you have a direct socket reference and want Arkos sugar
   * (deduplication, timeout, retries) on top of native socket.emit().
   *
   * For most direct responses inside a handler, native socket.timeout().emit()
   * is sufficient. Use this when deduplication matters on a per-socket emit.
   *
   * @example
   * await gateway.toSocket(socket).emit("notification", data)
   * await gateway.toSocket(socket).emit("order_update", data, {
   *   timeout: 5000,
   *   retries: 3,
   *   dedup: { enabled: true, ttl: 60 }
   * })
   *
   * @since 1.7.0-canary.19
   */
  toSocket(socket: ArkosSocket) {
    return new GatewayUserEmitBuilder(
      socket.user?.id ?? socket.id,
      new Map([[socket.user?.id ?? socket.id, new Set([socket.id])]]),
      this.io!,
      this.config
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
 *   (socket, data, io, ack) => {
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
