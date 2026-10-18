import {
  markRaw,
  onScopeDispose,
  reactive,
  ref,
  shallowRef,
  watch,
} from "vue";
import type {
  ArkosEmitOptions,
  ArkosEventHandler,
  GatewayClient,
  GatewayStatus,
} from "@arkosjs/websockets-client";
import type { SocketOptions } from "socket.io-client";
import { useWebsocketClientRef } from "../provider";
import { useSocketEmit, type SocketEmitter } from "./use-emit";

export interface GatewayHandle {
  /**
   * Listen to a server event. Cleaned up automatically when the component
   * unmounts; the returned function unsubscribes early.
   * Client-side dedup is applied automatically when _meta.mid is present.
   */
  on<T = any>(event: string, handler: ArkosEventHandler<T>): () => void;

  /**
   * Returns a reactive emitter object for the given event.
   */
  useEmit<TData extends Record<string, any>, TResponse = any>(
    event: string,
    defaultOptions?: ArkosEmitOptions
  ): SocketEmitter<TData, TResponse>;

  /**
   * Reactive connection status for this namespace.
   */
  status: GatewayStatus;

  /**
   * Escape hatch to the raw GatewayClient.
   */
  raw: GatewayClient;
}

interface Registration {
  event: string;
  handler: ArkosEventHandler;
  off: () => void;
}

/**
 * Returns a scoped, reactive gateway handle for a given namespace.
 * Must be called from a component `setup()` (or an effect scope).
 *
 * The namespace socket is lazily created on first call and reused, so calling
 * this twice with the same namespace shares one connection.
 *
 * @example
 * const chat = useGateway("/chat")
 *
 * const off = chat.on("receive_message", (data) => { messages.value.push(data) })
 *
 * const sendMessage = chat.useEmit("send_message")
 * sendMessage.emit({ room: "general", content: "hello" })
 *
 * chat.status   // "connected" | "reconnecting" | "disconnected"
 */
export function useGateway(
  namespace: string,
  opts?: Partial<SocketOptions>
): GatewayHandle {
  const client = useWebsocketClientRef();
  const gateway = shallowRef<GatewayClient>(
    markRaw(client.value.gateway(namespace, opts))
  );
  const status = ref<GatewayStatus>(gateway.value.status);

  const registrations = new Set<Registration>();

  function subscribeToStatus(): () => void {
    status.value = gateway.value.status;
    return gateway.value.subscribe({
      onStatus: (nextStatus) => {
        status.value = nextStatus;
      },
    });
  }

  let statusOff = subscribeToStatus();

  function on<T = any>(
    event: string,
    handler: ArkosEventHandler<T>
  ): () => void {
    const registration: Registration = {
      event,
      handler: handler as ArkosEventHandler,
      off: gateway.value.on<T>(event, handler),
    };
    registrations.add(registration);

    return () => {
      registration.off();
      registrations.delete(registration);
    };
  }

  function useEmit<TData extends Record<string, any>, TResponse = any>(
    event: string,
    defaultOptions?: ArkosEmitOptions
  ): SocketEmitter<TData, TResponse> {
    return useSocketEmit<TData, TResponse>(gateway, event, defaultOptions);
  }

  // Re-bind listeners and status to the new client's gateway.
  const stopWatching = watch(client, (nextClient) => {
    statusOff();
    for (const registration of registrations) {
      registration.off();
    }

    gateway.value = markRaw(nextClient.gateway(namespace, opts));
    statusOff = subscribeToStatus();

    for (const registration of registrations) {
      registration.off = gateway.value.on(
        registration.event,
        registration.handler
      );
    }
  });

  onScopeDispose(() => {
    stopWatching();
    statusOff();
    for (const registration of registrations) {
      registration.off();
    }
    registrations.clear();
  });

  return reactive({
    on,
    useEmit,
    status,
    raw: gateway,
  });
}
