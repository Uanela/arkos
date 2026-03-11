import * as runtimeCliCommanderModule from "../utils/cli/utils/runtime-cli-commander";

jest.mock("../utils/helpers/arkos-config.helpers", () => ({}));
let mockListenFn: jest.Mock;

jest.mock("express", () => {
  const mockListen = jest.fn();
  const app: any = {
    listen: mockListen,
    use: jest.fn(),
    _events: {},
  };
  const express = jest.fn(() => app);
  (express as any).__mockApp = app;
  (express as any).__mockListen = mockListen;
  return express;
});
jest.mock("../utils/setup-app", () => ({
  __esModule: true,
  default: jest.fn(),
}));
jest.mock("../utils/initialize-app", () => ({
  __esModule: true,
  default: jest.fn((app: any) => app),
}));
jest.mock("../server", () => ({ logAppStartup: jest.fn() }));
jest.mock("../utils/helpers/prisma.helpers", () => ({
  loadPrismaModule: jest.fn().mockResolvedValue(undefined),
}));
jest.mock("../utils/dynamic-loader", () => ({
  loadAllModuleComponents: jest.fn().mockResolvedValue(undefined),
}));
jest.mock("../utils/cli/utils/runtime-cli-commander", () => ({
  __esModule: true,
  default: { handle: jest.fn().mockResolvedValue(undefined) },
}));
jest.mock("../utils/helpers/exit-error", () => ({
  __esModule: true,
  default: (_msg: string) => {
    process.exit(1);
  },
}));

