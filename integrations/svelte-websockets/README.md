![Header Image](https://www.arkosjs.com/img/arkos-readme-header.webp?v=4)

<div align="center">

[![npm](https://img.shields.io/npm/v/@arkosjs/svelte-websockets)](https://www.npmjs.com/package/@arkosjs/svelte-websockets)
![npm](https://img.shields.io/npm/dt/@arkosjs/svelte-websockets)
![GitHub](https://img.shields.io/github/license/uanela/arkos)

</div>

<div align="center">
<h2>Svelte 5 Bindings for Arkos WebSocket Gateway</h2>
<p>Runes-first, store-compatible — automatic cleanup, reactive status, ack/retry, and no boilerplate</p>
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

## What is `@arkosjs/svelte-websockets`?

Svelte 5 bindings for the [Arkos WebSocket Gateway](https://www.arkosjs.com/docs/core-concepts/components/gateways). A thin adapter over `@arkosjs/websockets-client` that ties gateways to the component lifecycle.

Every handle works **both ways**:

- **Runes:** `chat.status`, `sendMessage.loading`. Plain reactive reads that work in `$derived`, `$effect` and markup.
- **Stores:** `$chat.status`, `$sendMessage.loading`. Each handle implements the Svelte store contract, so it also works in legacy (non-runes) components.

## Installation

```bash
npm install @arkosjs/svelte-websockets @arkosjs/websockets-client socket.io-client
```

Requires `svelte@^5`.

## Quick Start

### 1. Wrap your app with `ArkosProvider`

```svelte
<!-- App.svelte (or +layout.svelte) -->
<script lang="ts">
  import { Manager } from "socket.io-client";
  import { ArkosProvider } from "@arkosjs/svelte-websockets";

  let { children } = $props();

  const manager = new Manager("http://localhost:8000", {
    auth: { token: "your-auth-token" },
    reconnection: true,
  });
</script>

<ArkosProvider {manager}>
  {@render children()}
</ArkosProvider>
```

The provider creates and owns the `WebsocketClient`, and destroys it when the provider is destroyed.

### 2. Use `useGateway` in any child component

```svelte
<script lang="ts">
  import { useGateway } from "@arkosjs/svelte-websockets";

  const chat = useGateway("/chat");
  let messages = $state<{ text: string }[]>([]);

  // Listen to events. Cleaned up automatically on destroy.
  chat.on<{ text: string }>("receive_message", (data) => messages.push(data));

  // Emit with loading/error tracking
  const sendMessage = chat.useEmit<{ text: string }>("send_message");
</script>

<p>Status: {chat.status}</p>

<button
  onclick={() => sendMessage.emit({ text: "hello" }, { ack: true })}
  disabled={sendMessage.loading}
>
  {sendMessage.loading ? "Sending..." : "Send"}
</button>

{#if sendMessage.error}<p style="color: red">{sendMessage.error}</p>{/if}

<ul>
  {#each messages as msg}<li>{msg.text}</li>{/each}
</ul>
```

Prefer stores? The same handles work with `$` syntax:

```svelte
<div>
  Status: {$chat.status}
  {#if $sendMessage.loading} Sending... {/if}
</div>
```

---

## API Reference

### `<ArkosProvider>`

Provides the `WebsocketClient` to the component tree. Mount it once, near the root.

| Prop       | Type                                | Description                                                      |
| ---------- | ----------------------------------- | ---------------------------------------------------------------- |
| `manager`  | `Manager` (from `socket.io-client`) | Socket.IO manager with connection config and auth                |
| `options`  | `Partial<SocketOptions>`            | Default socket options for every namespace (read once)           |
| `children` | `Snippet`                           | Your component tree                                              |

**Changing `manager`** (e.g. after login with a new token) destroys the old client and creates a new one. Every `useGateway` below rebinds its status, listeners and emitters to the new client, and **children stay mounted**, so component state is kept.

---

### `useGateway(namespace, opts?)`

Returns a reactive handle for a namespace. Call it during component initialisation, inside a provider. The namespace socket is created lazily and shared: two components calling `useGateway("/chat")` use the same connection.

`namespace` may be a string or a **getter**. With a getter, changing the namespace re-subscribes everything (status, `on` listeners and emitters) to the new gateway:

```svelte
<script lang="ts">
  let { room } = $props();
  const chat = useGateway(() => `/rooms/${room}`);
</script>
```

#### `chat.on(event, handler)`

Listens to a server event. The listener is removed automatically when the component is destroyed, and it follows the gateway when the namespace changes. Returns an `off()` function for removing it earlier.

```ts
chat.on("receive_message", (data) => messages.push(data));

const off = chat.on("typing", showTyping);
off(); // stop listening early
```

Handlers always see the latest component state (Svelte closures read `$state` live), so you don't need deps arrays or refs.

Client-side dedup is applied automatically when `_meta.mid` is present in the payload.

#### `chat.useEmit(event, defaultOptions?)`

Returns a `SocketEmitter` for the event. Per-call options are merged over `defaultOptions`.

```ts
const sendMessage = chat.useEmit<{ text: string }, { id: string }>("send_message", {
  ack: true,
  timeout: 5000,
});

// Fire and forget
sendMessage.emit({ text: "hi" }, { ack: false });

// With acknowledgement. Resolves to { success, data?, error? } and never throws.
const result = await sendMessage.emit({ text: "hi" }, { ack: true, retries: 2 });
```

| Member                 | Type                       | Description                                                       |
| ---------------------- | -------------------------- | ----------------------------------------------------------------- |
| `emit(data, options?)` | `void \| Promise<Result>`  | `void` for fire-and-forget, `Promise<ArkosEmitResult>` with `ack` |
| `loading`              | `boolean` (reactive)       | `true` while **any** ack emit is pending                          |
| `error`                | `string \| null` (reactive) | Last ack error (failure or timeout), cleared on the next emit      |
| `lastEmittedAt`        | `number \| null` (reactive) | Timestamp of the last emit                                        |
| `reset()`              | `() => void`               | Clears `error`/`loading`. Acks already in flight are ignored after a reset |
| `subscribe`            | store contract             | `$sendMessage` → `{ loading, error, lastEmittedAt }`              |

It is safe to call `emit` inside an `$effect`: the emitter's own state is not tracked, so an ack resolving won't re-run the effect.

#### Reactive properties

| Property         | Type                                                              |
| ---------------- | ----------------------------------------------------------------- |
| `chat.status`    | `"connected" \| "connecting" \| "reconnecting" \| "disconnected"` |
| `chat.namespace` | the namespace currently in use                                    |
| `chat.raw`       | the underlying `GatewayClient` (escape hatch)                     |
| `$chat`          | store value `{ status }`                                          |

---

## Examples

### Watch connection status

```svelte
<script lang="ts">
  const chat = useGateway("/chat");
  const color = $derived(
    chat.status === "connected" ? "green" : chat.status === "disconnected" ? "red" : "orange"
  );
</script>

<span style:color>{chat.status}</span>
```

### Join a room once connected

```svelte
<script lang="ts">
  const chat = useGateway("/chat");
  const join = chat.useEmit<{ room: string }>("join_room", { ack: true });

  $effect(() => {
    if (chat.status === "connected") join.emit({ room: "general" });
  });
</script>
```

### Legacy (non-runes) components

```svelte
<script>
  import { useGateway } from "@arkosjs/svelte-websockets";
  export let room;

  const chat = useGateway("/chat");
</script>

<p>{$chat.status}</p>
```

### SvelteKit

socket.io connects as soon as a `Manager` is created, so create it in the browser only. For example, disable SSR for the route that uses it (`export const ssr = false`), or only render the provider when `browser` from `$app/environment` is true.

A full app lives in [`examples/tic-tac-toe-websockets/frontend-svelte`](../../examples/tic-tac-toe-websockets/frontend-svelte).

---

## Types

```ts
import type {
  Gateway,
  GatewayState,
  SocketEmitter,
  EmitterState,
  ArkosEmitOptions,
  ArkosEmitResult,
  ArkosEventHandler,
  GatewayStatus,
} from "@arkosjs/svelte-websockets";
```

---

## Development

```bash
pnpm install
pnpm test        # vitest + @testing-library/svelte against a real socket.io server
pnpm typecheck   # svelte-check
pnpm build       # svelte-package → dist/
```

The tests cover provider cleanup, listener cleanup on unmount, re-subscription on namespace and manager changes, ack `loading`/`error` state, status across disconnect and reconnect, runes mode, store syntax and legacy components.

---

## Peer Dependencies

| Package                      | Version  |
| ---------------------------- | -------- |
| `svelte`                     | `^5.0.0` |
| `socket.io-client`           | `^4.7.0` |
| `@arkosjs/websockets-client` | `^0.2.0` |

---

## Related

- [Arkos WebSocket Gateway Docs](https://www.arkosjs.com/docs/core-concepts/components/gateways)
- [`@arkosjs/websockets-client`](../websockets-client): core package
- [`@arkosjs/react-websockets`](../react-websockets): React bindings
- [Contributing Framework Bindings](../../CONTRIBUTING_FRAMEWORK_BINDING.md)

---

## License

MIT
