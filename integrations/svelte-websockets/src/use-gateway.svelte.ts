import { onDestroy, untrack } from "svelte";
import type { Readable } from "svelte/store";
import type {
  ArkosEmitOptions,
  ArkosEventHandler,
  GatewayClient,
  GatewayStatus,
} from "@arkosjs/websockets-client";
import type { SocketOptions } from "socket.io-client";
import { getArkosClientRef } from "./context.svelte.js";
import { createEmitter, type SocketEmitter } from "./use-emit.svelte.js";
import { StoreBridge } from "./store-bridge.js";

export interface GatewayState {
  status: GatewayStatus;
}

export interface Gateway extends Readable<GatewayState> {
  on<T = any>(event: string, handler: ArkosEventHandler<T>): () => void;
  useEmit<TData extends Record<string, any>, TResponse = any>(
    event: string,
    defaultOptions?: ArkosEmitOptions
  ): SocketEmitter<TData, TResponse>;
  readonly status: GatewayStatus;
  readonly namespace: string;
  readonly raw: GatewayClient;
}

interface Listener {
  event: string;
  handler: ArkosEventHandler;
  off?: () => void;
}

/**
 * Returns a reactive handle for a gateway namespace.
 * Pass the namespace as a getter to re-subscribe when it changes.
 *
 * @example
 * const chat = useGateway("/chat");
 *
 * chat.on("receive_message", (data) => messages.push(data));
 *
 * const sendMessage = chat.useEmit("send_message");
 * sendMessage.emit({ text: "hello" }, { ack: true });
 *
 * chat.status;  // runes
 * $chat.status; // store
 */
export function useGateway(
  namespace: string | (() => string),
  opts?: Partial<SocketOptions>
): Gateway {
  const clientRef = getArkosClientRef();
  const getNamespace =
    typeof namespace === "function" ? namespace : () => namespace;
  const listeners = new Set<Listener>();

  const initialNamespace = untrack(getNamespace);
  const initialGateway = untrack(() =>
    clientRef.current.gateway(initialNamespace, opts)
  );

  let currentNamespace = $state(initialNamespace);
  let gateway = $state.raw(initialGateway);
  let status = $state<GatewayStatus>(initialGateway.status);

  const store = new StoreBridge<GatewayState>(() => ({ status }));

  function attach(target: GatewayClient): () => void {
    status = target.status;
    store.notify();

    const unsubscribe = target.subscribe({
      onStatus: (next) => {
        status = next;
        store.notify();
      },
    });
    for (const listener of listeners) {
      listener.off = target.on(listener.event, listener.handler);
    }

    return () => {
      unsubscribe();
      for (const listener of listeners) {
        listener.off?.();
        listener.off = undefined;
      }
    };
  }

  let detach = untrack(() => attach(initialGateway));

  $effect.pre(() => {
    const nextNamespace = getNamespace();
    const client = clientRef.current;

    untrack(() => {
      const next = client.gateway(nextNamespace, opts);
      if (next === gateway) return;
      detach();
      currentNamespace = nextNamespace;
      gateway = next;
      detach = attach(next);
    });
  });

  onDestroy(() => {
    detach();
    listeners.clear();
  });

  return {
    on<T = any>(event: string, handler: ArkosEventHandler<T>) {
      const listener: Listener = { event, handler: (data) => handler(data) };
      listeners.add(listener);
      listener.off = untrack(() => gateway).on(event, listener.handler);

      return () => {
        listener.off?.();
        listeners.delete(listener);
      };
    },
    useEmit<TData extends Record<string, any>, TResponse = any>(
      event: string,
      defaultOptions?: ArkosEmitOptions
    ) {
      return createEmitter<TData, TResponse>(
        () => untrack(() => gateway),
        event,
        defaultOptions
      );
    },
    get status() {
      return status;
    },
    get namespace() {
      return currentNamespace;
    },
    get raw() {
      return gateway;
    },
    subscribe: store.subscribe,
  };
}