describe("arkos()", () => {
  let arkos: typeof import("../app").arkos;
  let getAppServer: typeof import("../app").getAppServer;
  let mockExpressApp: any;
  let mockServer: any;
  let prismaHelpers: typeof import("../utils/helpers/prisma.helpers");
  let dynamicLoader: typeof import("../utils/dynamic-loader");
  let initializeAppModule: typeof import("../utils/initialize-app");
  let serverModule: typeof import("../server");
  let runtimeCliCommander: typeof runtimeCliCommanderModule;

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();

    delete process.env.CLI_COMMAND;
    delete process.env.PORT;
    delete process.env.__PORT;
    delete process.env.HOST;
    delete process.env.__HOST;

    mockServer = { listen: jest.fn().mockReturnThis() };

    const expressMock = require("express");
    mockExpressApp = expressMock.__mockApp;
    mockListenFn = expressMock.__mockListen;
    mockListenFn.mockReturnValue(mockServer);

    arkos = require("../app").arkos;
    getAppServer = require("../app").getAppServer;
    prismaHelpers = require("../utils/helpers/prisma.helpers");
    dynamicLoader = require("../utils/dynamic-loader");
    initializeAppModule = require("../utils/initialize-app");
    serverModule = require("../server");
    runtimeCliCommander = require("../utils/cli/utils/runtime-cli-commander");

    jest.spyOn(process, "exit").mockImplementation((code?: any) => {
      throw new Error(`process.exit(${code})`);
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("arkos() instantiation", () => {
    it("should create app successfully on first call", () => {
      expect(() => arkos()).not.toThrow();
    });

    it("should throw if arkos() called twice", () => {
      arkos();
      expect(() => arkos()).toThrow("process.exit(1)");
    });
  });

  describe("app.build()", () => {
    it("should build successfully on first call", async () => {
      const app = arkos();
      await expect(app.build()).resolves.not.toThrow();
      expect(prismaHelpers.loadPrismaModule).toHaveBeenCalledTimes(1);
      expect(dynamicLoader.loadAllModuleComponents).toHaveBeenCalledTimes(1);
      expect(initializeAppModule.default).toHaveBeenCalledTimes(1);
    });

    it("should throw if build() called twice", async () => {
      const app = arkos();
      await app.build();
      await expect(app.build()).rejects.toThrow("process.exit(1)");
    });

    it("should throw if build() called while building", async () => {
      const app = arkos();
      const buildPromise = app.build();
      await expect(app.build()).rejects.toThrow("process.exit(1)");
      await buildPromise;
    });

    it("should throw if build() called after listen()", async () => {
      const app = arkos();
      await app.listen();
      await expect(app.build()).rejects.toThrow("process.exit(1)");
    });

    it("should handle CLI_COMMAND env var", async () => {
      process.env.CLI_COMMAND = "some-command";
      const app = arkos();
      await app.build();
      expect(runtimeCliCommander.default.handle).toHaveBeenCalledTimes(1);
    });

    it("should not call CLI handler without CLI_COMMAND", async () => {
      const app = arkos();
      await app.build();
      expect(runtimeCliCommander.default.handle).not.toHaveBeenCalled();
    });
  });

  describe("app.listen()", () => {
    it("should listen successfully without prior build", async () => {
      const app = arkos();
      await app.listen();
      expect(prismaHelpers.loadPrismaModule).toHaveBeenCalledTimes(1);
      expect(mockListenFn).toHaveBeenCalledWith(
        8000,
        "0.0.0.0",
        expect.any(Function)
      );
    });

    it("should listen successfully after build", async () => {
      const app = arkos();
      await app.build();
      await app.listen();
      expect(prismaHelpers.loadPrismaModule).toHaveBeenCalledTimes(1);
      expect(mockListenFn).toHaveBeenCalled();
    });

    it("should throw if listen() called twice", async () => {
      const app = arkos();
      await app.listen();
      await expect(app.listen()).rejects.toThrow("process.exit(1)");
    });

    it("should throw if listen() called while building", async () => {
      const app = arkos();
      const buildPromise = app.build();
      await expect(app.listen()).rejects.toThrow("process.exit(1)");
      await buildPromise;
    });

    it("should use PORT env var", async () => {
      process.env.PORT = "3000";
      const app = arkos();
      await app.listen();
      expect(mockListenFn).toHaveBeenCalledWith(
        3000,
        "0.0.0.0",
        expect.any(Function)
      );
    });

    it("should use __PORT over PORT", async () => {
      process.env.PORT = "3000";
      process.env.__PORT = "4000";
      const app = arkos();
      await app.listen();
      expect(mockListenFn).toHaveBeenCalledWith(
        4000,
        "0.0.0.0",
        expect.any(Function)
      );
    });

    it("should use HOST env var", async () => {
      process.env.HOST = "localhost";
      const app = arkos();
      await app.listen();
      expect(mockListenFn).toHaveBeenCalledWith(
        8000,
        "localhost",
        expect.any(Function)
      );
    });

    it("should use __HOST over HOST", async () => {
      process.env.HOST = "localhost";
      process.env.__HOST = "127.0.0.1";
      const app = arkos();
      await app.listen();
      expect(mockListenFn).toHaveBeenCalledWith(
        8000,
        "127.0.0.1",
        expect.any(Function)
      );
    });

    it("should accept a callback as first arg", async () => {
      const app = arkos();
      const cb = jest.fn();
      await app.listen(cb);
      expect(mockListenFn).toHaveBeenCalledWith(8000, "0.0.0.0", cb);
    });

    it("should accept a custom http.Server as first arg", async () => {
      const app = arkos();
      const customServer = { listen: jest.fn().mockReturnThis() };
      await app.listen(customServer as any);
      expect(customServer.listen).toHaveBeenCalledWith(
        8000,
        "0.0.0.0",
        expect.any(Function)
      );
    });

    it("should accept a custom server with a callback", async () => {
      const app = arkos();
      const customServer = { listen: jest.fn().mockReturnThis() };
      const cb = jest.fn();
      await app.listen(customServer as any, cb);
      expect(customServer.listen).toHaveBeenCalledWith(8000, "0.0.0.0", cb);
    });

    it("should log app startup", async () => {
      const app = arkos();
      await app.listen();
      expect(serverModule.logAppStartup).toHaveBeenCalledWith(8000, "0.0.0.0");
    });
  });

  describe("getAppServer()", () => {
    it("should return undefined before listen", () => {
      expect(getAppServer()).toBeUndefined();
    });

    it("should return the server after listen", async () => {
      const app = arkos();
      await app.listen();
      expect(getAppServer()).toBe(mockServer);
    });
  });
});
