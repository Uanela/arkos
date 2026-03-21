import { getPrismaModelsRouter } from "../base.router";
import loadableRegistry from "../../../components/arkos-loadable-registry";
import { routeHookReader } from "../../../components/arkos-route-hook/reader";
import modelOpenAPIGenerator from "../utils/model-openapi-generator";

const mockRouter = {
  get: jest.fn().mockReturnThis(),
  post: jest.fn().mockReturnThis(),
  patch: jest.fn().mockReturnThis(),
  delete: jest.fn().mockReturnThis(),
  use: jest.fn().mockReturnThis(),
};

jest.mock("../../../utils/arkos-router", () => ({
  __esModule: true,
  ArkosRouter: jest.fn(() => mockRouter),
}));

jest.mock("../../../exports", () => ({
  ArkosRouter: jest.fn(() => mockRouter),
  BaseController: jest.fn().mockImplementation(() => ({
    createOne: jest.fn(),
    createMany: jest.fn(),
    findMany: jest.fn(),
    findOne: jest.fn(),
    updateOne: jest.fn(),
    updateMany: jest.fn(),
    deleteOne: jest.fn(),
    deleteMany: jest.fn(),
  })),
}));

jest.mock("../../../components/arkos-loadable-registry", () => ({
  __esModule: true,
  default: { getItem: jest.fn() },
}));

jest.mock("../../../components/arkos-route-hook/reader", () => ({
  routeHookReader: {
    forOperation: jest.fn().mockReturnValue({
      before: [],
      after: [],
      onError: [],
      prismaArgs: {},
      routeConfig: {},
    }),
  },
}));

jest.mock("../utils/model-openapi-generator", () => ({
  __esModule: true,
  default: {
    getOpenApiConfig: jest.fn().mockReturnValue({ summary: "generated" }),
  },
}));

jest.mock("../../../utils/prisma/prisma-schema-parser", () => ({
  __esModule: true,
  default: {
    getModelsAsArrayOfStrings: jest.fn(),
  },
}));

jest.mock("../../../exports/utils", () => ({
  kebabCase: jest.fn((str: string) => str.toLowerCase()),
}));

jest.mock("../base.middlewares", () => ({
  addPrismaQueryOptionsToRequest: jest.fn(() => jest.fn()),
  sendResponse: jest.fn(),
}));

jest.mock("../../../utils/helpers/routers.helpers", () => ({
  processMiddleware: jest.fn(() => []),
}));

jest.mock("pluralize", () => ({
  plural: jest.fn((str: string) => str + "s"),
}));

const getPrismaParser = () =>
  require("../../../exports/prisma").prismaSchemaParser;

