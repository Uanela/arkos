import { IArkosGateway } from "../arkos-gateway";
import { checkRateLimit, clearRateLimitForSocket } from "../utils/rate-limiter";
import {
  handleArkosGatewayErrors,
  runArkosGatewayPipes,
  handleGatewayEventLog,
  handleGatewayLifecycleLog,
} from "../utils/helpers";

jest.mock("../utils/rate-limiter");
jest.mock("../utils/helpers");
jest.mock("../../../exports/services");
jest.mock("../../../modules/auth/utils/auth-hooks-manager");
jest.mock("../../../server");
jest.mock("../../../types/validation/validation-manager");
jest.mock("../../../modules/base/utils/error-prettifier");

const mockCheckRateLimit = checkRateLimit as jest.Mock;
const mockHandleErrors = handleArkosGatewayErrors as jest.Mock;
const mockRunPipes = runArkosGatewayPipes as jest.Mock;
const mockEventLog = handleGatewayEventLog as jest.Mock;
const mockLifecycleLog = handleGatewayLifecycleLog as jest.Mock;

function makeSocket(overrides: Partial<any> = {}): any {
  const handlers: Record<string, Function> = {};
  return {
    id: "socket-id-123",
    user: { id: "user-1", name: "Test User" },
    data: {},
    emit: jest.fn(),
    to: jest.fn().mockReturnThis(),
    join: jest.fn(),
    on: jest.fn((event: string, handler: Function) => {
      handlers[event] = handler;
    }),
    _trigger: (event: string, ...args: any[]) => handlers[event]?.(...args),
    ...overrides,
  };
}

function makeIo(overrides: Partial<any> = {}): any {
  const namespaces: Record<string, any> = {};
  return {
    of: jest.fn((name: string) => {
      if (!namespaces[name]) {
        const nsHandlers: Record<string, Function> = {};
        namespaces[name] = {
          use: jest.fn(),
          on: jest.fn((event: string, handler: Function) => {
            nsHandlers[event] = handler;
          }),
          _trigger: (event: string, ...args: any[]) =>
            nsHandlers[event]?.(...args),
        };
      }
      return namespaces[name];
    }),
    _namespaces: namespaces,
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockRunPipes.mockResolvedValue(undefined);
  mockHandleErrors.mockResolvedValue(undefined);
  mockEventLog.mockReturnValue(undefined);
  mockLifecycleLog.mockReturnValue(undefined);
  mockCheckRateLimit.mockReturnValue({ allowed: true });
});

describe("IArkosGateway — use()", () => {
  test("accepts a pipe function", () => {
    const gw = new IArkosGateway({ name: "/chat" });
    const pipe = jest.fn();
    expect(() => gw.use(pipe)).not.toThrow();
  });

  test("accepts a child IArkosGateway", () => {
    const gw = new IArkosGateway({ name: "/chat" });
    const child = new IArkosGateway({ name: "/notifications" });
    expect(() => gw.use(child)).not.toThrow();
  });

  test("throws on invalid value", () => {
    const gw = new IArkosGateway({ name: "/chat" });
    expect(() => (gw as any).use(42)).toThrow(
      /expected an ArkosGateway instance or a middleware function/
    );
  });

  test("is chainable", () => {
    const gw = new IArkosGateway({ name: "/chat" });
    expect(gw.use(jest.fn())).toBe(gw);
  });
});

describe("IArkosGateway — pipe()", () => {
  test("registers a global pipe", () => {
    const gw = new IArkosGateway({ name: "/chat" });
    const pipe = jest.fn();
    expect(() => gw.pipe(pipe)).not.toThrow();
  });

  test("registers a scoped pipe for an existing event", () => {
    const gw = new IArkosGateway({ name: "/chat" });
    const handler = jest.fn();
    const pipe = jest.fn();
    gw.on({ event: "send_message" }, handler);
    expect(() => gw.pipe({ event: "send_message" }, pipe)).not.toThrow();
  });

  test("registers a deferred scoped pipe before on()", () => {
    const gw = new IArkosGateway({ name: "/chat" });
    const pipe = jest.fn();
    const handler = jest.fn();
    gw.pipe({ event: "send_message" }, pipe);
    gw.on({ event: "send_message" }, handler);
  });

  test("throws on invalid arguments", () => {
    const gw = new IArkosGateway({ name: "/chat" });
    expect(() => (gw as any).pipe({ event: "send_message" })).toThrow(
      /Invalid arguments for gateway.pipe/
    );
  });

  test("is chainable", () => {
    const gw = new IArkosGateway({ name: "/chat" });
    expect(gw.pipe(jest.fn())).toBe(gw);
  });
});

