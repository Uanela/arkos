import { mountArkosSocketExtensions } from "../socket-extensions";
import { ArkosSocket } from "../types";

function makeBroadcastOperator(overrides: Record<string, any> = {}) {
  const op: any = {
    emit: jest.fn().mockReturnValue(true),
    emitWithAck: jest.fn().mockResolvedValue([{ ok: true }]),
    fetchSockets: jest.fn(() => {
      return op?.sockets
        ? Array.from(op.sockets)
            .filter((s: any) => {
              return Array.from(s[1].rooms || []).includes(op.id);
            })
            .map((s: any) => s[1])
        : [];
    }),
    except: jest.fn(),
    compress: jest.fn(),
    timeout: jest.fn(),
    volatile: null as any,
    socketsJoin: jest.fn().mockResolvedValue(undefined),
    socketsLeave: jest.fn().mockResolvedValue(undefined),
    disconnectSockets: jest.fn(),
    ...overrides,
  };
  op.except.mockReturnValue(op);
  op.compress.mockReturnValue(op);
  op.timeout.mockReturnValue(op);
  op.volatile = op;
  return op;
}

function makeSocket(
  id = "socket-1",
  overrides: Record<string, any> = {}
): ArkosSocket & { activeRooms: Set<string> } {
  const broadcastOp = makeBroadcastOperator();
  const sockets = new Map<string, ArkosSocket>();

  const nsp = {
    sockets,
    to: jest.fn((roomId: string) => {
      return makeBroadcastOperator({ sockets, id: roomId });
    }),
  };

  const rawEmit = jest.fn().mockReturnValue(true);
  const rawEmitWithAck = jest.fn().mockResolvedValue({ ack: true });
  const rawTo = jest.fn().mockReturnValue(makeBroadcastOperator());
  const rawTimeout = jest.fn();

  const socket: any = {
    id,
    rooms: new Set<string>([id]),
    activeRooms: () => {
      const rooms = (Array.from(socket.rooms) as string[]).filter(
        (r: string) => r !== id
      );
      return rooms;
    },
    nsp,
    emit: rawEmit,
    emitWithAck: rawEmitWithAck,
    to: rawTo,
    timeout: rawTimeout,
    socketsJoin: jest.fn().mockResolvedValue(undefined),
    socketsLeave: jest.fn().mockResolvedValue(undefined),
    disconnectSockets: jest.fn(),
    user: jest.fn(),
    peer: jest.fn(),
    retry: jest.fn(),
    ...overrides,
  };

  // broadcast as a getter on the prototype so the descriptor lookup works
  const proto = Object.create(null);
  Object.defineProperty(proto, "broadcast", {
    get: () => broadcastOp,
    configurable: true,
  });
  Object.setPrototypeOf(socket, proto);

  // rawTimeout returns a timed socket with its own emitWithAck
  const timedSocket = {
    emitWithAck: jest.fn().mockResolvedValue({ ack: true }),
  };
  rawTimeout.mockReturnValue(timedSocket);

  nsp.sockets.set(id, socket);
  return socket;
}

function addUserSocket(
  socket: ArkosSocket,
  userId: string,
  socketId = `s-${userId}`
) {
  const s = makeSocket(socketId);
  (s.rooms as Set<string>).add(`arkos::user:${userId}`);
  // (s.activeRooms as Set<string>).add(`arkos::user:${userId}`);
  socket.nsp.sockets.set(socketId, s);
  return s;
}

