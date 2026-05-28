![Header Image](https://www.arkosjs.com/img/arkos-readme-header.webp?v=4)

<div align="center">

[![npm](https://img.shields.io/npm/v/@arkosjs/websockets-client)](https://www.npmjs.com/package/@arkosjs/websockets-client)
![npm](https://img.shields.io/npm/dt/@arkosjs/websockets-client)
![GitHub](https://img.shields.io/github/license/uanela/arkos)

</div>

<div align="center">
<h2>Framework-Agnostic WebSocket Client for Arkos Gateway</h2>
<p>Handle real-time communication with automatic deduplication, ack/retry/timeout, and observable connection state — without framework lock-in</p>
</div>

<div align="center">

**[Installation](#installation)** •
**[Quick Start](#quick-start)** •
**[API Reference](#api-reference)** •
**[How \_meta Works](#how-_meta-works)** •
**[Framework Adapters](#framework-adapters)** •
**[Documentation](https://www.arkosjs.com/docs/core-concepts/components/gateways)** •
**[GitHub](https://github.com/uanela/arkos)**

</div>

---

## What is `@arkosjs/websockets-client`?

This is the **core WebSocket client** that powers all Arkos real-time features. It wraps socket.io and adds:

- **Automatic `_meta` injection** — every emit gets a unique ID and timestamp for dedup/maxAge
- **Client-side deduplication** — guards against reconnect replay and server retry storms
- **Ack + retry + timeout** — request-response patterns with exponential backoff
- **Observable connection state** — drive framework reactivity without framework coupling
- **Zero framework dependencies** — works standalone or with React, Vue, Svelte, Solid, Angular

## Installation

```bash
npm install @arkosjs/websockets-client socket.io-client
```

You'll also need `socket.io-client` as a peer dependency.

## Quick Start

### Create a Manager and Client

```ts
import { Manager } from "socket.io-client";
import { createWebsocketClient } from "@arkosjs/websockets-client";

const manager = new Manager("http://localhost:3000", {
    auth: { token: "your-auth-token" },
    reconnection: true,
});

const client = createWebsocketClient(manager);
```

### Get a Gateway for a Namespace

```ts
const chat = client.gateway("/chat");
const orders = client.gateway("/orders");
```

Calling `.gateway()` with the same namespace twice returns the same instance — no duplicate connections. Socket.io multiplexes all namespaces over a single TCP connection.

### Listen to Events

```ts
const off = chat.on("receive_message", (data) => {
    console.log(data);
});

// Cleanup when done
off();
```

Client-side deduplication is applied automatically when `_meta.mid` is present — guards against reconnect replay or server retry storms.

### Emit Events

**Fire and forget:**

```ts
chat.emit("send_message", { room: "general", content: "hello" });
```

**With acknowledgement:**

```ts
const result = await chat.emit("send_message", data, {
    ack: true,
    timeout: 5000,
    retries: 3,
});

if (result.success) {
    console.log(result.data);
} else {
    console.error(result.error);
}
```

Retries with exponential backoff on timeout, capped at 5s per attempt.

### Track Connection State

```ts
const unsub = chat.subscribe({
    onStatus: (status) => {
        console.log(status); // "connected" | "disconnected" | "reconnecting" | "connecting"
    },
    onUser: (user) => {
        console.log(user); // Populated when server emits "authenticated"
    },
});

// Cleanup
unsub();
```

Or read the current state synchronously:

```ts
chat.status; // "connected" | "disconnected" | "reconnecting" | "connecting"
chat.user; // { id, email, ... } | null
```

---

## API Reference

### `createWebsocketClient(manager)`

Creates a `WebsocketClient` from a socket.io `Manager`.

```ts
const client = createWebsocketClient(manager);
```

### `client.gateway(namespace)`

Returns (or lazily creates) a `GatewayClient` for the given namespace.

```ts
const chat = client.gateway("/chat");
const orders = client.gateway("/orders");
```

Subsequent calls with the same namespace return the cached instance.

### `client.destroy()`

Disconnects all namespace sockets and clears the gateway map.

```ts
client.destroy();
```

---

## GatewayClient API

The object returned by `client.gateway()`. All interaction with a namespace goes through here.

### `.on(event, handler)` → `() => void`

Listen to a server event. Returns an unsubscribe function.

```ts
const off = chat.on("receive_message", (data) => {
    console.log(data);
});

// Cleanup
off();
```

**Deduplication:** Client-side dedup is applied automatically when `_meta.mid` is present in the payload — it's stripped before the handler is called.

### `.emit(event, data)` → `void`

Fire-and-forget emit. Automatically injects `_meta.mid` and `_meta.timestamp`.

```ts
chat.emit("send_message", { room: "general", content: "hello" });
```

### `.emit(event, data, { ack: true, timeout?, retries? })` → `Promise<ArkosEmitResult>`

Emit with acknowledgement. Returns a promise resolving to the server's ack response.

```ts
const result = await chat.emit("send_message", data, {
    ack: true,
    timeout: 5000, // Wait 5s before retrying (default: 5000)
    retries: 3, // Retry up to 3 times (default: 0)
});

if (result.success) {
    console.log("Data:", result.data);
} else {
    console.error("Error:", result.error);
}
```

Retries use exponential backoff: 1s, 2s, 4s, capped at 5s.

### `.subscribe(subscriber)` → `() => void`

Subscribe to connection state changes. Used by framework adapters to drive reactivity.

```ts
const unsub = chat.subscribe({
    onStatus: (status) => {
        // "connected" | "disconnected" | "reconnecting" | "connecting"
    },
    onUser: (user) => {
        // Populated when server emits "authenticated"
    },
});

// Cleanup
unsub();
```

### `.status`

Current connection status (non-reactive sync read).

```ts
if (chat.status === "connected") {
    chat.emit("send_message", data);
}
```

### `.user`

Current user object (non-reactive sync read). Populated when the server emits `"authenticated"` after authentication.

```ts
if (chat.user) {
    console.log(`Connected as ${chat.user.id}`);
}
```

### `.rawSocket`

Escape hatch to the underlying socket.io `Socket` instance for advanced use cases.

```ts
chat.rawSocket.id; // Socket ID
```

### `.destroy()`

Removes all listeners and cleans up internal state. Called automatically by `client.destroy()`.

```ts
chat.destroy();
```

---

## How `_meta` Works

Every `.emit()` call automatically wraps your payload with a `_meta` envelope:

```ts
// You call this
chat.emit("send_message", { room: "general", content: "hello" });

// Server receives this
{
  room: "general",
  content: "hello",
  _meta: {
    mid: "550e8400-e29b-41d4-a716-446655440000",  // Auto-generated UUID
    timestamp: "2026-01-01T00:00:00.000Z"          // Auto-generated ISO timestamp
  }
}
```

This `_meta` envelope is what [ArkosGateway](https://www.arkosjs.com/docs/core-concepts/components/gateways)'s `dedup` and `maxAge` options consume for server-side deduplication and time-based validation.

**You never need to construct it manually.** On the receive side, `_meta` is stripped before your handler is called — it's internal plumbing, not your data.

---

## Framework Adapters

This package is the **core** used by all official Arkos framework bindings. If you're using a framework, use one of these instead:

| Framework | Package                       | Status                      |
| --------- | ----------------------------- | --------------------------- |
| React     | `@arkosjs/react-websockets`   | ✅ Available                |
| Svelte    | `@arkosjs/svelte-websockets`  | 🚧 Looking for contributors |
| Vue       | `@arkosjs/vue-websockets`     | 🚧 Looking for contributors |
| Solid     | `@arkosjs/solid-websockets`   | 🚧 Looking for contributors |
| Angular   | `@arkosjs/angular-websockets` | 🚧 Looking for contributors |

Each adapter wraps this core in your framework's reactivity primitives (hooks, stores, services, etc.).

**Want to contribute a binding?** See [CONTRIBUTING_FRAMEWORK_BINDINGS.md](../../CONTRIBUTING_FRAMEWORK_BINDINGS.md).

---

## Peer Dependencies

| Package            | Version  |
| ------------------ | -------- |
| `socket.io-client` | `^4.7.0` |

---

## Related

- [ArkosGateway Documentation](https://www.arkosjs.com/docs/core-concepts/components/gateways)
- [Contributing Framework Bindings](../../CONTRIBUTING_FRAMEWORK_BINDINGS.md)
- [`@arkosjs/react-websockets`](../react-websockets)

---

## License

MIT

<div align="center">

**[Installation](#installation)** •
**[Quick Start](#quick-start)** •
**[API Reference](#api-reference)** •
**[How \_meta Works](#how-_meta-works)** •
**[Framework Adapters](#framework-adapters)** •
**[Documentation](https://www.arkosjs.com/docs/core-concepts/components/gateways)** •
**[GitHub](https://github.com/uanela/arkos)**

Built with ❤️ as part of [Arkos.js](https://arkosjs.com)

_Real-time WebSocket communication, simplified._

</div>