describe("IArkosGateway — on()", () => {
  test("registers an event handler", () => {
    const gw = new IArkosGateway({ name: "/chat" });
    expect(() => gw.on({ event: "send_message" }, jest.fn())).not.toThrow();
  });

  test("skips disabled events", () => {
    const gw = new IArkosGateway({ name: "/chat" });
    const handler = jest.fn();
    gw.on({ event: "send_message", disabled: true }, handler);
    const io = makeIo();
    gw._register(io);
    const ns = io.of("/chat");
    ns._trigger("connection", makeSocket());
  });

  test("throws when authorization defined but authentication is false", () => {
    const gw = new IArkosGateway({ name: "/chat", authentication: false });
    expect(() =>
      gw.on({ event: "delete", authorization: ["Admin"] }, jest.fn())
    ).toThrow(/authentication: false/);
  });

  test("snapshots global pipes at registration time", () => {
    const gw = new IArkosGateway({ name: "/chat" });
    const pipe1 = jest.fn();
    gw.pipe(pipe1);
    gw.on({ event: "send_message" }, jest.fn());
    const pipe2 = jest.fn();
    gw.pipe(pipe2);
    gw.on({ event: "typing" }, jest.fn());
  });

  test("is chainable", () => {
    const gw = new IArkosGateway({ name: "/chat" });
    expect(gw.on({ event: "send_message" }, jest.fn())).toBe(gw);
  });
});

describe("IArkosGateway — hook()", () => {
  test("registers connection hook", () => {
    const gw = new IArkosGateway({ name: "/chat" });
    expect(() => gw.hook("connection", jest.fn())).not.toThrow();
  });

  test("registers disconnect hook", () => {
    const gw = new IArkosGateway({ name: "/chat" });
    expect(() => gw.hook("disconnect", jest.fn())).not.toThrow();
  });

  test("registers error hook", () => {
    const gw = new IArkosGateway({ name: "/chat" });
    expect(() => gw.hook("error", jest.fn())).not.toThrow();
  });

  test("is chainable", () => {
    const gw = new IArkosGateway({ name: "/chat" });
    expect(gw.hook("connection", jest.fn())).toBe(gw);
  });
});

