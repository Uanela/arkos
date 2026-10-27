import { defineComponent, h, nextTick, ref } from "vue";
import { describe, expect, it } from "vitest";
import { useGateway, type GatewayHandle } from "../src/composables/use-gateway";
import { asManager, FakeManager } from "./fake-socket";
import { mountWithProvider } from "./mount-provider";

/** Mounts a child that grabs a gateway and hands the handle back to the test. */
function mountGateway(manager: FakeManager) {
  let chat!: GatewayHandle;

  const Child = defineComponent({
    setup() {
      chat = useGateway("/chat");
      return () => null;
    },
  });

  return { wrapper: mountWithProvider(manager, Child), chat: () => chat };
}

describe("useGateway", () => {
  it("shares one socket between two consumers of the same namespace", () => {
    const manager = new FakeManager();

    const Consumer = defineComponent({
      setup() {
        useGateway("/chat");
        return () => null;
      },
    });

    const Pair = defineComponent({
      setup: () => () => [h(Consumer), h(Consumer)],
    });

    mountWithProvider(manager, Pair);

    expect(manager.socketCalls).toHaveLength(1);
  });

  it("does not re-register listeners when the component re-renders", async () => {
    const manager = new FakeManager();
    const received: string[] = [];
    const marker = ref("first");

    const Child = defineComponent({
      setup() {
        const chat = useGateway("/chat");
        chat.on("ping", () => received.push(marker.value));
        return () => h("span", marker.value);
      },
    });

    const wrapper = mountWithProvider(manager, Child);
    const socket = manager.socketFor("/chat")!;
    expect(socket.listenerCount("ping")).toBe(1);

    marker.value = "second";
    await nextTick();
    marker.value = "third";
    await nextTick();

    expect(wrapper.text()).toBe("third");
    expect(socket.listenerCount("ping")).toBe(1);
    expect(socket.listenerCount("connect")).toBe(1);

    socket.receive("ping", {});
    expect(received).toEqual(["third"]);
  });

  it("tracks connection status reactively", () => {
    const manager = new FakeManager();

    const { chat } = mountGateway(manager);

    expect(chat().status).toBe("disconnected");

    manager.socketFor("/chat")!.receive("connect");
    expect(chat().status).toBe("connected");

    manager.socketFor("/chat")!.receive("disconnect");
    expect(chat().status).toBe("disconnected");

    manager.socketFor("/chat")!.receive("reconnect_attempt");
    expect(chat().status).toBe("reconnecting");
  });

  it("delivers events to handlers with the _meta envelope stripped", () => {
    const manager = new FakeManager();
    const received: any[] = [];

    const { chat } = mountGateway(manager);
    chat().on<{ content: string }>("receive_message", (data) =>
      received.push(data)
    );

    manager.socketFor("/chat")!.receive("receive_message", {
      content: "hello",
      _meta: { mid: "m-1", timestamp: "now" },
    });

    expect(received).toEqual([{ content: "hello" }]);
  });

  it("ignores duplicate deliveries with the same _meta.mid", () => {
    const manager = new FakeManager();
    const received: any[] = [];

    const { chat } = mountGateway(manager);
    chat().on("receive_message", (data) => received.push(data));

    const socket = manager.socketFor("/chat")!;
    const payload = { content: "hello", _meta: { mid: "m-1", timestamp: "now" } };
    socket.receive("receive_message", payload);
    socket.receive("receive_message", payload);

    expect(received).toHaveLength(1);
  });

  it("stops delivering to a handler after its off() is called", () => {
    const manager = new FakeManager();
    const first: any[] = [];
    const second: any[] = [];

    const { chat } = mountGateway(manager);
    const off = chat().on("receive_message", (data) => first.push(data));
    chat().on("receive_message", (data) => second.push(data));

    const socket = manager.socketFor("/chat")!;
    socket.receive("receive_message", { content: "one" });
    expect(first).toHaveLength(1);
    expect(second).toHaveLength(1);

    off();
    socket.receive("receive_message", { content: "two" });

    expect(first).toHaveLength(1);
    expect(second).toHaveLength(2);
    // Handlers share one socket-level listener, so dropping one must not tear
    // down the others.
    expect(socket.listenerCount("receive_message")).toBe(1);
  });

  it("unsubscribes handlers when the component unmounts", () => {
    const manager = new FakeManager();
    const received: any[] = [];

    const { wrapper, chat } = mountGateway(manager);
    chat().on("receive_message", (data) => received.push(data));

    const socket = manager.socketFor("/chat")!;
    wrapper.unmount();

    socket.receive("receive_message", { content: "late" });
    expect(received).toHaveLength(0);
  });

  it("exposes the underlying GatewayClient as raw", () => {
    const manager = new FakeManager();

    const { chat } = mountGateway(manager);

    expect(chat().raw.rawSocket).toBe(manager.socketFor("/chat"));
  });

  it("moves the handle to the new client when the manager changes", async () => {
    const first = new FakeManager();
    const second = new FakeManager();

    const { wrapper, chat } = mountGateway(first);

    await wrapper.setProps({ manager: asManager(second) });
    await nextTick();

    expect(chat().raw.rawSocket).toBe(second.socketFor("/chat"));
  });

  it("re-binds existing listeners to the new gateway when the manager changes", async () => {
    const first = new FakeManager();
    const second = new FakeManager();
    const received: any[] = [];

    const { wrapper, chat } = mountGateway(first);
    chat().on("move", (data) => received.push(data));

    const staleSocket = first.socketFor("/chat")!;
    await wrapper.setProps({ manager: asManager(second) });
    await nextTick();

    const freshSocket = second.socketFor("/chat")!;
    expect(staleSocket.listenerCount("move")).toBe(0);

    freshSocket.receive("move", { to: "e4" });
    expect(received).toEqual([{ to: "e4" }]);

    // Status keeps tracking the connection that is actually live.
    freshSocket.receive("connect");
    expect(chat().status).toBe("connected");
  });
});
