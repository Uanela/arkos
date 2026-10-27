import { defineComponent, h, type Component, type PropType } from "vue";
import { mount, type VueWrapper } from "@vue/test-utils";
import type { Manager } from "socket.io-client";
import { WebSocketProvider } from "../src/provider";
import { asManager, type FakeManager } from "./fake-socket";

/**
 * Mounts a provider around `child`.
 * The provider sits behind a host component so `setProps` drives prop changes.
 */
export function mountWithProvider(
  manager: FakeManager,
  child: Component,
  options?: Record<string, any>
): VueWrapper<any> {
  const Host = defineComponent({
    name: "ProviderHost",
    props: {
      manager: { type: Object as PropType<Manager>, required: true },
      options: {
        type: Object as PropType<Record<string, any>>,
        required: false,
      },
    },
    setup(props) {
      return () =>
        h(
          WebSocketProvider,
          { manager: props.manager, options: props.options } as any,
          { default: () => [h(child)] }
        );
    },
  });

  return mount(Host, {
    props: options
      ? { manager: asManager(manager), options }
      : { manager: asManager(manager) },
  });
}
