# @arkosjs/react-websockets

React bindings for [Arkos WebSocket Gateway](https://arkosjs.com/docs/core-concepts/components/gateways). Connect to namespaced gateways, listen to events, emit with loading/error state, join rooms, and track connection status — all with ergonomic hooks that clean up automatically.

## Installation

```bash
pnpm add @arkosjs/react-websockets socket.io-client
```

## Quick Start

### 1. Wrap your app with `WebSocketProvider`

```tsx
import { Manager } from "socket.io-client";
import { WebSocketProvider } from "@arkosjs/react-websockets";

export default function App() {
  const manager = new Manager("http://localhost:3000", {
    auth: { token: "your-auth-token" },
    reconnection: true,
  });

  return (
    <WebSocketProvider manager={manager}>
      <ChatRoom />
    </WebSocketProvider>
  );
}
```

### 2. Use `useGateway` anywhere in the tree

```tsx
import { useGateway } from "@arkosjs/react-websockets";

function ChatRoom() {
  const chat = useGateway("/chat");
  const [messages, setMessages] = useState([]);

  // Listen to events — cleaned up on unmount
  chat.on("receive_message", (data) => {
    setMessages((prev) => [...prev, data]);
  });

  // Emit events with loading/error state
  const sendMessage = chat.useEmit("send_message");

  return (
    <div>
      <p>Status: {chat.status}</p>
      <button
        onClick={() => sendMessage.emit({ room: "general", content: "hello" })}
        disabled={sendMessage.loading}
      >
        Send
      </button>
      {sendMessage.error && <p>{sendMessage.error}</p>}
    </div>
  );
}
```

---

## API Reference

### `<WebSocketProvider>`

Provides the `WebsocketClient` to the React tree. Mount once at your app root.

```tsx
<WebSocketProvider manager={manager}>{children}</WebSocketProvider>
```

| Prop       | Type                                | Description                |
| ---------- | ----------------------------------- | -------------------------- |
| `manager`  | `Manager` (from `socket.io-client`) | Socket.IO manager instance |
| `children` | `ReactNode`                         | Your component tree        |

The client is destroyed automatically when the provider unmounts.

---

### `useGateway(namespace)`

Returns a scoped gateway handle for a given namespace. The underlying socket is lazily created on first call and reused across renders.

```tsx
const chat = useGateway("/chat");
```

#### `chat.on(event, handler, deps?)`

Listen to a server event. Unsubscribes automatically on unmount. The handler is kept in a ref internally — listener identity is stable even when the callback changes.

```tsx
chat.on("receive_message", (data) => {
  setMessages((prev) => [...prev, data]);
});

// Re-subscribe when room changes
chat.on("receive_message", handler, [roomId]);
```

#### `chat.useEmit(event, defaultOptions?)`

Returns a stable `SocketEmitter` object for the given event.

```tsx
const sendMessage = chat.useEmit("send_message");

// Fire and forget
sendMessage.emit({ room: "general", content: "hello" });

// With acknowledgement
const result = await sendMessage.emit(data, {
  ack: true,
  timeout: 5000,
  retries: 3,
});

sendMessage.loading; // true while awaiting ack
sendMessage.error; // string | null
sendMessage.lastEmittedAt; // number | null — timestamp of last emit
sendMessage.reset(); // clear error and loading state
```

#### `chat.join(room)` / `chat.leave(room)`

Join or leave a room on this namespace.

```tsx
chat.join("room-123");
chat.leave("room-123");
```

#### `chat.status`

Reactive connection status for the namespace. Re-renders the component when it changes.

```tsx
chat.status; // "connected" | "connecting" | "reconnecting" | "disconnected"
```

#### `chat.user`

Reactive user state. Populated when the server emits `arkos:user` after authentication.

```tsx
chat.user; // { id, email, ... } | null
```

#### `chat.raw`

Escape hatch to the underlying `GatewayClient` instance for advanced usage.

```tsx
chat.raw.socket; // raw socket.io Socket
```

---

### `useWebsocketClient()`

Returns the `WebsocketClient` instance directly from context. Throws if used outside `<WebSocketProvider>`.

```tsx
const client = useWebsocketClient();
const gateway = client.gateway("/notifications");
```

---

## Types

```ts
import type {
  WebsocketClientOptions,
  ArkosEmitOptions,
  ArkosEmitResult,
  ArkosEventHandler,
  GatewayStatus,
  SocketEmitter,
} from "@arkosjs/react-websockets";
```

| Type                              | Description                                                       |
| --------------------------------- | ----------------------------------------------------------------- |
| `GatewayStatus`                   | `"connected" \| "connecting" \| "reconnecting" \| "disconnected"` |
| `ArkosEventHandler<T>`            | `(data: T) => void`                                               |
| `ArkosEmitOptions`                | `{ ack?, timeout?, retries? }`                                    |
| `ArkosEmitResult<T>`              | `{ success: boolean; data?: T; error?: string }`                  |
| `SocketEmitter<TData, TResponse>` | Return type of `chat.useEmit()`                                   |

---

## Peer Dependencies

| Package                      | Version    |
| ---------------------------- | ---------- |
| `react`                      | `>=17.0.0` |
| `socket.io-client`           | `^4.7.0`   |
| `@arkosjs/websockets-client` | `*`        |

---

## License

MIT
