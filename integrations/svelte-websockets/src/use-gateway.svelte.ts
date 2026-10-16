import { onDestroy, untrack } from "svelte";
import type { Readable } from "svelte/store";
import type {
  ArkosEmitOptions,
  ArkosEventHandler,
  GatewayClient,
  GatewayStatus,
} from "@arkosjs/websockets-client";
import type { SocketOptions } from "socket.io-client";
import {
  getArkosClientRef,
  toGetter,
  type MaybeGetter,
} from "./context.svelte.js";
import { createEmitter, type SocketEmitter } from "./use-emit.svelte.js";
import { StoreBridge } from "./store-bridge.js";

/** Snapshot pushed to `$gateway` store subscribers. */
export interface GatewayState<TUser = any> {
  status: GatewayStatus;
  user: TUser | null;
}

export interface Gateway<TUser = any> extends Readable<GatewayState<TUser>> {
  /**
   * Listen to a server event. Cleans up automatically when the component
   * is destroyed, and follows the gateway when the namespace changes.
   * Returns an `off` function to stop listening earlier.
   */
  on<T = any>(event: string, handler: ArkosEventHandler<T>): () => void;

  /**
   * Returns an emitter for the given event with reactive
   * `loading` / `error` / `lastEmittedAt`.
   */
  useEmit<TData extends Record<string, any>, TResponse = any>(
    event: string,
    defaultOptions?: ArkosEmitOptions
  ): SocketEmitter<TData, TResponse>;

  /** Reactive connection status for this namespace. */
  readonly status: GatewayStatus;

  /** Reactive user, populated when the server emits `"authenticated"`. */
  readonly user: TUser | null;

  /** The namespace currently in use. Reactive. */
  readonly namespace: string;

  /** Escape hatch to the underlying `GatewayClient`. Reactive. */
  readonly raw: GatewayClient;
}

interface Listener {
  event: string;
  handler: ArkosEventHandler;
  off?: () => void;
}

/**
 * Returns a reactive handle for a gateway namespace. Must be called during
 * component initialisation, inside `<ArkosProvider>`.
 *
 * The handle works with runes (`chat.status`) and as a store (`$chat.status`).
 * Pass the namespace as a getter (`() => namespace`) to re-subscribe
 * everything when it changes.
 *
 * @example
 * const chat = useGateway("/chat");
 *
 * chat.on("receive_message", (data) => messages.push(data));
 *
 * const sendMessage = chat.useEmit("send_message");
 * sendMessage.emit({ text: "hello" }, { ack: true });
 *
 * chat.status; // "connected" | "connecting" | "reconnecting" | "disconnected"
 * chat.user;   // user object | null
 */
export function useGateway<TUser = any>(
  namespace: MaybeGetter<string>,
  opts?: Partial<SocketOptions>
): Gateway<TUser> {
  const clientRef = getArkosClientRef();
  const getNamespace = toGetter(namespace);
  const listeners = new Set<Listener>();

  const initialNamespace = untrack(getNamespace);
  const initialGateway = untrack(() =>
    clientRef.current.gateway(initialNamespace, opts)
  );

  let currentNamespace = $state(initialNamespace);
  let gateway = $state.raw(initialGateway);
  let status = $state<GatewayStatus>(initialGateway.status);
  let user = $state.raw<TUser | null>(initialGateway.user);

  const store = new StoreBridge<GatewayState<TUser>>(() => ({ status, user }));

  function attach(target: GatewayClient): () => void {
    status = target.status;
    user = target.user;
    store.notify();

    const unsubscribe = target.subscribe({
      onStatus: (next) => {
        status = next;
        store.notify();
      },
      onUser: (next) => {
        user = next;
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

  // Rebind when the namespace getter or the provider's client changes
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
      // Own wrapper per call so registering the same function twice
      // yields two independent subscriptions
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
    get user() {
      return user;
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
