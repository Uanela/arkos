# Contributing Framework Bindings for `@arkosjs/websockets-client`

> ⚠️ **The code in this document was written by AI and has NOT been tested by a real framework user.**
> If you use Svelte, Solid, Vue, or Angular and want to contribute, this document gives you the full picture — architecture, core API, and reference implementations to validate and ship.

---

## Architecture

```
@arkosjs/websockets-client     # pure TS core — the real logic lives here
@arkosjs/react-websockets      # ✅ shipped — reference implementation
@arkosjs/svelte-websockets     # 🚧 needs a Svelte user
@arkosjs/solid-websockets      # 🚧 needs a Solid user
@arkosjs/vue-websockets        # 🚧 needs a Vue user
@arkosjs/angular-websockets    # 🚧 needs an Angular user
```

Framework packages are **thin adapters**. All business logic (dedup, `_meta` injection, ack/retry/timeout, namespace management) lives in `@arkosjs/websockets-client`. Your job is to wrap `WebsocketClient` and `GatewayClient` in your framework's reactivity primitives.

---

## Core API to wrap

```ts
import { Manager } from "socket.io-client"
import { createWebsocketClient, GatewayClient } from "@arkosjs/websockets-client"

// Step 1: Create a socket.io Manager with connection config
const manager = new Manager("http://localhost:3000", {
  auth: { token: "your-auth-token" },
  reconnection: true,
})

// Step 2: Wrap it with createWebsocketClient
const client = createWebsocketClient(manager)

// Step 3: Get a GatewayClient for a namespace
const gateway: GatewayClient = client.gateway("/chat")

// Listen — returns unsubscribe fn
const off = gateway.on("receive_message", (data) => { ... })
off() // cleanup

// Emit — fire and forget
gateway.emit("send_message", { room: "general", content: "hello" })

// Emit — with ack
const result = await gateway.emit("send_message", data, { ack: true, timeout: 5000, retries: 3 })
// result: { success, data, error }

// Subscribe to state changes (status + user) — used to drive reactivity
const unsub = gateway.subscribe({
  onStatus: (status) => { ... }, // "connected" | "disconnected" | "reconnecting" | "connecting"
  onUser: (user) => { ... },     // populated when server emits "authenticated"
})
unsub()

// Current values (non-reactive, sync)
gateway.status  // GatewayStatus
gateway.user    // any | null
```

## Target consumer API (same across all frameworks)

```ts
// One provider at the root
// Framework-specific syntax, but same props:
// manager (socket.io-client Manager instance)

// One hook/composable/store per namespace
const chat = useGateway("/chat"); // React naming — adapt to framework idioms

chat.on("receive_message", handler); // subscribe, auto-cleanup on unmount

const sendMessage = chat.useEmit("send_message"); // or composable equivalent
sendMessage.emit(data);
sendMessage.emit(data, { ack: true });
sendMessage.loading; // reactive
sendMessage.error; // reactive
sendMessage.lastEmittedAt; // reactive
sendMessage.reset();

chat.status; // reactive: "connected" | "reconnecting" | "disconnected"
chat.user; // reactive: user object | null
```

---

## Svelte

> **Needs a Svelte 5 user to test and validate.**

```ts
// integrations/svelte-websockets/src/context.ts
import { setContext, getContext, onDestroy } from "svelte";
import { Manager } from "socket.io-client";
import {
  createWebsocketClient,
  type WebsocketClient,
} from "@arkosjs/websockets-client";

const KEY = Symbol("arkos-client");

export function initArkosClient(manager: Manager): WebsocketClient {
  const client = createWebsocketClient(manager);
  setContext(KEY, client);
  onDestroy(() => client.destroy());
  return client;
}

export function getArkosClient(): WebsocketClient {
  return getContext(KEY);
}
```

```svelte
<!-- integrations/svelte-websockets/ArkosProvider.svelte -->
<script lang="ts">
  import { initArkosClient } from "./context"

  interface Props {
    manager: any
  }

  const { manager } = $props()

  initArkosClient(manager)
</script>

<slot />
```

