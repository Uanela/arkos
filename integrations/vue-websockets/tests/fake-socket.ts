import type { Manager } from "socket.io-client";

export type Listener = (...args: any[]) => void;

/** Stands in for a socket.io namespace socket. */
export class FakeSocket {
  connected = false;
  active = false;
  connectCount = 0;
  disconnectCount = 0;
  readonly emitted: Array<{ event: string; payload: any }> = [];
  lastAck: ((err: any, response: any) => void) | null = null;

  private listeners = new Map<string, Set<Listener>>();

  io = {
    on: (event: string, listener: Listener) => {
      this.addListener(event, listener);
    },
  };

  private addListener(event: string, listener: Listener): void {
    let set = this.listeners.get(event);
    if (!set) {
      set = new Set();
      this.listeners.set(event, set);
    }
    set.add(listener);
  }

  on(event: string, listener: Listener): this {
    this.addListener(event, listener);
    return this;
  }

  off(event: string, listener: Listener): this {
    this.listeners.get(event)?.delete(listener);
    return this;
  }

  removeAllListeners(): this {
    this.listeners.clear();
    return this;
  }

  connect(): this {
    this.connectCount += 1;
    this.active = true;
    this.connected = true;
    this.receive("connect");
    return this;
  }

  disconnect(): this {
    this.disconnectCount += 1;
    this.active = false;
    this.connected = false;
    this.receive("disconnect");
    return this;
  }

  emit(
    event: string,
    payload: any,
    ack?: (err: any, response: any) => void
  ): this {
    this.emitted.push({ event, payload });
    if (ack) this.lastAck = ack;
    return this;
  }

  /** Mirrors socket.io's `socket.timeout(ms).emit(event, payload, ack)`. */
  timeout(_ms: number): {
    emit: (
      event: string,
      payload: any,
      ack: (err: any, response: any) => void
    ) => FakeSocket;
  } {
    return {
      emit: (
        event: string,
        payload: any,
        ack: (err: any, response: any) => void
      ) => {
        this.emitted.push({ event, payload });
        this.lastAck = ack;
        return this;
      },
    };
  }

  /** How many listeners are bound for an event. */
  listenerCount(event: string): number {
    return this.listeners.get(event)?.size ?? 0;
  }

  /** Delivers an event to the client, as the server would. */
  receive(event: string, ...args: any[]): void {
    for (const listener of [...(this.listeners.get(event) ?? [])]) {
      listener(...args);
    }
  }
}

/** Stands in for a socket.io Manager — one reused socket per namespace. */
export class FakeManager {
  readonly sockets = new Map<string, FakeSocket>();
  readonly socketCalls: Array<{ namespace: string; opts: any }> = [];

  socket(namespace: string, opts?: any): FakeSocket {
    this.socketCalls.push({ namespace, opts });

    let socket = this.sockets.get(namespace);
    if (!socket) {
      socket = new FakeSocket();
      this.sockets.set(namespace, socket);
    }
    return socket;
  }

  socketFor(namespace: string): FakeSocket | undefined {
    return this.sockets.get(namespace);
  }

  /** The options the client last asked for a namespace socket with. */
  lastSocketOpts(): any {
    return this.socketCalls[this.socketCalls.length - 1]?.opts;
  }
}

export const asManager = (manager: FakeManager): Manager =>
  manager as unknown as Manager;
