import { IArkosGateway } from "../arkos-gateway";
import { defaultGatewayStore } from "../utils/memory-gateway-store";

// Mock external dependencies
jest.mock("../../../exports/services", () => ({
  authService: {
    getAuthenticatedUser: jest.fn(),
  },
  authActionService: {
    add: jest.fn(),
  },
}));

// jest.mock("../../../modules/auth/utils/auth-hooks-manager", () => ({
//   runAuthenticate: jest.fn(),
//   runAuthorize: jest.fn(),
// }));

jest.mock("../../../modules/auth/utils/auth-error-objects", () => ({
  loginRequiredError: new Error("Login required"),
}));

jest.mock("../../../server", () => ({
  getArkosConfig: jest
    .fn()
    .mockReturnValue({ validation: { resolver: "zod" } }),
}));

jest.mock("../../../types/validation/validation-manager", () => ({
  validationFn: jest.fn(),
  isValidValidator: jest.fn().mockReturnValue(true),
  shouldValidate: jest.fn().mockReturnValue(true),
  validatorName: "ZodSchema",
  validatorNameType: "z.ZodSchema",
  validationConfig: { resolver: "zod" },
}));

jest.mock("../../../modules/base/utils/error-prettifier", () => ({
  prettify: jest.fn().mockReturnValue([{ message: "Validation error" }]),
}));

jest.mock("../../../exports/error-handler", () => ({
  BadRequestError: class extends Error {
    isOperational = true;
    statusCode = 400;
    code = "BadRequestError";
    constructor(message: string, code?: string, meta?: any) {
      super(message);
      this.code = code || "BadRequestError";
      (this as any).meta = meta;
    }
  },
  TooManyRequestsError: class extends Error {
    isOperational = true;
    statusCode = 429;
    code = "TooManyRequestsError";
    retryAfter: number;
    constructor(message?: string, _?: string, meta?: any) {
      super(message || "Too many requests");
      this.retryAfter = meta?.retryAfter;
    }
  },
}));

jest.mock("../utils/rate-limiter", () => ({
  checkRateLimit: jest.fn().mockResolvedValue({ allowed: true }),
  clearRateLimitForSocket: jest.fn(),
}));

jest.mock("../utils/helpers", () => ({
  handleArkosGatewayErrors: jest.fn(),
  runArkosGatewayPipes: jest.fn(),
  handleGatewayEventLog: jest.fn(),
  handleGatewayLifecycleLog: jest.fn(),
}));

jest.mock("../utils/emit-builders", () => ({
  GatewayEmitBuilder: jest.fn().mockImplementation((target) => ({ target })),
  GatewayRoomBuilder: jest
    .fn()
    .mockImplementation((roomId, ns) => ({ roomId, ns })),
  GatewayUserBuilder: jest
    .fn()
    .mockImplementation((userId, ns) => ({ userId, ns })),
  GatewayUserEmitBuilder: jest
    .fn()
    .mockImplementation((userId, ns, config, store) => ({
      userId,
      ns,
      config,
      store,
    })),
  GatewaySocketEmitBuilder: jest
    .fn()
    .mockImplementation((socket, config, store) => ({
      socket,
      config,
      store,
    })),
}));

jest.mock("../../../utils/helpers/deepmerge.helper", () => ({
  __esModule: true,
  default: jest.fn((target, source, options) => ({ ...target, ...source })),
}));

jest.mock("../utils/memory-gateway-store", () => ({
  defaultGatewayStore: {
    has: jest.fn(),
    set: jest.fn(),
    increment: jest.fn(),
    clear: jest.fn(),
    setIfNotExists: jest.fn(),
  },
}));

import { authService, authActionService } from "../../../exports/services";
import authHookManager from "../../../modules/auth/utils/auth-hooks-manager";
import { checkRateLimit, clearRateLimitForSocket } from "../utils/rate-limiter";
import {
  handleArkosGatewayErrors,
  runArkosGatewayPipes,
  handleGatewayEventLog,
  handleGatewayLifecycleLog,
} from "../utils/helpers";
import validationManager from "../../../types/validation/validation-manager";
// import errorPrettifier from "../../modules/base/utils/error-prettifier";
// import { getArkosConfig } from "../../server";

// Helper to create mock Socket.io namespace
function createMockNamespace() {
  const sockets = new Map();
  const mockNs: any = {
    use: jest.fn(),
    on: jest.fn(),
    of: jest.fn(),
    in: jest.fn().mockReturnThis(),
    to: jest.fn().mockReturnThis(),
    sockets,
    emit: jest.fn(),
    fetchSockets: jest.fn().mockResolvedValue([]),
  };
  return mockNs;
}

// Helper to create mock Socket.io Server
function createMockIo() {
  const mockNs = createMockNamespace();
  const mockIo: any = {
    of: jest.fn().mockReturnValue(mockNs),
  };
  return { mockIo, mockNs };
}

// Helper to create a mock ArkosSocket
function createMockSocket(overrides: any = {}) {
  return {
    id: "socket-1",
    user: { id: "user-1", email: "test@test.com", role: "User" },
    data: {},
    meta: {},
    locals: {},
    join: jest.fn(),
    on: jest.fn(),
    emit: jest.fn(),
    rooms: new Set(["arkos::user:user-1"]),
    ...overrides,
  };
}

