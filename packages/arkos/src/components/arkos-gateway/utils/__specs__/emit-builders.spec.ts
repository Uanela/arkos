import {
  GatewayUserBuilder,
  GatewayRoomBuilder,
  GatewayEmitBuilder,
  GatewayUserEmitBuilder,
  GatewaySocketEmitBuilder,
} from "../emit-builders";

const makeSocket = (
  { id = "socket-1", ...overrides }: Record<string, any> = { id: "socket-1" }
) => ({
  id,
  rooms: new Set([`arkos::user:user-1`]),
  timeout: jest.fn().mockReturnThis(),
  compress: jest.fn().mockReturnThis(),
  emit: jest.fn((event, data, cb) => cb && cb(null)),
  emitWithAck: jest.fn().mockResolvedValue({ ok: true }),
  volatile: {
    timeout: jest.fn().mockReturnThis(),
    compress: jest.fn().mockReturnThis(),
    emit: jest.fn(),
    emitWithAck: jest.fn(),
  },
  ...overrides,
});

const makeNs = (sockets: any[] = []) => ({
  in: jest.fn().mockReturnValue({
    fetchSockets: jest.fn().mockResolvedValue(sockets),
    emit: jest.fn(),
    volatile: { compress: jest.fn().mockReturnValue({ emit: jest.fn() }) },
    compress: jest.fn().mockReturnValue({ emit: jest.fn() }),
  }),
  sockets: new Map(sockets.map((s) => [s.id, s])),
  fetchSockets: jest.fn().mockResolvedValue(sockets),
  emit: jest.fn(),
  volatile: { compress: jest.fn().mockReturnValue({ emit: jest.fn() }) },
  compress: jest.fn().mockReturnValue({ emit: jest.fn() }),
});

const gatewayConfig = {} as any;
const store = {} as any;

describe("GatewayUserBuilder", () => {
  it("isOnline returns true when sockets exist", async () => {
    const ns = makeNs([makeSocket()]);
    const builder = new GatewayUserBuilder("user-1", ns as any);
    expect(await builder.isOnline()).toBe(true);
  });

  it("isOnline returns false when no sockets", async () => {
    const ns = makeNs([]);
    const builder = new GatewayUserBuilder("user-1", ns as any);
    expect(await builder.isOnline()).toBe(false);
  });

  it("socketCount returns the correct count", async () => {
    const ns = makeNs([makeSocket(), makeSocket({ id: "socket-2" })]);
    const builder = new GatewayUserBuilder("user-1", ns as any);
    expect(await builder.socketCount()).toBe(2);
  });

  it("socketIds returns all socket ids", async () => {
    const s1 = makeSocket({ id: "a" });
    const s2 = makeSocket({ id: "b" });
    const ns = makeNs([s1, s2]);
    const builder = new GatewayUserBuilder("user-1", ns as any);
    expect(await builder.socketIds()).toEqual(["a", "b"]);
  });

  it("caches fetchSockets across multiple calls", async () => {
    const fetchSockets = jest.fn().mockResolvedValue([makeSocket()]);
    const ns = { in: jest.fn().mockReturnValue({ fetchSockets }) } as any;
    const builder = new GatewayUserBuilder("user-1", ns);
    await builder.isOnline();
    await builder.socketCount();
    await builder.socketIds();
    expect(fetchSockets).toHaveBeenCalledTimes(1);
  });

  it("scopes the room to arkos::user:<userId>", async () => {
    const ns = makeNs([]);
    const builder = new GatewayUserBuilder("user-42", ns as any);
    await builder.isOnline();
    expect(ns.in).toHaveBeenCalledWith("arkos::user:user-42");
  });
});

