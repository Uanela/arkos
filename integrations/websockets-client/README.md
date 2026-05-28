# @arkosjs/websockets-client

Framework-agnostic WebSocket client for [Arkos Gateway](https://www.arkosjs.com/docs/core-concepts/components/gateways).

Handles `_meta` envelope injection, client-side deduplication, ack/retry/timeout, and observable connection state — all without binding you to any framework.

## Installation

```bash
npm install @arkosjs/websockets-client socket.io-client
```

## Quick start

```ts
import { Manager } from "socket.io-client";
import { createWebsocketClient } from "@arkosjs/websockets-client";

const manager = new Manager("http://localhost:3000", {
  auth: { token: "your-auth-token" },
  reconnection: true,
});

const client = createWebsocketClient(manager);

const chat = client.gateway("/chat");
const orders = client.gateway("/orders");
```

> The `Manager` owns the connection config. `createWebsocketClient` wraps it.
> Calling `client.gateway()` with the same namespace twice returns the same instance — no duplicate connections.
> socket.io multiplexes all namespaces over a single TCP connection.

## API

### `createWebsocketClient(manager)`

Creates a `WebsocketClient` from a socket.io `Manager`.

```ts
const client = createWebsocketClient(manager);
```

### `client.gateway(namespace)`

Returns (or lazily creates) a `GatewayClient` for the given namespace.

```ts
const chat = client.gateway("/chat");
```

### `client.destroy()`

Disconnects all namespace sockets and clears the gateway map.

```ts
client.destroy();
```

### `GatewayClient`

The object returned by `client.gateway()`. All interaction with a namespace goes through here.

#### `.on(event, handler)` → `() => void`

Listen to a server event. Returns an unsubscribe function.

Client-side deduplication is applied automatically when `_meta.mid` is present in the payload — guards against reconnect replay or server retry storms.

```ts
const off = chat.on("receive_message", (data) => {
  console.log(data);
});

// cleanup
off();
```

#### `.off(event, handler?)`

Remove a specific handler or all handlers for an event.

```ts
chat.off("receive_message", handler);
chat.off("receive_message"); // removes all
```

#### `.emit(event, data)` — fire and forget

Automatically injects `_meta.mid` and `_meta.timestamp` into the payload so ArkosGateway's dedup and `maxAge` features work without any manual wiring.

```ts
chat.emit("send_message", { room: "general", content: "hello" });
```

#### `.emit(event, data, { ack: true, timeout?, retries? })` — with ack

Returns a `Promise<ArkosEmitResult>`. Retries with exponential backoff on timeout, capped at 5s per attempt.

```ts
const result = await chat.emit("send_message", data, {
  ack: true,
  timeout: 5000,
  retries: 3,
});

if (result.success) console.log(result.data);
else console.error(result.error);
```

#### `.join(room)` / `.leave(room)`

Emit `arkos:join` / `arkos:leave` to the server.

```ts
chat.join("room-123");
chat.leave("room-123");
```

#### `.subscribe(subscriber)` → `() => void`

Subscribe to connection state changes. Used by framework adapters to drive reactivity. Returns an unsubscribe function.

```ts
const unsub = chat.subscribe({
  onStatus: (status) => console.log(status), // "connected" | "disconnected" | "reconnecting" | "connecting"
  onUser: (user) => console.log(user), // populated when server emits "arkos:user"
});

unsub();
```

#### `.status`

Current connection status (non-reactive sync read).

```ts
chat.status; // "connected" | "disconnected" | "reconnecting" | "connecting"
```

#### `.user`

Current user (non-reactive sync read). Populated when the server emits `"arkos:user"` after authentication.

```ts
chat.user; // { id, email, ... } | null
```

#### `.rawSocket`

Escape hatch to the underlying socket.io `Socket` instance.

```ts
chat.rawSocket.id;
```

#### `.destroy()`

Removes all listeners and cleans up internal state. Called automatically by `client.destroy()`.

## How `_meta` works

Every `.emit()` call automatically wraps your payload with a `_meta` envelope:

```ts
// you call
chat.emit("send_message", { room: "general", content: "hello" })

// server receives
{
  room: "general",
  content: "hello",
  _meta: {
    mid: "550e8400-e29b-41d4-a716-446655440000", // auto-generated UUID
    timestamp: "2026-01-01T00:00:00.000Z"        // auto-generated ISO timestamp
  }
}
```

This is what ArkosGateway's `dedup` and `maxAge` options consume. You never need to construct it manually.

On the receive side, `_meta` is stripped before your handler is called — it's internal plumbing, not your data.

## Framework adapters

This package is the core used by all official Arkos framework bindings:

| Package                       | Status                      |
| ----------------------------- | --------------------------- |
| `@arkosjs/react-websockets`   | ✅ Available                |
| `@arkosjs/svelte-websockets`  | 🚧 Looking for contributors |
| `@arkosjs/solid-websockets`   | 🚧 Looking for contributors |
| `@arkosjs/vue-websockets`     | 🚧 Looking for contributors |
| `@arkosjs/angular-websockets` | 🚧 Looking for contributors |

See [CONTRIBUTING-FRAMEWORK-BINDINGS.md](../../CONTRIBUTING-FRAMEWORK-BINDINGS.md) if you want to help.

## Related

- [ArkosGateway docs](https://www.arkosjs.com/docs/core-concepts/components/gateways)
- [`@arkosjs/react-websockets`](../react-websockets)
