export { WebSocketProvider, useWebsocketClient } from "../provider";
export { useGateway } from "../hooks/use-gateway";

export type {
  WebsocketClient,
  ArkosEmitOptions,
  ArkosEmitResult,
  ArkosEventHandler,
  GatewayStatus,
} from "@arkosjs/websockets-client";

export type { SocketEmitter } from "../hooks/use-socket-emit";
