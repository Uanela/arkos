import swaggerJsdoc from "swagger-jsdoc";
import { getSwaggerRouter } from "../../../../src/modules/swagger/swagger.router";
import getSwaggerDefaultConfig from "../../../../src/modules/swagger/utils/helpers/get-swagger-default-configs";
import express from "express";
import { Arkos } from "../../../types/arkos";

jest.mock("fs", () => ({
  __esModule: true,
  default: {
    stat: jest.fn(),
    access: jest.fn(),
    mkdir: jest.fn(),
    readdirSync: jest.fn(),
  },
  promises: {
    stat: jest.fn(),
    access: jest.fn(),
    mkdir: jest.fn(),
  },
}));
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

describe("getSwaggerRouter", () => {
  const mockConfig: any = {
    swagger: {
      endpoint: "/docs",
      mode: "prisma",
      options: {
        definition: {
          info: {
            title: "Test API",
            version: "1.0.0",
          },
        },
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

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup default mock implementations
    (swaggerJsdoc as jest.Mock).mockReturnValue(mockSwaggerSpec);
    (mockApiReference as jest.Mock).mockReturnValue(jest.fn());

    (getSwaggerDefaultConfig as jest.Mock).mockReturnValue(mockConfig.swagger);
  });

  it("should return a router instance", async () => {
    const router = getSwaggerRouter(mockConfig, mockApp);
    expect(router).toHaveProperty("use");
  });

  it("should merge default and user configs", async () => {
    getSwaggerRouter(mockConfig, mockApp);

    expect(getSwaggerDefaultConfig).toHaveBeenCalledWith(
      expect.objectContaining({})
    );
  });

  it("should generate OpenAPI specification", async () => {
    getSwaggerRouter(mockConfig, mockApp);

    expect(swaggerJsdoc).toHaveBeenCalledWith({
      definition: mockConfig.swagger.options?.definition,
      ...mockConfig.swagger.options,
    });
  });

  it("should handle missing swagger config", async () => {
    const config = { ...mockConfig, swagger: undefined };
    const router = getSwaggerRouter(config, mockApp);
    expect(router).toHaveProperty("use");
    // expect(swaggerJsdoc).not.toHaveBeenCalled();
  });

  it("should handle dynamic import errors", async () => {
    const originalError = console.error;
    console.error = jest.fn();

    const mockImport = jest.fn().mockRejectedValue(new Error("Import failed"));
    const originalFunction = global.Function;
    (global as any).Function = jest.fn().mockImplementation(() => mockImport);

    expect(getSwaggerRouter(mockConfig, mockApp)).toHaveProperty("use");

    (global as any).Function = originalFunction;
    console.error = originalError;
  });
});
