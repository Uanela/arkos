import { getPrismaModelsRouter } from "../base.router";
import loadableRegistry from "../../../components/arkos-loadable-registry";
import { routeHookReader } from "../../../components/arkos-route-hook/reader";

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

describe("Base Router", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset router mock call counts
    mockRouter.get.mockReturnThis();
    mockRouter.post.mockReturnThis();
    mockRouter.patch.mockReturnThis();
    mockRouter.delete.mockReturnThis();
  });

  describe("getPrismaModelsRouter", () => {
    it("should return a router", () => {
      const {
        prismaSchemaParser: mockParser,
      } = require("../../../exports/prisma");
      mockParser.getModelsAsArrayOfStrings.mockReturnValue([]);

      const result = getPrismaModelsRouter();

      expect(result).toBe(mockRouter);
    });

    it("should register all 8 routes per model", () => {
      const {
        prismaSchemaParser: mockParser,
      } = require("../../../exports/prisma");
      mockParser.getModelsAsArrayOfStrings.mockReturnValue(["User"]);
      (loadableRegistry.getItem as jest.Mock).mockReturnValue(null);

      getPrismaModelsRouter();

      // POST /users, POST /users/many
      expect(mockRouter.post).toHaveBeenCalledTimes(2);
      // GET /users, GET /users/:id
      expect(mockRouter.get).toHaveBeenCalledTimes(2);
      // PATCH /users/many, PATCH /users/:id
      expect(mockRouter.patch).toHaveBeenCalledTimes(2);
      // DELETE /users/many, DELETE /users/:id
      expect(mockRouter.delete).toHaveBeenCalledTimes(2);
    });

    it("should register routes for multiple models", () => {
      const {
        prismaSchemaParser: mockParser,
      } = require("../../../exports/prisma");
      mockParser.getModelsAsArrayOfStrings.mockReturnValue(["User", "Post"]);
      (loadableRegistry.getItem as jest.Mock).mockReturnValue(null);

      getPrismaModelsRouter();

      expect(mockRouter.post).toHaveBeenCalledTimes(4); // 2 per model
      expect(mockRouter.get).toHaveBeenCalledTimes(4);
    });

    it("should use routeHookReader when interceptor exists for model", () => {
      const {
        prismaSchemaParser: mockParser,
      } = require("../../../exports/prisma");
      mockParser.getModelsAsArrayOfStrings.mockReturnValue(["Post"]);
      (loadableRegistry.getItem as jest.Mock).mockReturnValue({
        someHook: jest.fn(),
      });

      getPrismaModelsRouter();

      expect(routeHookReader.forOperation).toHaveBeenCalled();
    });

    it("should not call routeHookReader when no interceptor for model", () => {
      const {
        prismaSchemaParser: mockParser,
      } = require("../../../exports/prisma");
      mockParser.getModelsAsArrayOfStrings.mockReturnValue(["Post"]);
      (loadableRegistry.getItem as jest.Mock).mockReturnValue(null);

      getPrismaModelsRouter();

      expect(routeHookReader.forOperation).not.toHaveBeenCalled();
    });

    it("should handle empty models list", () => {
      const {
        prismaSchemaParser: mockParser,
      } = require("../../../exports/prisma");
      mockParser.getModelsAsArrayOfStrings.mockReturnValue([]);

      const result = getPrismaModelsRouter();

      expect(result).toBe(mockRouter);
      expect(mockRouter.get).not.toHaveBeenCalled();
      expect(mockRouter.post).not.toHaveBeenCalled();
    });
  });
});
