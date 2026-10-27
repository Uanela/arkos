import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  WebsocketClient,
  createWebsocketClient,
} from "@arkosjs/websockets-client";
import { SocketOptions } from "socket.io-client";

const WebsocketClientContext = createContext<WebsocketClient | null>(null);

type SocketManager = Parameters<typeof createWebsocketClient>[0];

interface WebSocketProviderProps {
  children: ReactNode;
  manager: SocketManager;
  options?: Partial<SocketOptions>;
}

interface ClientEntry {
  manager: SocketManager;
  client: WebsocketClient;
}

/**
 * Provides the WebsocketClient instance to the React tree.
 * Mount once at the root — all `useGateway` calls beneath it
 * share the same client and lazily connect per namespace.
 *
 * A new `manager` instance rebuilds the client and destroys the previous one.
 * Changing `options` alone does not rebuild it.
 *
 * @example
 * const manager = useMemo(() => new Manager("http://localhost:3000", {
 *   reconnection: true,
 * }), [accessToken]);
 *
 * <WebSocketProvider manager={manager} options={{ auth: { token } }}>
 *   <App />
 * </WebSocketProvider>
 */
export function WebSocketProvider({
  children,
  manager,
  options,
}: WebSocketProviderProps) {
  const [entry, setEntry] = useState<ClientEntry>(() => ({
    manager,
    client: createWebsocketClient(manager, options),
  }));

  if (entry.manager !== manager) {
    setEntry({ manager, client: createWebsocketClient(manager, options) });
  }

  useDeferredDestroy(entry.client);

  return (
    <WebsocketClientContext.Provider value={entry.client}>
      {children}
    </WebsocketClientContext.Provider>
  );
}

/**
 * Destroys `client` once it stops being the active one.
 * Deferred by a tick so a StrictMode remount reuses it.
 */
function useDeferredDestroy(client: WebsocketClient): void {
  const pending = useRef<{
    client: WebsocketClient;
    timer: ReturnType<typeof setTimeout>;
  } | null>(null);

  useEffect(() => {
    if (pending.current?.client === client) {
      clearTimeout(pending.current.timer);
      pending.current = null;
    }

    return () => {
      pending.current = {
        client,
        timer: setTimeout(() => {
          pending.current = null;
          client.destroy();
        }, 0),
      };
    };
  }, [client]);
}

/**
 * Returns the WebsocketClient instance from context.
 * Throws if used outside <WebSocketProvider>.
 */
export function useWebsocketClient(): WebsocketClient {
  const client = useContext(WebsocketClientContext);
  if (!client) {
    throw new Error(
      "useWebsocketClient must be used within an <WebSocketProvider>"
    );
  }
  return client;
}
