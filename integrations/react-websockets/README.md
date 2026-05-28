![Header Image](https://www.arkosjs.com/img/arkos-readme-header.webp?v=4)

<div align="center">

[![npm](https://img.shields.io/npm/v/@arkosjs/react-websockets)](https://www.npmjs.com/package/@arkosjs/react-websockets)
![npm](https://img.shields.io/npm/dt/@arkosjs/react-websockets)
![GitHub](https://img.shields.io/github/license/uanela/arkos)

</div>

<div align="center">
<h2>React Bindings for Arkos WebSocket Gateway</h2>
<p>Ergonomic hooks for real-time communication — automatic cleanup, reactive status, ack/retry, and no boilerplate</p>
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

## What is `@arkosjs/react-websockets`?

React bindings for the [Arkos WebSocket Gateway](https://www.arkosjs.com/docs/core-concepts/components/gateways). Wraps `@arkosjs/websockets-client` in React hooks that integrate with your component lifecycle — no memory leaks, no listener churn, clean APIs.

## Installation

```bash
npm install @arkosjs/react-websockets socket.io-client
```

You'll also need `socket.io-client` as a peer dependency.

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

The provider creates and owns the `WebsocketClient`. It's destroyed automatically on unmount.

### 2. Use `useGateway` in any child component

```tsx
import { useGateway } from "@arkosjs/react-websockets";
import { useState } from "react";

function ChatRoom() {
    const chat = useGateway("/chat");
    const [messages, setMessages] = useState([]);

    // Listen to events — automatically cleaned up on unmount
    chat.on("receive_message", (data) => {
        setMessages((prev) => [...prev, data]);
    });

    // Emit with loading/error tracking
    const sendMessage = chat.useEmit("send_message");

    return (
        <div>
            <p>Status: {chat.status}</p>
            <button
                onClick={() =>
                    sendMessage.emit({
                        room: "general",
                        content: "hello",
                    })
                }
                disabled={sendMessage.loading}
            >
                {sendMessage.loading ? "Sending..." : "Send"}
            </button>
            {sendMessage.error && (
                <p style={{ color: "red" }}>{sendMessage.error}</p>
            )}
            <ul>
                {messages.map((msg, i) => (
                    <li key={i}>{msg.content}</li>
                ))}
            </ul>
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

| Prop       | Type                                | Description                                       |
| ---------- | ----------------------------------- | ------------------------------------------------- |
| `manager`  | `Manager` (from `socket.io-client`) | Socket.IO manager with connection config and auth |
| `children` | `ReactNode`                         | Your component tree                               |

The client is destroyed automatically when the provider unmounts.

---

### `useGateway(namespace)`

Returns a scoped gateway handle for the given namespace. The underlying socket is lazily created on first call and reused.

```tsx
const chat = useGateway("/chat");
const orders = useGateway("/orders");
```

Calling with the same namespace twice returns the same instance — no duplicate connections.

#### `chat.on(event, handler, deps?)`

Listen to a server event. Automatically unsubscribes on component unmount.

The handler is kept stable internally — changing the callback won't re-register the listener.

```tsx
// Simple listener
chat.on("receive_message", (data) => {
    setMessages((prev) => [...prev, data]);
});

// With explicit dependencies (e.g., re-subscribe when room changes)
chat.on("receive_message", messageHandler, [roomId]);
```

**Note:** Client-side deduplication is applied automatically when `_meta.mid` is present in the payload.

#### `chat.useEmit(event, defaultOptions?)`

Returns a `SocketEmitter` object for the given event. Use it to emit with loading/error tracking.

```tsx
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
- `loading` — `boolean` — True while waiting for ack response.
- `error` — `string | null` — Last error message, or null if succeeded.
- `lastEmittedAt` — `number | null` — Timestamp of last emit, or null if never emitted.
- `reset()` — Clears error and loading state.

#### `chat.status`

Reactive connection status. Re-renders when status changes.

```tsx
chat.status; // "connected" | "connecting" | "reconnecting" | "disconnected"

if (chat.status === "connected") {
    sendMessage.emit(data);
}
```

#### `chat.raw`

Escape hatch to the underlying `GatewayClient` for advanced use cases.

```tsx
chat.raw; // GatewayClient instance
chat.raw.rawSocket; // raw socket.io Socket
```

---

### `useWebsocketClient()`

Returns the `WebsocketClient` instance from context. Throws if used outside `<WebSocketProvider>`.

```tsx
const client = useWebsocketClient();
const gateway = client.gateway("/notifications");
```

---

## Examples

### Handle Authentication

Listen for the `"authenticated"` event after login:

```tsx
function Dashboard() {
    const chat = useGateway("/chat");
    const [user, setUser] = useState(null);

    useEffect(() => {
        // Server emits "authenticated" with user data
        chat.on("authenticated", (data) => {
            setUser(data.user);
        });
    }, [chat]);

    return user ? <div>Welcome, {user.name}</div> : <div>Loading...</div>;
}
```

### Emit with Acknowledgement

```tsx
function SendForm() {
    const chat = useGateway("/messages");
    const sendMessage = chat.useEmit("send_message");

    const handleSubmit = async (e) => {
        e.preventDefault();
        const result = await sendMessage.emit(
            { content: "Hello!" },
            { ack: true, timeout: 5000, retries: 2 }
        );

        if (result.success) {
            alert("Message received by server");
        } else {
            alert(`Error: ${result.error}`);
        }
    };

    return (
        <form onSubmit={handleSubmit}>
            <button disabled={sendMessage.loading}>
                {sendMessage.loading ? "Sending..." : "Send"}
            </button>
        </form>
    );
}
```

### Global Error Handler

Listen for server-wide errors:

```tsx
function ChatRoom() {
    const chat = useGateway("/chat");

    chat.on("error", (errorData) => {
        console.error("Server error:", errorData);
        // Show toast, log, etc.
    });

    return <div>Chat App</div>;
}
```

### Watch Connection Status

```tsx
function ConnectionIndicator() {
    const chat = useGateway("/chat");

    return (
        <div
            style={{
                color:
                    chat.status === "connected"
                        ? "green"
                        : chat.status === "disconnected"
                          ? "red"
                          : "orange",
            }}
        >
            {chat.status}
        </div>
    );
}
```

---

## Types

```ts
import type {
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
| `ArkosEmitOptions`                | `{ ack?: boolean; timeout?: number; retries?: number }`           |
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

## Related

- [Arkos WebSocket Gateway Docs](https://www.arkosjs.com/docs/core-concepts/components/gateways)
- [`@arkosjs/websockets-client`](../websockets-client) — Core package
- [Contributing Framework Bindings](../../CONTRIBUTING_FRAMEWORK_BINDINGS.md)

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

_Real-time React, simplified._

</div>
