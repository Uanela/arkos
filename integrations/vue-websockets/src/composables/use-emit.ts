import { reactive, ref, type ShallowRef } from "vue";
import type {
  ArkosEmitOptions,
  ArkosEmitResult,
  GatewayClient,
} from "@arkosjs/websockets-client";

export interface SocketEmitter<
  TData extends Record<string, any>,
  TResponse = any,
> {
  /**
   * Emit the event with optional data and per-call options.
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

  /** True while waiting for an ack response. Always false for fire-and-forget. */
  loading: boolean;

  /** Last error message, or null if the last emit succeeded. */
  error: string | null;

  /** Timestamp of the last emit call, or null if never emitted. */
  lastEmittedAt: number | null;

  /** Clears error and resets loading state. */
  reset(): void;
}

/**
 * Returns a reactive emitter object for the given event.
 *
 * @internal — use via `chat.useEmit()` from useGateway
 */
export function useSocketEmit<
  TData extends Record<string, any>,
  TResponse = any,
>(
  gateway: ShallowRef<GatewayClient>,
  event: string,
  defaultOptions?: ArkosEmitOptions
): SocketEmitter<TData, TResponse> {
  const loading = ref(false);
  const error = ref<string | null>(null);
  const lastEmittedAt = ref<number | null>(null);

  function emit(data: TData): void;
  function emit(
    data: TData,
    options: ArkosEmitOptions & { ack: true }
  ): Promise<ArkosEmitResult<TResponse>>;
  function emit(
    data: TData,
    options?: ArkosEmitOptions
  ): void | Promise<ArkosEmitResult<TResponse>>;
  function emit(
    data: TData,
    options?: ArkosEmitOptions
  ): void | Promise<ArkosEmitResult<TResponse>> {
    const mergedOptions = { ...defaultOptions, ...options };
    lastEmittedAt.value = Date.now();
    error.value = null;

    if (!mergedOptions.ack) {
      gateway.value.emit(event, data);
      return;
    }

    loading.value = true;
    return (
      gateway.value.emit(
        event,
        data,
        mergedOptions as ArkosEmitOptions & { ack: true }
      ) as Promise<ArkosEmitResult<TResponse>>
    )
      .then((result) => {
        if (!result.success) {
          error.value = result.error ?? "Emit failed";
        }
        return result;
      })
      .catch((err: any) => {
        const message = err?.message ?? "Unknown error";
        error.value = message;
        return { success: false, error: message } as ArkosEmitResult<TResponse>;
      })
      .finally(() => {
        loading.value = false;
      });
  }

  function reset(): void {
    error.value = null;
    loading.value = false;
  }

  return reactive({
    emit,
    loading,
    error,
    lastEmittedAt,
    reset,
  }) as SocketEmitter<TData, TResponse>;
}