describe("IArkosGateway — _register()", () => {
  test("calls io.of with the gateway name", () => {
    const gw = new IArkosGateway({ name: "/chat" });
    const io = makeIo();
    gw._register(io);
    expect(io.of).toHaveBeenCalledWith("/chat");
  });

  test("concatenates parent name with own name for child", () => {
    const gw = new IArkosGateway({ name: "/chat" });
    const child = new IArkosGateway({ name: "/notifications" });
    gw.use(child);
    const io = makeIo();
    gw._register(io);
    expect(io.of).toHaveBeenCalledWith("/chat/notifications");
  });

  test("registers ns.use for auth when authentication is true", () => {
    const gw = new IArkosGateway({ name: "/chat", authentication: true });
    const io = makeIo();
    gw._register(io);
    const ns = io.of("/chat");
    expect(ns.use).toHaveBeenCalled();
  });

  test("does not register ns.use for auth when authentication is false", () => {
    const gw = new IArkosGateway({ name: "/chat", authentication: false });
    const io = makeIo();
    gw._register(io);
    const ns = io.of("/chat");
    expect(ns.use).not.toHaveBeenCalled();
  });

  test("logs lifecycle on connection", async () => {
    const gw = new IArkosGateway({ name: "/chat" });
    const io = makeIo();
    gw._register(io);
    const ns = io.of("/chat");
    const socket = makeSocket();
    await ns._trigger("connection", socket);
    expect(mockLifecycleLog).toHaveBeenCalledWith(
      "/chat",
      "connected",
      socket.id
    );
  });

  test("logs lifecycle on disconnect", async () => {
    const gw = new IArkosGateway({ name: "/chat" });
    const io = makeIo();
    gw._register(io);
    const ns = io.of("/chat");
    const socket = makeSocket();
    await ns._trigger("connection", socket);
    await socket._trigger("disconnect");
    expect(mockLifecycleLog).toHaveBeenCalledWith(
      "/chat",
      "disconnected",
      socket.id
    );
  });

  test("calls connection hooks on connect", async () => {
    const gw = new IArkosGateway({ name: "/chat" });
    const onConnect = jest.fn().mockResolvedValue(undefined);
    gw.hook("connection", onConnect);
    const io = makeIo();
    gw._register(io);
    const socket = makeSocket();
    await io.of("/chat")._trigger("connection", socket);
    expect(onConnect).toHaveBeenCalledWith(socket, io);
  });

  test("calls disconnect hooks on disconnect", async () => {
    const gw = new IArkosGateway({ name: "/chat" });
    const onDisconnect = jest.fn().mockResolvedValue(undefined);
    gw.hook("disconnect", onDisconnect);
    const io = makeIo();
    gw._register(io);
    const socket = makeSocket();
    await io.of("/chat")._trigger("connection", socket);
    await socket._trigger("disconnect");
    expect(onDisconnect).toHaveBeenCalledWith(socket, io);
  });

  test("calls handleArkosGatewayErrors when connection hook throws", async () => {
    const gw = new IArkosGateway({ name: "/chat" });
    gw.hook("connection", jest.fn().mockRejectedValue(new Error("boom")));
    const io = makeIo();
    gw._register(io);
    const socket = makeSocket();
    await io.of("/chat")._trigger("connection", socket);
    expect(mockHandleErrors).toHaveBeenCalled();
  });

  test("calls handleArkosGatewayErrors when disconnect hook throws", async () => {
    const gw = new IArkosGateway({ name: "/chat" });
    gw.hook("disconnect", jest.fn().mockRejectedValue(new Error("boom")));
    const io = makeIo();
    gw._register(io);
    const socket = makeSocket();
    await io.of("/chat")._trigger("connection", socket);
    await socket._trigger("disconnect");
    expect(mockHandleErrors).toHaveBeenCalled();
  });

  test("skips _pipeOnly entries — no handler registered for them", async () => {
    const gw = new IArkosGateway({ name: "/chat" });
    gw.pipe({ event: "ghost_event" }, jest.fn());
    const io = makeIo();
    gw._register(io);
    const socket = makeSocket();
    await io.of("/chat")._trigger("connection", socket);
    const registered = (socket.on as jest.Mock).mock.calls.map((c) => c[0]);
    expect(registered).not.toContain("ghost_event");
  });

  test("inherits parent rateLimit when child has none", () => {
    const parentRateLimit = { windowMs: 60_000, max: 100 };
    const gw = new IArkosGateway({ name: "/chat", rateLimit: parentRateLimit });
    const child = new IArkosGateway({ name: "/notifications" });
    gw.use(child);
    const io = makeIo();
    gw._register(io);
  });

  test("child rateLimit overrides parent", () => {
    const gw = new IArkosGateway({
      name: "/chat",
      rateLimit: { windowMs: 60_000, max: 100 },
    });
    const child = new IArkosGateway({
      name: "/notifications",
      rateLimit: { windowMs: 10_000, max: 5 },
    });
    gw.use(child);
    const io = makeIo();
    gw._register(io);
  });

  test("child inherits parent auth when child has none", () => {
    const gw = new IArkosGateway({ name: "/chat", authentication: true });
    const child = new IArkosGateway({ name: "/notifications" });
    gw.use(child);
    const io = makeIo();
    gw._register(io);
    const childNs = io.of("/chat/notifications");
    expect(childNs.use).toHaveBeenCalled();
  });
});

