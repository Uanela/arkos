import { getContext, onDestroy, setContext, untrack } from "svelte";
import {
  createWebsocketClient,
  type WebsocketClient,
} from "@arkosjs/websockets-client";
import type { SocketOptions } from "socket.io-client";

export type ArkosManager = Parameters<typeof createWebsocketClient>[0];

const KEY = Symbol("arkos-websocket-client");

export class ArkosClientRef {
  current = $state.raw() as WebsocketClient;

  constructor(client: WebsocketClient) {
    this.current = client;
  }
}

export function setArkosClient(
  getManager: () => ArkosManager,
  options?: Partial<SocketOptions>
): void {
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
}

export function getArkosClientRef(): ArkosClientRef {
  const ref = getContext<ArkosClientRef | undefined>(KEY);
  if (!ref) throw new Error("useGateway() must be used within <ArkosProvider>");
  return ref;
}
