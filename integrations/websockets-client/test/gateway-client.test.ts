import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Server } from "socket.io";
import { Manager } from "socket.io-client";
import {
  createWebsocketClient,
  type GatewayClient,
  type GatewayStatus,
  type WebsocketClient,
} from "../src/exports/index";

const cleanups: Array<() => unknown> = [];

afterEach(async () => {
  for (const cleanup of cleanups.splice(0).reverse()) await cleanup();
});

async function startServer() {
  const http = createServer();
  const io = new Server(http);
  io.of("/chat");
  io.of("/orders");
  await new Promise<void>((resolve) => http.listen(0, resolve));
  const { port } = http.address() as AddressInfo;
  let closed = false;
  const close = () =>
    closed
      ? undefined
      : new Promise<void>((resolve) => {
          closed = true;
          io.close(() => resolve());
        });
  cleanups.push(close);
  return { url: `http://localhost:${port}`, io, close };
}

function createClient(url: string, opts: ConstructorParameters<typeof Manager>[1] = {}) {
  const manager = new Manager(url, {
    transports: ["websocket"],
    reconnectionDelay: 10,
    reconnectionDelayMax: 20,
    ...opts,
  });
  const client = createWebsocketClient(manager);
  cleanups.push(() => {
    client.destroy();
    manager.engine?.close();
  });
  return { manager, client };
}

function recordStatuses(gateway: GatewayClient): GatewayStatus[] {
  const statuses: GatewayStatus[] = [];
  gateway.subscribe({ onStatus: (s) => statuses.push(s) });
  return statuses;
}

const connected = (gateway: GatewayClient) =>
  vi.waitFor(() => expect(gateway.status).toBe("connected"));

describe("GatewayClient status", () => {
  it("starts as connecting and becomes connected", async () => {
    const server = await startServer();
    const { client } = createClient(server.url);

    const chat = client.gateway("/chat");

    expect(chat.status).toBe("connecting");
    await connected(chat);
  });

  it("starts as connected when reusing an already-connected socket", async () => {
    const server = await startServer();
    const { manager } = createClient(server.url);
    const first = createWebsocketClient(manager).gateway("/chat");
    await connected(first);

    const second = createWebsocketClient(manager).gateway("/chat");

    expect(second.status).toBe("connected");
  });

  it("stays reconnecting while the manager retries, then disconnected when it gives up", async () => {
    const server = await startServer();
    const { client } = createClient(server.url, { reconnectionAttempts: 3 });
    const chat = client.gateway("/chat");
    await connected(chat);
    const statuses = recordStatuses(chat);

    await server.close();

    await vi.waitFor(() => expect(statuses.at(-1)).toBe("disconnected"), {
      timeout: 2000,
    });
    expect(statuses).toEqual(["disconnected", "reconnecting", "disconnected"]);
  });

  it("goes disconnected → reconnecting → connected after a dropped transport", async () => {
    const server = await startServer();
    const { client } = createClient(server.url);
    const chat = client.gateway("/chat");
    await connected(chat);
    const statuses = recordStatuses(chat);

    for (const socket of server.io.of("/chat").sockets.values()) socket.conn.close();

    await vi.waitFor(() =>
      expect(statuses).toEqual(["disconnected", "reconnecting", "connected"])
    );
  });

  it("reports disconnected when the server rejects the connection", async () => {
    const server = await startServer();
    server.io.of("/private").use((_socket, next) => next(new Error("unauthorized")));
    const { client } = createClient(server.url);
    const gateway = client.gateway("/private");
    const statuses = recordStatuses(gateway);

    await vi.waitFor(() => expect(gateway.status).toBe("disconnected"));
    expect(statuses).toEqual(["disconnected"]);
  });

  it("does not mark a deliberately disconnected namespace as reconnecting", async () => {
    const server = await startServer();
    const { client } = createClient(server.url);
    const chat = client.gateway("/chat");
    const orders = client.gateway("/orders");
    await connected(chat);
    await connected(orders);

    orders.rawSocket.disconnect();
    expect(orders.status).toBe("disconnected");
    const orderStatuses = recordStatuses(orders);
    const chatStatuses = recordStatuses(chat);

    for (const socket of server.io.of("/chat").sockets.values()) socket.conn.close();
    await vi.waitFor(() =>
      expect(chatStatuses).toEqual(["disconnected", "reconnecting", "connected"])
    );

    expect(orderStatuses).toEqual([]);
  });
});

describe("GatewayClient.destroy", () => {
  it("removes the listeners it registered on the shared Manager", async () => {
    const server = await startServer();
    const { manager } = createClient(server.url);
    const count = () =>
      manager.listeners("reconnect_attempt").length +
      manager.listeners("reconnect_failed").length +
      manager.listeners("reconnect").length;
    const baseline = count();

    const client: WebsocketClient = createWebsocketClient(manager);
    client.gateway("/chat");
    client.gateway("/orders");
    expect(count()).toBeGreaterThan(baseline);

    client.destroy();

    expect(count()).toBe(baseline);
  });
});

describe("GatewayClient.on", () => {
  async function setup() {
    const server = await startServer();
    const { client } = createClient(server.url);
    const chat = client.gateway("/chat");
    const handler = vi.fn();
    chat.on("update", handler);
    await connected(chat);
    const emit = (data: unknown) => server.io.of("/chat").emit("update", data);
    return { handler, emit };
  }

  it("dedups deliveries that share a _meta.mid and strips the envelope", async () => {
    const { handler, emit } = await setup();
    const _meta = { mid: "m-1", timestamp: Date.now() };

    emit({ text: "a", _meta });
    emit({ text: "a", _meta });
    emit({ text: "b", _meta: { ...(_meta), mid: "m-2" } });

    await vi.waitFor(() => expect(handler).toHaveBeenCalledTimes(2));
    expect(handler.mock.calls).toEqual([[{ text: "a" }], [{ text: "b" }]]);
  });

  it("does not treat a shared domain id as a duplicate", async () => {
    const { handler, emit } = await setup();

    emit({ id: "order-1", status: "paid" });
    emit({ id: "order-1", status: "shipped" });

    await vi.waitFor(() => expect(handler).toHaveBeenCalledTimes(2));
    expect(handler.mock.calls.map(([d]) => d.status)).toEqual(["paid", "shipped"]);
  });

  it("passes non-object payloads through untouched", async () => {
    const { handler, emit } = await setup();

    emit("hello");
    emit([1, 2]);
    emit(42);
    emit(null);

    await vi.waitFor(() => expect(handler).toHaveBeenCalledTimes(4));
    expect(handler.mock.calls).toEqual([["hello"], [[1, 2]], [42], [null]]);
  });
});