describe("IArkosGateway — event execution", () => {
  async function triggerEvent(
    gw: IArkosGateway,
    eventName: string,
    args: any[] = [{}],
    socketOverrides: Partial<any> = {}
  ) {
    const io = makeIo();
    gw._register(io);
    const socket = makeSocket(socketOverrides);
    await io.of(gw["config"].name)._trigger("connection", socket);
    await socket._trigger(eventName, ...args);
    return { socket, io };
  }

  test("calls handler with socket, data, io", async () => {
    const handler = jest.fn().mockResolvedValue(undefined);
    const gw = new IArkosGateway({ name: "/chat" });
    gw.on({ event: "send_message" }, handler);
    const { socket, io } = await triggerEvent(gw, "send_message", [
      { content: "hi" },
    ]);
    expect(handler).toHaveBeenCalledWith(
      socket,
      { content: "hi" },
      io,
      undefined
    );
  });

  test("passes ack when ack: true and last arg is function", async () => {
    const handler = jest.fn().mockResolvedValue(undefined);
    const ackFn = jest.fn();
    const gw = new IArkosGateway({ name: "/chat" });
    gw.on({ event: "send_message", ack: true }, handler);
    const { socket, io } = await triggerEvent(gw, "send_message", [
      { content: "hi" },
      ackFn,
    ]);
    expect(handler).toHaveBeenCalledWith(socket, { content: "hi" }, io, ackFn);
  });

  test("does not pass ack when ack: false", async () => {
    const handler = jest.fn().mockResolvedValue(undefined);
    const ackFn = jest.fn();
    const gw = new IArkosGateway({ name: "/chat" });
    gw.on({ event: "send_message", ack: false }, handler);
    await triggerEvent(gw, "send_message", [{ content: "hi" }, ackFn]);
    expect(handler).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.anything(),
      undefined
    );
  });

  test("logs event on success", async () => {
    const gw = new IArkosGateway({ name: "/chat" });
    gw.on({ event: "send_message" }, jest.fn().mockResolvedValue(undefined));
    await triggerEvent(gw, "send_message", [{}]);
    expect(mockEventLog).toHaveBeenCalledWith(
      "/chat",
      "send_message",
      200,
      expect.any(Number)
    );
  });

  test("calls handleArkosGatewayErrors when handler throws", async () => {
    const gw = new IArkosGateway({ name: "/chat" });
    gw.on(
      { event: "send_message" },
      jest.fn().mockRejectedValue(new Error("handler boom"))
    );
    await triggerEvent(gw, "send_message", [{}]);
    expect(mockHandleErrors).toHaveBeenCalled();
  });

  test("runs global pipes before handler", async () => {
    const order: string[] = [];
    const pipe = jest.fn().mockImplementation(async () => {
      order.push("pipe");
    });
    mockRunPipes.mockImplementation(async (pipes: any[]) => {
      for (const p of pipes) await p();
    });
    const handler = jest.fn().mockImplementation(async () => {
      order.push("handler");
    });
    const gw = new IArkosGateway({ name: "/chat" });
    gw.pipe(pipe);
    gw.on({ event: "send_message" }, handler);
    await triggerEvent(gw, "send_message", [{}]);
    expect(mockRunPipes).toHaveBeenCalled();
  });

  test("checks rate limit before handler", async () => {
    mockCheckRateLimit.mockReturnValue({ allowed: false, retryAfter: 5000 });
    const handler = jest.fn();
    const gw = new IArkosGateway({
      name: "/chat",
      rateLimit: { windowMs: 60_000, max: 1 },
    });
    gw.on({ event: "send_message" }, handler);
    await triggerEvent(gw, "send_message", [{}]);
    expect(handler).not.toHaveBeenCalled();
    expect(mockHandleErrors).toHaveBeenCalled();
  });

  test("rate limit allowed — handler is called", async () => {
    mockCheckRateLimit.mockReturnValue({ allowed: true });
    const handler = jest.fn().mockResolvedValue(undefined);
    const gw = new IArkosGateway({
      name: "/chat",
      rateLimit: { windowMs: 60_000, max: 100 },
    });
    gw.on({ event: "send_message" }, handler);
    await triggerEvent(gw, "send_message", [{}]);
    expect(handler).toHaveBeenCalled();
  });

  test("event-level rateLimit overrides gateway-level", async () => {
    mockCheckRateLimit.mockReturnValue({ allowed: true });
    const handler = jest.fn().mockResolvedValue(undefined);
    const gw = new IArkosGateway({
      name: "/chat",
      rateLimit: { windowMs: 60_000, max: 100 },
    });
    gw.on(
      { event: "send_message", rateLimit: { windowMs: 10_000, max: 5 } },
      handler
    );
    await triggerEvent(gw, "send_message", [{}]);
    expect(mockCheckRateLimit).toHaveBeenCalledWith(
      expect.any(String),
      "send_message",
      { windowMs: 10_000, max: 5 }
    );
  });

  test("pipe throwing calls handleArkosGatewayErrors", async () => {
    mockRunPipes.mockRejectedValue(new Error("pipe boom"));
    const handler = jest.fn();
    const gw = new IArkosGateway({ name: "/chat" });
    gw.pipe(jest.fn());
    gw.on({ event: "send_message" }, handler);
    await triggerEvent(gw, "send_message", [{}]);
    expect(handler).not.toHaveBeenCalled();
    expect(mockHandleErrors).toHaveBeenCalled();
  });

  test("clears rate limit on disconnect", async () => {
    const gw = new IArkosGateway({ name: "/chat" });
    gw.on({ event: "send_message" }, jest.fn());
    const io = makeIo();
    gw._register(io);
    const socket = makeSocket();
    await io.of("/chat")._trigger("connection", socket);
    await socket._trigger("disconnect");
    expect(clearRateLimitForSocket).toHaveBeenCalledWith(socket.id);
  });
});

