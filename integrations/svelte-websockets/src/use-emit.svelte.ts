import { untrack } from "svelte";
import type { Readable } from "svelte/store";
import type {
  ArkosEmitOptions,
  ArkosEmitResult,
  GatewayClient,
} from "@arkosjs/websockets-client";
import { StoreBridge } from "./store-bridge.js";

export interface EmitterState {
  loading: boolean;
  error: string | null;
  lastEmittedAt: number | null;
}

export interface SocketEmitter<
  TData extends Record<string, any>,
  TResponse = any,
> extends Readable<EmitterState> {
  /** Returns void for fire-and-forget, Promise<ArkosEmitResult> when ack: true. */
  emit(data: TData): void;
  emit(
    data: TData,
    options: ArkosEmitOptions & { ack: true }
  ): Promise<ArkosEmitResult<TResponse>>;
  emit(
    data: TData,
    options?: ArkosEmitOptions
  ): void | Promise<ArkosEmitResult<TResponse>>;

  /** True while at least one ack emit is awaiting a response. */
  readonly loading: boolean;

  /** Last error message, or null if the last emit succeeded. */
  readonly error: string | null;

  /** Timestamp of the last emit call, or null if never emitted. */
  readonly lastEmittedAt: number | null;

  /** Clears error and loading state. */
  reset(): void;
}

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
