import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { Server } from "socket.io";

export interface SendPayload {
  text: string;
  delay?: number;
  fail?: string;
  noAck?: boolean;
}

export interface Received {
  namespace: string;
  event: string;
  data: any;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Minimal socket.io server standing in for an ArkosGateway:
 * - /chat, /orders: send_message (ack, optional delay / failure / no ack)
 * - /control: lets tests drive the server (broadcast, drop, kick, inspect)
 *
 * Started from vitest globalSetup so it runs in plain Node — test workers
 * use the "browser" resolve condition, which breaks the `ws` server.
 */
export async function startServer() {
  const http = createServer();
  const io = new Server(http, { cors: { origin: "*" } });
  const received: Received[] = [];

  for (const name of ["/chat", "/orders"]) {
    io.of(name).on("connection", (socket) => {
      socket.on("send_message", async (data: SendPayload, ack?: Function) => {
        received.push({ namespace: name, event: "send_message", data });
        if (data.noAck) return;
        if (data.delay) await sleep(data.delay);
        if (data.fail) return ack?.({ success: false, error: data.fail });
        ack?.({ success: true, data: { echo: data.text } });
      });
    });
  }

  io.of("/control").on("connection", (socket) => {
    socket.on("broadcast", ({ namespace, event, data }, ack) => {
      io.of(namespace).emit(event, data);
      ack();
    });
    // Close the engine.io transport: the client manager will reconnect
    socket.on("drop", ({ namespace }, ack) => {
      for (const s of io.of(namespace).sockets.values()) s.conn.close();
      ack();
    });
    // Server-side disconnect: the client will NOT reconnect
    socket.on("kick", ({ namespace }, ack) => {
      for (const s of io.of(namespace).sockets.values()) s.disconnect(true);
      ack();
    });
    socket.on("received", (ack) => ack(received));
    socket.on("reset", (ack) => {
      received.length = 0;
      ack();
    });
  });

  await new Promise<void>((resolve) => http.listen(0, resolve));
  const { port } = http.address() as AddressInfo;

  return {
    url: `http://localhost:${port}`,
    close: () => new Promise<void>((resolve) => io.close(() => resolve())),
  };
}
