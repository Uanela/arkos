import {
  createContext,
  useContext,
  useEffect,
  useRef,
  type ReactNode,
} from "react";
import {
  WebsocketClient,
  createWebsocketClient,
} from "@arkosjs/websockets-client";
import { SocketOptions } from "socket.io-client";

const WebsocketClientContext = createContext<WebsocketClient | null>(null);

interface WebSocketProviderProps {
  children: ReactNode;
  manager: Parameters<typeof createWebsocketClient>[0];
  options?: Partial<SocketOptions>;
}

/**
 * Provides the WebsocketClient instance to the React tree.
 * Mount once at the root — all `useGateway` calls beneath it
 * share the same client and lazily connect per namespace.
 *
 * @example
 * const manager = useMemo(() => new Manager("http://localhost:3000", {
 *   reconnection: true,
 * }), []);
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
  const clientRef = useRef<WebsocketClient | null>(null);

  if (!clientRef.current)
    clientRef.current = createWebsocketClient(manager, options);

  const mountCount = useRef(0);

  useEffect(() => {
    mountCount.current += 1;
    if (!clientRef.current)
      clientRef.current = createWebsocketClient(manager, options);

    return () => {
      if (mountCount.current === 1) return;
      clientRef.current?.destroy();
      clientRef.current = null;
    };
  }, [manager]);

  return (
    <WebsocketClientContext.Provider value={clientRef.current}>
      {children}
    </WebsocketClientContext.Provider>
  );
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
