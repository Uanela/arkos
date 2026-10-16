import { getContext, onDestroy, setContext, untrack } from "svelte";
import {
  createWebsocketClient,
  type WebsocketClient,
} from "@arkosjs/websockets-client";
import type { SocketOptions } from "socket.io-client";

/** The socket.io `Manager` accepted by `createWebsocketClient`. */
export type ArkosManager = Parameters<typeof createWebsocketClient>[0];

/** A plain value, or a getter so the value can be read reactively. */
export type MaybeGetter<T> = T | (() => T);

const KEY = Symbol("arkos-websocket-client");

/**
 * Reactive holder for the current client. When the provider receives a new
 * `manager`, `current` is swapped and every `useGateway` beneath it rebinds
 * to the new client without remounting the tree.
 *
 * @internal
 */
export class ArkosClientRef {
  current = $state.raw() as WebsocketClient;

  constructor(client: WebsocketClient) {
    this.current = client;
  }
}

export function toGetter<T>(value: MaybeGetter<T>): () => T {
  return typeof value === "function" ? (value as () => T) : () => value;
}

/**
 * Creates a `WebsocketClient`, provides it to all descendants via context
 * and destroys it when the calling component is destroyed.
 *
 * Must be called during component initialisation. `<ArkosProvider>` is a
 * thin wrapper around this function — call it directly if you prefer to
 * set up the client in your root layout script.
 *
 * Pass `manager` as a getter (`() => manager`) to have the client recreated
 * whenever the manager changes (e.g. a new auth token). `options` are read
 * once; to change socket options, pass a new `Manager`.
 *
 * @example
 * <script>
 *   import { Manager } from "socket.io-client";
 *   import { initArkosClient } from "@arkosjs/svelte-websockets";
 *
 *   initArkosClient(new Manager("http://localhost:8000"));
 * </script>
 */
export function initArkosClient(
  manager: MaybeGetter<ArkosManager>,
  options?: Partial<SocketOptions>
): WebsocketClient {
  const getManager = toGetter(manager);
  let currentManager = untrack(getManager);
  const ref = new ArkosClientRef(
    createWebsocketClient(currentManager, options)
  );

  setContext(KEY, ref);

  $effect.pre(() => {
    const nextManager = getManager();
    if (nextManager === currentManager) return;

    untrack(() => {
      const previous = ref.current;
      currentManager = nextManager;
      ref.current = createWebsocketClient(nextManager, options);
      previous.destroy();
    });
  });

  onDestroy(() => ref.current.destroy());

  return ref.current;
}

/** @internal */
export function getArkosClientRef(): ArkosClientRef {
  const ref = getContext<ArkosClientRef | undefined>(KEY);
  if (!ref) {
    throw new Error(
      "No Arkos websocket client found. Wrap your app in <ArkosProvider> or call initArkosClient() in a parent component."
    );
  }
  return ref;
}

/**
 * Returns the `WebsocketClient` provided by the nearest `<ArkosProvider>`.
 * Must be called during component initialisation.
 * Throws if used outside a provider.
 *
 * @example
 * const client = getArkosClient();
 * const notifications = client.gateway("/notifications");
 */
export function getArkosClient(): WebsocketClient {
  return getArkosClientRef().current;
}