describe("GatewayRoomBuilder", () => {
  it("size returns the number of sockets in the room", async () => {
    const ns = makeNs([makeSocket(), makeSocket({ id: "s2" })]);
    const builder = new GatewayRoomBuilder("room-1", ns as any);
    expect(await builder.size()).toBe(2);
  });

  it("sockets returns all socket ids", async () => {
    const ns = makeNs([makeSocket({ id: "x" }), makeSocket({ id: "y" })]);
    const builder = new GatewayRoomBuilder("room-1", ns as any);
    expect(await builder.sockets()).toEqual(["x", "y"]);
  });

  it("isEmpty returns true when room is empty", async () => {
    const ns = makeNs([]);
    const builder = new GatewayRoomBuilder("room-1", ns as any);
    expect(await builder.isEmpty()).toBe(true);
  });

  it("isEmpty returns false when room has sockets", async () => {
    const ns = makeNs([makeSocket()]);
    const builder = new GatewayRoomBuilder("room-1", ns as any);
    expect(await builder.isEmpty()).toBe(false);
  });
});

describe("GatewayEmitBuilder", () => {
  const makeTarget = () => ({
    volatile: { compress: jest.fn().mockReturnValue({ emit: jest.fn() }) },
    compress: jest.fn().mockReturnValue({ emit: jest.fn() }),
  });

  it("resolve returns the raw namespace target", () => {
    const target = makeTarget();
    const builder = new GatewayEmitBuilder(target as any, gatewayConfig, store);
    expect(builder.resolve()).toBe(target);
  });

  it("emit calls compress with true by default", async () => {
    const target = makeTarget();
    const builder = new GatewayEmitBuilder(target as any, gatewayConfig, store);
    await builder.emit("event", { foo: "bar" });
    expect(target.compress).toHaveBeenCalledWith(true);
  });

  it("emit calls compress with false when compress option is false", async () => {
    const target = makeTarget();
    const builder = new GatewayEmitBuilder(target as any, gatewayConfig, store);
    await builder.emit("event", { foo: "bar" }, { compress: false });
    expect(target.compress).toHaveBeenCalledWith(false);
  });

  it("emit uses volatile target when volatile option is true", async () => {
    const target = makeTarget();
    const builder = new GatewayEmitBuilder(target as any, gatewayConfig, store);
    await builder.emit("event", { foo: "bar" }, { volatile: true });
    expect(target.volatile.compress).toHaveBeenCalled();
  });
});

describe("GatewayUserEmitBuilder", () => {
  it("returns offline when user has no sockets", async () => {
    const ns = makeNs([]);
    const builder = new GatewayUserEmitBuilder(
      "user-1",
      ns as any,
      gatewayConfig,
      store
    );
    const result = await builder.emit("event", {});
    expect(result).toEqual({ success: false, reason: "offline" });
  });

  it("returns success on fire-and-forget emit with ack callback", async () => {
    const socket = makeSocket();
    const ns = makeNs([socket]);
    const builder = new GatewayUserEmitBuilder(
      "user-1",
      ns as any,
      gatewayConfig,
      store
    );
    const result = await builder.emit("event", { msg: "hello" });
    expect(result.success).toBe(true);
  });

  it("returns success and data when ack is true", async () => {
    const ackPayload = { received: true };
    const socket = makeSocket({
      timeout: jest.fn().mockReturnValue({
        compress: jest.fn().mockReturnValue({
          emitWithAck: jest.fn().mockResolvedValue(ackPayload),
        }),
      }),
    });
    const ns = makeNs([socket]);
    const builder = new GatewayUserEmitBuilder(
      "user-1",
      ns as any,
      gatewayConfig,
      store
    );
    const result = await builder.emit("event", {}, { ack: true });
    expect(result).toEqual({ success: true, data: ackPayload });
  });

  it("attaches _meta with mid and timestamp to emitted data", async () => {
    const emitMock = jest.fn((event, data, cb) => cb && cb(null));
    const socket = makeSocket({
      timeout: jest.fn().mockReturnValue({
        compress: jest.fn().mockReturnValue({ emit: emitMock }),
      }),
    });
    const ns = makeNs([socket]);
    const builder = new GatewayUserEmitBuilder(
      "user-1",
      ns as any,
      gatewayConfig,
      store
    );
    await builder.emit("event", { payload: 1 });
    const emittedData = emitMock.mock.calls[0][1];
    expect(emittedData._meta).toMatchObject({
      mid: expect.any(String),
      timestamp: expect.any(Number),
    });
  });

  it("retries on failure and returns timeout after exhausting retries", async () => {
    jest.useFakeTimers();
    const socket = makeSocket({
      timeout: jest.fn().mockReturnValue({
        compress: jest.fn().mockReturnValue({
          emit: jest.fn((event, data, cb) => cb && cb(new Error("fail"))),
        }),
      }),
    });
    const ns = makeNs([socket]);
    const builder = new GatewayUserEmitBuilder(
      "user-1",
      ns as any,
      gatewayConfig,
      store
    );

    const promise = builder.emit("event", {}, { retries: 2 });
    // advance through exponential backoff delays
    await jest.runAllTimersAsync();
    const result = await promise;

    expect(result).toEqual({ success: false, reason: "timeout" });
    jest.useRealTimers();
  });

  it("resolve returns the scoped room target for the user", () => {
    const ns = makeNs([]);
    const builder = new GatewayUserEmitBuilder(
      "user-99",
      ns as any,
      gatewayConfig,
      store
    );
    builder.resolve();
    expect(ns.in).toHaveBeenCalledWith("arkos::user:user-99");
  });
});

