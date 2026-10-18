import type { ReactNode } from "react";
import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { SocketEmitter } from "../src/hooks/use-socket-emit";
import { WebSocketProvider } from "../src/provider";
import { useGateway } from "../src/hooks/use-gateway";
import { asManager, FakeManager } from "./fake-socket";

const wrap = (manager: FakeManager) =>
  ({ children }: { children: ReactNode }) => (
    <WebSocketProvider manager={asManager(manager)}>{children}</WebSocketProvider>
  );

/** Renders useGateway + useEmit and hands back the emitter for assertions. */
function renderEmitter(
  manager: FakeManager,
  event: string,
  defaultOptions?: { ack?: boolean; timeout?: number; retries?: number }
) {
  let emitter!: SocketEmitter<{ content?: string }, any>;

  const utils = renderHook(
    () => {
      const chat = useGateway("/chat");
      emitter = chat.useEmit<{ content?: string }>(event, defaultOptions);
      return chat;
    },
    { wrapper: wrap(manager) }
  );

  return { ...utils, emitter: () => emitter };
}

describe("useEmit", () => {
  it("emits fire-and-forget without touching loading state", () => {
    const manager = new FakeManager();
    const { emitter } = renderEmitter(manager, "send_message");
    const socket = manager.socketFor("/chat")!;

    let returned: void | undefined;
    act(() => {
      returned = emitter().emit({ content: "hello" });
    });

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
    const { emitter } = renderEmitter(manager, "join_game", { ack: true });
    const socket = manager.socketFor("/chat")!;

    let pending!: Promise<any>;
    act(() => {
      pending = emitter().emit({ content: "x" }, { ack: true }) as Promise<any>;
    });

    expect(emitter().loading).toBe(true);

    await act(async () => {
      socket.lastAck!(null, { success: true, data: { roomId: "r1" } });
      await pending;
    });

    expect(emitter().loading).toBe(false);
    expect(emitter().error).toBeNull();
  });

  it("resolves with the ack payload", async () => {
    const manager = new FakeManager();
    const { emitter } = renderEmitter(manager, "join_game", { ack: true });
    const socket = manager.socketFor("/chat")!;

    let pending!: Promise<any>;
    act(() => {
      pending = emitter().emit({ content: "x" }, { ack: true }) as Promise<any>;
    });

    await act(async () => {
      socket.lastAck!(null, { success: true, data: { roomId: "r1" } });
    });

    await expect(pending).resolves.toEqual({
      success: true,
      data: { roomId: "r1" },
    });
  });

  it("records the error when the server acknowledges with a failure", async () => {
    const manager = new FakeManager();
    const { emitter } = renderEmitter(manager, "make_move", { ack: true });
    const socket = manager.socketFor("/chat")!;

    let pending!: Promise<any>;
    act(() => {
      pending = emitter().emit({ content: "x" }, { ack: true }) as Promise<any>;
    });

    await act(async () => {
      socket.lastAck!(null, { success: false, error: "Not your turn" });
      await pending;
    });

    expect(emitter().error).toBe("Not your turn");
    expect(emitter().loading).toBe(false);
  });

  it("records the error when the ack times out", async () => {
    const manager = new FakeManager();
    const { emitter } = renderEmitter(manager, "make_move", {
      ack: true,
      timeout: 10,
      retries: 0,
    });
    const socket = manager.socketFor("/chat")!;

    let pending!: Promise<any>;
    act(() => {
      pending = emitter().emit({ content: "x" }, { ack: true }) as Promise<any>;
    });

    await act(async () => {
      socket.lastAck!(new Error("operation has timed out"), undefined);
      await pending;
    });

    expect(emitter().error).toBe("operation has timed out");
    expect(emitter().loading).toBe(false);
  });

  it("uses defaultOptions when the call passes none", () => {
    const manager = new FakeManager();
    const { emitter } = renderEmitter(manager, "leave_queue", { ack: true });

    // ack came from defaultOptions, so emit must return a promise.
    let returned: unknown;
    act(() => {
      returned = emitter().emit({});
    });

    expect(returned).toBeInstanceOf(Promise);
    expect(emitter().loading).toBe(true);
  });

  it("clears error and loading on reset", async () => {
    const manager = new FakeManager();
    const { emitter } = renderEmitter(manager, "make_move", { ack: true });
    const socket = manager.socketFor("/chat")!;

    let pending!: Promise<any>;
    act(() => {
      pending = emitter().emit({ content: "x" }, { ack: true }) as Promise<any>;
    });

    await act(async () => {
      socket.lastAck!(null, { success: false, error: "nope" });
      await pending;
    });

    expect(emitter().error).toBe("nope");

    act(() => emitter().reset());

    expect(emitter().error).toBeNull();
    expect(emitter().loading).toBe(false);
  });
});
