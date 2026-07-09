import swaggerJsdoc from "swagger-jsdoc";
import { getSwaggerRouter, scalarMiddleware } from "../swagger.router";
import getSwaggerDefaultConfig from "../utils/helpers/get-swagger-default-configs";
import { importEsmPreventingTsTransformation } from "../../../utils/helpers/global.helpers";
import getOpenApiLoginHtml from "../utils/get-open-api-login-html";
import { Arkos } from "../../../types/arkos";

jest.mock("fs", () => ({
  __esModule: true,
  default: {
    stat: jest.fn(),
    access: jest.fn(),
    mkdir: jest.fn(),
    readdirSync: jest.fn(),
  },
  promises: { stat: jest.fn(), access: jest.fn(), mkdir: jest.fn() },
}));
jest.mock("../../../utils/arkos-router", () => {
  const instance = {
    use: jest.fn(),
    delete: jest.fn(),
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
  };
  const router = jest.fn(() => instance);

  return {
    __esModule: true,
    ...jest.requireActual("../../../utils/arkos-router"),
    default: router,
    _getMockInstance: () => instance,
  };
});
jest.mock("swagger-jsdoc");

const mockApiReference = jest.fn();
jest.mock("../../../utils/helpers/global.helpers", () => ({
  ...jest.requireActual("../../../utils/helpers/global.helpers"),
  importEsmPreventingTsTransformation: jest.fn(() =>
    Promise.resolve({ apiReference: mockApiReference })
  ),
}));

jest.mock("../utils/helpers/get-swagger-default-configs");
jest.mock("../../auth/auth.service", () => ({
  __esModule: true,
  default: { authenticate: jest.fn() },
}));
jest.mock("../../../modules/error-handler/utils/app-error", () => {
  return jest.fn().mockImplementation((message, status, code) => ({
    message,
    status,
    code,
  }));
});
jest.mock("../utils/get-open-api-login-html", () => ({
  __esModule: true,
  default: jest.fn(() => "<html>login</html>"),
}));

function getRouterInstance(): {
  use: jest.Mock;
  get: jest.Mock;
  delete: jest.Mock;
  post: jest.Mock;
  put: jest.Mock;
} {
  const express = require("../../../utils/arkos-router");

  return express._getMockInstance();
}

