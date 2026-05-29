import {
  GatewayUserBuilder,
  GatewayRoomBuilder,
  GatewaySocketBuilder,
  GatewayBroadcastBuilder,
  GatewayUserExceptBuilder,
  GatewayRoomExceptBuilder,
  GatewayBroadcastExceptBuilder,
} from "../emit-builders";

const makeSocket = ({
  id = "socket-1",
  rooms,
  ...overrides
}: Record<string, any> = {}) => ({
  id,
  rooms: rooms ?? new Set([`arkos::user:user-1`, id]),
  join: jest.fn().mockResolvedValue(undefined),
  leave: jest.fn().mockResolvedValue(undefined),
  disconnect: jest.fn(),
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

const makeNs = (sockets: any[] = []) => {
  const fetchSockets = jest.fn().mockResolvedValue(sockets);
  const toTarget = {
    fetchSockets,
    emit: jest.fn(),
    except: jest.fn().mockReturnThis(),
    volatile: { compress: jest.fn().mockReturnValue({ emit: jest.fn() }) },
    compress: jest.fn().mockReturnValue({ emit: jest.fn() }),
  };
  return {
    in: jest.fn().mockReturnValue(toTarget),
    to: jest.fn().mockReturnValue(toTarget),
    except: jest.fn().mockReturnThis(),
    sockets: new Map(sockets.map((s) => [s.id, s])),
    fetchSockets,
    emit: jest.fn(),
    volatile: { compress: jest.fn().mockReturnValue({ emit: jest.fn() }) },
    compress: jest.fn().mockReturnValue({ emit: jest.fn() }),
  };
};

const gatewayConfig = {} as any;
const store = {} as any;

describe("GatewayUserBuilder", () => {
  it("isOnline returns true when sockets exist", async () => {
    const ns = makeNs([makeSocket()]);
    const builder = new GatewayUserBuilder(
      "user-1",
      ns as any,
      gatewayConfig,
      store
    );
    expect(await builder.isOnline()).toBe(true);
  });

  it("isOnline returns false when no sockets", async () => {
    const ns = makeNs([]);
    const builder = new GatewayUserBuilder(
      "user-1",
      ns as any,
      gatewayConfig,
      store
    );
    expect(await builder.isOnline()).toBe(false);
  });

  it("socketCount returns the correct count", async () => {
    const ns = makeNs([makeSocket(), makeSocket({ id: "socket-2" })]);
    const builder = new GatewayUserBuilder(
      "user-1",
      ns as any,
      gatewayConfig,
      store
    );
    expect(await builder.socketCount()).toBe(2);
  });

  it("socketIds returns all socket ids", async () => {
    const s1 = makeSocket({ id: "a" });
    const s2 = makeSocket({ id: "b" });
    const ns = makeNs([s1, s2]);
    const builder = new GatewayUserBuilder(
      "user-1",
      ns as any,
      gatewayConfig,
      store
    );
    expect(await builder.socketIds()).toEqual(["a", "b"]);
  });

  it("rooms returns union of rooms across all sockets excluding arkos internal rooms", async () => {
    const s1 = makeSocket({
      id: "s1",
      rooms: new Set(["arkos::user:user-1", "room-a", "room-b"]),
    });
    const s2 = makeSocket({
      id: "s2",
      rooms: new Set(["arkos::user:user-1", "room-b", "room-c"]),
    });
    const ns = makeNs([s1, s2]);
    const builder = new GatewayUserBuilder(
      "user-1",
      ns as any,
      gatewayConfig,
      store
    );
    const rooms = await builder.rooms();
    expect(rooms.sort()).toEqual(["room-a", "room-b", "room-c"]);
  });

  it("inRoom returns true when any socket is in the room", async () => {
    const s1 = makeSocket({
      id: "s1",
      rooms: new Set(["arkos::user:user-1", "room-a"]),
    });
    const s2 = makeSocket({ id: "s2", rooms: new Set(["arkos::user:user-1"]) });
    const ns = makeNs([s1, s2]);
    const builder = new GatewayUserBuilder(
      "user-1",
      ns as any,
      gatewayConfig,
      store
    );
    expect(await builder.inRoom("room-a")).toBe(true);
  });

  it("inRoom returns false when no socket is in the room", async () => {
    const ns = makeNs([
      makeSocket({ id: "s1", rooms: new Set(["arkos::user:user-1"]) }),
    ]);
    const builder = new GatewayUserBuilder(
      "user-1",
      ns as any,
      gatewayConfig,
      store
    );
    expect(await builder.inRoom("room-x")).toBe(false);
  });

  it("join calls join on all user sockets", async () => {
    const s1 = makeSocket({ id: "s1" });
    const s2 = makeSocket({ id: "s2" });
    const ns = makeNs([s1, s2]);
    const builder = new GatewayUserBuilder(
      "user-1",
      ns as any,
      gatewayConfig,
      store
    );
    await builder.join("room-123");
    expect(s1.join).toHaveBeenCalledWith("room-123");
    expect(s2.join).toHaveBeenCalledWith("room-123");
  });

  it("leave calls leave on all user sockets", async () => {
    const s1 = makeSocket({ id: "s1" });
    const s2 = makeSocket({ id: "s2" });
    const ns = makeNs([s1, s2]);
    const builder = new GatewayUserBuilder(
      "user-1",
      ns as any,
      gatewayConfig,
      store
    );
    await builder.leave("room-123");
    expect(s1.leave).toHaveBeenCalledWith("room-123");
    expect(s2.leave).toHaveBeenCalledWith("room-123");
  });

  it("disconnect calls disconnect on all user sockets", async () => {
    const s1 = makeSocket({ id: "s1" });
    const s2 = makeSocket({ id: "s2" });
    const ns = makeNs([s1, s2]);
    const builder = new GatewayUserBuilder(
      "user-1",
      ns as any,
      gatewayConfig,
      store
    );
    await builder.disconnect();
    expect(s1.disconnect).toHaveBeenCalledWith(false);
    expect(s2.disconnect).toHaveBeenCalledWith(false);
  });

  it("disconnect passes close=true when specified", async () => {
    const s1 = makeSocket({ id: "s1" });
    const ns = makeNs([s1]);
    const builder = new GatewayUserBuilder(
      "user-1",
      ns as any,
      gatewayConfig,
      store
    );
    await builder.disconnect(true);
    expect(s1.disconnect).toHaveBeenCalledWith(true);
  });

  it("emit returns offline when user has no sockets", async () => {
    const ns = makeNs([]);
    const builder = new GatewayUserBuilder(
      "user-1",
      ns as any,
      gatewayConfig,
      store
    );
    const result = await builder.emit("event", {});
    expect(result).toEqual({ success: false, reason: "offline" });
  });

  it("emit returns success on fire-and-forget", async () => {
    const socket = makeSocket();
    const ns = makeNs([socket]);
    const builder = new GatewayUserBuilder(
      "user-1",
      ns as any,
      gatewayConfig,
      store
    );
    const result = await builder.emit("event", { msg: "hello" });
    expect(result.success).toBe(true);
  });

  it("emit returns success and data when ack is true", async () => {
    const ackPayload = { received: true };
    const socket = makeSocket({
      timeout: jest.fn().mockReturnValue({
        compress: jest.fn().mockReturnValue({
          emitWithAck: jest.fn().mockResolvedValue(ackPayload),
        }),
      }),
    });
    const ns = makeNs([socket]);
    const builder = new GatewayUserBuilder(
      "user-1",
      ns as any,
      gatewayConfig,
      store
    );
    const result = await builder.emit("event", {}, { ack: true });
    expect(result).toEqual({ success: true, data: ackPayload });
  });

  it("emit attaches _meta with mid and timestamp", async () => {
    const emitMock = jest.fn((event, data, cb) => cb && cb(null));
    const socket = makeSocket({
      timeout: jest.fn().mockReturnValue({
        compress: jest.fn().mockReturnValue({ emit: emitMock }),
      }),
    });
    const ns = makeNs([socket]);
    const builder = new GatewayUserBuilder(
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

  it("emit retries on failure and returns timeout after exhausting retries", async () => {
    jest.useFakeTimers();
    const socket = makeSocket({
      timeout: jest.fn().mockReturnValue({
        compress: jest.fn().mockReturnValue({
          emit: jest.fn((event, data, cb) => cb && cb(new Error("fail"))),
        }),
      }),
    });
    const ns = makeNs([socket]);
    const builder = new GatewayUserBuilder(
      "user-1",
      ns as any,
      gatewayConfig,
      store
    );
    const promise = builder.emit("event", {}, { retries: 2 });
    await jest.runAllTimersAsync();
    const result = await promise;
    expect(result).toEqual({ success: false, reason: "timeout" });
    jest.useRealTimers();
  });

  it("except returns a GatewayUserExceptBuilder", () => {
    const ns = makeNs([]);
    const builder = new GatewayUserBuilder(
      "user-1",
      ns as any,
      gatewayConfig,
      store
    );
    const except = builder.except({ socket: "socket-1" });
    expect(except).toBeInstanceOf(GatewayUserExceptBuilder);
  });
});

describe("GatewayUserExceptBuilder", () => {
  it("emit excludes the specified socket", async () => {
    const emitMock = jest.fn((event, data, cb) => cb && cb(null));
    const s1 = makeSocket({
      id: "s1",
      timeout: jest.fn().mockReturnValue({
        compress: jest.fn().mockReturnValue({ emit: emitMock }),
      }),
    });
    const s2 = makeSocket({
      id: "s2",
      timeout: jest.fn().mockReturnValue({
        compress: jest.fn().mockReturnValue({ emit: emitMock }),
      }),
    });
    const ns = makeNs([s1, s2]);
    const builder = new GatewayUserExceptBuilder(
      "user-1",
      ns as any,
      "s1",
      gatewayConfig,
      store
    );
    await builder.emit("event", { data: 1 });
    const calledSocketIds = emitMock.mock.calls.map((c) => c[0]);
    expect(calledSocketIds).not.toContain("s1");
  });

  it("emit returns offline when all sockets are excluded", async () => {
    const ns = makeNs([makeSocket({ id: "s1" })]);
    const builder = new GatewayUserExceptBuilder(
      "user-1",
      ns as any,
      "s1",
      gatewayConfig,
      store
    );
    const result = await builder.emit("event", {});
    expect(result).toEqual({ success: false, reason: "offline" });
  });
});

describe("GatewayRoomBuilder", () => {
  it("size returns the number of sockets in the room", async () => {
    const ns = makeNs([makeSocket(), makeSocket({ id: "s2" })]);
    const builder = new GatewayRoomBuilder(
      "room-1",
      ns as any,
      gatewayConfig,
      store
    );
    expect(await builder.size()).toBe(2);
  });

  it("sockets returns all socket ids", async () => {
    const ns = makeNs([makeSocket({ id: "x" }), makeSocket({ id: "y" })]);
    const builder = new GatewayRoomBuilder(
      "room-1",
      ns as any,
      gatewayConfig,
      store
    );
    expect(await builder.sockets()).toEqual(["x", "y"]);
  });

  it("isEmpty returns true when room is empty", async () => {
    const ns = makeNs([]);
    const builder = new GatewayRoomBuilder(
      "room-1",
      ns as any,
      gatewayConfig,
      store
    );
    expect(await builder.isEmpty()).toBe(true);
  });

  it("isEmpty returns false when room has sockets", async () => {
    const ns = makeNs([makeSocket()]);
    const builder = new GatewayRoomBuilder(
      "room-1",
      ns as any,
      gatewayConfig,
      store
    );
    expect(await builder.isEmpty()).toBe(false);
  });

  it("users returns unique user ids from authenticated sockets", async () => {
    const s1 = makeSocket({
      id: "s1",
      rooms: new Set(["room-1", "arkos::user:user-1"]),
    });
    const s2 = makeSocket({
      id: "s2",
      rooms: new Set(["room-1", "arkos::user:user-2"]),
    });
    const s3 = makeSocket({
      id: "s3",
      rooms: new Set(["room-1", "arkos::user:user-1"]),
    });
    const ns = makeNs([s1, s2, s3]);
    const builder = new GatewayRoomBuilder(
      "room-1",
      ns as any,
      gatewayConfig,
      store
    );
    const users = await builder.users();
    expect(users.sort()).toEqual(["user-1", "user-2"]);
  });

  it("users excludes unauthenticated sockets", async () => {
    const s1 = makeSocket({ id: "s1", rooms: new Set(["room-1"]) });
    const ns = makeNs([s1]);
    const builder = new GatewayRoomBuilder(
      "room-1",
      ns as any,
      gatewayConfig,
      store
    );
    expect(await builder.users()).toEqual([]);
  });

  it("has({ socket }) returns true when socket is in the room", async () => {
    const ns = makeNs([makeSocket({ id: "s1" })]);
    const builder = new GatewayRoomBuilder(
      "room-1",
      ns as any,
      gatewayConfig,
      store
    );
    expect(await builder.has({ socket: "s1" })).toBe(true);
  });

  it("has({ socket }) returns false when socket is not in the room", async () => {
    const ns = makeNs([makeSocket({ id: "s1" })]);
    const builder = new GatewayRoomBuilder(
      "room-1",
      ns as any,
      gatewayConfig,
      store
    );
    expect(await builder.has({ socket: "s99" })).toBe(false);
  });

  it("has({ user }) returns true when user has a socket in the room", async () => {
    const s1 = makeSocket({
      id: "s1",
      rooms: new Set(["room-1", "arkos::user:user-7"]),
    });
    const ns = makeNs([s1]);
    const builder = new GatewayRoomBuilder(
      "room-1",
      ns as any,
      gatewayConfig,
      store
    );
    expect(await builder.has({ user: "user-7" })).toBe(true);
  });

  it("has({ user }) returns false when user has no socket in the room", async () => {
    const ns = makeNs([
      makeSocket({
        id: "s1",
        rooms: new Set(["room-1", "arkos::user:user-2"]),
      }),
    ]);
    const builder = new GatewayRoomBuilder(
      "room-1",
      ns as any,
      gatewayConfig,
      store
    );
    expect(await builder.has({ user: "user-99" })).toBe(false);
  });

  it("emit emits to the room", async () => {
    const ns = makeNs([]);
    const builder = new GatewayRoomBuilder(
      "room-1",
      ns as any,
      gatewayConfig,
      store
    );
    await builder.emit("event", { data: 1 });
    expect(ns.to).toHaveBeenCalledWith("room-1");
  });

  it("emit uses volatile when volatile option is true", async () => {
    const volatileEmit = jest.fn();
    const ns = makeNs([]);
    ns.to = jest.fn().mockReturnValue({
      volatile: { compress: jest.fn().mockReturnValue({ emit: volatileEmit }) },
      compress: jest.fn().mockReturnValue({ emit: jest.fn() }),
      except: jest.fn().mockReturnThis(),
    });
    const builder = new GatewayRoomBuilder(
      "room-1",
      ns as any,
      gatewayConfig,
      store
    );
    await builder.emit("event", {}, { volatile: true });
    expect(volatileEmit).toHaveBeenCalled();
  });

  it("except returns a GatewayRoomExceptBuilder", () => {
    const ns = makeNs([]);
    const builder = new GatewayRoomBuilder(
      "room-1",
      ns as any,
      gatewayConfig,
      store
    );
    expect(builder.except({ socket: "s1" })).toBeInstanceOf(
      GatewayRoomExceptBuilder
    );
    expect(builder.except({ room: "other" })).toBeInstanceOf(
      GatewayRoomExceptBuilder
    );
    expect(builder.except({ user: "user-1" })).toBeInstanceOf(
      GatewayRoomExceptBuilder
    );
  });
});

describe("GatewayRoomExceptBuilder", () => {
  it("emit calls except with socketId when target is socket", async () => {
    const emitMock = jest.fn();
    const exceptMock = jest.fn().mockReturnValue({
      compress: jest.fn().mockReturnValue({ emit: emitMock }),
    });
    const ns = makeNs([]);
    ns.to = jest.fn().mockReturnValue({ except: exceptMock });
    const builder = new GatewayRoomExceptBuilder(
      "room-1",
      ns as any,
      { socket: "s1" },
      gatewayConfig,
      store
    );
    await builder.emit("event", {});
    expect(exceptMock).toHaveBeenCalledWith("s1");
  });

  it("emit calls except with roomId when target is room", async () => {
    const emitMock = jest.fn();
    const exceptMock = jest.fn().mockReturnValue({
      compress: jest.fn().mockReturnValue({ emit: emitMock }),
    });
    const ns = makeNs([]);
    ns.to = jest.fn().mockReturnValue({ except: exceptMock });
    const builder = new GatewayRoomExceptBuilder(
      "room-1",
      ns as any,
      { room: "other-room" },
      gatewayConfig,
      store
    );
    await builder.emit("event", {});
    expect(exceptMock).toHaveBeenCalledWith("other-room");
  });
});

describe("GatewaySocketBuilder", () => {
  it("id returns the socket id", () => {
    const ns = makeNs([makeSocket({ id: "abc" })]);
    const builder = new GatewaySocketBuilder(
      "abc",
      ns as any,
      gatewayConfig,
      store
    );
    expect(builder.id).toBe("abc");
  });

  it("user returns userId from arkos::user: room", () => {
    const socket = makeSocket({
      id: "s1",
      rooms: new Set(["s1", "arkos::user:user-42"]),
    });
    const ns = makeNs([socket]);
    const builder = new GatewaySocketBuilder(
      "s1",
      ns as any,
      gatewayConfig,
      store
    );
    expect(builder.user).toBe("user-42");
  });

  it("user returns null when socket is unauthenticated", () => {
    const socket = makeSocket({ id: "s1", rooms: new Set(["s1"]) });
    const ns = makeNs([socket]);
    const builder = new GatewaySocketBuilder(
      "s1",
      ns as any,
      gatewayConfig,
      store
    );
    expect(builder.user).toBeNull();
  });

  it("user returns null when socket is not found", () => {
    const ns = makeNs([]);
    const builder = new GatewaySocketBuilder(
      "missing",
      ns as any,
      gatewayConfig,
      store
    );
    expect(builder.user).toBeNull();
  });

  it("isConnected returns true when socket exists", async () => {
    const ns = makeNs([makeSocket({ id: "s1" })]);
    const builder = new GatewaySocketBuilder(
      "s1",
      ns as any,
      gatewayConfig,
      store
    );
    expect(await builder.isConnected()).toBe(true);
  });

  it("isConnected returns false when socket is not found", async () => {
    const ns = makeNs([]);
    const builder = new GatewaySocketBuilder(
      "missing",
      ns as any,
      gatewayConfig,
      store
    );
    expect(await builder.isConnected()).toBe(false);
  });

  it("rooms returns all rooms for the socket", async () => {
    const socket = makeSocket({
      id: "s1",
      rooms: new Set(["s1", "room-a", "room-b"]),
    });
    const ns = makeNs([socket]);
    const builder = new GatewaySocketBuilder(
      "s1",
      ns as any,
      gatewayConfig,
      store
    );
    expect((await builder.rooms()).sort()).toEqual(["room-a", "room-b", "s1"]);
  });

  it("rooms returns empty array when socket not found", async () => {
    const ns = makeNs([]);
    const builder = new GatewaySocketBuilder(
      "missing",
      ns as any,
      gatewayConfig,
      store
    );
    expect(await builder.rooms()).toEqual([]);
  });

  it("inRoom returns true when socket is in the room", async () => {
    const socket = makeSocket({ id: "s1", rooms: new Set(["s1", "room-a"]) });
    const ns = makeNs([socket]);
    const builder = new GatewaySocketBuilder(
      "s1",
      ns as any,
      gatewayConfig,
      store
    );
    expect(await builder.inRoom("room-a")).toBe(true);
  });

  it("inRoom returns false when socket is not in the room", async () => {
    const socket = makeSocket({ id: "s1", rooms: new Set(["s1"]) });
    const ns = makeNs([socket]);
    const builder = new GatewaySocketBuilder(
      "s1",
      ns as any,
      gatewayConfig,
      store
    );
    expect(await builder.inRoom("room-x")).toBe(false);
  });

  it("inRoom returns false when socket not found", async () => {
    const ns = makeNs([]);
    const builder = new GatewaySocketBuilder(
      "missing",
      ns as any,
      gatewayConfig,
      store
    );
    expect(await builder.inRoom("room-a")).toBe(false);
  });

  it("join calls join on the socket", async () => {
    const socket = makeSocket({ id: "s1" });
    const ns = makeNs([socket]);
    const builder = new GatewaySocketBuilder(
      "s1",
      ns as any,
      gatewayConfig,
      store
    );
    await builder.join("room-123");
    expect(socket.join).toHaveBeenCalledWith("room-123");
  });

  it("join no-ops when socket not found", async () => {
    const ns = makeNs([]);
    const builder = new GatewaySocketBuilder(
      "missing",
      ns as any,
      gatewayConfig,
      store
    );
    await expect(builder.join("room-123")).resolves.toBeUndefined();
  });

  it("leave calls leave on the socket", async () => {
    const socket = makeSocket({ id: "s1" });
    const ns = makeNs([socket]);
    const builder = new GatewaySocketBuilder(
      "s1",
      ns as any,
      gatewayConfig,
      store
    );
    await builder.leave("room-123");
    expect(socket.leave).toHaveBeenCalledWith("room-123");
  });

  it("leave no-ops when socket not found", async () => {
    const ns = makeNs([]);
    const builder = new GatewaySocketBuilder(
      "missing",
      ns as any,
      gatewayConfig,
      store
    );
    await expect(builder.leave("room-123")).resolves.toBeUndefined();
  });

  it("disconnect calls disconnect on the socket with false by default", () => {
    const socket = makeSocket({ id: "s1" });
    const ns = makeNs([socket]);
    const builder = new GatewaySocketBuilder(
      "s1",
      ns as any,
      gatewayConfig,
      store
    );
    builder.disconnect();
    expect(socket.disconnect).toHaveBeenCalledWith(false);
  });

  it("disconnect passes close=true when specified", () => {
    const socket = makeSocket({ id: "s1" });
    const ns = makeNs([socket]);
    const builder = new GatewaySocketBuilder(
      "s1",
      ns as any,
      gatewayConfig,
      store
    );
    builder.disconnect(true);
    expect(socket.disconnect).toHaveBeenCalledWith(true);
  });

  it("disconnect no-ops when socket not found", () => {
    const ns = makeNs([]);
    const builder = new GatewaySocketBuilder(
      "missing",
      ns as any,
      gatewayConfig,
      store
    );
    expect(() => builder.disconnect()).not.toThrow();
  });

  it("emit returns not_found when socket does not exist", async () => {
    const ns = makeNs([]);
    const builder = new GatewaySocketBuilder(
      "missing",
      ns as any,
      gatewayConfig,
      store
    );
    const result = await builder.emit("event", {});
    expect(result).toEqual({ success: false, reason: "not_found" });
  });

  it("emit returns success on fire-and-forget", async () => {
    const socket = makeSocket({
      id: "s1",
      timeout: jest.fn().mockReturnValue({
        compress: jest.fn().mockReturnValue({
          emit: jest.fn((event, data, cb) => cb && cb(null)),
        }),
      }),
    });
    const ns = makeNs([socket]);
    const builder = new GatewaySocketBuilder(
      "s1",
      ns as any,
      gatewayConfig,
      store
    );
    const result = await builder.emit("event", { data: 1 });
    expect(result.success).toBe(true);
  });

  it("emit returns success and data when ack is true", async () => {
    const ackPayload = { confirmed: true };
    const socket = makeSocket({
      id: "s1",
      timeout: jest.fn().mockReturnValue({
        compress: jest.fn().mockReturnValue({
          emitWithAck: jest.fn().mockResolvedValue(ackPayload),
        }),
      }),
    });
    const ns = makeNs([socket]);
    const builder = new GatewaySocketBuilder(
      "s1",
      ns as any,
      gatewayConfig,
      store
    );
    const result = await builder.emit("event", {}, { ack: true });
    expect(result).toEqual({ success: true, data: ackPayload });
  });

  it("emit returns timeout after exhausting retries", async () => {
    jest.useFakeTimers();
    const socket = makeSocket({
      id: "s1",
      timeout: jest.fn().mockReturnValue({
        compress: jest.fn().mockReturnValue({
          emit: jest.fn((event, data, cb) => cb && cb(new Error("fail"))),
        }),
      }),
    });
    const ns = makeNs([socket]);
    const builder = new GatewaySocketBuilder(
      "s1",
      ns as any,
      gatewayConfig,
      store
    );
    const promise = builder.emit("event", {}, { retries: 1 });
    await jest.runAllTimersAsync();
    const result = await promise;
    expect(result).toEqual({ success: false, reason: "timeout" });
    jest.useRealTimers();
  });

  it("emit returns failure when ack rejects", async () => {
    const socket = makeSocket({
      id: "s1",
      timeout: jest.fn().mockReturnValue({
        compress: jest.fn().mockReturnValue({
          emitWithAck: jest.fn().mockRejectedValue(new Error("timeout")),
        }),
      }),
    });
    const ns = makeNs([socket]);
    const builder = new GatewaySocketBuilder(
      "s1",
      ns as any,
      gatewayConfig,
      store
    );
    const result = await builder.emit("event", {}, { ack: true });
    expect(result.success).toBe(false);
  });

  it("emit uses volatile when volatile option is true", async () => {
    const compressMock = jest.fn().mockReturnValue({
      emit: jest.fn((event, data, cb) => cb && cb(null)),
    });
    const socket = makeSocket({
      id: "s1",
      volatile: {
        timeout: jest.fn().mockReturnValue({ compress: compressMock }),
      },
    });
    const ns = makeNs([socket]);
    const builder = new GatewaySocketBuilder(
      "s1",
      ns as any,
      gatewayConfig,
      store
    );
    await builder.emit("event", {}, { volatile: true });
    expect(compressMock).toHaveBeenCalled();
  });

  it("emit attaches _meta with mid and timestamp", async () => {
    const emitMock = jest.fn((event, data, cb) => cb && cb(null));
    const socket = makeSocket({
      id: "s1",
      timeout: jest.fn().mockReturnValue({
        compress: jest.fn().mockReturnValue({ emit: emitMock }),
      }),
    });
    const ns = makeNs([socket]);
    const builder = new GatewaySocketBuilder(
      "s1",
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
});

describe("GatewayBroadcastBuilder", () => {
  it("emit emits to the namespace", async () => {
    const ns = makeNs([]);
    const builder = new GatewayBroadcastBuilder(
      ns as any,
      gatewayConfig,
      store
    );
    await builder.emit("announcement", { msg: "hello" });
    expect(ns.compress).toHaveBeenCalledWith(true);
  });

  it("emit uses volatile when volatile option is true", async () => {
    const ns = makeNs([]);
    const builder = new GatewayBroadcastBuilder(
      ns as any,
      gatewayConfig,
      store
    );
    await builder.emit("announcement", {}, { volatile: true });
    expect(ns.volatile.compress).toHaveBeenCalled();
  });

  it("emit uses compress false when specified", async () => {
    const ns = makeNs([]);
    const builder = new GatewayBroadcastBuilder(
      ns as any,
      gatewayConfig,
      store
    );
    await builder.emit("announcement", {}, { compress: false });
    expect(ns.compress).toHaveBeenCalledWith(false);
  });

  it("except returns a GatewayBroadcastExceptBuilder", () => {
    const ns = makeNs([]);
    const builder = new GatewayBroadcastBuilder(
      ns as any,
      gatewayConfig,
      store
    );
    expect(builder.except({ socket: "s1" })).toBeInstanceOf(
      GatewayBroadcastExceptBuilder
    );
    expect(builder.except({ room: "room-1" })).toBeInstanceOf(
      GatewayBroadcastExceptBuilder
    );
    expect(builder.except({ user: "user-1" })).toBeInstanceOf(
      GatewayBroadcastExceptBuilder
    );
  });
});

describe("GatewayBroadcastExceptBuilder", () => {
  it("emit calls except with socketId when target is socket", async () => {
    const emitMock = jest.fn();
    const ns = makeNs([]);
    ns.except = jest.fn().mockReturnValue({
      compress: jest.fn().mockReturnValue({ emit: emitMock }),
    });
    const builder = new GatewayBroadcastExceptBuilder(
      ns as any,
      { socket: "s1" },
      gatewayConfig,
      store
    );
    await builder.emit("event", {});
    expect(ns.except).toHaveBeenCalledWith("s1");
    expect(emitMock).toHaveBeenCalled();
  });

  it("emit calls except with roomId when target is room", async () => {
    const emitMock = jest.fn();
    const ns = makeNs([]);
    ns.except = jest.fn().mockReturnValue({
      compress: jest.fn().mockReturnValue({ emit: emitMock }),
    });
    const builder = new GatewayBroadcastExceptBuilder(
      ns as any,
      { room: "room-1" },
      gatewayConfig,
      store
    );
    await builder.emit("event", {});
    expect(ns.except).toHaveBeenCalledWith("room-1");
  });

  it("emit excludes all sockets of a user when target is user", async () => {
    const s1 = makeSocket({
      id: "s1",
      rooms: new Set(["arkos::user:user-5", "s1"]),
    });
    const s2 = makeSocket({
      id: "s2",
      rooms: new Set(["arkos::user:user-5", "s2"]),
    });
    const ns = makeNs([s1, s2]);
    const exceptMock = jest.fn().mockReturnThis();
    ns.except = exceptMock;
    (ns as any).compress = jest.fn().mockReturnValue({ emit: jest.fn() });

    const builder = new GatewayBroadcastExceptBuilder(
      ns as any,
      { user: "user-5" },
      gatewayConfig,
      store
    );
    await builder.emit("event", {});
    const calledWith = exceptMock.mock.calls.map((c) => c[0]);
    expect(calledWith).toContain("s1");
    expect(calledWith).toContain("s2");
  });
});
