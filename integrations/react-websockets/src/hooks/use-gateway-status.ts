import { useState, useEffect } from "react";
import type { GatewayClient, GatewayStatus } from "@arkosjs/websockets-client";

/**
 * Reactive connection status for a gateway namespace.
 * Re-renders when the socket connects, disconnects, or reconnects.
 *
 * @internal — use via `chat.status` from useGateway
 */
export function useGatewayStatus(gateway: GatewayClient): GatewayStatus {
  const [status, setStatus] = useState<GatewayStatus>(gateway.status);

  useEffect(() => {
    // Sync in case status changed between render and effect
    setStatus(gateway.status);

    const unsubscribe = gateway.subscribe({
      onStatus: (s) => {
        setStatus(s);
      },
    });

    return unsubscribe;
  }, [gateway]);

  return status;
}