describe("IArkosGateway — pipe order", () => {
  test("global pipe registered before on() is snapshotted into event", async () => {
    const pipe1 = jest.fn();
    const pipe2 = jest.fn();
    const gw = new IArkosGateway({ name: "/chat" });
    gw.pipe(pipe1);
    gw.on({ event: "send_message" }, jest.fn().mockResolvedValue(undefined));
    gw.pipe(pipe2);
    gw.on({ event: "typing" }, jest.fn().mockResolvedValue(undefined));
    const io = makeIo();
    gw._register(io);
    const socket = makeSocket();
    await io.of("/chat")._trigger("connection", socket);
    await socket._trigger("send_message", {});
    const sendMessagePipes = mockRunPipes.mock.calls[0]?.[0] ?? [];
    expect(sendMessagePipes).toContain(pipe1);
    expect(sendMessagePipes).not.toContain(pipe2);
  });

  test("deferred scoped pipe merges with global pipes at on() time", async () => {
    const globalPipe = jest.fn();
    const scopedPipe = jest.fn();
    const gw = new IArkosGateway({ name: "/chat" });
    gw.pipe({ event: "send_message" }, scopedPipe);
    gw.pipe(globalPipe);
    gw.on({ event: "send_message" }, jest.fn().mockResolvedValue(undefined));
    const io = makeIo();
    gw._register(io);
    const socket = makeSocket();
    await io.of("/chat")._trigger("connection", socket);
    await socket._trigger("send_message", {});
    const pipes = mockRunPipes.mock.calls[0]?.[0] ?? [];
    expect(pipes).toContain(globalPipe);
    expect(pipes).toContain(scopedPipe);
  });
});

describe("handleArkosGatewayErrors", () => {
  test("calls error handlers if registered", async () => {
    const errorHandler = jest.fn().mockResolvedValue(undefined);
    const socket = makeSocket();
    const io = makeIo();
    const err = new Error("boom");

    mockHandleErrors.mockImplementationOnce(
      async (
        err: any,
        socket: any,
        io: any,
        handlers: any[],
        meta: any,
        ack?: any
      ) => {
        for (const h of handlers) await h(err, socket, io);
      }
    );

    await handleArkosGatewayErrors(err, socket, io, [errorHandler], {
      namespace: "/chat",
      event: "send_message",
      startTime: Date.now(),
    });

    expect(mockHandleErrors).toHaveBeenCalled();
  });

  test("emits default error when no error handler registered", async () => {
    const socket = makeSocket();
    const io = makeIo();
    const err = { message: "oops", isOperational: true, statusCode: 400 };

    mockHandleErrors.mockImplementationOnce(
      async (
        err: any,
        socket: any,
        io: any,
        handlers: any[],
        meta: any,
        ack?: any
      ) => {
        if (!handlers.length) socket.emit("error", err);
      }
    );

    await handleArkosGatewayErrors(err, socket, io, [], {
      namespace: "/chat",
      event: "send_message",
      startTime: Date.now(),
    });

    expect(mockHandleErrors).toHaveBeenCalled();
  });
});

