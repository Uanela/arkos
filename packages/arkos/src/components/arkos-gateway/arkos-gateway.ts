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
import deepmerge from "../../utils/helpers/deepmerge.helper";
import { defaultGatewayStore } from "./utils/memory-gateway-store";
import { mountArkosSocketExtensions } from "./socket-extensions";
import {
  isAuthenticationEnabled,
  isUsingAuthentication,
} from "../../utils/helpers/arkos-config.helpers";
import ExitError from "../../utils/helpers/exit-error";
import { getUserFileExtension } from "../../utils/helpers/fs.helpers";

export class IArkosGateway {
  private config: ArkosGatewayConfig;
  private events: ArkosGatewayEventEntry[] = [];
  private pipes: ArkosGatewayPipe[] = [];
  private gateways: IArkosGateway[] = [];
  private hooks: {
    type: ArkosGatewayHookType;
    handler: ArkosGatewayHookHandler;
  }[] = [];

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
   * chatGateway.use((socket, next) => {
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
   * handler in this gateway and drills down to child gateways.
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
      pipes: [...this.pipes, ...(deferred?.pipes ?? [])],
    };

    if (deferred) {
      const idx = this.events.indexOf(deferred);
      this.events.splice(idx, 1, entry);
    } else {
      this.events.push(entry);
    }

    if (typeof eventConfig?.authorization == "object")
      eventConfig.authorization._authAction = authActionService.add(
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

    const parentName = parentConfig?.name;
    const ownName = this.config.name;
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

    if (resolvedAuth && isAuthenticationEnabled()) {
      ns.use(async (socket: any, next) => {
        socket = socket as ArkosSocket;
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
            },
            "currentUser"
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
    } else if (
      (this.config.authentication || parentConfig?.authentication) &&
      !isUsingAuthentication()
    )
      throw ExitError(
        `Trying to authenticate gateway ${this.config.name ? ` ${this.config.name}` : ""} without choosing an authentication mode under arkos.config.${getUserFileExtension()}.

For further help see https://www.arkosjs.com/docs/core-concepts/authentication/setup.`
      );

    ns.on("connection", async (s) => {
      const socket = s as ArkosSocket;
      socket.locals = {};

      socket._arkos = { store, gatewayConfig: localConfig };
      mountArkosSocketExtensions(socket);

      handleGatewayLifecycleLog(this.config.name, "connected", socket.id);
      const connectionStartTime = new Date().getTime();

      if (socket.currentUser?.id)
        socket.join(`arkos::user:${socket.currentUser.id}`);

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

              if (age + 1000 < 0)
                throw new BadRequestError(
                  "Timestamp is in the future",
                  "FutureTimestamp"
                );

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

            if (
              typeof eventConfig.authorization === "object" &&
              resolvedAuth &&
              isAuthenticationEnabled()
            ) {
              await authHookManager.runAuthorize(
                { context: socket, done: () => {} },
                eventConfig?.authorization?._authAction,
                "currentUser"
              );
            } else if (
              (this.config.authentication || parentConfig?.authentication) &&
              !isUsingAuthentication()
            )
              throw ExitError(
                `Trying to use authorization gateway.on("${eventConfig.event}") without choosing an authentication mode under arkos.config.${getUserFileExtension()}.

For further help see https://www.arkosjs.com/docs/core-concepts/authentication/setup.`
              );

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
}

/**
 * Creates an Arkos WebSocket Gateway backed by Socket.io.
 *
 * Handles authentication, validation, rate limiting, pipes,
 * error handling, and nested gateways — all declaratively.
 * Enhances every connected socket with `socket.user()`, `socket.peer()`,
 * `socket.retry()`, and automatic `_meta` injection on outgoing emits.
 *
 * @example
 * ```ts
 * const chatGateway = ArkosGateway({
 *   name: "chat",
 *   authentication: true,
 *   rateLimit: { windowMs: 60_000, max: 200 },
 * })
 *
 * chatGateway.on(
 *   { event: "send_message", validation: MessageSchema, ack: true },
 *   (socket, data, ack) => {
 *     socket.to(data.room).emit("receive_message", data)
 *     ack?.({ status: "ok" })
 *   }
 * )
 * ```
 * @since 1.7.0-canary.18
 * @see {@link https://www.arkosjs.com/docs/core-concepts/components/gateways}
 */
function ArkosGateway(config: ArkosGatewayConfig) {
  return new IArkosGateway(config);
}

export default ArkosGateway;
