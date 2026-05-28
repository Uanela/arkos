import { useState, useCallback, useRef } from "react";
import type {
  GatewayClient,
  ArkosEmitOptions,
  ArkosEmitResult,
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
 * Returns a stable emitter object for the given event.
 *
 * @internal — use via `chat.useEmit()` from useGateway
 *
 * @example
 * const sendMessage = chat.useEmit("send_message")
 *
 * sendMessage.emit({ room: "general", content: "hello" })
 * sendMessage.emit(data, { ack: true, timeout: 5000, retries: 3 })
 *
 * sendMessage.loading      // true while awaiting ack
 * sendMessage.error        // string | null
 * sendMessage.lastEmittedAt // number | null
 * sendMessage.reset()      // clear state
 */
export function useSocketEmit<
  TData extends Record<string, any>,
  TResponse = any,
>(
  gateway: GatewayClient,
  event: string,
  defaultOptions?: ArkosEmitOptions
): SocketEmitter<TData, TResponse> {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastEmittedAt, setLastEmittedAt] = useState<number | null>(null);

  // Stable ref so emit callback doesn't change identity on every render
  const gatewayRef = useRef(gateway);
  useRef(() => {
    gatewayRef.current = gateway;
  });

  const emit = useCallback(
    (data: TData, options?: ArkosEmitOptions) => {
      const mergedOptions = { ...defaultOptions, ...options };
      setLastEmittedAt(Date.now());
      setError(null);

      if (!mergedOptions.ack) {
        // Fire and forget — no state changes beyond lastEmittedAt
        gatewayRef.current.emit(event, data);
        return;
      }

      // Ack mode — track loading
      setLoading(true);
      return (
        gatewayRef.current.emit(
          event,
          data,
          mergedOptions as ArkosEmitOptions & { ack: true }
        ) as Promise<ArkosEmitResult<TResponse>>
      )
        .then((result) => {
          if (!result.success) {
            setError(result.error ?? "Emit failed");
          }
          return result;
        })
        .catch((err: any) => {
          const msg = err?.message ?? "Unknown error";
          setError(msg);
          return { success: false, error: msg } as ArkosEmitResult<TResponse>;
        })
        .finally(() => {
          setLoading(false);
        });
    },
    [event, defaultOptions]
  ) as SocketEmitter<TData, TResponse>["emit"];

  const reset = useCallback(() => {
    setError(null);
    setLoading(false);
  }, []);

  return { emit, loading, error, lastEmittedAt, reset };
}