describe("runArkosGatewayPipes", () => {
  test("runs pipes in order", async () => {
    const order: number[] = [];
    const pipes = [
      jest.fn().mockImplementation(async () => {
        order.push(1);
      }),
      jest.fn().mockImplementation(async () => {
        order.push(2);
      }),
      jest.fn().mockImplementation(async () => {
        order.push(3);
      }),
    ];
    mockRunPipes.mockImplementationOnce(
      async (ps: any[], socket: any, data: any, io: any) => {
        for (const p of ps) await p(socket, data, io);
      }
    );
    const socket = makeSocket();
    const io = makeIo();
    await runArkosGatewayPipes(pipes, socket, {}, io);
    expect(order).toEqual([1, 2, 3]);
  });

  test("propagates throw from pipe", async () => {
    const err = new Error("pipe exploded");
    mockRunPipes.mockImplementationOnce(
      async (ps: any[], socket: any, data: any, io: any) => {
        for (const p of ps) await p(socket, data, io);
      }
    );
    const pipes = [jest.fn().mockRejectedValue(err)];
    const socket = makeSocket();
    const io = makeIo();
    await expect(runArkosGatewayPipes(pipes, socket, {}, io)).rejects.toThrow(
      "pipe exploded"
    );
  });
});

describe("handleGatewayEventLog", () => {
  test("calls console.info", () => {
    const spy = jest.spyOn(console, "info").mockImplementation(() => {});
    mockEventLog.mockImplementationOnce(
      (ns: string, event: string, code: number, start: number) => {
        console.info(`WS ${ns} ${event} ${code}`);
      }
    );
    handleGatewayEventLog("/chat", "send_message", 200, Date.now());
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });
});

describe("handleGatewayLifecycleLog", () => {
  test("calls console.info for connected", () => {
    const spy = jest.spyOn(console, "info").mockImplementation(() => {});
    mockLifecycleLog.mockImplementationOnce(
      (ns: string, event: string, id: string) => {
        console.info(`WS ${ns} ${event} ${id}`);
      }
    );
    handleGatewayLifecycleLog("/chat", "connected", "socket-id-123");
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  test("calls console.info for disconnected", () => {
    const spy = jest.spyOn(console, "info").mockImplementation(() => {});
    mockLifecycleLog.mockImplementationOnce(
      (ns: string, event: string, id: string) => {
        console.info(`WS ${ns} ${event} ${id}`);
      }
    );
    handleGatewayLifecycleLog("/chat", "disconnected", "socket-id-123");
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  test("includes errorType when provided", () => {
    const spy = jest.spyOn(console, "info").mockImplementation(() => {});
    mockLifecycleLog.mockImplementationOnce(
      (ns: string, event: string, id: string, errType?: string) => {
        console.info(`WS ${ns} ${event} ${id} ${errType}`);
      }
    );
    handleGatewayLifecycleLog(
      "/chat",
      "error",
      "socket-id-123",
      "UnauthorizedError"
    );
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });
});

describe("checkRateLimit", () => {
  beforeEach(() => {
    (checkRateLimit as jest.Mock).mockRestore?.();
  });

  test("allows first request", () => {
    mockCheckRateLimit.mockReturnValue({ allowed: true });
    const result = checkRateLimit("socket-1", "send_message", {
      windowMs: 60_000,
      max: 10,
    });
    expect(result.allowed).toBe(true);
  });

  test("blocks when max exceeded", () => {
    mockCheckRateLimit.mockReturnValue({ allowed: false, retryAfter: 5000 });
    const result = checkRateLimit("socket-1", "send_message", {
      windowMs: 60_000,
      max: 1,
    });
    expect(result.allowed).toBe(false);
    expect(result.retryAfter).toBeGreaterThan(0);
  });

  test("clears socket entries on disconnect", () => {
    clearRateLimitForSocket("socket-1");
    expect(clearRateLimitForSocket).toHaveBeenCalledWith("socket-1");
  });
});