describe("getPrismaModelsRouter", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRouter.get.mockReturnThis();
    mockRouter.post.mockReturnThis();
    mockRouter.patch.mockReturnThis();
    mockRouter.delete.mockReturnThis();
  });

  it("should return a router", () => {
    const mockParser = getPrismaParser();
    mockParser.getModelsAsArrayOfStrings.mockReturnValue([]);

    const result = getPrismaModelsRouter();

    expect(result).toBe(mockRouter);
  });

  it("should handle empty models list", () => {
    const mockParser = getPrismaParser();
    mockParser.getModelsAsArrayOfStrings.mockReturnValue([]);

    getPrismaModelsRouter();

    expect(mockRouter.get).not.toHaveBeenCalled();
    expect(mockRouter.post).not.toHaveBeenCalled();
  });

  it("should register all 8 routes per model", () => {
    const mockParser = getPrismaParser();
    mockParser.getModelsAsArrayOfStrings.mockReturnValue(["User"]);
    (loadableRegistry.getItem as jest.Mock).mockReturnValue(null);

    getPrismaModelsRouter();

    expect(mockRouter.post).toHaveBeenCalledTimes(2); // createOne, createMany
    expect(mockRouter.get).toHaveBeenCalledTimes(2); // findMany, findOne
    expect(mockRouter.patch).toHaveBeenCalledTimes(2); // updateMany, updateOne
    expect(mockRouter.delete).toHaveBeenCalledTimes(2); // deleteMany, deleteOne
  });

  it("should register routes for multiple models", () => {
    const mockParser = getPrismaParser();
    mockParser.getModelsAsArrayOfStrings.mockReturnValue(["User", "Post"]);
    (loadableRegistry.getItem as jest.Mock).mockReturnValue(null);

    getPrismaModelsRouter();

    expect(mockRouter.post).toHaveBeenCalledTimes(4);
    expect(mockRouter.get).toHaveBeenCalledTimes(4);
  });

  it("should use routeHookReader when route hook exists for model", () => {
    const mockParser = getPrismaParser();
    mockParser.getModelsAsArrayOfStrings.mockReturnValue(["Post"]);
    (loadableRegistry.getItem as jest.Mock).mockReturnValue({
      someHook: jest.fn(),
    });

    getPrismaModelsRouter();

    expect(routeHookReader.forOperation).toHaveBeenCalled();
  });

  it("should not call routeHookReader when no route hook for model", () => {
    const mockParser = getPrismaParser();
    mockParser.getModelsAsArrayOfStrings.mockReturnValue(["Post"]);
    (loadableRegistry.getItem as jest.Mock).mockReturnValue(null);

    getPrismaModelsRouter();

    expect(routeHookReader.forOperation).not.toHaveBeenCalled();
  });

  it("should call modelOpenAPIGenerator.getOpenApiConfig for each endpoint", () => {
    const mockParser = getPrismaParser();
    mockParser.getModelsAsArrayOfStrings.mockReturnValue(["User"]);
    (loadableRegistry.getItem as jest.Mock).mockReturnValue(null);

    getPrismaModelsRouter();

    // 8 endpoints per model
    expect(modelOpenAPIGenerator.getOpenApiConfig).toHaveBeenCalledTimes(8);
  });

  it("should call getOpenApiConfig with correct args for createOne", () => {
    const mockParser = getPrismaParser();
    mockParser.getModelsAsArrayOfStrings.mockReturnValue(["User"]);
    (loadableRegistry.getItem as jest.Mock).mockReturnValue(null);

    getPrismaModelsRouter();

    expect(modelOpenAPIGenerator.getOpenApiConfig).toHaveBeenCalledWith(
      expect.any(Object), // endpointConfig
      "createOne",
      "user",
      {} // prismaArgs
    );
  });

  it("should inject openapi config into experimental when openapi is not false", () => {
    const mockParser = getPrismaParser();
    mockParser.getModelsAsArrayOfStrings.mockReturnValue(["User"]);
    (loadableRegistry.getItem as jest.Mock).mockReturnValue(null);

    (routeHookReader.forOperation as jest.Mock).mockReturnValue({
      before: [],
      after: [],
      onError: [],
      prismaArgs: {},
      routeConfig: {},
    });

    (modelOpenAPIGenerator.getOpenApiConfig as jest.Mock).mockReturnValue({
      summary: "generated",
    });

    getPrismaModelsRouter();

    // The route config passed to router.post for createOne should have openapi injected
    const firstPostCall = (mockRouter.post as jest.Mock).mock.calls[0][0];
    expect(firstPostCall.experimental?.openapi).toEqual({
      summary: "generated",
    });
  });

  it("should skip openapi injection when experimental.openapi is false", () => {
    const mockParser = getPrismaParser();
    mockParser.getModelsAsArrayOfStrings.mockReturnValue(["User"]);
    (loadableRegistry.getItem as jest.Mock).mockReturnValue(null);

    (routeHookReader.forOperation as jest.Mock).mockReturnValue({
      before: [],
      after: [],
      onError: [],
      prismaArgs: {},
      routeConfig: {
        experimental: { openapi: false },
      },
    });

    getPrismaModelsRouter();

    // getOpenApiConfig should not be called for this endpoint
    expect(modelOpenAPIGenerator.getOpenApiConfig).not.toHaveBeenCalled();
  });

  it("should pass prismaArgs from routeHookReader to getOpenApiConfig", () => {
    const mockParser = getPrismaParser();
    mockParser.getModelsAsArrayOfStrings.mockReturnValue(["User"]);
    (loadableRegistry.getItem as jest.Mock).mockReturnValue({ hook: true });

    const customPrismaArgs = { select: { id: true, name: true } };

    (routeHookReader.forOperation as jest.Mock).mockReturnValue({
      before: [],
      after: [],
      onError: [],
      prismaArgs: customPrismaArgs,
      routeConfig: {},
    });

    getPrismaModelsRouter();

    expect(modelOpenAPIGenerator.getOpenApiConfig).toHaveBeenCalledWith(
      expect.any(Object),
      expect.any(String),
      "user",
      customPrismaArgs
    );
  });

  it("should preserve existing experimental config when injecting openapi", () => {
    const mockParser = getPrismaParser();
    mockParser.getModelsAsArrayOfStrings.mockReturnValue(["User"]);
    (loadableRegistry.getItem as jest.Mock).mockReturnValue(null);

    (routeHookReader.forOperation as jest.Mock).mockReturnValue({
      before: [],
      after: [],
      onError: [],
      prismaArgs: {},
      routeConfig: {
        experimental: {
          uploads: { type: "single", field: "avatar" },
        },
      },
    });

    getPrismaModelsRouter();

    const firstPostCall = (mockRouter.post as jest.Mock).mock.calls[0][0];
    expect(firstPostCall.experimental?.uploads).toEqual({
      type: "single",
      field: "avatar",
    });
    expect(firstPostCall.experimental?.openapi).toBeDefined();
  });

  it("should pass correct path for each endpoint", () => {
    const mockParser = getPrismaParser();
    mockParser.getModelsAsArrayOfStrings.mockReturnValue(["User"]);
    (loadableRegistry.getItem as jest.Mock).mockReturnValue(null);

    getPrismaModelsRouter();

    const postCalls = (mockRouter.post as jest.Mock).mock.calls;
    const paths = postCalls.map((call: any[]) => call[0].path);
    expect(paths).toContain("/users");
    expect(paths).toContain("/users/many");

    const getCalls = (mockRouter.get as jest.Mock).mock.calls;
    const getPaths = getCalls.map((call: any[]) => call[0].path);
    expect(getPaths).toContain("/users");
    expect(getPaths).toContain("/users/:id");
  });

  it("should forOperation called with correct operation names", () => {
    const mockParser = getPrismaParser();
    mockParser.getModelsAsArrayOfStrings.mockReturnValue(["User"]);
    (loadableRegistry.getItem as jest.Mock).mockReturnValue({ hook: true });

    getPrismaModelsRouter();

    const operations = (
      routeHookReader.forOperation as jest.Mock
    ).mock.calls.map((call: any[]) => call[1]);

    expect(operations).toContain("createOne");
    expect(operations).toContain("findMany");
    expect(operations).toContain("createMany");
    expect(operations).toContain("updateMany");
    expect(operations).toContain("deleteMany");
    expect(operations).toContain("findOne");
    expect(operations).toContain("updateOne");
    expect(operations).toContain("deleteOne");
  });
});
