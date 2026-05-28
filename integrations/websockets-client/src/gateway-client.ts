import { Socket } from "socket.io-client";
import { ClientDedupStore } from "./utils/dedup-store";
import {
  ArkosEmitOptions,
  ArkosEmitResult,
  ArkosEventHandler,
  GatewayStateSubscriber,
  GatewayStatus,
} from "./types";
import { wrapWithMeta } from "./utils/meta-builder";

/**
 * GatewayClient wraps a socket.io namespace socket and provides:
 * - _meta envelope injection on emit
 * - ack + retry + timeout handling
 * - client-side dedup on received events
 * - observable status/user state for framework adapters
 */
export class GatewayClient {
  private socket: Socket;
  private dedup: ClientDedupStore;
  private subscribers = new Set<GatewayStateSubscriber>();

  public status: GatewayStatus = "disconnected";
  public user: any = null;

  constructor(socket: Socket, dedup: ClientDedupStore) {
    this.socket = socket;
    this.dedup = dedup;
    this.bindSocketEvents();
  }

  private bindSocketEvents(): void {
    this.socket.on("connect", () => this.setStatus("connected"));
    this.socket.on("disconnect", () => this.setStatus("disconnected"));
    this.socket.on("connect_error", () => this.setStatus("disconnected"));
    this.socket.io.on("reconnect_attempt", () =>
      this.setStatus("reconnecting")
    );
    this.socket.io.on("reconnect", () => this.setStatus("connected"));

    // Convention: server can emit "arkos:user" after auth to hydrate client user
    this.socket.on("arkos:user", (user: any) => {
      this.user = user;
      this.notify("onUser", user);
    });
  }

  private setStatus(status: GatewayStatus): void {
    this.status = status;
    this.notify("onStatus", status);
  }

  private notify<K extends keyof GatewayStateSubscriber>(
    key: K,
    value: any
  ): void {
    for (const sub of this.subscribers) {
      sub[key]?.(value as any);
    }
  }

  /**
   * Subscribe to gateway state changes.
   * Used by framework adapters to drive reactivity.
   * Returns an unsubscribe function.
   */
  subscribe(subscriber: GatewayStateSubscriber): () => void {
    this.subscribers.add(subscriber);
    return () => this.subscribers.delete(subscriber);
  }

  /**
   * Listen to an event from the server.
   * Automatically handles client-side deduplication using _meta.mid
   * when present in the payload.
   *
   * Returns an unsubscribe function.
   *
   * @example
   * const off = chat.on("receive_message", (data) => {
   *   setMessages(prev => [...prev, data])
   * })
   */
  on<T = any>(event: string, handler: ArkosEventHandler<T>): () => void {
    const wrappedHandler = (payload: any) => {
      // Dedup based on _meta.mid if present (server used dedup on emit)
      const mid = payload?._meta?.mid ?? payload?.id ?? payload?.messageId;
      if (mid && this.dedup.checkAndSet(event, mid)) return;

      // Strip _meta before handing to user — it's internal plumbing
      const { _meta, ...data } = payload ?? {};
      handler(data as T);
    };

    this.socket.on(event, wrappedHandler);
    return () => this.socket.off(event, wrappedHandler);
  }

  /**
   * Remove a specific handler or all handlers for an event.
   */
  off(event: string, handler?: ArkosEventHandler): void {
    if (handler) this.socket.off(event, handler);
    else this.socket.removeAllListeners(event);
  }

  /**
   * Fire-and-forget emit. Automatically injects _meta envelope.
   *
   * @example
   * chat.emit("send_message", { room: "general", content: "hello" })
   */
  emit<T extends Record<string, any>>(event: string, data: T): void;

  /**
   * Emit with ack. Returns a Promise resolving to the server ack response.
   *
   * @example
   * const result = await chat.emit("send_message", data, { ack: true, timeout: 5000, retries: 3 })
   */
  emit<T extends Record<string, any>, R = any>(
    event: string,
    data: T,
    options: ArkosEmitOptions & { ack: true }
  ): Promise<ArkosEmitResult<R>>;

  emit<T extends Record<string, any>, R = any>(
    event: string,
    data: T,
    options?: ArkosEmitOptions
  ): void | Promise<ArkosEmitResult<R>> {
    const payload = wrapWithMeta(data);

    if (!options?.ack) {
      this.socket.emit(event, payload);
      return;
    }

    return this.emitWithAck<typeof payload, R>(event, payload, options);
  }

  private async emitWithAck<T, R>(
    event: string,
    payload: T,
    options: ArkosEmitOptions
  ): Promise<ArkosEmitResult<R>> {
    const { timeout = 5000, retries = 0 } = options;
    let attempt = 0;

    const tryEmit = (): Promise<ArkosEmitResult<R>> => {
      return new Promise((resolve) => {
        try {
          this.socket
            .timeout(timeout)
            .emit(event, payload, (err: any, response: any) => {
              if (err) {
                if (attempt < retries) {
                  attempt++;
                  const delay = Math.min(Math.pow(2, attempt - 1) * 1000, 5000);
                  setTimeout(() => tryEmit().then(resolve), delay);
                } else {
                  resolve({
                    success: false,
                    error: err?.message ?? "Emit timed out",
                  });
                }
                return;
              }

              resolve(response ?? { success: true });
            });
        } catch (err: any) {
          resolve({ success: false, error: err?.message ?? "Emit failed" });
        }
      });
    };

    return tryEmit();
  }

  /**
   * Join a Socket.IO room.
   *
   * @example
   * chat.join("room-123")
   */
  join(room: string): void {
    this.socket.emit("arkos:join", { room });
  }

  /**
   * Leave a Socket.IO room.
   *
   * @example
   * chat.leave("room-123")
   */
  leave(room: string): void {
    this.socket.emit("arkos:leave", { room });
  }

  /**
   * The underlying socket.io socket for escape-hatch access.
   */
  get rawSocket(): Socket {
    return this.socket;
  }

  destroy(): void {
    this.socket.removeAllListeners();
    this.dedup.destroy();
    this.subscribers.clear();
  }
}
