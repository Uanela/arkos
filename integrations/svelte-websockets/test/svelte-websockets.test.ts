import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/svelte";
import { tick } from "svelte";
import { Manager } from "socket.io-client";
import { WebsocketClient, type GatewayClient } from "@arkosjs/websockets-client";
import type { Gateway, GatewayState, SocketEmitter } from "../src/index.js";
import type { SendPayload } from "./server.js";
import { connectControl, type Control } from "./control.js";
import Harness from "./fixtures/Harness.svelte";
import ChatRunes from "./fixtures/ChatRunes.svelte";
import ChatStore from "./fixtures/ChatStore.svelte";
import ChatLegacy from "./fixtures/ChatLegacy.svelte";
import EmitInEffect from "./fixtures/EmitInEffect.svelte";
import Outside from "./fixtures/Outside.svelte";

type Api = { chat: Gateway; send: SocketEmitter<SendPayload> };

let server: Control;
const managers: Manager[] = [];

function createManager() {
  const manager = new Manager(server.url, {
    transports: ["websocket"],
    reconnectionDelay: 20,
    reconnectionDelayMax: 50,
  });
  managers.push(manager);
  return manager;
}

function handlerCount(gateway: GatewayClient, event: string): number {
  return (gateway as any).handlers.get(event)?.size ?? 0;
}

function renderChat(props: Record<string, unknown> = {}) {
  let api!: Api;
  const ready = vi.fn((a: Api) => (api = a));
  const manager = createManager();
  const result = render(Harness, {
    props: {
      manager,
      child: ChatRunes,
      childProps: { onReady: ready, ...props },
    },
  });
  return { ...result, manager, api: () => api };
}

const connected = () =>
  waitFor(() => expect(screen.getByTestId("status").textContent).toBe("connected"));

beforeAll(() => {
  server = connectControl();
});

afterEach(async () => {
  cleanup();
  for (const manager of managers.splice(0)) manager.engine?.close();
  await server.reset();
  vi.restoreAllMocks();
});

afterAll(() => server.close());

describe("ArkosProvider", () => {
  it("throws a helpful error when useGateway is used outside a provider", () => {
    expect(() => render(Outside)).toThrow(/ArkosProvider/);
  });

  it("destroys the client when the provider is destroyed", async () => {
    const destroy = vi.spyOn(WebsocketClient.prototype, "destroy");
    const { unmount, api } = renderChat();
    await connected();
    const socket = api().chat.raw.rawSocket;

    unmount();

    expect(destroy).toHaveBeenCalledTimes(1);
    expect(socket.connected).toBe(false);
  });

  it("swaps the client when the manager changes, keeping children mounted", async () => {
    const destroy = vi.spyOn(WebsocketClient.prototype, "destroy");
    const { rerender, api } = renderChat();
    await connected();
    const firstGateway = api().chat.raw;

    await server.broadcast("/chat", "receive_message", { text: "before" });
    await screen.findByText("before");

    await rerender({ manager: createManager() });

    expect(destroy).toHaveBeenCalledTimes(1);
    expect(api().chat.raw).not.toBe(firstGateway);
    await connected();

    await server.broadcast("/chat", "receive_message", { text: "after" });
    await screen.findByText("after");
    expect(screen.getByText("before")).toBeTruthy();
    expect(handlerCount(firstGateway, "receive_message")).toBe(0);
  });
});

