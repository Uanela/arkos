export { WebSocketProvider, useWebsocketClient } from "../provider";
export { useGateway } from "../composables/use-gateway";

export type { GatewayHandle } from "../composables/use-gateway";
export type { SocketEmitter } from "../composables/use-emit";

export type {
  WebsocketClient,
  ArkosEmitOptions,
  ArkosEmitResult,
  ArkosEventHandler,
  GatewayStatus,
} from "@arkosjs/websockets-client";
