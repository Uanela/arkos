import {
  defineComponent,
  inject,
  markRaw,
  onUnmounted,
  provide,
  shallowRef,
  watch,
  type InjectionKey,
  type PropType,
  type ShallowRef,
} from "vue";
import {
  createWebsocketClient,
  type WebsocketClient,
} from "@arkosjs/websockets-client";
import type { Manager, SocketOptions } from "socket.io-client";

export const WebsocketClientKey: InjectionKey<ShallowRef<WebsocketClient>> =
  Symbol("arkos-websocket-client");

/**
 * Provides the WebsocketClient instance to the component tree.
 * Mount once at the root — all `useGateway` calls beneath it
 * share the same client and lazily connect per namespace.
 *
 * A new `manager` instance swaps the client and destroys the previous one.
 * Changing `options` alone does not rebuild it.
 *
 * @example
 * <WebSocketProvider :manager="manager" :options="{ auth: { token } }">
 *   <App />
 * </WebSocketProvider>
 */
export const WebSocketProvider = defineComponent({
  name: "WebSocketProvider",
  props: {
    manager: {
      type: Object as PropType<Manager>,
      required: true,
    },
    options: {
      type: Object as PropType<Partial<SocketOptions>>,
      required: false,
    },
  },
  setup(props, { slots }) {
    const client = shallowRef(
      markRaw(createWebsocketClient(props.manager, props.options))
    );

    watch(
      () => props.manager,
      (manager) => {
        const previous = client.value;
        client.value = markRaw(createWebsocketClient(manager, props.options));
        previous.destroy();
      }
    );

    provide(WebsocketClientKey, client);

    onUnmounted(() => {
      client.value.destroy();
    });

    return () => slots.default?.();
  },
});

function requireClient(): ShallowRef<WebsocketClient> {
  const client = inject(WebsocketClientKey);
  if (!client) {
    throw new Error(
      "useWebsocketClient must be used in a component tree that renders <WebSocketProvider>"
    );
  }
  return client;
}

/**
 * Returns the WebsocketClient instance from context.
 * Throws if used outside a <WebSocketProvider>.
 */
export function useWebsocketClient(): WebsocketClient {
  return requireClient().value;
}

/**
 * The client ref itself, so composables can follow a client swap.
 *
 * @internal — use `useWebsocketClient()` unless you need to stay reactive to
 * the manager changing.
 */
export function useWebsocketClientRef(): ShallowRef<WebsocketClient> {
  return requireClient();
}
