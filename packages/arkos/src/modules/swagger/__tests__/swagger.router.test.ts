import swaggerJsdoc from "swagger-jsdoc";
import {
  getSwaggerRouter,
  scalarMiddleware,
} from "../../../../src/modules/swagger/swagger.router";
import deepmerge from "../../../../src/utils/helpers/deepmerge.helper";
import { importEsmPreventingTsTransformation } from "../../../../src/utils/helpers/global.helpers";
import getSwaggerDefaultConfig from "../../../../src/modules/swagger/utils/helpers/get-swagger-default-configs";
import { Arkos } from "../../../types/arkos";

jest.mock("fs");
jest.mock("express", () => ({
  __esModule: true,
  Router: jest.fn(() => ({
    use: jest.fn(),
    delete: jest.fn(),
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
  })),
  default: jest.fn(),
}));
jest.mock("swagger-jsdoc");

const mockApiReference = jest.fn();

jest.mock("../../../utils/helpers/global.helpers", () => ({
  ...jest.requireActual("../../../utils/helpers/global.helpers"),
  importEsmPreventingTsTransformation: jest.fn(() => ({
    apiReference: mockApiReference,
  })),
}));

jest.mock(
  "../../../../src/modules/swagger/utils/helpers/get-swagger-default-configs"
);
jest.mock("../../../../src/utils/arkos-router", () => ({
  generateOpenAPIFromApp: jest.fn(),
}));
jest.mock(
  "../../../../src/modules/swagger/utils/helpers/get-file-upload-json-schema-paths"
);
jest.mock(
  "../../../../src/modules/swagger/utils/helpers/json-schema-generators/generate-system-json-schemas"
);
jest.mock("../../../../src/utils/helpers/deepmerge.helper");
jest.mock("../../../../src/utils/helpers/global.helpers");

describe("getSwaggerRouter", () => {
  const mockConfig: any = {
    swagger: {
      endpoint: "/docs",
      options: {
        definition: { info: { title: "Test API", version: "1.0.0" } },
        apis: [],
      },
    },
  };

  const mockApp = {
    _router: {
      stack: [],
    },
  } as any as Arkos;

  const mockSwaggerSpec = { openapi: "3.0.0" };
  const mockMergedConfig = {
    endpoint: "/docs",
    options: {
      definition: { info: { title: "Test API", version: "1.0.0" } },
      apis: [],
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();

    (swaggerJsdoc as jest.Mock).mockReturnValue(mockSwaggerSpec);
    (deepmerge as any as jest.Mock).mockReturnValue(mockMergedConfig);
    (importEsmPreventingTsTransformation as jest.Mock).mockResolvedValue({
      apiReference: jest.fn().mockReturnValue(jest.fn()),
    });
    (mockApiReference as jest.Mock).mockReturnValue(jest.fn());

    (getSwaggerDefaultConfig as jest.Mock).mockReturnValue(mockConfig.swagger);
  });

  it("should return a router instance", () => {
    const router = getSwaggerRouter(mockConfig, mockApp);
    expect(router).toHaveProperty("use");
  });

  it("should merge default and user configs", async () => {
    getSwaggerRouter(mockConfig, mockApp);
    expect(generateSystemJsonSchemas).toHaveBeenCalledWith(mockConfig);
    expect(getSwaggerDefaultConfig).toHaveBeenCalledWith(
      expect.objectContaining({})
    );
  });

  it("should deepmerge swagger default config with user config", () => {
    getSwaggerRouter(mockConfig, mockApp);
    expect(deepmerge).toHaveBeenCalledWith(
      expect.any(Object),
      mockConfig.swagger
    );
  });

  it("should generate OpenAPI specification from merged swagger options", () => {
    getSwaggerRouter(mockConfig, mockApp);
    expect(swaggerJsdoc).toHaveBeenCalledWith({
      ...mockMergedConfig.options,
      definition: mockMergedConfig.options.definition,
    });
  });

  it("should handle missing swagger config without throwing", () => {
    const config = { ...mockConfig, swagger: undefined };
    (deepmerge as any as jest.Mock).mockReturnValue({
      options: mockConfig.swagger.options,
      endpoint: "/docs",
    });
    expect(() => getSwaggerRouter(config, mockApp)).not.toThrow();
  });
});

describe("scalarMiddleware", () => {
  const mockSwaggerSpec = { openapi: "3.0.0" };
  const mockSwaggerConfigs = {
    endpoint: "/docs",
    scalarApiReferenceConfiguration: {},
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should lazy-load scalar on first request and call handler", async () => {
    const mockHandler = jest.fn();
    const mockApiReference = jest.fn().mockReturnValue(mockHandler);
    (importEsmPreventingTsTransformation as jest.Mock).mockResolvedValue({
      apiReference: mockApiReference,
    });

    const middleware = scalarMiddleware(
      null,
      mockSwaggerSpec,
      mockSwaggerConfigs
    );
    const req = {} as any;
    const res = {} as any;
    const next = jest.fn();

    await middleware(req, res, next);

    expect(importEsmPreventingTsTransformation).toHaveBeenCalledWith(
      "@scalar/express-api-reference"
    );
    expect(mockApiReference).toHaveBeenCalledWith({
      content: mockSwaggerSpec,
      ...mockSwaggerConfigs.scalarApiReferenceConfiguration,
    });
    expect(mockHandler).toHaveBeenCalledWith(req, res, next);
  });

  it("should not reload scalar on subsequent requests", async () => {
    const mockHandler = jest.fn();
    (importEsmPreventingTsTransformation as jest.Mock).mockResolvedValue({
      apiReference: jest.fn().mockReturnValue(mockHandler),
    });

    const middleware = scalarMiddleware(
      null,
      mockSwaggerSpec,
      mockSwaggerConfigs
    );
    const req = {} as any;
    const res = {} as any;
    const next = jest.fn();

    await middleware(req, res, next);
    await middleware(req, res, next);

    expect(importEsmPreventingTsTransformation).toHaveBeenCalledTimes(1);
    expect(mockHandler).toHaveBeenCalledTimes(2);
  });

  it("should use provided scalarHandler directly without loading", async () => {
    const existingHandler = jest.fn();
    const middleware = scalarMiddleware(
      existingHandler,
      mockSwaggerSpec,
      mockSwaggerConfigs
    );

    await middleware({} as any, {} as any, jest.fn());

    expect(importEsmPreventingTsTransformation).not.toHaveBeenCalled();
    expect(existingHandler).toHaveBeenCalled();
  });
});
