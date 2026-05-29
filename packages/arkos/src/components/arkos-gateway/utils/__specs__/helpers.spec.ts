import { Server } from "socket.io";

jest.mock("../../../../utils/sheu", () => ({ error: jest.fn() }));
jest.mock("../../../../utils/helpers/arkos-config.helpers", () => ({
  isProduction: jest.fn().mockReturnValue(false),
}));

import {
  handleArkosGatewayErrors,
  runArkosGatewayPipes,
  handleGatewayEventLog,
  handleGatewayLifecycleLog,
} from "../helpers";

function makeSocket(): { socket: any; emitSpy: jest.Mock } {
  const emitSpy = jest.fn();
  return {
    socket: { id: "socket-id-123", emit: emitSpy },
    emitSpy,
  };
}

function makeIo(): any {
  return {} as Server;
}

const loggerMeta = {
  namespace: "/chat",
  event: "send_message",
  startTime: Date.now(),
};

describe("handleArkosGatewayErrors", () => {
  test("calls error handlers when registered", async () => {
    const { socket } = makeSocket();
    const errorHandler = jest.fn().mockResolvedValue(undefined);
    const err = new Error("boom");

    await handleArkosGatewayErrors(err, socket, [errorHandler], loggerMeta);

    expect(errorHandler).toHaveBeenCalledWith(err, socket);
  });

  test("does not emit default error when handler calls socket.emit", async () => {
    const { socket, emitSpy } = makeSocket();
    const errorHandler = jest.fn().mockImplementation(async (err, socket) => {
      socket.emit("custom_error", { message: err.message });
    });

    await handleArkosGatewayErrors(
      new Error("handled"),
      socket,
      [errorHandler],
      loggerMeta
    );

    expect(emitSpy).toHaveBeenCalledWith("custom_error", expect.any(Object));
    expect(emitSpy).toHaveBeenCalledTimes(1);
  });

  test("emits default error when no handlers registered", async () => {
    const { socket, emitSpy } = makeSocket();
    const err = {
      message: "oops",
      isOperational: true,
      statusCode: 400,
      code: "BadRequest",
    };

    await handleArkosGatewayErrors(err, socket, [], loggerMeta);

    expect(emitSpy).toHaveBeenCalledWith(
      "error",
      expect.objectContaining({ message: "oops" })
    );
  });

  test("emits default error when handler does not call socket.emit", async () => {
    const { socket, emitSpy } = makeSocket();
    const errorHandler = jest.fn().mockResolvedValue(undefined);

    await handleArkosGatewayErrors(
      new Error("unhandled"),
      socket,
      [errorHandler],
      loggerMeta
    );

    expect(emitSpy).toHaveBeenCalledWith("error", expect.any(Object));
  });

  test("calls ack with error message when no handler emits", async () => {
    const { socket } = makeSocket();
    const ack = jest.fn();
    const err = {
      message: "fail",
      isOperational: true,
      statusCode: 422,
      meta: { field: "email" },
    };

    await handleArkosGatewayErrors(err, socket, [], loggerMeta, ack);

    expect(ack).toHaveBeenCalledWith(
      expect.objectContaining({ error: "fail" })
    );
  });

  test("does not call ack when handler emits", async () => {
    const { socket } = makeSocket();
    const ack = jest.fn();
    const errorHandler = jest.fn().mockImplementation(async (err, socket) => {
      socket.emit("error", { message: err.message });
    });

    await handleArkosGatewayErrors(
      new Error("handled"),
      socket,
      [errorHandler],
      loggerMeta,
      ack
    );

    expect(ack).not.toHaveBeenCalled();
  });

  test("restores socket.emit after error handlers run", async () => {
    const { socket } = makeSocket();
    const errorHandler = jest.fn().mockResolvedValue(undefined);

    await handleArkosGatewayErrors(
      new Error("test"),
      socket,
      [errorHandler],
      loggerMeta
    );

    expect(() => socket.emit("test", {})).not.toThrow();
  });

  test("restores socket.emit even when error handler throws", async () => {
    const { socket } = makeSocket();
    const errorHandler = jest.fn().mockRejectedValue(new Error("handler boom"));

    await handleArkosGatewayErrors(
      new Error("original"),
      socket,
      [errorHandler],
      loggerMeta
    );

    expect(() => socket.emit("test", {})).not.toThrow();
  });

  test("uses new error from handler throw for default emission", async () => {
    const { socket, emitSpy } = makeSocket();
    const errorHandler = jest.fn().mockRejectedValue(new Error("handler boom"));

    await handleArkosGatewayErrors(
      new Error("original"),
      socket,
      [errorHandler],
      loggerMeta
    );

    expect(emitSpy).toHaveBeenCalledWith(
      "error",
      expect.objectContaining({ message: "handler boom" })
    );
  });

  test("uses InternalServerError for non-operational errors", async () => {
    const { socket, emitSpy } = makeSocket();

    await handleArkosGatewayErrors(
      new Error("raw error"),
      socket,
      [],
      loggerMeta
    );

    expect(emitSpy).toHaveBeenCalledWith(
      "error",
      expect.objectContaining({ code: "InternalServerError", statusCode: 500 })
    );
  });

  test("uses operational error shape directly", async () => {
    const { socket, emitSpy } = makeSocket();
    const err = {
      message: "Not found",
      isOperational: true,
      statusCode: 404,
      code: "NotFound",
    };

    await handleArkosGatewayErrors(err, socket, [], loggerMeta);

    expect(emitSpy).toHaveBeenCalledWith(
      "error",
      expect.objectContaining({ message: "Not found" })
    );
  });

  test("calls multiple error handlers in sequence", async () => {
    const { socket } = makeSocket();
    const order: number[] = [];
    const h1 = jest.fn().mockImplementation(async () => {
      order.push(1);
    });
    const h2 = jest.fn().mockImplementation(async () => {
      order.push(2);
    });

    await handleArkosGatewayErrors(
      new Error("multi"),
      socket,
      [h1, h2],
      loggerMeta
    );

    expect(order).toEqual([1, 2]);
  });
});

