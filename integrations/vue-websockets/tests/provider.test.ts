import { defineComponent, nextTick } from "vue";
import { mount } from "@vue/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useWebsocketClient } from "../src/provider";
import { useGateway } from "../src/composables/use-gateway";
import { asManager, FakeManager } from "./fake-socket";
import { mountWithProvider } from "./mount-provider";

const ChatChild = defineComponent({
  setup() {
    useGateway("/chat");
    return () => null;
  },
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("WebSocketProvider", () => {
  it("throws when the client is read outside a provider", () => {
    // Vue logs the injection miss; keep the test output readable.
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});

    const Broken = defineComponent({
      setup() {
        useWebsocketClient();
        return () => null;
      },
    });

    expect(() => mount(Broken)).toThrowError(
      /must be used in a component tree that renders <WebSocketProvider>/
    );
  });

  it("provides the client to descendants", () => {
    const manager = new FakeManager();
    let client!: ReturnType<typeof useWebsocketClient>;

    const Child = defineComponent({
      setup() {
        client = useWebsocketClient();
        return () => null;
      },
    });

    mountWithProvider(manager, Child);

    expect(client.gateway).toBeTypeOf("function");
    expect(client.destroy).toBeTypeOf("function");
  });

  it("destroys the client when it unmounts", () => {
    const manager = new FakeManager();

    const wrapper = mountWithProvider(manager, ChatChild);
    const socket = manager.socketFor("/chat")!;
    expect(socket.disconnectCount).toBe(0);

    wrapper.unmount();

    expect(socket.disconnectCount).toBe(1);
  });

  it("rebuilds the client when the manager prop changes and destroys the old one", async () => {
    const first = new FakeManager();
    const second = new FakeManager();

    const wrapper = mountWithProvider(first, ChatChild);
    const staleSocket = first.socketFor("/chat")!;
    expect(second.socketFor("/chat")).toBeUndefined();

    await wrapper.setProps({ manager: asManager(second) });
    await nextTick();

    expect(second.socketFor("/chat")).toBeDefined();
    expect(staleSocket.disconnectCount).toBe(1);
  });

  it("passes the current auth token to sockets after a manager change", async () => {
    const first = new FakeManager();
    const second = new FakeManager();
    let token = "token-1";

    const wrapper = mountWithProvider(first, ChatChild, {
      auth: { token },
    });

    expect(first.lastSocketOpts().auth).toEqual({ token: "token-1" });

    token = "token-2";
    await wrapper.setProps({
      manager: asManager(second),
      options: { auth: { token } },
    });
    await nextTick();

    expect(second.lastSocketOpts().auth).toEqual({ token: "token-2" });
  });

  it("does not rebuild when only the options object identity changes", async () => {
    const manager = new FakeManager();

    const wrapper = mountWithProvider(manager, ChatChild, {
      auth: { token: "token-1" },
    });

    // A fresh inline object each time — the common consumer pattern.
    await wrapper.setProps({ options: { auth: { token: "token-1" } } });
    await wrapper.setProps({ options: { auth: { token: "token-1" } } });

    expect(manager.socketCalls).toHaveLength(1);
    expect(manager.socketFor("/chat")!.disconnectCount).toBe(0);
  });
});