```ts
// integrations/svelte-websockets/src/use-gateway.ts
import { writable, readable, get } from "svelte/store";
import { getArkosClient } from "./context";
import { onDestroy } from "svelte";
import type { ArkosEmitOptions } from "@arkosjs/websockets-client";

export function useGateway(namespace: string) {
  const client = getArkosClient();
  const gateway = client.gateway(namespace);

  // Reactive status store
  const status = writable(gateway.status);
  const user = writable(gateway.user);

  const unsub = gateway.subscribe({
    onStatus: (s) => status.set(s),
    onUser: (u) => user.set(u),
  });
  onDestroy(unsub);

  function on<T = any>(event: string, handler: (data: T) => void) {
    const off = gateway.on(event, handler);
    onDestroy(off);
  }

  function useEmit<TData extends Record<string, any>>(
    event: string,
    defaultOptions?: ArkosEmitOptions
  ) {
    const loading = writable(false);
    const error = writable<string | null>(null);
    const lastEmittedAt = writable<number | null>(null);

    function emit(data: TData, options?: ArkosEmitOptions) {
      lastEmittedAt.set(Date.now());
      error.set(null);

      const merged = { ...defaultOptions, ...options };
      if (!merged.ack) {
        gateway.emit(event, data);
        return;
      }

      loading.set(true);
      return (gateway.emit(event, data, merged as any) as Promise<any>)
        .then((r) => {
          if (!r.success) error.set(r.error ?? "Emit failed");
          return r;
        })
        .catch((e: any) => {
          error.set(e?.message ?? "Unknown error");
        })
        .finally(() => loading.set(false));
    }

    return {
      emit,
      loading: { subscribe: loading.subscribe },
      error: { subscribe: error.subscribe },
      lastEmittedAt: { subscribe: lastEmittedAt.subscribe },
      reset: () => {
        error.set(null);
        loading.set(false);
      },
    };
  }

  return {
    on,
    useEmit,
    status: { subscribe: status.subscribe },
    user: { subscribe: user.subscribe },
    raw: gateway,
  };
}
```

---

## Solid

> **Needs a Solid user to test and validate.**

```tsx
// integrations/solid-websockets/src/context.tsx
import {
  createContext,
  useContext,
  onCleanup,
  type ParentComponent,
} from "solid-js";
import { Manager } from "socket.io-client";
import {
  createWebsocketClient,
  type WebsocketClient,
} from "@arkosjs/websockets-client";

const ArkosContext = createContext<WebsocketClient>();

export interface ArkosSocketProviderProps {
  manager: Manager;
  children: any;
}

export const ArkosSocketProvider: ParentComponent<ArkosSocketProviderProps> = (
  props
) => {
  const client = createWebsocketClient(props.manager);
  onCleanup(() => client.destroy());

  return (
    <ArkosContext.Provider value={client}>
      {props.children}
    </ArkosContext.Provider>
  );
};

export function useArkosClient(): WebsocketClient {
  const client = useContext(ArkosContext);
  if (!client)
    throw new Error("useArkosClient must be used within ArkosSocketProvider");
  return client;
}
```

```ts
// integrations/solid-websockets/src/use-gateway.ts
import { createSignal, createEffect, onCleanup } from "solid-js";
import { useArkosClient } from "./context";
import type { ArkosEmitOptions } from "@arkosjs/websockets-client";

export function useGateway(namespace: string) {
  const client = useArkosClient();
  const gateway = client.gateway(namespace);

  const [status, setStatus] = createSignal(gateway.status);
  const [user, setUser] = createSignal(gateway.user);

  const unsub = gateway.subscribe({
    onStatus: setStatus,
    onUser: setUser,
  });
  onCleanup(unsub);

  function on<T = any>(event: string, handler: (data: T) => void) {
    const off = gateway.on(event, handler);
    onCleanup(off);
  }

  function useEmit<TData extends Record<string, any>>(
    event: string,
    defaultOptions?: ArkosEmitOptions
  ) {
    const [loading, setLoading] = createSignal(false);
    const [error, setError] = createSignal<string | null>(null);
    const [lastEmittedAt, setLastEmittedAt] = createSignal<number | null>(null);

    function emit(data: TData, options?: ArkosEmitOptions) {
      setLastEmittedAt(Date.now());
      setError(null);

      const merged = { ...defaultOptions, ...options };
      if (!merged.ack) {
        gateway.emit(event, data);
        return;
      }

      setLoading(true);
      return (gateway.emit(event, data, merged as any) as Promise<any>)
        .then((r) => {
          if (!r.success) setError(r.error ?? "Emit failed");
          return r;
        })
        .catch((e: any) => setError(e?.message ?? "Unknown error"))
        .finally(() => setLoading(false));
    }

    return {
      emit,
      loading,
      error,
      lastEmittedAt,
      reset: () => {
        setError(null);
        setLoading(false);
      },
    };
  }

  return {
    on,
    useEmit,
    get status() {
      return status();
    },
    get user() {
      return user();
    },
    raw: gateway,
  };
}
```

---

## Vue

> **Needs a Vue 3 user to test and validate.**

```ts
// integrations/vue-websockets/src/plugin.ts
import { inject, provide, onUnmounted } from "vue";
import { Manager } from "socket.io-client";
import {
  createWebsocketClient,
  type WebsocketClient,
} from "@arkosjs/websockets-client";

const KEY = Symbol("arkos-client");

export function provideArkosClient(manager: Manager): WebsocketClient {
  const client = createWebsocketClient(manager);
  provide(KEY, client);
  onUnmounted(() => client.destroy());
  return client;
}

export function useArkosClient(): WebsocketClient {
  const client = inject<WebsocketClient>(KEY);
  if (!client)
    throw new Error(
      "useArkosClient must be used within a component that called provideArkosClient"
    );
  return client;
}
```