describe("mountArkosSocketExtensions", () => {
  describe("socket.emit", () => {
    test("injects _meta with mid and timestamp", () => {
      const socket = makeSocket();
      const raw = socket.emit as jest.Mock;
      mountArkosSocketExtensions(socket);

      socket.emit("event", { foo: "bar" });

      const [event, payload] = raw.mock.calls[0];
      expect(event).toBe("event");
      expect(payload.foo).toBe("bar");
      expect(payload._meta).toBeDefined();
      expect(typeof payload._meta.mid).toBe("string");
      expect(typeof payload._meta.timestamp).toBe("number");
    });

    test("each call gets a unique mid", () => {
      const socket = makeSocket();
      const raw = socket.emit as jest.Mock;
      mountArkosSocketExtensions(socket);

      socket.emit("e", {});
      socket.emit("e", {});

      const mid1 = raw.mock.calls[0][1]._meta.mid;
      const mid2 = raw.mock.calls[1][1]._meta.mid;
      expect(mid1).not.toBe(mid2);
    });

    test("passes through extra args after data", () => {
      const socket = makeSocket();
      const raw = socket.emit as jest.Mock;
      mountArkosSocketExtensions(socket);

      const cb = jest.fn();
      socket.emit("event", { x: 1 }, cb);

      expect(raw.mock.calls[0][2]).toBe(cb);
    });

    test("works when data is undefined", () => {
      const socket = makeSocket();
      const raw = socket.emit as jest.Mock;
      mountArkosSocketExtensions(socket);

      socket.emit("ping");

      expect(raw.mock.calls[0][1]._meta).toBeDefined();
    });
  });

  describe("socket.emitWithAck", () => {
    test("injects _meta", async () => {
      const socket = makeSocket();
      const raw = socket.emitWithAck as jest.Mock;
      mountArkosSocketExtensions(socket);

      await socket.emitWithAck("event", { x: 1 });

      const payload = raw.mock.calls[0][1];
      expect(payload.x).toBe(1);
      expect(payload._meta).toBeDefined();
    });

    test("forwards extra args", async () => {
      const socket = makeSocket();
      const raw = socket.emitWithAck as jest.Mock;
      mountArkosSocketExtensions(socket);

      const extra = { extra: true };
      await socket.emitWithAck("event", { x: 1 }, extra);

      expect(raw.mock.calls[0][2]).toBe(extra);
    });
  });

  describe("socket.timeout", () => {
    test("patched emitWithAck on timed socket injects _meta", async () => {
      const socket = makeSocket();

      const emitWithAckMock = jest.fn();

      const timedSocket1 = {
        emitWithAck: emitWithAckMock,
      };
      const originalTimeout = jest.fn().mockReturnValue(timedSocket1);

      socket.timeout = jest.fn((ms: number) => {
        return originalTimeout(ms);
      });

      const rawTimeout = socket.timeout as jest.Mock;

      mountArkosSocketExtensions(socket);

      socket.timeout(3000).emitWithAck("event", { y: 2 });

      expect(rawTimeout).toHaveBeenCalledWith(3000);

      const payload = emitWithAckMock.mock.calls[0][1];
      expect(payload.y).toBe(2);
      expect(payload._meta).toBeDefined();
    });
  });

  describe("socket.broadcast", () => {
    test("emit injects _meta via broadcast operator", () => {
      const socket = makeSocket();
      mountArkosSocketExtensions(socket);

      const broadcastEmit = jest.fn().mockReturnValue(true);
      const proto = Object.getPrototypeOf(socket);
      const originalDescriptor = Object.getOwnPropertyDescriptor(
        proto,
        "broadcast"
      )!;
      const originalOp = originalDescriptor.get!.call(socket);
      originalOp.emit = broadcastEmit;

      socket.broadcast.emit("event", { z: 3 });

      const payload = broadcastEmit.mock.calls[0][1];
      expect(payload.z).toBe(3);
      expect(payload._meta).toBeDefined();
    });
  });

  describe("socket.to", () => {
    test("emit on returned operator injects _meta", () => {
      const socket = makeSocket();
      const op = makeBroadcastOperator();
      (socket.to as jest.Mock).mockReturnValue(op);
      mountArkosSocketExtensions(socket);

      socket.to("room-1").emit("msg", { hello: true });

      const payload = op.emit.mock.calls[0][1];
      expect(payload.hello).toBe(true);
      expect(payload._meta).toBeDefined();
    });

    test("emitWithAck on returned operator injects _meta", async () => {
      const socket = makeSocket();
      const op = makeBroadcastOperator();
      (socket.to as jest.Mock).mockReturnValue(op);
      mountArkosSocketExtensions(socket);

      await socket.to("room-1").emitWithAck("confirm", { req: true });

      const payload = op.emitWithAck.mock.calls[0][1];
      expect(payload.req).toBe(true);
      expect(payload._meta).toBeDefined();
    });

    test("except with string delegates to operator.except", () => {
      const socket = makeSocket();
      const op = makeBroadcastOperator();
      (socket.to as jest.Mock).mockReturnValue(op);
      mountArkosSocketExtensions(socket);

      socket.to("room-1").except("room-2").emit("msg", {});

      expect(op.except).toHaveBeenCalledWith("room-2");
    });

    test("except with array delegates to operator.except", () => {
      const socket = makeSocket();
      const op = makeBroadcastOperator();
      (socket.to as jest.Mock).mockReturnValue(op);
      mountArkosSocketExtensions(socket);

      socket.to("room-1").except(["room-2", "room-3"]).emit("msg", {});

      expect(op.except).toHaveBeenCalledWith(["room-2", "room-3"]);
    });

    test("except with { user } resolves socket ids and calls operator.except per id", () => {
      const socket = makeSocket();
      const op = makeBroadcastOperator();
      (socket.to as jest.Mock).mockReturnValue(op);
      mountArkosSocketExtensions(socket);

      addUserSocket(socket, "user-99", "peer-99");

      socket.to("room-1").except({ user: "user-99" }).emit("msg", {});

      expect(op.except).toHaveBeenCalledWith("peer-99");
    });

    test("except with { user: string[] } resolves multiple users", () => {
      const socket = makeSocket();
      const op = makeBroadcastOperator();
      (socket.to as jest.Mock).mockReturnValue(op);
      mountArkosSocketExtensions(socket);

      addUserSocket(socket, "user-a", "peer-a");
      addUserSocket(socket, "user-b", "peer-b");

      socket
        .to("room-1")
        .except({ user: ["user-a", "user-b"] })
        .emit("msg", {});

      expect(op.except).toHaveBeenCalledWith("peer-a");
      expect(op.except).toHaveBeenCalledWith("peer-b");
    });

    test("volatile returns new operator wrapping operator.volatile", () => {
      const socket = makeSocket();
      const op = makeBroadcastOperator();
      (socket.to as jest.Mock).mockReturnValue(op);
      mountArkosSocketExtensions(socket);

      socket.to("room-1").volatile.emit("cursor", { x: 0 });

      expect(op.emit).toHaveBeenCalled();
    });

    test("compress delegates to operator.compress", () => {
      const socket = makeSocket();
      const op = makeBroadcastOperator();
      (socket.to as jest.Mock).mockReturnValue(op);
      mountArkosSocketExtensions(socket);

      socket.to("room-1").compress(false).emit("msg", {});

      expect(op.compress).toHaveBeenCalledWith(false);
    });

    test("timeout delegates to operator.timeout", () => {
      const socket = makeSocket();
      const op = makeBroadcastOperator();
      (socket.to as jest.Mock).mockReturnValue(op);
      mountArkosSocketExtensions(socket);

      socket.to("room-1").timeout(2000).emit("msg", {});

      expect(op.timeout).toHaveBeenCalledWith(2000);
    });

    test("users method extracts unique user ids from fetchSockets", async () => {
      const socket = makeSocket();
      const s1 = makeSocket("s1");
      (s1.rooms as Set<string>).add("arkos::user:alice");
      const s2 = makeSocket("s2");
      (s2.rooms as Set<string>).add("arkos::user:bob");
      const s3 = makeSocket("s3");
      (s3.rooms as Set<string>).add("arkos::user:alice");

      const op = makeBroadcastOperator({
        fetchSockets: jest.fn().mockResolvedValue([s1, s2, s3]),
      });
      (socket.to as jest.Mock).mockReturnValue(op);
      mountArkosSocketExtensions(socket);

      const users = await (socket.to("room-1") as any).users();
      expect(users).toEqual(expect.arrayContaining(["alice", "bob"]));
      expect(users).toHaveLength(2);
    });

    test("users() returns empty array when no sockets in room", async () => {
      const socket = makeSocket();
      const op = makeBroadcastOperator({
        fetchSockets: jest.fn().mockResolvedValue([]),
      });
      (socket.to as jest.Mock).mockReturnValue(op);
      mountArkosSocketExtensions(socket);

      const users = await (socket.to("room-1") as any).users();
      expect(users).toEqual([]);
    });

    test("users() ignores sockets with no user room", async () => {
      const socket = makeSocket();
      const s1 = makeSocket("s1");
      const op = makeBroadcastOperator({
        fetchSockets: jest.fn().mockResolvedValue([s1]),
      });
      (socket.to as jest.Mock).mockReturnValue(op);
      mountArkosSocketExtensions(socket);

      const users = await (socket.to("room-1") as any).users();
      expect(users).toEqual([]);
    });
  });

  describe("socket.user", () => {
    test("emit targets user room via nsp.to", () => {
      const socket = makeSocket();
      mountArkosSocketExtensions(socket);

      addUserSocket(socket, "user-1");
      socket.user("user-1").emit("notify", { msg: "hi" });

      expect(socket.nsp.to).toHaveBeenCalledWith("arkos::user:user-1");
    });

    test("emit injects _meta", () => {
      const socket = makeSocket();
      const nspOp = makeBroadcastOperator();
      (socket.nsp.to as jest.Mock).mockReturnValue(nspOp);
      mountArkosSocketExtensions(socket);

      addUserSocket(socket, "user-1");
      socket.user("user-1").emit("notify", { msg: "hi" });

      const payload = nspOp.emit.mock.calls[0][1];
      expect(payload.msg).toBe("hi");
      expect(payload._meta).toBeDefined();
    });

    // test("isOnline returns true when user has active sockets", async () => {
    //   const socket = makeSocket();
    //   mountArkosSocketExtensions(socket);
    //   addUserSocket(socket, "user-1");
    //
    //   expect(await socket.user("user-1").isOnline()).toBe(true);
    // });

    // test("isOnline returns false when user has no sockets", async () => {
    //   const socket = makeSocket();
    //   mountArkosSocketExtensions(socket);
    //
    //   expect(await socket.user("ghost").isOnline()).toBe(false);
    // });

    test("fetchSockets returns only sockets in the user room", async () => {
      const socket = makeSocket();
      mountArkosSocketExtensions(socket);
      const s1 = addUserSocket(socket, "user-1", "s-u1-a");
      const s2 = addUserSocket(socket, "user-1", "s-u1-b");
      // addUserSocket(socket, "user-2", "s-u2");

      const sockets = await socket.user("user-1").fetchSockets();
      // console.log(socket);
      expect(sockets).toHaveLength(2);
      expect(sockets).toContain(s1);
      expect(sockets).toContain(s2);
    });

    test("rooms returns all rooms except internal user tracking rooms", async () => {
      const socket = makeSocket();
      mountArkosSocketExtensions(socket);
      const s1 = addUserSocket(socket, "user-1", "s-u1");
      (s1.rooms as Set<string>).add("game-room");
      (s1.rooms as Set<string>).add("lobby");

      const rooms = await socket.user("user-1").activeRooms();
      expect(rooms).toContain("game-room");
      expect(rooms).toContain("lobby");
      expect(rooms.some((r) => r.startsWith("arkos::user:"))).toBe(false);
    });

    test("rooms deduplicates across multiple sockets", async () => {
      const socket = makeSocket();
      mountArkosSocketExtensions(socket);
      const s1 = addUserSocket(socket, "user-1", "s-u1-a");
      const s2 = addUserSocket(socket, "user-1", "s-u1-b");
      (s1.rooms as Set<string>).add("shared-room");
      (s2.rooms as Set<string>).add("shared-room");

      const rooms = await socket.user("user-1").activeRooms();
      expect(rooms.filter((r) => r === "shared-room")).toHaveLength(1);
    });

    test("rooms returns empty array when user is offline", async () => {
      const socket = makeSocket();
      mountArkosSocketExtensions(socket);

      expect(await socket.user("ghost").activeRooms()).toEqual([]);
    });

    // test("in returns true when user socket is in the room", async () => {
    //   const socket = makeSocket();
    //   mountArkosSocketExtensions(socket);
    //   const s1 = addUserSocket(socket, "user-1");
    //   (s1.rooms as Set<string>).add("target-room");
    //
    //   expect(await socket.user("user-1").in("target-room")).toBe(true);
    // });

    // test("in returns false when user socket is not in the room", async () => {
    //   const socket = makeSocket();
    //   mountArkosSocketExtensions(socket);
    //   addUserSocket(socket, "user-1");
    //
    //   expect(await socket.user("user-1").in("other-room")).toBe(false);
    // });

    // test("in returns false when user is offline", async () => {
    //   const socket = makeSocket();
    //   mountArkosSocketExtensions(socket);
    //
    //   expect(await socket.user("ghost").in("room")).toBe(false);
    // });

    test("join calls join on all user sockets", async () => {
      const socket = makeSocket();
      const nspOp = makeBroadcastOperator();
      (socket.nsp.to as jest.Mock).mockReturnValue(nspOp);
      mountArkosSocketExtensions(socket);

      addUserSocket(socket, "user-1", "s-u1-a");
      addUserSocket(socket, "user-1", "s-u1-b");

      socket.user("user-1").socketsJoin("new-room");

      expect(nspOp.socketsJoin).toHaveBeenCalledWith("new-room");
      expect(nspOp.socketsJoin).toHaveBeenCalledWith("new-room");
    });

    test("join is a no-op when user is offline", async () => {
      const socket = makeSocket();
      mountArkosSocketExtensions(socket);
      await expect(
        socket.user("ghost").socketsJoin("room")
      ).resolves.toBeUndefined();
    });

    test("leave calls leave on all user sockets", async () => {
      const socket = makeSocket();
      const nspOp = makeBroadcastOperator();
      (socket.nsp.to as jest.Mock).mockReturnValue(nspOp);
      mountArkosSocketExtensions(socket);
      addUserSocket(socket, "user-1", "s-u1-a");
      addUserSocket(socket, "user-1", "s-u1-b");

      socket.user("user-1").socketsLeave("old-room");

      expect(nspOp.socketsLeave).toHaveBeenCalledWith("old-room");
      expect(nspOp.socketsLeave).toHaveBeenCalledWith("old-room");
    });

    test("disconnect calls disconnect on all user sockets with close=false by default", async () => {
      const socket = makeSocket();
      const nspOp = makeBroadcastOperator();
      (socket.nsp.to as jest.Mock).mockReturnValue(nspOp);
      mountArkosSocketExtensions(socket);

      addUserSocket(socket, "user-1", "s-u1-a");
      addUserSocket(socket, "user-1", "s-u1-b");

      socket.user("user-1").disconnectSockets(false);

      expect(nspOp.disconnectSockets).toHaveBeenCalledWith(false);
      expect(nspOp.disconnectSockets).toHaveBeenCalledWith(false);
    });

    test("disconnect with close=true passes through", async () => {
      const socket = makeSocket();
      const nspOp = makeBroadcastOperator();
      (socket.nsp.to as jest.Mock).mockReturnValue(nspOp);
      mountArkosSocketExtensions(socket);
      addUserSocket(socket, "user-1");

      socket.user("user-1").disconnectSockets(true);

      expect(nspOp.disconnectSockets).toHaveBeenCalledWith(true);
    });

    test("except with string excludes room from emit target", () => {
      const socket = makeSocket();
      const nspOp = makeBroadcastOperator();
      (socket.nsp.to as jest.Mock).mockReturnValue(nspOp);
      mountArkosSocketExtensions(socket);
      addUserSocket(socket, "user-1");

      socket.user("user-1").except("excluded-room").emit("e", {});

      expect(nspOp.except).toHaveBeenCalledWith("excluded-room");
    });

    test("except with array excludes multiple rooms", () => {
      const socket = makeSocket();
      const nspOp = makeBroadcastOperator();
      (socket.nsp.to as jest.Mock).mockReturnValue(nspOp);
      mountArkosSocketExtensions(socket);
      addUserSocket(socket, "user-1");

      socket.user("user-1").except(["room-a", "room-b"]).emit("e", {});

      expect(nspOp.except).toHaveBeenCalledWith(["room-a", "room-b"]);
    });

    test("except with { user } excludes target user socket ids", () => {
      const socket = makeSocket();
      const nspOp = makeBroadcastOperator();
      (socket.nsp.to as jest.Mock).mockReturnValue(nspOp);
      mountArkosSocketExtensions(socket);
      addUserSocket(socket, "user-1", "s-u1");
      addUserSocket(socket, "user-2", "s-u2");

      socket.user("user-1").except({ user: "user-2" }).emit("e", {});

      expect(nspOp.except).toHaveBeenCalledWith("s-u2");
    });

    test("except with { user: string[] } excludes multiple users", () => {
      const socket = makeSocket();
      const nspOp = makeBroadcastOperator();
      (socket.nsp.to as jest.Mock).mockReturnValue(nspOp);
      mountArkosSocketExtensions(socket);
      addUserSocket(socket, "user-1", "s-u1");
      addUserSocket(socket, "user-2", "s-u2");
      addUserSocket(socket, "user-3", "s-u3");

      socket
        .user("user-1")
        .except({ user: ["user-2", "user-3"] })
        .emit("e", {});

      expect(nspOp.except).toHaveBeenCalledWith("s-u2");
      expect(nspOp.except).toHaveBeenCalledWith("s-u3");
    });

    test("except is immutable — returns new instance", () => {
      const socket = makeSocket();
      mountArkosSocketExtensions(socket);
      const target = socket.user("user-1");
      const excepted = target.except("some-room");
      expect(excepted).not.toBe(target);
    });
  });

  describe("socket.retry", () => {
    test("emitWithAck injects _meta and resolves on success", async () => {
      const socket = makeSocket();
      mountArkosSocketExtensions(socket);

      const result = await socket.retry(3).emitWithAck("event", { val: 2 });
      expect(result).toBeDefined();
    });

    test("emitWithAck injects _meta and resolves on success with custom initialDelay and multiplier", async () => {
      const socket = makeSocket();
      mountArkosSocketExtensions(socket);

      const result = await socket
        .retry(3, 50, 1)
        .emitWithAck("event", { val: 2 });
      expect(result).toBeDefined();
    });

    test("emitWithAck retries and resolves on second attempt", async () => {
      const socket = makeSocket();
      const raw = socket.emitWithAck as jest.Mock;
      raw
        .mockRejectedValueOnce(new Error("timeout"))
        .mockResolvedValueOnce({ ok: true });
      mountArkosSocketExtensions(socket);

      jest.useFakeTimers();
      const promise = socket.retry(3).emitWithAck("event", { val: 2 });
      await jest.runAllTimersAsync();
      const result = await promise;
      expect(result).toEqual({ ok: true });
      jest.useRealTimers();
    });

    test("emitWithAck throws after all retries exhausted", async () => {
      const socket = makeSocket();
      const raw = socket.emitWithAck as jest.Mock;
      raw.mockRejectedValue(new Error("always fails"));
      mountArkosSocketExtensions(socket);

      jest.useFakeTimers();
      await jest.runAllTimersAsync();
      await expect(socket.retry(0).emitWithAck("event", {})).rejects.toThrow(
        "always fails"
      );
      jest.useRealTimers();
    });

    test("timeout sets timeout on socket before emitWithAck", async () => {
      const socket = makeSocket();
      const rawTimeout = socket.timeout as jest.Mock;
      mountArkosSocketExtensions(socket);

      jest.useFakeTimers();
      const promise = socket.retry(1).timeout(5000).emitWithAck("event", {});
      await jest.runAllTimersAsync();
      await promise.catch(() => {});
      expect(rawTimeout).toHaveBeenCalledWith(5000);
      jest.useRealTimers();
    });

    test("timeout returns same ArkosRetryTarget instance (fluent)", () => {
      const socket = makeSocket();
      mountArkosSocketExtensions(socket);
      const retry = socket.retry(3);
      expect(retry.timeout(1000)).toBe(retry);
    });
  });
});