describe("getSwaggerRouter", () => {
  const endpoint = "/api/docs";

  const baseDefaultConfig = {
    endpoint,
    authenticate: true,
    options: {
      definition: {
        info: { title: "Test API", version: "1.0.0" },
        servers: [{ url: "http://localhost:3000" }],
      },
      apis: [],
    },
    scalarApiReferenceConfiguration: {},
  };

  const mockApp = { _router: { stack: [] } } as any as Arkos;
  const mockSwaggerSpec = { openapi: "3.0.0" };

  beforeEach(() => {
    jest.clearAllMocks();
    (swaggerJsdoc as jest.Mock).mockReturnValue(mockSwaggerSpec);
    (mockApiReference as jest.Mock).mockReturnValue(jest.fn());
    (getSwaggerDefaultConfig as jest.Mock).mockReturnValue(
      structuredClone(baseDefaultConfig)
    );
  });

  it("returns a router instance", () => {
    const router = getSwaggerRouter({} as any, mockApp);
    expect(router).toHaveProperty("use");
    expect(router).toHaveProperty("get");
  });

  it("calls getSwaggerDefaultConfig with system paths", () => {
    getSwaggerRouter({} as any, mockApp);
    expect(getSwaggerDefaultConfig).toHaveBeenCalledWith(
      expect.objectContaining({
        "/api/available-resources": expect.any(Object),
      })
    );
  });

  it("generates swagger spec via swaggerJsdoc", () => {
    getSwaggerRouter({} as any, mockApp);
    expect(swaggerJsdoc).toHaveBeenCalledWith(
      expect.objectContaining({ definition: expect.any(Object) })
    );
  });

  it("handles missing swagger config without throwing", () => {
    const router = getSwaggerRouter({ swagger: undefined } as any, mockApp);
    expect(router).toHaveProperty("use");
  });

  describe("authentication middleware — enabled", () => {
    it("registers two use() calls on endpoint when authenticate is true", () => {
      getSwaggerRouter({ swagger: { authenticate: true } } as any, mockApp);
      const router = getRouterInstance();
      const endpointUseCalls = router.use.mock.calls.filter(
        (c: any[]) => c[0].path === endpoint
      );
      expect(endpointUseCalls.length).toBeGreaterThanOrEqual(2);
    });

    it("first middleware skips to next() when path includes /auth", () => {
      getSwaggerRouter({ swagger: { authenticate: true } } as any, mockApp);
      const router = getRouterInstance();
      const firstMiddleware = router.use.mock.calls[0][1];
      const next = jest.fn();
      firstMiddleware({ path: `${endpoint}/auth/login` }, {}, next);
      expect(next).toHaveBeenCalledWith();
    });

    it("first middleware calls next('route') for non-auth paths", () => {
      getSwaggerRouter({ swagger: { authenticate: true } } as any, mockApp);
      const router = getRouterInstance();
      const firstMiddleware = router.use.mock.calls[0][1];
      const next = jest.fn();
      firstMiddleware({ path: endpoint }, {}, next);
      expect(next).toHaveBeenCalledWith("route");
    });

    it("registers authService.authenticate in the second use() chain", () => {
      getSwaggerRouter({ swagger: { authenticate: true } } as any, mockApp);
      const router = getRouterInstance();
      const firstArgs = router.use.mock.calls[1];
      expect(firstArgs).toContainEqual({
        authentication: true,
        path: "/api/docs",
      });
    });

    it("super-user middleware calls next() when isSuperUser is true", () => {
      getSwaggerRouter({ swagger: { authenticate: true } } as any, mockApp);
      const router = getRouterInstance();
      const superUserMiddleware = router.use.mock.calls[1][1];
      const next = jest.fn();
      superUserMiddleware({ user: { isSuperUser: true } }, {}, next);
      expect(next).toHaveBeenCalledWith();
    });

    it("super-user middleware calls next(error) when isSuperUser is false", () => {
      getSwaggerRouter({ swagger: { authenticate: true } } as any, mockApp);
      const router = getRouterInstance();
      const superUserMiddleware = router.use.mock.calls[1][1];
      const next = jest.fn();
      superUserMiddleware({ user: { isSuperUser: false } }, {}, next);
      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({ status: 403 })
      );
    });

    it("super-user middleware calls next(error) when user is absent", () => {
      getSwaggerRouter({ swagger: { authenticate: true } } as any, mockApp);
      const router = getRouterInstance();
      const superUserMiddleware = router.use.mock.calls[1][1];
      const next = jest.fn();
      superUserMiddleware({ user: undefined }, {}, next);
      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({ status: 403 })
      );
    });

    it("error handler calls next() when path includes /auth", () => {
      getSwaggerRouter({ swagger: { authenticate: true } } as any, mockApp);
      const router = getRouterInstance();
      const errorHandler = router.use.mock.calls[1][2];
      const next = jest.fn();
      errorHandler(
        new Error("fail"),
        { path: `${endpoint}/auth/login` },
        {},
        next
      );
      expect(next).toHaveBeenCalledWith();
    });

    it("error handler redirects with encoded error message for non-auth paths", () => {
      getSwaggerRouter(
        { globalPrefix: "", swagger: { authenticate: true } } as any,
        mockApp
      );
      const router = getRouterInstance();
      const errorHandler = router.use.mock.calls[1][2];
      const res = { redirect: jest.fn() };
      errorHandler(
        { message: "Token expired" },
        { path: endpoint },
        res,
        jest.fn()
      );
      expect(res.redirect).toHaveBeenCalledWith(
        expect.stringContaining(encodeURIComponent("Token expired"))
      );
      expect(res.redirect).toHaveBeenCalledWith(
        expect.stringContaining("/auth/login")
      );
    });

    it("error handler falls back to default message when err has no message", () => {
      getSwaggerRouter(
        { globalPrefix: "", swagger: { authenticate: true } } as any,
        mockApp
      );
      const router = getRouterInstance();
      const errorHandler = router.use.mock.calls[1][2];
      const res = { redirect: jest.fn() };
      errorHandler({}, { path: endpoint }, res, jest.fn());
      expect(res.redirect).toHaveBeenCalledWith(
        expect.stringContaining(encodeURIComponent("Authentication required."))
      );
    });
  });

  describe("authentication — disabled", () => {
    it("does not register auth middleware blocks when authenticate is false", () => {
      getSwaggerRouter({ swagger: { authenticate: false } } as any, mockApp);
      const router = getRouterInstance();
      const endpointUseCalls = router.use.mock.calls.filter(
        (c: any[]) => c[0].path === endpoint
      );
      expect(endpointUseCalls).toHaveLength(1);
    });
  });

  describe("GET /auth/login", () => {
    it("registers the route", () => {
      getSwaggerRouter({} as any, mockApp);
      const router = getRouterInstance();
      const registered = router.get.mock.calls.map((c: any[]) => c[0].path);
      expect(registered).toContain(`${endpoint}/auth/login`);
    });

    it("sends login HTML", () => {
      getSwaggerRouter({} as any, mockApp);
      const router = getRouterInstance();
      const handler = router.get.mock.calls.find(
        (c: any[]) => c[0].path === `${endpoint}/auth/login`
      )![1];
      const res = { send: jest.fn() };
      handler({}, res);
      expect(getOpenApiLoginHtml).toHaveBeenCalled();
      expect(res.send).toHaveBeenCalledWith("<html>login</html>");
    });
  });

  describe("GET /openapi.json", () => {
    it("registers the route", () => {
      getSwaggerRouter({} as any, mockApp);
      const router = getRouterInstance();
      const registered = router.get.mock.calls.map((c: any[]) => c[0].path);
      expect(registered).toContain(`${endpoint}/openapi.json`);
    });

    it("responds with the swagger specification", () => {
      getSwaggerRouter({} as any, mockApp);
      const router = getRouterInstance();
      const handler = router.get.mock.calls.find(
        (c: any[]) => c[0].path === `${endpoint}/openapi.json`
      )![1];
      const res = { json: jest.fn() };
      handler({}, res);
      expect(res.json).toHaveBeenCalledWith(mockSwaggerSpec);
    });
  });

  describe("custom servers merging", () => {
    it("preserves user-defined servers and appends the default server", () => {
      const userServer = { url: "https://api.example.com" };
      getSwaggerRouter(
        {
          swagger: {
            options: {
              definition: {
                servers: [userServer],
                info: { title: "T", version: "1" },
              },
              apis: [],
            },
          },
        } as any,
        mockApp
      );
      const swaggerArg = (swaggerJsdoc as jest.Mock).mock.calls[0][0];
      expect(swaggerArg.definition.servers).toContainEqual(userServer);
      expect(swaggerArg.definition.servers).toContainEqual(
        baseDefaultConfig.options.definition.servers[0]
      );
    });

    it("does not push default server when no custom servers are defined", () => {
      getSwaggerRouter({} as any, mockApp);
      const swaggerArg = (swaggerJsdoc as jest.Mock).mock.calls[0][0];
      expect(swaggerArg.definition.servers).toHaveLength(1);
    });
  });
});

