import { useEffect, useRef, useCallback } from "react";
import type {
  GatewayClient,
  ArkosEventHandler,
} from "@arkosjs/websockets-client";

/**
 * Subscribes to a gateway event and cleans up on unmount.
 * Uses a stable ref for the handler so deps don't cause listener churn.
 *
 * @internal — use via `chat.on()` from useGateway
 */
export function useSocketOn<T = any>(
  gateway: GatewayClient,
  event: string,
  handler: ArkosEventHandler<T>,
  deps: any[] = []
): void {
  // Keep handler in a ref so the socket listener is never re-registered
  // just because an inline arrow function changed identity
  const handlerRef = useRef<ArkosEventHandler<T>>(handler);

  useEffect(() => {
    handlerRef.current = handler;
  });

  const stableHandler = useCallback((data: T) => {
    handlerRef.current(data);
  }, []); // intentionally empty — stability via ref

  useEffect(() => {
    const off = gateway.on<T>(event, stableHandler);
    return off;
    // deps spread lets callers control re-subscription (e.g. room change)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gateway, event, ...deps]);
}
