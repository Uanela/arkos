import { Server, Socket } from "socket.io";
import { User } from "../../types";
import { DefaultEventsMap } from "socket.io";
import { Validator } from "../../types/validation/validator";
import { Options as RateLimitOptions } from "express-rate-limit";
import { ArkosPolicyRule } from "../arkos-policy/types";
import { CorsOptions } from "cors";

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
  rateLimit?: Partial<RateLimitOptions>;

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
   * Disables this event handler without removing it.
   * Useful for feature flags or temporary disabling.
   */
  disabled?: boolean;
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
   * Arkos prepends "/" internally — just pass the name.
   * If omitted, defaults to the root namespace "/".
   *
   * @example
   * name: "chat"
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
   * CORS options passed to the Socket.io namespace.
   *
   * @example
   * cors: { origin: "https://myapp.com" }
   */
  cors?: CorsOptions;

  /**
   * Called after a socket successfully connects (and passes auth if enabled).
   */
  onConnect?: ArkosGatewayConnectionHandler;

  /**
   * Called when a socket disconnects.
   */
  onDisconnect?: ArkosGatewayConnectionHandler;

  /**
   * Called when an AppError is thrown inside any event handler.
   * If not provided, Arkos emits a default "error" event to the socket.
   */
  onError?: ArkosGatewayErrorHandler;
};

export class ArkosGatewayController {}
