import type { ReactNode } from "react";
import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { WebSocketProvider } from "../src/provider";
import { useGateway } from "../src/hooks/use-gateway";
import { asManager, FakeManager } from "./fake-socket";

const wrap = (manager: FakeManager) =>
  ({ children }: { children: ReactNode }) => (
    <WebSocketProvider manager={asManager(manager)}>{children}</WebSocketProvider>
  );

describe("useGateway", () => {
  it("reuses one socket per namespace across re-renders", () => {
    const manager = new FakeManager();

    const { rerender } = renderHook(() => useGateway("/chat"), {
      wrapper: wrap(manager),
    });

    rerender();
    rerender();

    expect(manager.socketCalls).toHaveLength(1);
  });

  it("tracks connection status reactively", () => {
    const manager = new FakeManager();

    const { result } = renderHook(() => useGateway("/chat"), {
      wrapper: wrap(manager),
    });

    expect(result.current.status).toBe("disconnected");

    act(() => manager.socketFor("/chat")!.receive("connect"));
    expect(result.current.status).toBe("connected");

    act(() => manager.socketFor("/chat")!.receive("disconnect"));
    expect(result.current.status).toBe("disconnected");

    act(() => manager.socketFor("/chat")!.receive("reconnect_attempt"));
    expect(result.current.status).toBe("reconnecting");
  });

  it("delivers events to handlers with the _meta envelope stripped", () => {
    const manager = new FakeManager();
    const received: any[] = [];

    renderHook(
      () => {
        const chat = useGateway("/chat");
        chat.on<{ content: string }>("receive_message", (data) =>
          received.push(data)
        );
        return chat;
      },
      { wrapper: wrap(manager) }
    );

    act(() =>
      manager
        .socketFor("/chat")!
        .receive("receive_message", {
          content: "hello",
          _meta: { mid: "m-1", timestamp: "now" },
        })
    );

    expect(received).toEqual([{ content: "hello" }]);
  });

  it("ignores duplicate deliveries with the same _meta.mid", () => {
    const manager = new FakeManager();
    const received: any[] = [];

    renderHook(
      () => {
        const chat = useGateway("/chat");
        chat.on("receive_message", (data) => received.push(data));
        return chat;
      },
      { wrapper: wrap(manager) }
    );

    const payload = { content: "hello", _meta: { mid: "m-1", timestamp: "now" } };
    act(() => manager.socketFor("/chat")!.receive("receive_message", payload));
    act(() => manager.socketFor("/chat")!.receive("receive_message", payload));

    expect(received).toHaveLength(1);
  });

  it("binds one socket listener no matter how often an inline handler changes", () => {
    const manager = new FakeManager();
    const received: string[] = [];
    let marker = "first";

    const { rerender } = renderHook(
      () => {
        const chat = useGateway("/chat");
        chat.on("ping", () => received.push(marker));
        return chat;
      },
      { wrapper: wrap(manager) }
    );

    const socket = manager.socketFor("/chat")!;
    expect(socket.listenerCount("ping")).toBe(1);

    marker = "second";
    rerender();
    marker = "third";
    rerender();

    // Still one listener, and it sees the newest handler rather than a stale one.
    expect(socket.listenerCount("ping")).toBe(1);
    expect(socket.listenerCount("connect")).toBe(1);

    act(() => socket.receive("ping", {}));
    expect(received).toEqual(["third"]);
  });

  it("re-subscribes when the deps argument changes", () => {
    const manager = new FakeManager();
    const received: string[] = [];
    let room = "lobby";

    const { rerender } = renderHook(
      () => {
        const chat = useGateway("/chat");
        chat.on("move", () => received.push(room), [room]);
        return chat;
      },
      { wrapper: wrap(manager) }
    );

    const socket = manager.socketFor("/chat")!;

    act(() => socket.receive("move", {}));
    expect(received).toEqual(["lobby"]);

    room = "arena";
    rerender();

    act(() => socket.receive("move", {}));
    expect(received).toEqual(["lobby", "arena"]);
  });

  it("unsubscribes handlers when the component unmounts", () => {
    const manager = new FakeManager();
    const received: any[] = [];

    const { unmount } = renderHook(
      () => {
        const chat = useGateway("/chat");
        chat.on("receive_message", (data) => received.push(data));
        return chat;
      },
      { wrapper: wrap(manager) }
    );

    const socket = manager.socketFor("/chat")!;
    unmount();

    act(() => socket.receive("receive_message", { content: "late" }));
    expect(received).toHaveLength(0);
  });

  it("exposes the underlying GatewayClient as raw", () => {
    const manager = new FakeManager();

    const { result } = renderHook(() => useGateway("/chat"), {
      wrapper: wrap(manager),
    });

    expect(result.current.raw.rawSocket).toBe(manager.socketFor("/chat"));
  });

  it("moves the handle to the new client when the manager changes", () => {
    const first = new FakeManager();
    const second = new FakeManager();
    let manager = first;

    const { result, rerender } = renderHook(() => useGateway("/chat"), {
      wrapper: ({ children }) => (
        <WebSocketProvider manager={asManager(manager)}>
          {children}
        </WebSocketProvider>
      ),
    });

    manager = second;
    rerender();

    expect(result.current.raw.rawSocket).toBe(second.socketFor("/chat"));
  });
});
