import { useMemo } from "react";
import { GatewayClient } from "@arkosjs/websockets-client";
import { useWebsocketClient } from "../provider";
import { useSocketOn } from "./use-socket-on";
import { useSocketEmit } from "./use-socket-emit";
import { useGatewayStatus } from "./use-gateway-status";
import type {
  ArkosEmitOptions,
  ArkosEventHandler,
} from "@arkosjs/websockets-client";

/**
 * Returns a scoped gateway handle for a given namespace.
 * All hooks hang off this handle — no need to pass namespace around.
 *
 * The namespace socket is lazily created on first call and reused.
 *
 * @example
 * const chat = useGateway("/chat")
 *
 * chat.on("receive_message", (data) => setMessages(prev => [...prev, data]))
 *
 * const sendMessage = chat.useEmit("send_message")
 * sendMessage.emit({ room: "general", content: "hello" })
 *
 * chat.join("room-123")
 * chat.status   // "connected" | "reconnecting" | "disconnected"
 * chat.user     // mirrors socket.user from server auth
 */
export function useGateway(namespace: string) {
  const client = useWebsocketClient();
  const gateway = useMemo(() => client.gateway(namespace), [client, namespace]);

  return useMemo(
    () => ({
      /**
       * Listen to a server event. Cleans up automatically on unmount.
       * Client-side dedup is applied automatically when _meta.mid is present.
       *
       * @example
       * chat.on("receive_message", (data) => {
       *   setMessages(prev => [...prev, data])
       * })
       */
      on<T = any>(
        event: string,
        handler: ArkosEventHandler<T>,
        deps: any[] = []
      ) {
        // eslint-disable-next-line react-hooks/rules-of-hooks
        return useSocketOn(gateway, event, handler, deps);
      },

      /**
       * Returns an emitter object for the given event.
       * Name it after what it does for readability.
       *
       * @example
       * const sendMessage = chat.useEmit("send_message")
       *
       * sendMessage.emit({ room: "general", content: "hello" })
       * sendMessage.emit(data, { ack: true, timeout: 5000, retries: 3 })
       * sendMessage.loading
       * sendMessage.error
       * sendMessage.lastEmittedAt
       * sendMessage.reset()
       */
      useEmit<TData extends Record<string, any>, TResponse = any>(
        event: string,
        defaultOptions?: ArkosEmitOptions
      ) {
        // eslint-disable-next-line react-hooks/rules-of-hooks
        return useSocketEmit<TData, TResponse>(gateway, event, defaultOptions);
      },

      /**
       * Reactive connection status for this namespace.
       * @example
       * chat.status // "connected" | "reconnecting" | "disconnected" | "connecting"
       */
      // eslint-disable-next-line react-hooks/rules-of-hooks
      get status() {
        return useGatewayStatus(gateway);
      },

      /**
       * Escape hatch to the raw GatewayClient.
       */
      raw: gateway as GatewayClient,
    }),
    [gateway]
  );
}
