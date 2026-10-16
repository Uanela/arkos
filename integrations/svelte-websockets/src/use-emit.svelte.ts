import { untrack } from "svelte";
import type { Readable } from "svelte/store";
import type {
  ArkosEmitOptions,
  ArkosEmitResult,
  GatewayClient,
} from "@arkosjs/websockets-client";
import { StoreBridge } from "./store-bridge.js";

/** Snapshot pushed to `$emitter` store subscribers. */
export interface EmitterState {
  loading: boolean;
  error: string | null;
  lastEmittedAt: number | null;
}

export interface SocketEmitter<
  TData extends Record<string, any>,
  TResponse = any,
> extends Readable<EmitterState> {
  /**
   * Emit the event with optional per-call options (merged over the defaults).
   * Returns void for fire-and-forget, Promise<ArkosEmitResult> when ack: true.
   */
  emit(data: TData): void;
  emit(
    data: TData,
    options: ArkosEmitOptions & { ack: true }
  ): Promise<ArkosEmitResult<TResponse>>;
  emit(
    data: TData,
    options?: ArkosEmitOptions
  ): void | Promise<ArkosEmitResult<TResponse>>;

  /** True while at least one ack emit is awaiting a response. Reactive. */
  readonly loading: boolean;

  /** Last error message, or null if the last emit succeeded. Reactive. */
  readonly error: string | null;

  /** Timestamp of the last emit call, or null if never emitted. Reactive. */
  readonly lastEmittedAt: number | null;

  /** Clears error and loading. Acks still in flight no longer affect state. */
  reset(): void;
}

/**
 * Creates an emitter bound to whatever gateway `getGateway` returns at emit
 * time, so it keeps working after the namespace changes.
 *
 * @internal — use via `chat.useEmit()` from useGateway
 */
export function createEmitter<
  TData extends Record<string, any>,
  TResponse = any,
>(
  getGateway: () => GatewayClient,
  event: string,
  defaultOptions?: ArkosEmitOptions
): SocketEmitter<TData, TResponse> {
  let pending = $state(0);
  let error = $state<string | null>(null);
  let lastEmittedAt = $state<number | null>(null);
  // Bumped by reset() so acks from before the reset don't touch state
  let generation = 0;

  const store = new StoreBridge<EmitterState>(() => ({
    loading: pending > 0,
    error,
    lastEmittedAt,
  }));

  function send(
    data: TData,
    options?: ArkosEmitOptions
  ): void | Promise<ArkosEmitResult<TResponse>> {
    const merged = { ...defaultOptions, ...options };
    const gateway = getGateway();
    lastEmittedAt = Date.now();
    error = null;

    if (!merged.ack) {
      store.notify();
      gateway.emit(event, data);
      return;
    }

    const emittedIn = generation;
    pending++;
    store.notify();

    return gateway
      .emit<TData, TResponse>(event, data, { ...merged, ack: true })
      .catch(
        (err: any): ArkosEmitResult<TResponse> => ({
          success: false,
          error: err?.message ?? "Unknown error",
        })
      )
      .then((result) => {
        if (emittedIn === generation) {
          pending--;
          if (!result.success) error = result.error ?? "Emit failed";
          store.notify();
        }
        return result;
      });
  }

  return {
    // untrack: emitting from inside an $effect must not make the effect
    // depend on (and re-run because of) the emitter's own state
    emit: ((data: TData, options?: ArkosEmitOptions) =>
      untrack(() => send(data, options))) as SocketEmitter<
      TData,
      TResponse
    >["emit"],
    get loading() {
      return pending > 0;
    },
    get error() {
      return error;
    },
    get lastEmittedAt() {
      return lastEmittedAt;
    },
    reset() {
      generation++;
      pending = 0;
      error = null;
      store.notify();
    },
    subscribe: store.subscribe,
  };
}