describe("useGateway", () => {
  it("updates status reactively once connected", async () => {
    renderChat();
    await connected();
    expect(screen.getByTestId("label").textContent).toBe("/chat:connected");
  });

  it("tracks disconnect → reconnecting → connected", async () => {
    const { api } = renderChat();
    await connected();

    const statuses: string[] = [];
    const unsubscribe = api().chat.subscribe((s: GatewayState) => statuses.push(s.status));

    await server.drop("/chat");

    await waitFor(() => {
      expect(statuses).toContain("reconnecting");
      expect(statuses.at(-1)).toBe("connected");
    });
    unsubscribe();

    expect(statuses[0]).toBe("connected");
    expect(statuses).toContain("disconnected");
    expect(statuses).toContain("reconnecting");
    expect(statuses.indexOf("disconnected")).toBeLessThan(statuses.indexOf("reconnecting"));
    expect(screen.getByTestId("status").textContent).toBe("connected");
  });

  it("reports disconnected when the server kicks the socket", async () => {
    const { api } = renderChat();
    await connected();

    await server.kick("/chat");

    await waitFor(() => expect(screen.getByTestId("status").textContent).toBe("disconnected"));
    expect(api().chat.status).toBe("disconnected");
  });

  it("receives events through on()", async () => {
    const onMessage = vi.fn();
    renderChat({ onMessage });
    await connected();

    await server.broadcast("/chat", "receive_message", { text: "hi" });

    await screen.findByText("hi");
    expect(onMessage).toHaveBeenCalledWith({ text: "hi" });
  });

  it("removes listeners when a component is destroyed", async () => {
    const onMessage = vi.fn();
    const { rerender, api, unmount } = renderChat({ onMessage });
    await rerender({ count: 2 });
    await waitFor(() => expect(screen.getAllByTestId("status")).toHaveLength(2));
    await waitFor(() =>
      screen.getAllByTestId("status").forEach((el) => expect(el.textContent).toBe("connected"))
    );
    const gateway = api().chat.raw;
    expect(handlerCount(gateway, "receive_message")).toBe(2);

    await rerender({ count: 1 });

    expect(handlerCount(gateway, "receive_message")).toBe(1);
    await server.broadcast("/chat", "receive_message", { text: "once" });
    await screen.findByText("once");
    expect(onMessage).toHaveBeenCalledTimes(1);

    unmount();
    expect(handlerCount(gateway, "receive_message")).toBe(0);
  });

  it("off() returned by on() stops a single listener", async () => {
    const { api } = renderChat();
    await connected();
    const handler = vi.fn();
    const off = api().chat.on("receive_message", handler);
    api().chat.on("receive_message", handler);

    off();
    await server.broadcast("/chat", "receive_message", { text: "x" });
    await screen.findByText("x");

    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("re-subscribes everything when the namespace changes", async () => {
    const onMessage = vi.fn();
    const { rerender, api } = renderChat({ onMessage, namespace: "/chat" });
    await connected();
    const chatGateway = api().chat.raw;

    await rerender({ childProps: { onMessage, namespace: "/orders" } });

    await waitFor(() =>
      expect(screen.getByTestId("label").textContent).toBe("/orders:connected")
    );
    expect(api().chat.namespace).toBe("/orders");
    expect(api().chat.raw).not.toBe(chatGateway);
    expect(handlerCount(chatGateway, "receive_message")).toBe(0);
    expect(handlerCount(api().chat.raw, "receive_message")).toBe(1);

    await server.broadcast("/chat", "receive_message", { text: "from-chat" });
    await server.broadcast("/orders", "receive_message", { text: "from-orders" });
    await screen.findByText("from-orders");
    expect(screen.queryByText("from-chat")).toBeNull();

    await api().send.emit({ text: "to-orders" }, { ack: true });
    expect((await server.received()).at(-1)).toMatchObject({ namespace: "/orders", data: { text: "to-orders" } });
  });
});

describe("useEmit", () => {
  it("flips loading around an ack emit and returns the result", async () => {
    const { api } = renderChat();
    await connected();

    const pending = api().send.emit({ text: "slow", delay: 100 }, { ack: true });
    expect(api().send.loading).toBe(true);
    await tick();
    expect(screen.getByTestId("loading").textContent).toBe("Sending...");

    const result = await pending;

    expect(result).toEqual({ success: true, data: { echo: "slow" } });
    expect(api().send.loading).toBe(false);
    await tick();
    expect(screen.getByTestId("loading").textContent).toBe("idle");
    expect(api().send.error).toBeNull();
    expect(api().send.lastEmittedAt).toBeTypeOf("number");
  });

  it("keeps loading true until every concurrent ack settles", async () => {
    const { api } = renderChat();
    await connected();

    const fast = api().send.emit({ text: "fast", delay: 20 }, { ack: true });
    const slow = api().send.emit({ text: "slow", delay: 150 }, { ack: true });

    await fast;
    expect(api().send.loading).toBe(true);
    await slow;
    expect(api().send.loading).toBe(false);
  });

  it("sets error on a failed ack and reset() clears it", async () => {
    const { api } = renderChat();
    await connected();

    const result = await api().send.emit({ text: "bad", fail: "nope" }, { ack: true });

    expect(result).toEqual({ success: false, error: "nope" });
    await waitFor(() => expect(screen.getByTestId("error").textContent).toBe("nope"));

    api().send.reset();
    await tick();
    expect(screen.getByTestId("error").textContent).toBe("");
  });

  it("reports a timeout as an error", async () => {
    const { api } = renderChat();
    await connected();

    const result = await api().send.emit({ text: "lost", noAck: true }, { ack: true, timeout: 50 });

    expect(result.success).toBe(false);
    expect(api().send.error).toMatch(/timed out/);
    expect(api().send.loading).toBe(false);
  });

  it("ignores acks that were in flight before reset()", async () => {
    const { api } = renderChat();
    await connected();

    const pending = api().send.emit({ text: "late", delay: 50, fail: "late" }, { ack: true });
    api().send.reset();
    expect(api().send.loading).toBe(false);

    await pending;
    expect(api().send.loading).toBe(false);
    expect(api().send.error).toBeNull();
  });

  it("fire-and-forget emits never set loading", async () => {
    const { api } = renderChat();
    await connected();

    const returned = api().send.emit({ text: "ff" }, { ack: false });

    expect(returned).toBeUndefined();
    expect(api().send.loading).toBe(false);
    expect(api().send.lastEmittedAt).toBeTypeOf("number");
    await waitFor(async () =>
      expect((await server.received()).map((r) => r.data.text)).toContain("ff")
    );
  });

  it("does not re-run an $effect that emits", async () => {
    const manager = createManager();
    render(Harness, { props: { manager, child: EmitInEffect } });

    await waitFor(() => expect(screen.getByTestId("last").textContent).toBe("emitted"));
    await waitFor(() => expect(screen.getByTestId("loading").textContent).toBe("idle"));
    await new Promise((r) => setTimeout(r, 100));

    const joins = (await server.received()).filter((r) => r.data.text === "joined-from-effect");
    expect(joins).toHaveLength(1);
  });
});

describe("store syntax", () => {
  it("supports $chat.status / $sendMessage.loading in runes mode", async () => {
    const manager = createManager();
    render(Harness, { props: { manager, child: ChatStore } });

    await waitFor(() =>
      expect(screen.getByTestId("status").textContent).toBe("Status: connected")
    );

    await fireEvent.click(screen.getByText("send"));
    expect(screen.getByTestId("loading").textContent).toBe("Sending...");
    await waitFor(() => expect(screen.getByTestId("loading").textContent).toBe("idle"));
  });

  it("works from a legacy (non-runes) component", async () => {
    const manager = createManager();
    render(Harness, { props: { manager, child: ChatLegacy } });

    await waitFor(() => expect(screen.getByTestId("status").textContent).toBe("connected"));
    await server.broadcast("/chat", "receive_message", { text: "legacy" });
    await screen.findByText("legacy");
  });
});
