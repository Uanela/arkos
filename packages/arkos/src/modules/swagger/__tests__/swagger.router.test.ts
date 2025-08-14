import { Router } from "express";
import swaggerJsdoc from "swagger-jsdoc";
import { getSwaggerRouter } from "../../../../src/modules/swagger/swagger.router";
import * as swaggerRouterHelpers from "../../../../src/modules/swagger/utils/helpers/swagger.router.helpers";
import missingJsonSchemaGenerator from "../../../../src/modules/swagger/utils/helpers/missing-json-schemas-generator";
import getSwaggerDefaultConfig from "../../../../src/modules/swagger/utils/helpers/get-swagger-default-configs";

// Mock all dependencies
jest.mock("fs", () => ({
  __esModule: true,
  default: {
    stat: jest.fn(),
    access: jest.fn(),
    mkdir: jest.fn(),
    readdirSync: jest.fn(),
  },
}));
jest.mock("express");
jest.mock("swagger-jsdoc");

const mockApiReference = jest.fn();

jest.mock("../../../utils/helpers/global.helpers", () => ({
  ...jest.requireActual("../../../utils/helpers/global.helpers"),
  importEsmPreventingTsTransformation: jest.fn(() => ({
    apiReference: mockApiReference,
  })),
}));
jest.mock(
  "../../../../src/modules/swagger/utils/helpers/swagger.router.helpers"
);
jest.mock(
  "../../../../src/modules/swagger/utils/helpers/missing-json-schemas-generator"
);
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

  const mockRouter = {
    use: jest.fn(),
    delete: jest.fn(),
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
  } as unknown as Router;

  const mockJsonSchemas = { components: { schemas: {} } };
  const mockPaths = { "/test": { get: {} } };
  const mockSwaggerSpec = { openapi: "3.0.0" };

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup default mock implementations
    (Router as jest.Mock).mockReturnValue(mockRouter);
    (swaggerJsdoc as jest.Mock).mockReturnValue(mockSwaggerSpec);
    (mockApiReference as jest.Mock).mockReturnValue(jest.fn());

    (
      swaggerRouterHelpers.getOpenAPIJsonSchemasByConfigMode as jest.Mock
    ).mockResolvedValue(mockJsonSchemas);

    (
      swaggerRouterHelpers.generatePathsForModels as jest.Mock
    ).mockResolvedValue(mockPaths);

    (
      missingJsonSchemaGenerator.generateMissingJsonSchemas as jest.Mock
    ).mockResolvedValue({});

    (getSwaggerDefaultConfig as jest.Mock).mockResolvedValue(
      mockConfig.swagger
    );
  });

  it("should return a router instance", async () => {
    const router = await getSwaggerRouter(mockConfig);
    expect(router).toHaveProperty("use");
  });

  it("should generate JSON schemas and paths", async () => {
    await getSwaggerRouter(mockConfig);

    expect(
      swaggerRouterHelpers.getOpenAPIJsonSchemasByConfigMode
    ).toHaveBeenCalledWith(mockConfig);

    expect(swaggerRouterHelpers.generatePathsForModels).toHaveBeenCalledWith(
      mockConfig
    );
  });

  it("should generate missing JSON schemas", async () => {
    await getSwaggerRouter(mockConfig);

    expect(
      missingJsonSchemaGenerator.generateMissingJsonSchemas
    ).toHaveBeenCalledWith(mockPaths, mockJsonSchemas, mockConfig);
  });

  it("should merge default and user configs", async () => {
    await getSwaggerRouter(mockConfig);

    expect(getSwaggerDefaultConfig).toHaveBeenCalledWith(
      mockPaths,
      mockJsonSchemas
    );
  });

  it("should generate OpenAPI specification", async () => {
    await getSwaggerRouter(mockConfig);

    expect(swaggerJsdoc).toHaveBeenCalledWith({
      definition: mockConfig.swagger.options?.definition,
      ...mockConfig.swagger.options,
    });
  });

  it("should setup Scalar API reference", async () => {
    await getSwaggerRouter(mockConfig);

    expect(mockApiReference).toHaveBeenCalledWith({
      content: mockSwaggerSpec,
      ...mockConfig.swagger.scalarApiReferenceConfiguration,
    });
  });

  it("should handle missing swagger config", async () => {
    const config = { ...mockConfig, swagger: undefined };
    const router = await getSwaggerRouter(config);
    expect(router).toHaveProperty("use");
    // expect(swaggerJsdoc).not.toHaveBeenCalled();
  });

  it("should handle dynamic import errors", async () => {
    const originalError = console.error;
    console.error = jest.fn();

    const mockImport = jest.fn().mockRejectedValue(new Error("Import failed"));
    const originalFunction = global.Function;
    (global as any).Function = jest.fn().mockImplementation(() => mockImport);

    await expect(getSwaggerRouter(mockConfig)).resolves.toHaveProperty("use");

    (global as any).Function = originalFunction;
    console.error = originalError;
  });
});