describe("GatewaySocketEmitBuilder", () => {
  it("resolve returns the raw socket", () => {
    const socket = makeSocket() as any;
    const builder = new GatewaySocketEmitBuilder(socket, gatewayConfig, store);
    expect(builder.resolve()).toBe(socket);
  });

  it("returns success on fire-and-forget emit", async () => {
    const socket = makeSocket({
      timeout: jest.fn().mockReturnValue({
        compress: jest.fn().mockReturnValue({
          emit: jest.fn((event, data, cb) => cb && cb(null)),
        }),
      }),
    }) as any;
    const builder = new GatewaySocketEmitBuilder(socket, gatewayConfig, store);
    const result = await builder.emit("event", { data: 1 });
    expect(result.success).toBe(true);
  });

  it("returns success and data when ack is true", async () => {
    const ackPayload = { confirmed: true };
    const socket = makeSocket({
      timeout: jest.fn().mockReturnValue({
        compress: jest.fn().mockReturnValue({
          emitWithAck: jest.fn().mockResolvedValue(ackPayload),
        }),
      }),
    }) as any;
    const builder = new GatewaySocketEmitBuilder(socket, gatewayConfig, store);
    const result = await builder.emit("event", {}, { ack: true });
    expect(result).toEqual({ success: true, data: ackPayload });
  });

  it("returns timeout reason after exhausting retries", async () => {
    jest.useFakeTimers();
    const socket = makeSocket({
      timeout: jest.fn().mockReturnValue({
        compress: jest.fn().mockReturnValue({
          emit: jest.fn((event, data, cb) => cb && cb(new Error("fail"))),
        }),
      }),
    }) as any;
    const builder = new GatewaySocketEmitBuilder(socket, gatewayConfig, store);

    const promise = builder.emit("event", {}, { retries: 1 });
    await jest.runAllTimersAsync();
    const result = await promise;

    expect(result).toEqual({ success: false, reason: "timeout" });
    jest.useRealTimers();
  });

  it("returns failure when ack rejects", async () => {
    const socket = makeSocket({
      timeout: jest.fn().mockReturnValue({
        compress: jest.fn().mockReturnValue({
          emitWithAck: jest.fn().mockRejectedValue(new Error("timeout")),
        }),
      }),
    }) as any;
    const builder = new GatewaySocketEmitBuilder(socket, gatewayConfig, store);
    const result = await builder.emit("event", {}, { ack: true });
    expect(result.success).toBe(false);
  });

  it("uses volatile socket when volatile option is true", async () => {
    const compressMock = jest.fn().mockReturnValue({
      emit: jest.fn((event, data, cb) => cb && cb(null)),
    });
    const socket = makeSocket({
      volatile: {
        timeout: jest.fn().mockReturnValue({ compress: compressMock }),
      },
    }) as any;
    const builder = new GatewaySocketEmitBuilder(socket, gatewayConfig, store);
    await builder.emit("event", {}, { volatile: true });
    expect(compressMock).toHaveBeenCalled();
  });
});
