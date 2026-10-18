import { StrictMode, type ReactNode } from "react";
import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { WebSocketProvider, useWebsocketClient } from "../src/provider";
import { useGateway } from "../src/hooks/use-gateway";
import { asManager, FakeManager } from "./fake-socket";

const wrap =
  (manager: FakeManager, options?: Record<string, any>) =>
  ({ children }: { children: ReactNode }) => (
    <WebSocketProvider manager={asManager(manager)} options={options as any}>
      {children}
    </WebSocketProvider>
  );

afterEach(() => {
  vi.restoreAllMocks();
});

describe("WebSocketProvider", () => {
  it("throws when the client is read outside a provider", () => {
    // React logs the thrown error; keep the test output readable.
    vi.spyOn(console, "error").mockImplementation(() => {});

    expect(() => renderHook(() => useWebsocketClient())).toThrowError(
      /must be used within an <WebSocketProvider>/
    );
  });

  it("provides the client to descendants", () => {
    const manager = new FakeManager();

    const { result } = renderHook(() => useWebsocketClient(), {
      wrapper: wrap(manager),
    });

    expect(result.current.gateway).toBeTypeOf("function");
    expect(result.current.destroy).toBeTypeOf("function");
  });

  it("destroys the client when it unmounts", async () => {
    const manager = new FakeManager();

    const { unmount } = renderHook(() => useGateway("/chat"), {
      wrapper: wrap(manager),
    });

    const socket = manager.socketFor("/chat")!;
    expect(socket.disconnectCount).toBe(0);

    unmount();

    await waitFor(() => expect(socket.disconnectCount).toBe(1));
  });

  it("keeps the client alive through StrictMode's mount/cleanup/mount probe", async () => {
    const manager = new FakeManager();

    const { result } = renderHook(() => useGateway("/chat"), {
      wrapper: ({ children }) => (
        <StrictMode>
          <WebSocketProvider manager={asManager(manager)}>
            {children}
          </WebSocketProvider>
        </StrictMode>
      ),
    });

    const socket = manager.socketFor("/chat")!;

    // Give the deferred teardown a chance to fire if it were going to.
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 25));
    });

    expect(socket.disconnectCount).toBe(0);

    act(() => socket.receive("connect"));
    expect(result.current.status).toBe("connected");
  });

  it("rebuilds the client when the manager prop changes and destroys the old one", async () => {
    const first = new FakeManager();
    const second = new FakeManager();
    let manager = first;

    const { rerender } = renderHook(() => useGateway("/chat"), {
      wrapper: ({ children }) => (
        <WebSocketProvider manager={asManager(manager)}>
          {children}
        </WebSocketProvider>
      ),
    });

    const staleSocket = first.socketFor("/chat")!;
    expect(second.socketFor("/chat")).toBeUndefined();

    manager = second;
    rerender();

    expect(second.socketFor("/chat")).toBeDefined();
    await waitFor(() => expect(staleSocket.disconnectCount).toBe(1));
  });

  it("passes the current auth token to sockets after a manager change", () => {
    const first = new FakeManager();
    const second = new FakeManager();
    let manager = first;
    let token = "token-1";

    const { rerender } = renderHook(() => useGateway("/chat"), {
      wrapper: ({ children }) => (
        <WebSocketProvider
          manager={asManager(manager)}
          options={{ auth: { token } }}
        >
          {children}
        </WebSocketProvider>
      ),
    });

    expect(first.lastSocketOpts().auth).toEqual({ token: "token-1" });

    token = "token-2";
    manager = second;
    rerender();

    expect(second.lastSocketOpts().auth).toEqual({ token: "token-2" });
  });

  it("does not rebuild when only the options object identity changes", () => {
    const manager = new FakeManager();

    const { rerender } = renderHook(() => useGateway("/chat"), {
      // A fresh inline object on every render — the common consumer pattern.
      wrapper: ({ children }) => (
        <WebSocketProvider
          manager={asManager(manager)}
          options={{ auth: { token: "token-1" } }}
        >
          {children}
        </WebSocketProvider>
      ),
    });

    rerender();
    rerender();

    expect(manager.socketCalls).toHaveLength(1);
    expect(manager.socketFor("/chat")!.disconnectCount).toBe(0);
  });
});
