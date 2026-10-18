![Header Image](https://www.arkosjs.com/img/arkos-readme-header.webp?v=4)

<div align="center">

[![npm](https://img.shields.io/npm/v/@arkosjs/vue-websockets)](https://www.npmjs.com/package/@arkosjs/vue-websockets)
![npm](https://img.shields.io/npm/dt/@arkosjs/vue-websockets)
![GitHub](https://img.shields.io/github/license/uanela/arkos)

</div>

<div align="center">
<h2>Vue Bindings for Arkos WebSocket Gateway</h2>
<p>Ergonomic composables for real-time communication — automatic cleanup, reactive status, ack/retry, and no boilerplate</p>
</div>

<div align="center">

**[Installation](#installation)** •
**[Quick Start](#quick-start)** •
**[API Reference](#api-reference)** •
**[Examples](#examples)** •
**[Documentation](https://www.arkosjs.com/docs/core-concepts/components/gateways)** •
**[GitHub](https://github.com/uanela/arkos)**

</div>

---

## What is `@arkosjs/vue-websockets`?

Vue bindings for the [Arkos WebSocket Gateway](https://www.arkosjs.com/docs/core-concepts/components/gateways). Wraps `@arkosjs/websockets-client` in composables that integrate with your component lifecycle — no memory leaks, no listener churn, clean APIs.

## Installation

```bash
npm install @arkosjs/vue-websockets socket.io-client
```

You'll also need `socket.io-client` as a peer dependency.

## Quick Start

### 1. Wrap your app with `WebSocketProvider`

```vue
<script setup lang="ts">
import { computed, shallowRef } from "vue";
import { Manager } from "socket.io-client";
import { WebSocketProvider } from "@arkosjs/vue-websockets";

const accessToken = shallowRef("123");

const manager = computed(
  () =>
    new Manager("http://localhost:3000", {
      auth: { token: accessToken.value },
      reconnection: true,
    })
);
</script>

<template>
  <WebSocketProvider :manager="manager">
    <ChatRoom />
  </WebSocketProvider>
</template>
```

The provider creates and owns the `WebsocketClient`. It's destroyed automatically when the provider unmounts.

Because the manager is derived from `accessToken` above, logging in or out builds a new
`Manager` — and the provider rebuilds the client around it, so the new token is what the
sockets actually connect with. The previous client is destroyed.

### 2. Use `useGateway` in any child component

```vue
<script setup lang="ts">
import { ref } from "vue";
import { useGateway } from "@arkosjs/vue-websockets";

const chat = useGateway("/chat");
const messages = ref<{ content: string }[]>([]);

// Listen to events — automatically cleaned up on unmount
chat.on("receive_message", (data) => {
  messages.value.push(data);
});

// Emit with loading/error tracking
const sendMessage = chat.useEmit("send_message");
</script>

<template>
  <div>
    <p>Status: {{ chat.status }}</p>

    <button
      :disabled="sendMessage.loading"
      @click="sendMessage.emit({ room: 'general', content: 'hello' })"
    >
      {{ sendMessage.loading ? "Sending..." : "Send" }}
    </button>

    <p v-if="sendMessage.error" style="color: red">{{ sendMessage.error }}</p>

    <ul>
      <li v-for="(msg, i) in messages" :key="i">{{ msg.content }}</li>
    </ul>
  </div>
</template>
```

---

## API Reference

### `<WebSocketProvider>`

Provides the `WebsocketClient` to the component tree. Mount once at your app root.

```vue
<WebSocketProvider :manager="manager" :options="options">
  <App />
</WebSocketProvider>
```

| Prop      | Type                                | Description                                                 |
| --------- | ----------------------------------- | ----------------------------------------------------------- |
| `manager` | `Manager` (from `socket.io-client`) | Socket.IO manager with connection config and auth           |
| `options` | `Partial<SocketOptions>`            | Extra socket.io options merged into every namespace socket  |

Default slot renders your component tree.

The client is destroyed automatically when the provider unmounts.

Passing a **new `manager` instance** rebuilds the client and destroys the old one. This is
what makes re-authentication work: derive the manager from your token, and pass the new
instance down when the token changes.

Only the manager's *identity* is compared. Changing `options` alone does not rebuild the
client — it is normally an inline object literal, so keying on it would rebuild on every
render. `options` is read when the client is created, which is why it carries your token
across a manager change.

---

### `useGateway(namespace, opts?)`

Returns a scoped, reactive gateway handle for the given namespace. The underlying socket is lazily created on first call and reused.

```ts
const chat = useGateway("/chat");
const orders = useGateway("/orders", { transports: ["websocket"] });
```

Calling with the same namespace twice returns the same instance — no duplicate connections.

Must be called from a component `setup()` (or an active effect scope), since listener
cleanup is bound to that scope.

#### `chat.on(event, handler)`

Listen to a server event. Automatically unsubscribes when the component unmounts.

```ts
const off = chat.on("receive_message", (data) => {
  messages.value.push(data);
});

// Or unsubscribe early
off();
```

The handler is not wrapped in a `watch`, so an inline arrow function is fine — it never
re-registers the underlying socket listener.

**Note:** Client-side deduplication is applied automatically when `_meta.mid` is present in the payload.

#### `chat.useEmit(event, defaultOptions?)`

Returns a `SocketEmitter` object for the given event. Use it to emit with loading/error tracking.

```ts
const sendMessage = chat.useEmit("send_message");

// Fire and forget
sendMessage.emit({ room: "general", content: "hello" });

// With acknowledgement (waits for server response)
const result = await sendMessage.emit(data, {
  ack: true,
  timeout: 5000,
  retries: 3,
});

if (result.success) {
  console.log("Message sent:", result.data);
} else {
  console.error("Failed:", result.error);
}
```

**SocketEmitter properties:**

- `emit(data, options?)` — Emit the event. Returns void for fire-and-forget, Promise for ack.
- `loading` — `boolean` — True while waiting for ack response. Always false for fire-and-forget.
- `error` — `string | null` — Last error message, or null if succeeded.
- `lastEmittedAt` — `number | null` — Timestamp of last emit, or null if never emitted.
- `reset()` — Clears error and loading state.

The emitter is reactive, so `sendMessage.loading` in a template updates on its own.

#### `chat.status`

Reactive connection status.

```ts
chat.status; // "connected" | "connecting" | "reconnecting" | "disconnected"
```

#### `chat.raw`

Escape hatch to the underlying `GatewayClient` for advanced use cases.

```ts
chat.raw; // GatewayClient instance
chat.raw.rawSocket; // raw socket.io Socket
```

---

### `useWebsocketClient()`

Returns the `WebsocketClient` instance from context. Throws if used outside `<WebSocketProvider>`.

```ts
const client = useWebsocketClient();
const gateway = client.gateway("/notifications");
```

---

## Examples

### Handle Authentication

Listen for the `"authenticated"` event after login:

```vue
<script setup lang="ts">
import { ref } from "vue";
import { useGateway } from "@arkosjs/vue-websockets";

const chat = useGateway("/chat");
const user = ref<{ name: string } | null>(null);

// Server emits "authenticated" with user data
chat.on("authenticated", (data) => {
  user.value = data.user;
});
</script>

<template>
  <div v-if="user">Welcome, {{ user.name }}</div>
  <div v-else>Loading...</div>
</template>
```

### Emit with Acknowledgement

```vue
<script setup lang="ts">
import { useGateway } from "@arkosjs/vue-websockets";

const chat = useGateway("/messages");
const sendMessage = chat.useEmit("send_message");

async function handleSubmit() {
  const result = await sendMessage.emit(
    { content: "Hello!" },
    { ack: true, timeout: 5000, retries: 2 }
  );

  if (result.success) {
    alert("Message received by server");
  } else {
    alert(`Error: ${result.error}`);
  }
}
</script>

<template>
  <form @submit.prevent="handleSubmit">
    <button :disabled="sendMessage.loading">
      {{ sendMessage.loading ? "Sending..." : "Send" }}
    </button>
  </form>
</template>
```

### Global Error Handler

Listen for server-wide errors:

```vue
<script setup lang="ts">
import { useGateway } from "@arkosjs/vue-websockets";

const chat = useGateway("/chat");

chat.on("error", (errorData) => {
  console.error("Server error:", errorData);
  // Show toast, log, etc.
});
</script>

<template>
  <div>Chat App</div>
</template>
```

### Watch Connection Status

```vue
<script setup lang="ts">
import { computed } from "vue";
import { useGateway } from "@arkosjs/vue-websockets";

const chat = useGateway("/chat");

const color = computed(() =>
  chat.status === "connected"
    ? "green"
    : chat.status === "disconnected"
      ? "red"
      : "orange"
);
</script>

<template>
  <div :style="{ color }">{{ chat.status }}</div>
</template>
```

---

## Types

```ts
import type {
  ArkosEmitOptions,
  ArkosEmitResult,
  ArkosEventHandler,
  GatewayStatus,
  GatewayHandle,
  SocketEmitter,
} from "@arkosjs/vue-websockets";
```

| Type                              | Description                                                       |
| --------------------------------- | ----------------------------------------------------------------- |
| `GatewayStatus`                   | `"connected" \| "connecting" \| "reconnecting" \| "disconnected"` |
| `ArkosEventHandler<T>`            | `(data: T) => void`                                               |
| `ArkosEmitOptions`                | `{ ack?: boolean; timeout?: number; retries?: number }`           |
| `ArkosEmitResult<T>`              | `{ success: boolean; data?: T; error?: string }`                  |
| `GatewayHandle`                   | Return type of `useGateway()`                                     |
| `SocketEmitter<TData, TResponse>` | Return type of `chat.useEmit()`                                   |

---

## Peer Dependencies

| Package                      | Version   |
| ---------------------------- | --------- |
| `vue`                        | `^3.4.0`  |
| `socket.io-client`           | `^4.7.0`  |
| `@arkosjs/websockets-client` | `^0.2.0`  |

---

## Development

```bash
pnpm test        # vitest, jsdom
pnpm typecheck
pnpm build
```

Tests run the real `@arkosjs/websockets-client` against a fake socket.io layer, so they
cover the binding-to-core contract rather than a mocked core.

---

## Related

- [Arkos WebSocket Gateway Docs](https://www.arkosjs.com/docs/core-concepts/components/gateways)
- [`@arkosjs/websockets-client`](../websockets-client) — Core package
- [`@arkosjs/react-websockets`](../react-websockets) — React bindings
- [Contributing Framework Bindings](../../CONTRIBUTING_FRAMEWORK_BINDING.md)

---

## License

MIT

<div align="center">

**[Installation](#installation)** •
**[Quick Start](#quick-start)** •
**[API Reference](#api-reference)** •
**[Examples](#examples)** •
**[Documentation](https://www.arkosjs.com/docs/core-concepts/components/gateways)** •
**[GitHub](https://github.com/uanela/arkos)**

Built with ❤️ as part of [Arkos.js](https://arkosjs.com)

_Real-time Vue, simplified._

</div>
