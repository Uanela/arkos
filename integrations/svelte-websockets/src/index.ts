export { default as ArkosProvider } from "./ArkosProvider.svelte";
export { useGateway } from "./use-gateway.svelte.js";

export type { Gateway, GatewayState } from "./use-gateway.svelte.js";
export type { SocketEmitter, EmitterState } from "./use-emit.svelte.js";

export type {
  WebsocketClient,
  GatewayClient,
  ArkosEmitOptions,
  ArkosEmitResult,
  ArkosEventHandler,
  GatewayStatus,
} from "@arkosjs/websockets-client";