```ts
// integrations/vue-websockets/src/use-gateway.ts
import { ref, onUnmounted } from "vue";
import { useArkosClient } from "./plugin";
import type { ArkosEmitOptions } from "@arkosjs/websockets-client";

export function useGateway(namespace: string) {
  const client = useArkosClient();
  const gateway = client.gateway(namespace);

  const status = ref(gateway.status);
  const user = ref(gateway.user);

  const unsub = gateway.subscribe({
    onStatus: (s) => (status.value = s),
    onUser: (u) => (user.value = u),
  });
  onUnmounted(unsub);

  function on<T = any>(event: string, handler: (data: T) => void) {
    const off = gateway.on(event, handler);
    onUnmounted(off);
  }

  function useEmit<TData extends Record<string, any>>(
    event: string,
    defaultOptions?: ArkosEmitOptions
  ) {
    const loading = ref(false);
    const error = ref<string | null>(null);
    const lastEmittedAt = ref<number | null>(null);

    function emit(data: TData, options?: ArkosEmitOptions) {
      lastEmittedAt.value = Date.now();
      error.value = null;

      const merged = { ...defaultOptions, ...options };
      if (!merged.ack) {
        gateway.emit(event, data);
        return;
      }

      loading.value = true;
      return (gateway.emit(event, data, merged as any) as Promise<any>)
        .then((r) => {
          if (!r.success) error.value = r.error ?? "Emit failed";
          return r;
        })
        .catch((e: any) => {
          error.value = e?.message ?? "Unknown error";
        })
        .finally(() => {
          loading.value = false;
        });
    }

    return {
      emit,
      loading,
      error,
      lastEmittedAt,
      reset: () => {
        error.value = null;
        loading.value = false;
      },
    };
  }

  return {
    on,
    useEmit,
    status,
    user,
    raw: gateway,
  };
}
```

---

## Angular

> **Needs an Angular user to test and validate. Angular's DI system makes this structurally different — the pattern below is a starting point, not a final design.**

```ts
// integrations/angular-websockets/src/arkos-client.service.ts
import { Injectable, OnDestroy } from "@angular/core";
import { Manager } from "socket.io-client";
import {
  createWebsocketClient,
  type WebsocketClient,
} from "@arkosjs/websockets-client";

@Injectable({ providedIn: "root" })
export class ArkosClientService implements OnDestroy {
  private client: WebsocketClient | null = null;

  init(manager: Manager): WebsocketClient {
    this.client = createWebsocketClient(manager);
    return this.client;
  }

  getClient(): WebsocketClient {
    if (!this.client)
      throw new Error("ArkosClientService not initialized. Call init() first.");
    return this.client;
  }

  ngOnDestroy() {
    this.client?.destroy();
  }
}

// integrations/angular-websockets/src/use-gateway.ts
// Angular doesn't have hooks — consumers would use the service directly
// and wrap gateway.subscribe() with RxJS fromEventPattern or BehaviorSubject.
// Example:

import { Injectable, OnDestroy } from "@angular/core";
import { BehaviorSubject, Observable, Subject } from "rxjs";
import { takeUntil } from "rxjs/operators";
import { ArkosClientService } from "./arkos-client.service";
import type {
  GatewayStatus,
  ArkosEmitOptions,
} from "@arkosjs/websockets-client";

@Injectable()
export class ChatGatewayService implements OnDestroy {
  private destroy$ = new Subject<void>();
  private gateway = this.arkos.getClient().gateway("/chat");

  status$ = new BehaviorSubject<GatewayStatus>(this.gateway.status);
  user$ = new BehaviorSubject<any>(this.gateway.user);

  constructor(private arkos: ArkosClientService) {
    this.gateway.subscribe({
      onStatus: (s) => this.status$.next(s),
      onUser: (u) => this.user$.next(u),
    });
  }

  on<T>(event: string): Observable<T> {
    return new Observable((observer) => {
      const off = this.gateway.on<T>(event, (data) => observer.next(data));
      return () => off();
    }).pipe(takeUntil(this.destroy$));
  }

  emit<TData extends Record<string, any>>(
    event: string,
    data: TData,
    options?: ArkosEmitOptions
  ) {
    return this.gateway.emit(event, data, options as any);
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
```

---

## How to contribute

1. Pick a framework above
2. Create `integrations/<framework>-websockets/`
3. Use the code above as a starting point — it needs real testing in a live app
4. The contract to satisfy: consumer API should match the React version as closely as the framework idioms allow
5. Open a PR to `feat/websockets-client` — include a minimal example app or test showing connect → emit → receive working end to end

Key things to verify in your testing:

- Listener cleanup on component unmount (no memory leaks)
- Re-subscription when namespace changes
- `loading` flips correctly on ack emit
- `status` updates reactively on disconnect/reconnect
- `user` populates when server emits `"authenticated"`