describe("scalarMiddleware", () => {
  const mockSwaggerSpec = { openapi: "3.0.0" };
  const swaggerConfigs = { scalarApiReferenceConfiguration: { theme: "moon" } };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("lazy-loads scalar on first request and calls the handler", async () => {
    const fakeHandler = jest.fn();
    const fakeApiReference = jest.fn(() => fakeHandler);
    (importEsmPreventingTsTransformation as jest.Mock).mockResolvedValue({
      apiReference: fakeApiReference,
    });

    const middleware = scalarMiddleware(null, mockSwaggerSpec, swaggerConfigs);
    const req = {};
    const res = {};
    const next = jest.fn();

    await middleware(req as any, res as any, next);

    expect(importEsmPreventingTsTransformation).toHaveBeenCalledWith(
      "@scalar/express-api-reference"
    );
    expect(fakeApiReference).toHaveBeenCalledWith({
      content: mockSwaggerSpec,
      theme: "moon",
    });
    expect(fakeHandler).toHaveBeenCalledWith(req, res, next);
  });

  it("does not re-import scalar on subsequent requests", async () => {
    const fakeHandler = jest.fn();
    const fakeApiReference = jest.fn(() => fakeHandler);
    (importEsmPreventingTsTransformation as jest.Mock).mockResolvedValue({
      apiReference: fakeApiReference,
    });

    const middleware = scalarMiddleware(null, mockSwaggerSpec, swaggerConfigs);
    const next = jest.fn();

    await middleware({} as any, {} as any, next);
    await middleware({} as any, {} as any, next);

    expect(importEsmPreventingTsTransformation).toHaveBeenCalledTimes(1);
  });

  it("skips import when scalarHandler is already provided", async () => {
    const existingHandler = jest.fn();
    const middleware = scalarMiddleware(
      existingHandler,
      mockSwaggerSpec,
      swaggerConfigs
    );
    const req = {};
    const res = {};
    const next = jest.fn();

    await middleware(req as any, res as any, next);

    expect(importEsmPreventingTsTransformation).not.toHaveBeenCalled();
    expect(existingHandler).toHaveBeenCalledWith(req, res, next);
  });

  it("concurrent requests share a single loading promise", async () => {
    let resolveImport!: (v: any) => void;
    const importPromise = new Promise((res) => {
      resolveImport = res;
    });
    (importEsmPreventingTsTransformation as jest.Mock).mockReturnValue(
      importPromise
    );

    const fakeHandler = jest.fn();
    const fakeApiReference = jest.fn(() => fakeHandler);

    const middleware = scalarMiddleware(null, mockSwaggerSpec, swaggerConfigs);
    const next = jest.fn();

    const p1 = middleware({} as any, {} as any, next);
    const p2 = middleware({} as any, {} as any, next);

    resolveImport({ apiReference: fakeApiReference });
    await Promise.all([p1, p2]);

    expect(importEsmPreventingTsTransformation).toHaveBeenCalledTimes(1);
  });

  it("passes scalarApiReferenceConfiguration fields to apiReference", async () => {
    const fakeHandler = jest.fn();
    const fakeApiReference = jest.fn(() => fakeHandler);
    (importEsmPreventingTsTransformation as jest.Mock).mockResolvedValue({
      apiReference: fakeApiReference,
    });

    const configs = {
      scalarApiReferenceConfiguration: { theme: "saturn", darkMode: true },
    };
    const middleware = scalarMiddleware(null, mockSwaggerSpec, configs);
    await middleware({} as any, {} as any, jest.fn());

    expect(fakeApiReference).toHaveBeenCalledWith({
      content: mockSwaggerSpec,
      theme: "saturn",
      darkMode: true,
    });
  });
});
