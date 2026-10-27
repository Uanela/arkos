import { defineComponent, nextTick } from "vue";
import { describe, expect, it } from "vitest";
import type { ArkosEmitOptions } from "@arkosjs/websockets-client";
import { useGateway } from "../src/composables/use-gateway";
import type { SocketEmitter } from "../src/composables/use-emit";
import { asManager, FakeManager } from "./fake-socket";
import { mountWithProvider } from "./mount-provider";

/** Mounts useGateway + useEmit and hands back the emitter for assertions. */
function mountEmitter(
  manager: FakeManager,
  event: string,
  defaultOptions?: ArkosEmitOptions
) {
  let emitter!: SocketEmitter<{ content?: string }, any>;

  const Child = defineComponent({
    setup() {
      const chat = useGateway("/chat");
      emitter = chat.useEmit<{ content?: string }>(event, defaultOptions);
      return () => null;
    },
  });

  return { wrapper: mountWithProvider(manager, Child), emitter: () => emitter };
}

describe("useEmit", () => {
  it("emits fire-and-forget without touching loading state", () => {
    const manager = new FakeManager();
    const { emitter } = mountEmitter(manager, "send_message");
    const socket = manager.socketFor("/chat")!;

    const returned = emitter().emit({ content: "hello" });

    expect(returned).toBeUndefined();
    expect(socket.emitted).toHaveLength(1);
    expect(socket.emitted[0]!.event).toBe("send_message");
    expect(socket.emitted[0]!.payload).toMatchObject({ content: "hello" });
    // The core injects the dedup envelope on the way out.
    expect(socket.emitted[0]!.payload._meta.mid).toBeTypeOf("string");

    expect(emitter().loading).toBe(false);
    expect(emitter().lastEmittedAt).toBeTypeOf("number");
  });

  it("tracks loading while an acked emit is in flight", async () => {
    const manager = new FakeManager();
    const { emitter } = mountEmitter(manager, "join_game", { ack: true });
    const socket = manager.socketFor("/chat")!;

    const pending = emitter().emit({ content: "x" }, { ack: true });

    expect(emitter().loading).toBe(true);

    socket.lastAck!(null, { success: true, data: { roomId: "r1" } });
    await pending;

    expect(emitter().loading).toBe(false);
    expect(emitter().error).toBeNull();
  });

  it("resolves with the ack payload", async () => {
    const manager = new FakeManager();
    const { emitter } = mountEmitter(manager, "join_game", { ack: true });
    const socket = manager.socketFor("/chat")!;

    const pending = emitter().emit({ content: "x" }, { ack: true });
    socket.lastAck!(null, { success: true, data: { roomId: "r1" } });

    await expect(pending).resolves.toEqual({
      success: true,
      data: { roomId: "r1" },
    });
  });

  it("records the error when the server acknowledges with a failure", async () => {
    const manager = new FakeManager();
    const { emitter } = mountEmitter(manager, "make_move", { ack: true });
    const socket = manager.socketFor("/chat")!;

    const pending = emitter().emit({ content: "x" }, { ack: true });
    socket.lastAck!(null, { success: false, error: "Not your turn" });
    await pending;

    expect(emitter().error).toBe("Not your turn");
    expect(emitter().loading).toBe(false);
  });

  it("records the error when the ack times out", async () => {
    const manager = new FakeManager();
    const { emitter } = mountEmitter(manager, "make_move", {
      ack: true,
      timeout: 10,
      retries: 0,
    });
    const socket = manager.socketFor("/chat")!;

    const pending = emitter().emit({ content: "x" }, { ack: true });
    socket.lastAck!(new Error("operation has timed out"), undefined);
    await pending;

    expect(emitter().error).toBe("operation has timed out");
    expect(emitter().loading).toBe(false);
  });

  it("uses defaultOptions when the call passes none", () => {
    const manager = new FakeManager();
    const { emitter } = mountEmitter(manager, "leave_queue", { ack: true });

    // ack came from defaultOptions, so emit must return a promise.
    const returned = emitter().emit({});

    expect(returned).toBeInstanceOf(Promise);
    expect(emitter().loading).toBe(true);
  });

  it("clears error and loading on reset", async () => {
    const manager = new FakeManager();
    const { emitter } = mountEmitter(manager, "make_move", { ack: true });
    const socket = manager.socketFor("/chat")!;

    const pending = emitter().emit({ content: "x" }, { ack: true });
    socket.lastAck!(null, { success: false, error: "nope" });
    await pending;

    expect(emitter().error).toBe("nope");

    emitter().reset();

    expect(emitter().error).toBeNull();
    expect(emitter().loading).toBe(false);
  });

  it("follows the client when the manager changes", async () => {
    const first = new FakeManager();
    const second = new FakeManager();

    const { wrapper, emitter } = mountEmitter(first, "send_message");
    expect(first.socketFor("/chat")).toBeDefined();

    await wrapper.setProps({ manager: asManager(second) });
    await nextTick();

    emitter().emit({ content: "after-swap" });

    expect(first.socketFor("/chat")!.emitted).toHaveLength(0);
    expect(second.socketFor("/chat")!.emitted).toHaveLength(1);
  });
});