describe("runArkosGatewayPipes", () => {
  test("runs all pipes in order", async () => {
    const { socket } = makeSocket();
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

    await runArkosGatewayPipes(pipes, socket, { data: true }, makeIo());

    expect(order).toEqual([1, 2, 3]);
  });

  test("passes socket, data, io to each pipe", async () => {
    const { socket } = makeSocket();
    const pipe = jest.fn().mockResolvedValue(undefined);
    const data = { room: "room:1" };
    const io = makeIo();

    await runArkosGatewayPipes([pipe], socket, data, io);

    expect(pipe).toHaveBeenCalledWith(socket, data, io);
  });

  test("propagates throw from pipe", async () => {
    const { socket } = makeSocket();
    const pipes = [jest.fn().mockRejectedValue(new Error("pipe exploded"))];

    await expect(
      runArkosGatewayPipes(pipes, socket, {}, makeIo())
    ).rejects.toThrow("pipe exploded");
  });

  test("stops execution after throwing pipe", async () => {
    const { socket } = makeSocket();
    const pipe2 = jest.fn();
    const pipes = [jest.fn().mockRejectedValue(new Error("stop")), pipe2];

    await expect(
      runArkosGatewayPipes(pipes, socket, {}, makeIo())
    ).rejects.toThrow();

    expect(pipe2).not.toHaveBeenCalled();
  });

  test("resolves immediately with empty pipes array", async () => {
    const { socket } = makeSocket();

    await expect(
      runArkosGatewayPipes([], socket, {}, makeIo())
    ).resolves.toBeUndefined();
  });

  test("handles sync pipe that returns undefined", async () => {
    const { socket } = makeSocket();
    const pipe = jest.fn().mockReturnValue(undefined);

    await expect(
      runArkosGatewayPipes([pipe], socket, {}, makeIo())
    ).resolves.toBeUndefined();
  });
});

describe("handleGatewayEventLog", () => {
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleSpy = jest.spyOn(console, "info").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  test("logs with 200 status", () => {
    handleGatewayEventLog("/chat", "send_message", 200, Date.now());

    expect(consoleSpy).toHaveBeenCalledTimes(1);
    expect(consoleSpy.mock.calls[0][0]).toContain("WS");
    expect(consoleSpy.mock.calls[0][0]).toContain("/chat");
    expect(consoleSpy.mock.calls[0][0]).toContain("send_message");
    expect(consoleSpy.mock.calls[0][0]).toContain("200");
  });

  test("logs with 400 status", () => {
    handleGatewayEventLog("/chat", "send_message", 400, Date.now());

    expect(consoleSpy.mock.calls[0][0]).toContain("400");
  });

  test("logs with 500 status", () => {
    handleGatewayEventLog("/chat", "send_message", 500, Date.now());

    expect(consoleSpy.mock.calls[0][0]).toContain("500");
  });

  test("includes duration in output", () => {
    handleGatewayEventLog("/chat", "send_message", 200, Date.now() - 100);

    expect(consoleSpy.mock.calls[0][0]).toMatch(/\d+ms/);
  });
});

describe("handleGatewayLifecycleLog", () => {
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleSpy = jest.spyOn(console, "info").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  test("logs connected with socket id", () => {
    handleGatewayLifecycleLog("/chat", "connected", "abc123");

    expect(consoleSpy).toHaveBeenCalledTimes(1);
    expect(consoleSpy.mock.calls[0][0]).toContain("connected");
    expect(consoleSpy.mock.calls[0][0]).toContain("abc123");
  });

  test("logs disconnected with socket id", () => {
    handleGatewayLifecycleLog("/chat", "disconnected", "abc123");

    expect(consoleSpy.mock.calls[0][0]).toContain("disconnected");
    expect(consoleSpy.mock.calls[0][0]).toContain("abc123");
  });

  test("logs error with errorType when provided", () => {
    handleGatewayLifecycleLog("/chat", "error", "abc123", "UnauthorizedError");

    expect(consoleSpy.mock.calls[0][0]).toContain("error");
    expect(consoleSpy.mock.calls[0][0]).toContain("UnauthorizedError");
  });

  test("logs error without errorType when not provided", () => {
    handleGatewayLifecycleLog("/chat", "error", "abc123");

    expect(consoleSpy).toHaveBeenCalledTimes(1);
    expect(consoleSpy.mock.calls[0][0]).not.toContain("undefined");
  });

  test("includes namespace in output", () => {
    handleGatewayLifecycleLog("/chat", "connected", "abc123");

    expect(consoleSpy.mock.calls[0][0]).toContain("/chat");
  });
});
