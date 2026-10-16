import { inject } from "vitest";
import { io } from "socket.io-client";
import type { Received } from "./server.js";

/** Test-side handle to drive the socket.io test server. */
export function connectControl() {
  const url = inject("serverUrl");
  const socket = io(`${url}/control`, { transports: ["websocket"], forceNew: true });

  return {
    url,
    broadcast: (namespace: string, event: string, data: unknown) =>
      socket.emitWithAck("broadcast", { namespace, event, data }),
    drop: (namespace: string) => socket.emitWithAck("drop", { namespace }),
    kick: (namespace: string) => socket.emitWithAck("kick", { namespace }),
    received: (): Promise<Received[]> => socket.emitWithAck("received"),
    reset: () => socket.emitWithAck("reset"),
    close: () => socket.close(),
  };
}

export type Control = ReturnType<typeof connectControl>;