describe("IArkosGateway", () => {
  let runAuthorize = jest.spyOn(authHookManager, "runAuthorize");
  let runAuthenticate = jest.spyOn(authHookManager, "runAuthenticate");
  beforeEach(() => {
    (validationManager.isValidValidator as jest.Mock).mockReturnValue(true);

    jest.clearAllMocks();
  });

  // ============================================================
  // CONSTRUCTOR TESTS
  // ============================================================
  describe("constructor", () => {
    it("should set default name to 'web-socket' when not provided", () => {
      const gateway = new IArkosGateway({} as any);
      expect((gateway as any).config.name).toBe("web-socket");
    });

    it("should use the provided name", () => {
      const gateway = new IArkosGateway({ name: "/chat" });
      expect((gateway as any).config.name).toBe("/chat");
    });

    it("should initialize empty arrays for events, pipes, gateways, and hooks", () => {
      const gateway = new IArkosGateway({ name: "/chat" });
      expect((gateway as any).events).toEqual([]);
      expect((gateway as any).pipes).toEqual([]);
      expect((gateway as any).gateways).toEqual([]);
      expect((gateway as any).hooks).toEqual([]);
    });

    it("should not have io or registryOptions initially", () => {
      const gateway = new IArkosGateway({ name: "/chat" });
      expect((gateway as any).io).toBeUndefined();
      expect((gateway as any).registryOptions).toBeUndefined();
    });
  });

  // ============================================================
  // USE METHOD TESTS
  // ============================================================
  describe("use()", () => {
    it("should add middleware function to pipes array", () => {
      const gateway = new IArkosGateway({ name: "/chat" });
      const middleware = jest.fn();

      gateway.use(middleware);

      expect((gateway as any).pipes).toContain(middleware);
    });

    it("should add IArkosGateway instance to gateways array", () => {
      const parentGateway = new IArkosGateway({ name: "/chat" });
      const childGateway = new IArkosGateway({ name: "/admin" });

      parentGateway.use(childGateway);

      expect((parentGateway as any).gateways).toContain(childGateway);
    });

    it("should accept multiple mixed arguments", () => {
      const parentGateway = new IArkosGateway({ name: "/chat" });
      const childGateway = new IArkosGateway({ name: "/admin" });
      const middleware1 = jest.fn();
      const middleware2 = jest.fn();

      parentGateway.use(childGateway, middleware1, middleware2);

      expect((parentGateway as any).gateways).toContain(childGateway);
      expect((parentGateway as any).pipes).toContain(middleware1);
      expect((parentGateway as any).pipes).toContain(middleware2);
    });

    it("should throw for invalid argument type", () => {
      const gateway = new IArkosGateway({ name: "/chat" });

      expect(() => gateway.use("invalid" as any)).toThrow(
        /expected an ArkosGateway instance or a middleware function/
      );
      expect(() => gateway.use(42 as any)).toThrow(
        /expected an ArkosGateway instance or a middleware function/
      );
      expect(() => gateway.use({} as any)).toThrow(
        /expected an ArkosGateway instance or a middleware function/
      );
    });

    it("should return this for chaining", () => {
      const gateway = new IArkosGateway({ name: "/chat" });
      const middleware = jest.fn();

      const result = gateway.use(middleware);

      expect(result).toBe(gateway);
    });
  });

  // ============================================================
  // PIPE METHOD TESTS
  // ============================================================
  describe("pipe()", () => {
    it("should add function to global pipes when called with function only", () => {
      const gateway = new IArkosGateway({ name: "/chat" });
      const pipeFn = jest.fn();

      gateway.pipe(pipeFn);

      expect((gateway as any).pipes).toContain(pipeFn);
    });

    it("should add scoped pipe to existing event", () => {
      const gateway = new IArkosGateway({ name: "/chat" });
      const handler = jest.fn();
      const pipeFn = jest.fn();

      // Register event first
      gateway.on({ event: "send_message" }, handler);
      // Add scoped pipe
      gateway.pipe({ event: "send_message" }, pipeFn);

      const events = (gateway as any).events;
      const eventEntry = events.find(
        (e: any) => e.config.event === "send_message"
      );

      expect(eventEntry.pipes).toContain(pipeFn);
    });

    it("should create deferred _pipeOnly entry when event not yet registered", () => {
      const gateway = new IArkosGateway({ name: "/chat" });
      const pipeFn = jest.fn();

      gateway.pipe({ event: "future_event" }, pipeFn);

      const events = (gateway as any).events;
      const deferredEntry = events.find(
        (e: any) => e.config._pipeOnly && e.config.event === "future_event"
      );

      expect(deferredEntry).toBeDefined();
      expect(deferredEntry.pipes).toContain(pipeFn);
      expect(deferredEntry.handler).toBeNull();
    });

    it("should merge deferred pipes when on() is called later", () => {
      const gateway = new IArkosGateway({ name: "/chat" });
      const pipeFn = jest.fn();
      const handler = jest.fn();

      // Register pipe first
      gateway.pipe({ event: "send_message" }, pipeFn);
      // Then register event
      gateway.on({ event: "send_message" }, handler);

      const events = (gateway as any).events;
      const eventEntry = events.find(
        (e: any) => e.config.event === "send_message"
      );

      expect(eventEntry.pipes).toContain(pipeFn);
      // Should also snapshot global pipes
      expect(eventEntry.handler).toBe(handler);
      // Only one entry for this event
      expect(
        events.filter((e: any) => e.config.event === "send_message").length
      ).toBe(1);
    });

    it("should throw for invalid arguments", () => {
      const gateway = new IArkosGateway({ name: "/chat" });

      expect(() => (gateway as any).pipe({ event: "test" })).toThrow(
        /Invalid arguments for gateway.pipe/
      );
      expect(() => (gateway as any).pipe(null as any)).toThrow(
        /Invalid arguments for gateway.pipe/
      );
    });

    it("should return this for chaining", () => {
      const gateway = new IArkosGateway({ name: "/chat" });
      const pipeFn = jest.fn();

      const result = gateway.pipe(pipeFn);

      expect(result).toBe(gateway);
    });
  });

  // ============================================================
  // ON METHOD TESTS
  // ============================================================
  describe("on()", () => {
    it("should skip registration when eventConfig.disabled is true", () => {
      const gateway = new IArkosGateway({ name: "/chat" });
      const handler = jest.fn();

      gateway.on({ event: "test", disabled: true }, handler);

      expect((gateway as any).events).toHaveLength(0);
    });

    it("should throw when authorization is set but gateway authentication is false", () => {
      const gateway = new IArkosGateway({
        name: "/chat",
        authentication: false,
      });

      expect(() =>
        gateway.on(
          { event: "test", authorization: { roles: ["Admin"] } },
          jest.fn()
        )
      ).toThrow(/Event "test" on "\/chat" gateway defines authorization rules/);
    });

    it("should create entry with event config, handler, and snapshot of global pipes", () => {
      const gateway = new IArkosGateway({ name: "/chat" });
      const handler = jest.fn();
      const globalPipe = jest.fn();

      // Add a global pipe first
      gateway.pipe(globalPipe);
      // Register event
      gateway.on({ event: "test" }, handler);

      const events = (gateway as any).events;
      const entry = events[0];

      expect(entry.config.event).toBe("test");
      expect(entry.handler).toBe(handler);
      expect(entry.pipes).toContain(globalPipe);
    });

    it("should call authActionService.add with event name and namespace", () => {
      const gateway = new IArkosGateway({ name: "/chat" });

      gateway.on(
        { event: "test", authorization: { roles: ["Admin"] } },
        jest.fn()
      );

      expect(authActionService.add).toHaveBeenCalledWith("test", "/chat", {
        test: { roles: ["Admin"] },
      });
    });

    it("should call authActionService.add even without authorization", () => {
      const gateway = new IArkosGateway({ name: "/chat" });

      gateway.on({ event: "test" }, jest.fn());

      expect(authActionService.add).toHaveBeenCalledWith("test", "/chat", {
        test: undefined,
      });
    });

    it("should return this for chaining", () => {
      const gateway = new IArkosGateway({ name: "/chat" });

      const result = gateway.on({ event: "test" }, jest.fn());

      expect(result).toBe(gateway);
    });
  });

  // ============================================================
  // HOOK METHOD TESTS
  // ============================================================
  describe("hook()", () => {
    it("should register connection hook", () => {
      const gateway = new IArkosGateway({ name: "/chat" });
      const connectionHandler = jest.fn();

      gateway.hook("connection", connectionHandler);

      const hooks = (gateway as any).hooks;
      expect(hooks).toHaveLength(1);
      expect(hooks[0].type).toBe("connection");
      expect(hooks[0].handler).toBe(connectionHandler);
    });

    it("should register disconnect hook", () => {
      const gateway = new IArkosGateway({ name: "/chat" });
      const disconnectHandler = jest.fn();

      gateway.hook("disconnect", disconnectHandler);

      const hooks = (gateway as any).hooks;
      expect(hooks).toHaveLength(1);
      expect(hooks[0].type).toBe("disconnect");
      expect(hooks[0].handler).toBe(disconnectHandler);
    });

    it("should register error hook", () => {
      const gateway = new IArkosGateway({ name: "/chat" });
      const errorHandler = jest.fn();

      gateway.hook("error", errorHandler);

      const hooks = (gateway as any).hooks;
      expect(hooks).toHaveLength(1);
      expect(hooks[0].type).toBe("error");
      expect(hooks[0].handler).toBe(errorHandler);
    });

    it("should register multiple hooks of different types", () => {
      const gateway = new IArkosGateway({ name: "/chat" });
      const connectionHandler = jest.fn();
      const disconnectHandler = jest.fn();
      const errorHandler = jest.fn();

      gateway.hook("connection", connectionHandler);
      gateway.hook("disconnect", disconnectHandler);
      gateway.hook("error", errorHandler);

      const hooks = (gateway as any).hooks;
      expect(hooks).toHaveLength(3);
      expect(hooks.filter((h: any) => h.type === "connection")).toHaveLength(1);
      expect(hooks.filter((h: any) => h.type === "disconnect")).toHaveLength(1);
      expect(hooks.filter((h: any) => h.type === "error")).toHaveLength(1);
    });

    it("should return this for chaining", () => {
      const gateway = new IArkosGateway({ name: "/chat" });

      const result = gateway.hook("connection", jest.fn());

      expect(result).toBe(gateway);
    });
  });

  // ============================================================
  // REGISTER METHOD TESTS
  // ============================================================
  describe("register()", () => {
    it("should throw when called twice on same io instance", () => {
      const { mockIo } = createMockIo();
      const gateway = new IArkosGateway({ name: "/chat" });

      gateway.register(mockIo);

      expect(() => gateway.register(mockIo)).toThrow(
        /gateway.register\(\) can only be called once per io server instance/
      );
    });

    it("should mark io as registered", () => {
      const { mockIo } = createMockIo();
      const gateway = new IArkosGateway({ name: "/chat" });

      gateway.register(mockIo);

      expect((mockIo as any)._arkosGatewayRegistered).toBe(true);
    });

    it("should use defaultGatewayStore when no store provided in options", () => {
      const { mockIo } = createMockIo();
      const gateway = new IArkosGateway({ name: "/chat" });

      gateway.register(mockIo);

      expect((gateway as any).registryOptions.store).toBe(defaultGatewayStore);
    });

    it("should use provided store from options", () => {
      const { mockIo } = createMockIo();
      const gateway = new IArkosGateway({ name: "/chat" });
      const customStore = {
        has: jest.fn(),
        set: jest.fn(),
        increment: jest.fn(),
        clear: jest.fn(),
        setIfNotExists: jest.fn(),
      };

      gateway.register(mockIo, { store: customStore });

      expect((gateway as any).registryOptions.store).toBe(customStore);
    });

    it("should call _register with merged hooks and pipes", () => {
      const { mockIo } = createMockIo();
      const gateway = new IArkosGateway({ name: "/chat" });
      const spy = jest.spyOn(gateway as any, "_register");

      gateway.register(mockIo);

      expect(spy).toHaveBeenCalledWith(
        mockIo,
        undefined,
        [],
        [],
        expect.any(Object)
      );
    });
  });

  // ============================================================
  // _REGISTER METHOD TESTS
  // ============================================================
  describe("_register()", () => {
    it("should create namespace with own name when no parent", () => {
      const { mockIo, mockNs } = createMockIo();
      const gateway = new IArkosGateway({ name: "/chat" });

      (gateway as any)._register(mockIo, undefined, [], [], {});

      expect(mockIo.of).toHaveBeenCalledWith("/chat");
    });

    it("should create namespace with parent name prefix", () => {
      const { mockIo, mockNs } = createMockIo();
      const childGateway = new IArkosGateway({ name: "/admin" });

      (childGateway as any)._register(mockIo, { name: "/chat" }, [], [], {});

      expect(mockIo.of).toHaveBeenCalledWith("/chat/admin");
    });

    it("should merge parent config with own config", () => {
      const { mockIo, mockNs } = createMockIo();
      const gateway = new IArkosGateway({
        name: "/chat",
        authentication: true,
      });
      const deepmergeSpy =
        require("../../../utils/helpers/deepmerge.helper").default;

      (gateway as any)._register(
        mockIo,
        { name: "/parent", rateLimit: { max: 10 } },
        [],
        [],
        {}
      );

      expect(deepmergeSpy).toHaveBeenCalled();
    });

    // ---- Auth Middleware Tests ----
    describe("authentication middleware", () => {
      it("should apply auth middleware when resolvedAuth is true", () => {
        const { mockIo, mockNs } = createMockIo();
        const gateway = new IArkosGateway({
          name: "/chat",
          authentication: true,
        });

        (gateway as any)._register(mockIo, undefined, [], [], {});

        expect(mockNs.use).toHaveBeenCalled();
        const middlewareFn = mockNs.use.mock.calls[0][0];
        expect(typeof middlewareFn).toBe("function");
      });

      it("should skip auth middleware when resolvedAuth is false", () => {
        const { mockIo, mockNs } = createMockIo();
        const gateway = new IArkosGateway({
          name: "/chat",
          authentication: false,
        });

        (gateway as any)._register(mockIo, undefined, [], [], {});

        expect(mockNs.use).not.toHaveBeenCalled();
      });

      it("should skip auth middleware when parent authentication is false", () => {
        const { mockIo, mockNs } = createMockIo();
        const gateway = new IArkosGateway({ name: "/chat" });

        (gateway as any)._register(
          mockIo,
          { name: "/parent", authentication: false },
          [],
          [],
          {}
        );

        expect(mockNs.use).not.toHaveBeenCalled();
      });

      it("auth middleware should call next() when authentication succeeds", async () => {
        const { mockIo, mockNs } = createMockIo();
        const gateway = new IArkosGateway({
          name: "/chat",
          authentication: true,
        });
        const mockSocket = createMockSocket();
        const next = jest.fn();

        (authService.getAuthenticatedUser as jest.Mock).mockResolvedValue({
          id: "user-1",
        });
        //         (authHookManager.runAuthenticate as jest.Mock).mockImplementation(
        //           ({ context, done }, authenticateFn) => {
        // authenticateFn(context)
        //           }
        //         );

        (gateway as any)._register(mockIo, undefined, [], [], {});
        const middlewareFn = mockNs.use.mock.calls[0][0];
        await middlewareFn(mockSocket, next);

        expect(next).toHaveBeenCalledWith();
      });

      it("auth middleware should call next() with error when user not found", async () => {
        const { mockIo, mockNs } = createMockIo();
        const gateway = new IArkosGateway({
          name: "/chat",
          authentication: true,
        });
        const mockSocket = createMockSocket({ user: undefined });
        const next = jest.fn();

        (authService.getAuthenticatedUser as jest.Mock).mockResolvedValue(null);
        // (authHookManager.runAuthenticate as jest.Mock).mockImplementation(
        //   ({ context, done }, authenticateFn) => authenticateFn(context)
        // );

        (gateway as any)._register(mockIo, undefined, [], [], {});
        const middlewareFn = mockNs.use.mock.calls[0][0];
        await middlewareFn(mockSocket, next);

        expect(next).toHaveBeenCalledWith(expect.any(Error));
      });

      it("auth middleware should call next() with error when runAuthenticate fails", async () => {
        const { mockIo, mockNs } = createMockIo();
        const gateway = new IArkosGateway({
          name: "/chat",
          authentication: true,
        });
        const mockSocket = createMockSocket();
        const next = jest.fn();
        const authError = new Error("Auth failed");

        (runAuthenticate as jest.Mock).mockRejectedValue(authError);

        (gateway as any)._register(mockIo, undefined, [], [], {});
        const middlewareFn = mockNs.use.mock.calls[0][0];
        await middlewareFn(mockSocket, next);

        expect(next).toHaveBeenCalledWith(authError);
      });
    });

    // ---- Connection Handler Tests ----
    describe("connection handler", () => {
      it("should join user room when socket has user.id", () => {
        const { mockIo, mockNs } = createMockIo();
        const gateway = new IArkosGateway({ name: "/chat" });
        const mockSocket = createMockSocket();

        (gateway as any)._register(mockIo, undefined, [], [], {});

        // Get the connection callback
        const connectionCb = mockNs.on.mock.calls.find(
          ([event]: [string, any]) => event === "connection"
        )[1];

        connectionCb(mockSocket);

        expect(mockSocket.join).toHaveBeenCalledWith("arkos::user:user-1");
      });

      it("should not join user room when socket has no user.id", () => {
        const { mockIo, mockNs } = createMockIo();
        const gateway = new IArkosGateway({ name: "/chat" });
        const mockSocket = createMockSocket({ user: undefined });

        (gateway as any)._register(mockIo, undefined, [], [], {});

        const connectionCb = mockNs.on.mock.calls.find(
          ([event]: [string, any]) => event === "connection"
        )[1];

        connectionCb(mockSocket);

        expect(mockSocket.join).not.toHaveBeenCalled();
      });

      it("should log lifecycle event on connection", () => {
        const { mockIo, mockNs } = createMockIo();
        const gateway = new IArkosGateway({ name: "/chat" });
        const mockSocket = createMockSocket();

        (gateway as any)._register(mockIo, undefined, [], [], {});

        const connectionCb = mockNs.on.mock.calls.find(
          ([event]: [string, any]) => event === "connection"
        )[1];

        connectionCb(mockSocket);

        expect(handleGatewayLifecycleLog).toHaveBeenCalledWith(
          "/chat",
          "connected",
          "socket-1"
        );
      });

      it("should run all connection hook handlers", async () => {
        const { mockIo, mockNs } = createMockIo();
        const gateway = new IArkosGateway({ name: "/chat" });
        const mockSocket = createMockSocket();
        const connHandler1 = jest.fn().mockResolvedValue(undefined);
        const connHandler2 = jest.fn().mockResolvedValue(undefined);

        (gateway as any)._register(
          mockIo,
          undefined,
          [
            { type: "connection", handler: connHandler1 },
            { type: "connection", handler: connHandler2 },
          ],
          [],
          {}
        );

        const connectionCb = mockNs.on.mock.calls.find(
          ([event]: [string, any]) => event === "connection"
        )[1];

        await connectionCb(mockSocket);

        expect(connHandler1).toHaveBeenCalledWith(mockSocket, mockIo);
        expect(connHandler2).toHaveBeenCalledWith(mockSocket, mockIo);
      });

      it("should handle error in connection handler", async () => {
        const { mockIo, mockNs } = createMockIo();
        const gateway = new IArkosGateway({ name: "/chat" });
        const mockSocket = createMockSocket();
        const error = new Error("Connection failed");
        const connHandler = jest.fn().mockRejectedValue(error);

        (gateway as any)._register(
          mockIo,
          undefined,
          [{ type: "connection", handler: connHandler }],
          [],
          {}
        );

        const connectionCb = mockNs.on.mock.calls.find(
          ([event]: [string, any]) => event === "connection"
        )[1];

        await connectionCb(mockSocket);

        expect(handleArkosGatewayErrors).toHaveBeenCalledWith(
          error,
          mockSocket,
          mockIo,
          [],
          expect.objectContaining({
            namespace: "/chat",
            event: "connection",
          })
        );
      });

      it("should return early after connection error", async () => {
        const { mockIo, mockNs } = createMockIo();
        const gateway = new IArkosGateway({ name: "/chat" });
        const mockSocket = createMockSocket();
        const error = new Error("Connection failed");
        const connHandler = jest.fn().mockRejectedValue(error);

        (gateway as any)._register(
          mockIo,
          undefined,
          [{ type: "connection", handler: connHandler }],
          [],
          {}
        );

        const connectionCb = mockNs.on.mock.calls.find(
          ([event]: [string, any]) => event === "connection"
        )[1];

        await connectionCb(mockSocket);

        // Event handlers should not be registered for this socket
        expect(mockSocket.on).not.toHaveBeenCalled();
      });
    });

    // ---- Disconnect Handler Tests ----
    describe("disconnect handler", () => {
      it("should clear rate limit for socket on disconnect", async () => {
        const { mockIo, mockNs } = createMockIo();
        const gateway = new IArkosGateway({ name: "/chat" });
        const mockSocket = createMockSocket();

        (gateway as any)._register(mockIo, undefined, [], [], {});

        const connectionCb = mockNs.on.mock.calls.find(
          ([event]: [string, any]) => event === "connection"
        )[1];

        connectionCb(mockSocket);

        // Get the disconnect callback registered on socket
        const disconnectCb = mockSocket.on.mock.calls.find(
          ([event]: [string, any]) => event === "disconnect"
        )[1];

        await disconnectCb();

        expect(clearRateLimitForSocket).toHaveBeenCalledWith(
          "socket-1",
          expect.any(Object)
        );
      });

      it("should run all disconnect hook handlers", async () => {
        const { mockIo, mockNs } = createMockIo();
        const gateway = new IArkosGateway({ name: "/chat" });
        const mockSocket = createMockSocket();
        const disHandler1 = jest.fn().mockResolvedValue(undefined);
        const disHandler2 = jest.fn().mockResolvedValue(undefined);

        (gateway as any)._register(
          mockIo,
          undefined,
          [
            { type: "disconnect", handler: disHandler1 },
            { type: "disconnect", handler: disHandler2 },
          ],
          [],
          {}
        );

        const connectionCb = mockNs.on.mock.calls.find(
          ([event]: [string, any]) => event === "connection"
        )[1];

        connectionCb(mockSocket);

        const disconnectCb = mockSocket.on.mock.calls.find(
          ([event]: [string, any]) => event === "disconnect"
        )[1];

        await disconnectCb();

        expect(disHandler1).toHaveBeenCalledWith(mockSocket, mockIo);
        expect(disHandler2).toHaveBeenCalledWith(mockSocket, mockIo);
      });

      it("should log lifecycle event on disconnect", async () => {
        const { mockIo, mockNs } = createMockIo();
        const gateway = new IArkosGateway({ name: "/chat" });
        const mockSocket = createMockSocket();

        (gateway as any)._register(mockIo, undefined, [], [], {});

        const connectionCb = mockNs.on.mock.calls.find(
          ([event]: [string, any]) => event === "connection"
        )[1];

        connectionCb(mockSocket);

        const disconnectCb = mockSocket.on.mock.calls.find(
          ([event]: [string, any]) => event === "disconnect"
        )[1];

        await disconnectCb();

        expect(handleGatewayLifecycleLog).toHaveBeenCalledWith(
          "/chat",
          "disconnected",
          "socket-1"
        );
      });

      it("should handle error in disconnect handler", async () => {
        const { mockIo, mockNs } = createMockIo();
        const gateway = new IArkosGateway({ name: "/chat" });
        const mockSocket = createMockSocket();
        const error = new Error("Disconnect failed");
        const disHandler = jest.fn().mockRejectedValue(error);

        (gateway as any)._register(
          mockIo,
          undefined,
          [{ type: "disconnect", handler: disHandler }],
          [],
          {}
        );

        const connectionCb = mockNs.on.mock.calls.find(
          ([event]: [string, any]) => event === "connection"
        )[1];

        connectionCb(mockSocket);

        const disconnectCb = mockSocket.on.mock.calls.find(
          ([event]: [string, any]) => event === "disconnect"
        )[1];

        await disconnectCb();

        expect(handleArkosGatewayErrors).toHaveBeenCalledWith(
          error,
          mockSocket,
          mockIo,
          [],
          expect.objectContaining({
            namespace: "/chat",
            event: "disconnection",
          })
        );
      });
    });

    // ---- Event Handler Registration ----
    describe("event handler registration", () => {
      it("should register socket.on for each event", () => {
        const { mockIo, mockNs } = createMockIo();
        const gateway = new IArkosGateway({ name: "/chat" });
        const handler1 = jest.fn();
        const handler2 = jest.fn();

        gateway.on({ event: "event1" }, handler1);
        gateway.on({ event: "event2" }, handler2);

        (gateway as any)._register(mockIo, undefined, [], [], {});

        const connectionCb = mockNs.on.mock.calls.find(
          ([event]: [string, any]) => event === "connection"
        )[1];
        const socket = createMockSocket();

        connectionCb(socket);

        expect(mockSocketOnForEvent(socket, "event1")).toBeDefined();
        expect(mockSocketOnForEvent(socket, "event2")).toBeDefined();
      });

      it("should skip _pipeOnly entries", () => {
        const { mockIo, mockNs } = createMockIo();
        const gateway = new IArkosGateway({ name: "/chat" });
        const mockSocket = createMockSocket();

        // Register a pipe-only entry
        gateway.pipe({ event: "future_event" }, jest.fn());

        (gateway as any)._register(mockIo, undefined, [], [], {});

        const connectionCb = mockNs.on.mock.calls.find(
          ([event]: [string, any]) => event === "connection"
        )[1];

        connectionCb(mockSocket);

        // Should not register handler for _pipeOnly events
        const onCalls = mockSocket.on.mock.calls.filter(
          ([event]: [string, any]) => event === "future_event"
        );
        expect(onCalls).toHaveLength(0);
      });
    });

    // ---- Deduplication Tests ----
    describe("deduplication", () => {
      it("should skip processing when dedup key exists in store", async () => {
        const { mockIo, mockNs } = createMockIo();
        const gateway = new IArkosGateway({ name: "/chat" });
        const mockSocket = createMockSocket();
        const handler = jest.fn();

        (defaultGatewayStore.setIfNotExists as jest.Mock).mockResolvedValueOnce(
          false
        );

        gateway.on({ event: "test" }, handler);

        (gateway as any)._register(mockIo, undefined, [], [], {});

        const connectionCb = mockNs.on.mock.calls.find(
          ([event]: [string, any]) => event === "connection"
        )[1];

        connectionCb(mockSocket);

        const eventHandler = getEventHandlerForSocket(mockSocket, "test");
        await eventHandler({ _meta: { mid: "msg-1" } });

        expect(handler).not.toHaveBeenCalled();
      });

      it("should call store.set after processing", async () => {
        const { mockIo, mockNs } = createMockIo();
        const gateway = new IArkosGateway({ name: "/chat" });
        const mockSocket = createMockSocket();
        const handler = jest.fn();

        (defaultGatewayStore.has as jest.Mock).mockResolvedValue(false);

        gateway.on({ event: "test" }, handler);

        (gateway as any)._register(mockIo, undefined, [], [], {});

        const connectionCb = mockNs.on.mock.calls.find(
          ([event]: [string, any]) => event === "connection"
        )[1];

        connectionCb(mockSocket);

        const eventHandler = getEventHandlerForSocket(mockSocket, "test");
        await eventHandler({ _meta: { mid: "msg-1" } });

        expect(defaultGatewayStore.setIfNotExists).toHaveBeenCalledWith(
          "arkos::dedup:test:msg-1",
          expect.any(Number)
        );
      });

      it("should throw BadRequestError when _meta.mid is missing", async () => {
        const { mockIo, mockNs } = createMockIo();
        const gateway = new IArkosGateway({ name: "/chat" });
        const mockSocket = createMockSocket();
        const handler = jest.fn();

        gateway.on({ event: "test" }, handler);

        (gateway as any)._register(mockIo, undefined, [], [], {});

        const connectionCb = mockNs.on.mock.calls.find(
          ([event]: [string, any]) => event === "connection"
        )[1];

        connectionCb(mockSocket);

        const eventHandler = getEventHandlerForSocket(mockSocket, "test");
        await eventHandler({ _meta: {} });

        expect(handleArkosGatewayErrors).toHaveBeenCalledWith(
          expect.objectContaining({ message: expect.stringContaining("mid") }),
          mockSocket,
          mockIo,
          [],
          expect.any(Object),
          undefined
        );
      });

      it("should remove _meta from data and set socket.meta", async () => {
        const { mockIo, mockNs } = createMockIo();
        const gateway = new IArkosGateway({ name: "/chat" });
        const mockSocket = createMockSocket();
        const handler = jest.fn();

        (defaultGatewayStore.has as jest.Mock).mockResolvedValue(false);

        gateway.on({ event: "test" }, handler);

        (gateway as any)._register(mockIo, undefined, [], [], {});

        const connectionCb = mockNs.on.mock.calls.find(
          ([event]: [string, any]) => event === "connection"
        )[1];

        connectionCb(mockSocket);

        const eventHandler = getEventHandlerForSocket(mockSocket, "test");
        await eventHandler({
          _meta: { mid: "msg-1", timestamp: "2024-01-01T00:00:00.000Z" },
          payload: "data",
        });

        expect(mockSocket.meta).toEqual({
          mid: "msg-1",
          timestamp: "2024-01-01T00:00:00.000Z",
        });
        // Data passed to handler should not contain _meta
        expect(handler).toHaveBeenCalledWith(
          mockSocket,
          expect.not.objectContaining({ _meta: expect.anything() }),
          mockIo,
          undefined
        );
      });

      it("should throw BadRequestError when _meta.mid is not a non-empty string", async () => {
        const { mockIo, mockNs } = createMockIo();
        const gateway = new IArkosGateway({ name: "/chat" });
        const mockSocket = createMockSocket();

        gateway.on({ event: "test" }, jest.fn());

        (gateway as any)._register(mockIo, undefined, [], [], {});

        const connectionCb = mockNs.on.mock.calls.find(
          ([event]: [string, any]) => event === "connection"
        )[1];

        connectionCb(mockSocket);

        // Test with empty string
        const eventHandler = getEventHandlerForSocket(mockSocket, "test");
        await eventHandler({ _meta: { mid: "" } });

        expect(handleArkosGatewayErrors).toHaveBeenCalledWith(
          expect.objectContaining({
            message: expect.stringContaining("Missing data._meta.mid"),
          }),
          mockSocket,
          expect.anything(),
          [],
          expect.objectContaining({
            event: "test",
            namespace: "/chat",
            startTime: expect.any(Number),
          }),
          undefined
        );
      });

      it("should throw BadRequestError when _meta.timestamp is invalid", async () => {
        const { mockIo, mockNs } = createMockIo();
        const gateway = new IArkosGateway({ name: "/chat" });
        const mockSocket = createMockSocket();

        gateway.on({ event: "test" }, jest.fn());

        (gateway as any)._register(mockIo, undefined, [], [], {});

        const connectionCb = mockNs.on.mock.calls.find(
          ([event]: [string, any]) => event === "connection"
        )[1];

        connectionCb(mockSocket);

        const eventHandler = getEventHandlerForSocket(mockSocket, "test");
        await eventHandler({
          _meta: { mid: "msg-1", timestamp: "not-a-date" },
        });

        expect(handleArkosGatewayErrors).toHaveBeenCalledWith(
          expect.objectContaining({
            message: expect.stringContaining("Invalid data._meta.timestamp"),
          }),
          mockSocket,
          expect.anything(),
          [],
          expect.objectContaining({
            event: "test",
            namespace: "/chat",
            startTime: expect.any(Number),
          }),
          undefined
        );
      });

      it("should disable dedup when eventConfig.dedup is false", async () => {
        const { mockIo, mockNs } = createMockIo();
        const gateway = new IArkosGateway({ name: "/chat" });
        const mockSocket = createMockSocket();
        const handler = jest.fn();

        gateway.on({ event: "test", dedup: false }, handler);

        (gateway as any)._register(mockIo, undefined, [], [], {});

        const connectionCb = mockNs.on.mock.calls.find(
          ([event]: [string, any]) => event === "connection"
        )[1];

        connectionCb(mockSocket);

        const eventHandler = getEventHandlerForSocket(mockSocket, "test");
        await eventHandler({ data: "test", _meta: { mid: "123" } });

        expect(defaultGatewayStore.has).not.toHaveBeenCalled();
        expect(handler).toHaveBeenCalled();
      });
    });

    // ---- Rate Limiting Tests ----
    describe("rate limiting", () => {
      it("should allow request when under limit", async () => {
        const { mockIo, mockNs } = createMockIo();
        const gateway = new IArkosGateway({
          name: "/chat",
          rateLimit: { max: 10 },
        });
        const mockSocket = createMockSocket();
        const handler = jest.fn();

        (checkRateLimit as jest.Mock).mockResolvedValue({ allowed: true });

        gateway.on({ event: "test" }, handler);

        (gateway as any)._register(mockIo, undefined, [], [], {});

        const connectionCb = mockNs.on.mock.calls.find(
          ([event]: [string, any]) => event === "connection"
        )[1];

        connectionCb(mockSocket);

        const eventHandler = getEventHandlerForSocket(mockSocket, "test");
        await eventHandler({ data: "test", _meta: { mid: "123" } });

        expect(handler).toHaveBeenCalled();
      });

      it("should block request when over limit", async () => {
        const { mockIo, mockNs } = createMockIo();
        const gateway = new IArkosGateway({
          name: "/chat",
          rateLimit: { max: 5 },
        });
        const mockSocket = createMockSocket();
        const handler = jest.fn();

        (checkRateLimit as jest.Mock).mockResolvedValue({
          allowed: false,
          retryAfter: 30000,
        });

        gateway.on({ event: "test" }, handler);

        (gateway as any)._register(mockIo, undefined, [], [], {});

        const connectionCb = mockNs.on.mock.calls.find(
          ([event]: [string, any]) => event === "connection"
        )[1];

        connectionCb(mockSocket);

        const eventHandler = getEventHandlerForSocket(mockSocket, "test");
        await eventHandler({ data: "test", _meta: { mid: "123" } });

        expect(handler).not.toHaveBeenCalled();
        expect(handleArkosGatewayErrors).toHaveBeenCalledWith(
          expect.any(Error),
          mockSocket,
          mockIo,
          [],
          expect.any(Object),
          undefined
        );
      });

      it("should skip rate limit when rateLimitOptions is false", async () => {
        const { mockIo, mockNs } = createMockIo();
        const gateway = new IArkosGateway({ name: "/chat" });
        const mockSocket = createMockSocket();
        const handler = jest.fn();

        gateway.on({ event: "test", rateLimit: false }, handler);

        (gateway as any)._register(mockIo, undefined, [], [], {});

        const connectionCb = mockNs.on.mock.calls.find(
          ([event]: [string, any]) => event === "connection"
        )[1];

        connectionCb(mockSocket);

        const eventHandler = getEventHandlerForSocket(mockSocket, "test");
        await eventHandler({ data: "test", _meta: { mid: "123" } });

        expect(checkRateLimit).not.toHaveBeenCalled();
        expect(handler).toHaveBeenCalled();
      });
    });

    // ---- Authorization Tests ----
    describe("authorization", () => {
      it("should call authHookManager.runAuthorize when configured", async () => {
        const { mockIo, mockNs } = createMockIo();
        const gateway = new IArkosGateway({
          name: "/chat",
          authentication: true,
        });
        const mockSocket = createMockSocket();
        const handler = jest.fn();

        (checkRateLimit as jest.Mock).mockResolvedValue({ allowed: true });

        gateway.on(
          { event: "test", authorization: { roles: ["Admin"] } },
          handler
        );

        (gateway as any)._register(mockIo, undefined, [], [], {});

        const connectionCb = mockNs.on.mock.calls.find(
          ([event]: [string, any]) => event === "connection"
        )[1];

        connectionCb(mockSocket);

        const eventHandler = getEventHandlerForSocket(mockSocket, "test");
        await eventHandler({ data: "test", _meta: { mid: "123" } });

        expect(authHookManager.runAuthorize).toHaveBeenCalledWith(
          { context: mockSocket, done: expect.any(Function) },
          "test",
          "/chat",
          { roles: ["Admin"] }
        );
      });
    });

    // ---- Validation Tests ----
    describe("validation", () => {
      it("should run validationFn when validation is configured", async () => {
        const { mockIo, mockNs } = createMockIo();
        const gateway = new IArkosGateway({ name: "/chat" });
        const mockSocket = createMockSocket();
        const handler = jest.fn();
        const validatedData = { validated: true };

        (checkRateLimit as jest.Mock).mockResolvedValue({ allowed: true });
        (validationManager.isValidValidator as jest.Mock).mockReturnValue(true);
        (validationManager.shouldValidate as jest.Mock).mockReturnValue(true);
        (validationManager.validationFn as jest.Mock).mockResolvedValue(
          validatedData
        );

        gateway.on({ event: "test", validation: {} as any }, handler);

        (gateway as any)._register(mockIo, undefined, [], [], {});

        const connectionCb = mockNs.on.mock.calls.find(
          ([event]: [string, any]) => event === "connection"
        )[1];

        connectionCb(mockSocket);

        const eventHandler = getEventHandlerForSocket(mockSocket, "test");
        await eventHandler({ data: "test", _meta: { mid: "123" } });

        expect(validationManager.validationFn).toHaveBeenCalled();
        expect(handler).toHaveBeenCalledWith(
          mockSocket,
          validatedData,
          mockIo,
          undefined
        );
      });

      it("should throw when validator is invalid", async () => {
        const { mockIo, mockNs } = createMockIo();
        const gateway = new IArkosGateway({ name: "/chat" });
        const mockSocket = createMockSocket();

        (validationManager.isValidValidator as jest.Mock).mockReturnValue(
          false
        );

        gateway.on({ event: "test", validation: {} as any }, jest.fn());

        (gateway as any)._register(mockIo, undefined, [], [], {});

        const connectionCb = mockNs.on.mock.calls.find(
          ([event]: [string, any]) => event === "connection"
        )[1];

        connectionCb(mockSocket);

        const eventHandler = getEventHandlerForSocket(mockSocket, "test");
        await eventHandler({ data: "test", _meta: { mid: "123" } });

        expect(handleArkosGatewayErrors).toHaveBeenCalledWith(
          expect.any(Error),
          mockSocket,
          mockIo,
          [],
          expect.any(Object),
          undefined
        );
      });

      it("should pass through when shouldValidate returns 'passthrough'", async () => {
        const { mockIo, mockNs } = createMockIo();
        const gateway = new IArkosGateway({ name: "/chat" });
        const mockSocket = createMockSocket();
        const handler = jest.fn();
        const data = {
          data: "original",
          _meta: { mid: "123" },
        };

        (checkRateLimit as jest.Mock).mockResolvedValue({ allowed: true });
        (validationManager.shouldValidate as jest.Mock).mockReturnValue(
          "passthrough"
        );

        gateway.on({ event: "test", validation: {} as any }, handler);

        (gateway as any)._register(mockIo, undefined, [], [], {});

        const connectionCb = mockNs.on.mock.calls.find(
          ([event]: [string, any]) => event === "connection"
        )[1];

        connectionCb(mockSocket);

        const eventHandler = getEventHandlerForSocket(mockSocket, "test");
        await eventHandler(data);

        const { _meta, ...originalData } = data;

        expect(handler).toHaveBeenCalledWith(
          mockSocket,
          originalData,
          mockIo,
          undefined
        );
      });

      it("should throw BadRequestError when shouldValidate returns 'prohibit'", async () => {
        const { mockIo, mockNs } = createMockIo();
        const gateway = new IArkosGateway({ name: "/chat" });
        const mockSocket = createMockSocket();

        (validationManager.shouldValidate as jest.Mock).mockReturnValue(
          "prohibit"
        );

        gateway.on({ event: "test", validation: {} as any }, jest.fn());

        (gateway as any)._register(mockIo, undefined, [], [], {});

        const connectionCb = mockNs.on.mock.calls.find(
          ([event]: [string, any]) => event === "connection"
        )[1];

        connectionCb(mockSocket);

        const eventHandler = getEventHandlerForSocket(mockSocket, "test");
        await eventHandler({ data: "test", _meta: { mid: "123" } });

        expect(handleArkosGatewayErrors).toHaveBeenCalledWith(
          expect.objectContaining({
            message: "Event data is not allowed for this event.",
          }),
          mockSocket,
          mockIo,
          [],
          expect.any(Object),
          undefined
        );
      });
    });

    // ---- ACK Tests ----
    describe("acknowledgement", () => {
      it("should extract ack when eventConfig.ack is true and last arg is a function", async () => {
        const { mockIo, mockNs } = createMockIo();
        const gateway = new IArkosGateway({ name: "/chat" });
        const mockSocket = createMockSocket();
        const handler = jest.fn();
        const ackFn = jest.fn();

        (checkRateLimit as jest.Mock).mockResolvedValue({ allowed: true });

        gateway.on({ event: "test" }, handler);

        (gateway as any)._register(mockIo, undefined, [], [], {});

        const connectionCb = mockNs.on.mock.calls.find(
          ([event]: [string, any]) => event === "connection"
        )[1];

        connectionCb(mockSocket);

        const eventHandler = getEventHandlerForSocket(mockSocket, "test");
        await eventHandler({ data: "test", _meta: { mid: "123" } }, ackFn);

        expect(handler).toHaveBeenCalledWith(
          mockSocket,
          expect.any(Object),
          mockIo,
          expect.any(Function)
        );
      });

      it("should not extract ack when eventConfig.ack is false", async () => {
        const { mockIo, mockNs } = createMockIo();
        const gateway = new IArkosGateway({ name: "/chat" });
        const mockSocket = createMockSocket();
        const handler = jest.fn();
        const ackFn = jest.fn();

        (checkRateLimit as jest.Mock).mockResolvedValue({ allowed: true });

        gateway.on({ event: "test" }, handler);

        (gateway as any)._register(mockIo, undefined, [], [], {});

        const connectionCb = mockNs.on.mock.calls.find(
          ([event]: [string, any]) => event === "connection"
        )[1];

        connectionCb(mockSocket);

        const eventHandler = getEventHandlerForSocket(mockSocket, "test");
        await eventHandler({ data: "test", _meta: { mid: "123" } }, ackFn);

        expect(handler).toHaveBeenCalledWith(
          mockSocket,
          expect.any(Object),
          mockIo,
          expect.any(Function)
        );
      });
    });

    // ---- Child Gateway Tests ----
    describe("child gateways", () => {
      it("should recursively register child gateways", () => {
        const { mockIo, mockNs } = createMockIo();
        const parentGateway = new IArkosGateway({ name: "/chat" });
        const childGateway = new IArkosGateway({ name: "/admin" });
        const childSpy = jest.spyOn(childGateway as any, "_register");

        parentGateway.use(childGateway);

        (parentGateway as any)._register(mockIo, undefined, [], [], {});

        expect(childSpy).toHaveBeenCalledWith(
          mockIo,
          expect.objectContaining({ name: "/chat" }),
          expect.any(Array),
          expect.any(Array),
          expect.any(Object)
        );
      });

      it("should pass resolved auth and rateLimit to child gateways", () => {
        const { mockIo, mockNs } = createMockIo();
        const parentGateway = new IArkosGateway({
          name: "/chat",
          authentication: true,
          rateLimit: { max: 10 },
        });
        const childGateway = new IArkosGateway({ name: "/admin" });
        const childSpy = jest.spyOn(childGateway as any, "_register");

        parentGateway.use(childGateway);

        (parentGateway as any)._register(mockIo, undefined, [], [], {});

        const parentConfigPassed: any = childSpy.mock.calls[0][1];
        expect(parentConfigPassed.authentication).toBe(true);
        expect(parentConfigPassed.rateLimit).toEqual({ max: 10 });
      });

      it("should pass resolved hooks to child gateways", () => {
        const { mockIo, mockNs } = createMockIo();
        const parentGateway = new IArkosGateway({ name: "/chat" });
        const childGateway = new IArkosGateway({ name: "/admin" });
        const childSpy = jest.spyOn(childGateway as any, "_register");
        const connHandler = jest.fn();

        parentGateway.hook("connection", connHandler);
        parentGateway.use(childGateway);

        (parentGateway as any)._register(mockIo, undefined, [], [], {});

        const resolvedHooks = childSpy.mock.calls[0][2];
        expect(resolvedHooks).toContainEqual({
          type: "connection",
          handler: connHandler,
        });
      });
    });

    // ---- Error Handling Tests ----
    describe("error handling in event handler", () => {
      it("should handle errors thrown in event handler", async () => {
        const { mockIo, mockNs } = createMockIo();
        const gateway = new IArkosGateway({ name: "/chat" });
        const mockSocket = createMockSocket();
        const error = new Error("Handler error");

        (checkRateLimit as jest.Mock).mockResolvedValue({ allowed: true });

        gateway.on({ event: "test" }, jest.fn().mockRejectedValue(error));

        (gateway as any)._register(
          mockIo,
          undefined,
          [{ type: "error", handler: jest.fn() }],
          [],
          {}
        );

        const connectionCb = mockNs.on.mock.calls.find(
          ([event]: [string, any]) => event === "connection"
        )[1];

        connectionCb(mockSocket);

        const eventHandler = getEventHandlerForSocket(mockSocket, "test");
        await eventHandler({ data: "test", _meta: { mid: "123" } });

        expect(handleArkosGatewayErrors).toHaveBeenCalledWith(
          error,
          mockSocket,
          mockIo,
          expect.any(Array),
          expect.any(Object),
          undefined
        );
      });

      it("should pass error handlers to handleArkosGatewayErrors", async () => {
        const { mockIo, mockNs } = createMockIo();
        const gateway = new IArkosGateway({ name: "/chat" });
        const mockSocket = createMockSocket();
        const errorHandler = jest.fn();
        const error = new Error("Handler error");

        (checkRateLimit as jest.Mock).mockResolvedValue({ allowed: true });

        gateway.on({ event: "test" }, jest.fn().mockRejectedValue(error));

        (gateway as any)._register(
          mockIo,
          undefined,
          [{ type: "error", handler: errorHandler }],
          [],
          {}
        );

        const connectionCb = mockNs.on.mock.calls.find(
          ([event]: [string, any]) => event === "connection"
        )[1];

        connectionCb(mockSocket);

        const eventHandler = getEventHandlerForSocket(mockSocket, "test");
        await eventHandler({ data: "test", _meta: { mid: "123" } });

        expect(handleArkosGatewayErrors).toHaveBeenCalledWith(
          error,
          mockSocket,
          mockIo,
          [errorHandler],
          expect.any(Object),
          undefined
        );
      });

      it("should pass ack to handleArkosGatewayErrors", async () => {
        const { mockIo, mockNs } = createMockIo();
        const gateway = new IArkosGateway({ name: "/chat" });
        const mockSocket = createMockSocket();
        const ackFn = jest.fn();
        const error = new Error("Handler error");

        (checkRateLimit as jest.Mock).mockResolvedValue({ allowed: true });

        gateway.on(
          { event: "test", ack: true },
          jest.fn().mockRejectedValue(error)
        );

        (gateway as any)._register(mockIo, undefined, [], [], {});

        const connectionCb = mockNs.on.mock.calls.find(
          ([event]: [string, any]) => event === "connection"
        )[1];

        connectionCb(mockSocket);

        const eventHandler = getEventHandlerForSocket(mockSocket, "test");
        await eventHandler({ data: "test", _meta: { mid: "123" } }, ackFn);

        expect(handleArkosGatewayErrors).toHaveBeenCalledWith(
          error,
          mockSocket,
          mockIo,
          [],
          expect.any(Object),
          ackFn
        );
      });
    });

    // ---- Handler Execution Tests ----
    describe("handler execution", () => {
      it("should run pipes before handler", async () => {
        const { mockIo, mockNs } = createMockIo();
        const gateway = new IArkosGateway({ name: "/chat" });
        const mockSocket = createMockSocket();
        const handler = jest.fn();
        const globalPipe = jest.fn();
        const eventPipe = jest.fn();

        (checkRateLimit as jest.Mock).mockResolvedValue({ allowed: true });

        gateway.pipe(globalPipe);
        gateway.pipe({ event: "test" }, eventPipe);
        gateway.on({ event: "test" }, handler);

        (gateway as any)._register(mockIo, undefined, [], [], {});

        const connectionCb = mockNs.on.mock.calls.find(
          ([event]: [string, any]) => event === "connection"
        )[1];

        connectionCb(mockSocket);

        const eventHandler = getEventHandlerForSocket(mockSocket, "test");
        await eventHandler({ data: "test", _meta: { mid: "123" } });

        expect(runArkosGatewayPipes).toHaveBeenCalledWith(
          expect.arrayContaining([globalPipe, eventPipe]),
          mockSocket,
          expect.any(Object),
          mockIo
        );
        expect(handler).toHaveBeenCalled();
      });

      it("should set socket.data after validation", async () => {
        const { mockIo, mockNs } = createMockIo();
        const gateway = new IArkosGateway({ name: "/chat" });
        const mockSocket = createMockSocket();
        const validatedData = { validated: true };

        (checkRateLimit as jest.Mock).mockResolvedValue({ allowed: true });
        (validationManager.shouldValidate as jest.Mock).mockReturnValue(true);
        (validationManager.validationFn as jest.Mock).mockResolvedValue(
          validatedData
        );

        gateway.on({ event: "test", validation: {} as any }, jest.fn());

        (gateway as any)._register(mockIo, undefined, [], [], {});

        const connectionCb = mockNs.on.mock.calls.find(
          ([event]: [string, any]) => event === "connection"
        )[1];

        connectionCb(mockSocket);

        const eventHandler = getEventHandlerForSocket(mockSocket, "test");
        await eventHandler({ data: "thebigg", _meta: { mid: "123" } });

        expect(mockSocket.data).toEqual(validatedData);
      });

      it("should log successful event handling", async () => {
        const { mockIo, mockNs } = createMockIo();
        const gateway = new IArkosGateway({ name: "/chat" });
        const mockSocket = createMockSocket();
        const handler = jest.fn();

        (checkRateLimit as jest.Mock).mockResolvedValue({ allowed: true });

        gateway.on({ event: "test" }, handler);

        (gateway as any)._register(mockIo, undefined, [], [], {});

        const connectionCb = mockNs.on.mock.calls.find(
          ([event]: [string, any]) => event === "connection"
        )[1];

        connectionCb(mockSocket);

        const eventHandler = getEventHandlerForSocket(mockSocket, "test");
        await eventHandler({ name: "test", _meta: { mid: "123" } });

        expect(handleGatewayEventLog).toHaveBeenCalledWith(
          "/chat",
          "test",
          200,
          expect.any(Number)
        );
      });
    });
  });

  // ============================================================
  // EMIT HELPER METHODS TESTS
  // ============================================================
  describe("emit helper methods", () => {
    const { mockIo } = createMockIo();

    it("toUser() should return GatewayUserEmitBuilder instance", () => {
      const gateway = new IArkosGateway({ name: "/chat" });
      (gateway as any).io = mockIo;
      (gateway as any).registryOptions = { store: defaultGatewayStore };

      const result = gateway.toUser("user-1");

      expect(result).toBeDefined();
    });

    it("toRoom() should return GatewayEmitBuilder instance", () => {
      const gateway = new IArkosGateway({ name: "/chat" });
      (gateway as any).io = mockIo;
      (gateway as any).registryOptions = { store: defaultGatewayStore };

      const result = gateway.toRoom("room-1");

      expect(result).toBeDefined();
    });

    it("toAll() should return GatewayEmitBuilder instance", () => {
      const gateway = new IArkosGateway({ name: "/chat" });
      (gateway as any).io = mockIo;
      (gateway as any).registryOptions = { store: defaultGatewayStore };

      const result = gateway.toAll();

      expect(result).toBeDefined();
    });

    it("user() should return GatewayUserBuilder instance", () => {
      const gateway = new IArkosGateway({ name: "/chat" });
      (gateway as any).io = mockIo;

      const result = gateway.user("user-1");

      expect(result).toBeDefined();
    });

    it("room() should return GatewayRoomBuilder instance", () => {
      const gateway = new IArkosGateway({ name: "/chat" });
      (gateway as any).io = mockIo;

      const result = gateway.room("room-1");

      expect(result).toBeDefined();
    });

    it("toSocket() should return GatewaySocketEmitBuilder instance", () => {
      const gateway = new IArkosGateway({ name: "/chat" });
      const mockSocket = createMockSocket();
      (gateway as any).registryOptions = { store: defaultGatewayStore };

      const result = gateway.toSocket(mockSocket as any);

      expect(result).toBeDefined();
    });
  });

  // ============================================================
  // FACTORY FUNCTION TEST
  // ============================================================
  describe("ArkosGateway factory function", () => {
    it("should create an IArkosGateway instance", () => {
      const ArkosGateway = require("../arkos-gateway").default;
      const gateway = ArkosGateway({ name: "/chat" });

      expect(gateway).toBeInstanceOf(IArkosGateway);
    });
  });

  it("should throw BadRequestError when maxAge is set but _meta.timestamp is missing", async () => {
    const { mockIo, mockNs } = createMockIo();
    const gateway = new IArkosGateway({ name: "/chat" });
    const mockSocket = createMockSocket();

    gateway.on({ event: "test", maxAge: 60_000 }, jest.fn());

    (gateway as any)._register(mockIo, undefined, [], [], {});

    const connectionCb = mockNs.on.mock.calls.find(
      ([event]: [string, any]) => event === "connection"
    )[1];
    connectionCb(mockSocket);

    const eventHandler = getEventHandlerForSocket(mockSocket, "test");
    await eventHandler({ _meta: { mid: "msg-1" } });

    expect(handleArkosGatewayErrors).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining("_meta.timestamp"),
      }),
      mockSocket,
      mockIo,
      [],
      expect.objectContaining({ event: "test", namespace: "/chat" }),
      undefined
    );
  });

  it("should throw BadRequestError when message age exceeds maxAge", async () => {
    const { mockIo, mockNs } = createMockIo();
    const gateway = new IArkosGateway({ name: "/chat" });
    const mockSocket = createMockSocket();

    gateway.on({ event: "test", maxAge: 60_000 }, jest.fn());

    (gateway as any)._register(mockIo, undefined, [], [], {});

    const connectionCb = mockNs.on.mock.calls.find(
      ([event]: [string, any]) => event === "connection"
    )[1];
    connectionCb(mockSocket);

    const oldTimestamp = new Date(Date.now() - 120_000).toISOString(); // 2 min ago
    const eventHandler = getEventHandlerForSocket(mockSocket, "test");
    await eventHandler({ _meta: { mid: "msg-1", timestamp: oldTimestamp } });

    expect(handleArkosGatewayErrors).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Message is too old" }),
      mockSocket,
      mockIo,
      [],
      expect.objectContaining({ event: "test", namespace: "/chat" }),
      undefined
    );
  });

  it("should process message within maxAge window", async () => {
    const { mockIo, mockNs } = createMockIo();
    const gateway = new IArkosGateway({ name: "/chat" });
    const mockSocket = createMockSocket();
    const handler = jest.fn();

    (defaultGatewayStore.setIfNotExists as jest.Mock).mockResolvedValueOnce(
      true
    );

    gateway.on({ event: "test", maxAge: 60_000 }, handler);

    (gateway as any)._register(mockIo, undefined, [], [], {});

    const connectionCb = mockNs.on.mock.calls.find(
      ([event]: [string, any]) => event === "connection"
    )[1];
    connectionCb(mockSocket);

    const recentTimestamp = new Date(Date.now() - 10_000).toISOString(); // 10s ago
    const eventHandler = getEventHandlerForSocket(mockSocket, "test");
    await eventHandler({ _meta: { mid: "msg-1", timestamp: recentTimestamp } });

    expect(handler).toHaveBeenCalled();
  });

  it("should throw BadRequestError when _meta.timestamp is in the future", async () => {
    const { mockIo, mockNs } = createMockIo();
    const gateway = new IArkosGateway({ name: "/chat" });
    const mockSocket = createMockSocket();

    gateway.on({ event: "test" }, jest.fn());

    (gateway as any)._register(mockIo, undefined, [], [], {});

    const connectionCb = mockNs.on.mock.calls.find(
      ([event]: [string, any]) => event === "connection"
    )[1];
    connectionCb(mockSocket);

    const futureTimestamp = new Date(Date.now() + 60_000).toISOString();
    const eventHandler = getEventHandlerForSocket(mockSocket, "test");
    await eventHandler({ _meta: { mid: "msg-1", timestamp: futureTimestamp } });

    expect(handleArkosGatewayErrors).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Timestamp is in the future" }),
      mockSocket,
      mockIo,
      [],
      expect.objectContaining({ event: "test", namespace: "/chat" }),
      undefined
    );
  });
});

// ============================================================
// HELPER FUNCTIONS FOR TESTS
// ============================================================
function mockSocketOnForEvent(socket: any, event: string) {
  return socket.on.mock.calls.find(([e]: [string, any]) => e === event);
}

function getEventHandlerForSocket(socket: any, event: string): Function {
  const call: any = socket.on.mock.calls.find(
    ([e]: [string, any]) => e === event
  );
  return call ? call[1] : (null as any);
}
