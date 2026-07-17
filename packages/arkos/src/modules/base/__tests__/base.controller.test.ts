import { BaseController } from "../base.controller";
import { ArkosPrismaService } from "../base.service";
import AppError from "../../error-handler/utils/app-error";
import APIFeatures from "../../../utils/features/api.features";
import loadableRegistry from "../../../components/arkos-loadable-registry";
import { routeHookReader } from "../../../components/arkos-route-hook/reader";

jest.mock("fs", () => ({
  ...jest.requireActual("fs"),
  readdirSync: jest.fn(),
  readFileSync: jest.fn(),
}));
jest.mock("../../base/base.service", () => ({
  __esModule: true,
  getArkosPrismaServices: jest.fn(),
  ArkosPrismaService: jest.fn(),
}));
jest.mock("../../error-handler/utils/app-error");
jest.mock("../../../utils/features/api.features");
jest.mock("../../../server");
jest.mock("../../../components/arkos-loadable-registry", () => ({
  __esModule: true,
  default: { getItem: jest.fn(), register: jest.fn() },
}));
jest.mock("../../../components/arkos-route-hook/reader", () => ({
  routeHookReader: { getHooks: jest.fn() },
}));
jest.mock("../../../utils/sheu");
jest.mock("../../../utils/prisma/prisma-schema-parser", () => ({
  parse: jest.fn(),
  getModelsAsArrayOfStrings: jest.fn(() => []),
}));

const mockGetItem = loadableRegistry.getItem as jest.Mock;
const mockGetHooks = routeHookReader.getHooks as jest.Mock;

describe("BaseController", () => {
  let baseController: BaseController<any>;
  let mockRequest: any;
  let mockResponse: any;
  let mockNext: jest.Mock;
  let mockArkosPrismaService: jest.Mocked<ArkosPrismaService<any>>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockArkosPrismaService = {
      createOne: jest.fn(),
      createMany: jest.fn(),
      findOne: jest.fn(),
      findMany: jest.fn(),
      updateOne: jest.fn(),
      updateMany: jest.fn(),
      deleteOne: jest.fn(),
      deleteMany: jest.fn(),
      batchUpdate: jest.fn(),
      batchDelete: jest.fn(),
      count: jest.fn(),
      relationFields: { singular: [], list: [] },
    } as any;
    (ArkosPrismaService as jest.Mock).mockImplementation(() => mockArkosPrismaService);
    (ArkosPrismaService as jest.Mock).mockImplementation(() => mockArkosPrismaService);

    mockGetItem.mockReturnValue(null);
    mockGetHooks.mockReturnValue(null);

    (APIFeatures as jest.Mock).mockImplementation(function (
      req: any,
      _: string
    ) {
      return {
        filters: {},
        filter: jest.fn().mockImplementation(function (this: any) {
          let whereClause = req.query;
          if (req.query.filterMode) {
            const { filterMode, ...restOfQuery } = req.query;
            whereClause = { AND: restOfQuery };
          }
          this.filters = { ...this.filters, where: whereClause };
          return this;
        }),
        sort: jest.fn().mockReturnThis(),
        limitFields: jest.fn().mockReturnThis(),
        paginate: jest.fn().mockImplementation(function (this: any) {
          this.filters = {
            ...this.filters,
            take: 30,
            skip: 0,
          };
          return this;
        }),
      };
    });

    mockRequest = {
      body: {},
      params: {},
      query: {},
      responseData: null,
      responseStatus: null,
      prismaQueryOptions: {},
    };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      send: jest.fn(),
      locals: {},
    };
    mockNext = jest.fn();

    baseController = new BaseController("Post");
  });

  describe("constructor", () => {
    it("should initialize controller with correct model name and service", () => {
      expect(ArkosPrismaService).toHaveBeenCalledWith("Post");
    });

    it("should initialize with empty interceptors when registry returns null", () => {
      mockGetItem.mockReturnValue(null);
      new BaseController("User");
      expect(ArkosPrismaService).toHaveBeenCalledWith("User");
    });

    it("should initialize when registry returns undefined", () => {
      mockGetItem.mockReturnValue(undefined);
      new BaseController("User");
      expect(ArkosPrismaService).toHaveBeenCalledWith("User");
    });
  });

  describe("createOne", () => {
    it("should create a record and return 201 status", async () => {
      const mockBody = { title: "Test Post" };
      const mockData = { id: 1, ...mockBody };
      mockRequest.body = mockBody;
      mockArkosPrismaService.createOne.mockResolvedValue(mockData);

      await baseController.createOne(mockRequest, mockResponse, mockNext);

      expect(mockArkosPrismaService.createOne).toHaveBeenCalledWith(
        mockBody,
        {},
        {
          accessToken: undefined,
          user: undefined,
        }
      );
      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith({ data: mockData });
    });

    it("should call next with responseData if afterCreateOne hook exists", async () => {
      mockGetItem.mockReturnValue({ afterCreateOne: jest.fn() });
      mockGetHooks.mockImplementation((_: string, op: string) => {
        if (op === "createOne") return { after: jest.fn() };
        return null;
      });
      baseController = new BaseController("Post");

      const mockData = { id: 1, title: "Test Post" };
      mockArkosPrismaService.createOne.mockResolvedValue(mockData);

      await baseController.createOne(mockRequest, mockResponse, mockNext);

      expect(mockRequest.responseData).toEqual({ data: mockData });
      expect(mockRequest.responseStatus).toBe(201);
      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.json).not.toHaveBeenCalled();
    });
  });

  describe("createMany", () => {
    it("should create multiple records and return 201 status", async () => {
      const mockBody = [{ title: "Post 1" }, { title: "Post 2" }];
      const mockResult = { count: 2 };
      mockRequest.body = mockBody;
      mockArkosPrismaService.createMany.mockResolvedValue(mockResult as any);

      await baseController.createMany(mockRequest, mockResponse, mockNext);

      expect(mockArkosPrismaService.createMany).toHaveBeenCalledWith(
        mockBody,
        {},
        {
          accessToken: undefined,
          user: undefined,
        }
      );
      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith({
        data: mockResult,
        results: mockResult.count,
      });
    });

    it("should throw an error on empty array", async () => {
      const mockBody: any[] = [];
      const mockResult = { count: 2 };
      mockRequest.body = mockBody;
      mockArkosPrismaService.createMany.mockResolvedValue(mockResult as any);
      try {
        await baseController.createMany(mockRequest, mockResponse, mockNext);
      } catch (err: any) {
        expect(err).toBeDefined();
      }

      expect(mockArkosPrismaService.createMany).not.toHaveBeenCalledWith(
        mockBody,
        {},
        {
          accessToken: undefined,
          user: undefined,
        }
      );
      expect(mockResponse.status).not.toHaveBeenCalledWith(201);
      expect(mockResponse.json).not.toHaveBeenCalledWith({
        data: mockResult,
        results: mockResult.count,
      });
    });

    it("should call next with error if createMany returns null", async () => {
      const mockBody = [{ title: "Post 1" }];
      mockRequest.body = mockBody;
      mockArkosPrismaService.createMany.mockResolvedValue(null as any);

      await baseController.createMany(mockRequest, mockResponse, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
      expect(mockResponse.json).not.toHaveBeenCalled();
    });

    it("should call next with responseData if afterCreateMany hook exists", async () => {
      mockGetItem.mockReturnValue({ afterCreateMany: jest.fn() });
      mockGetHooks.mockImplementation((_: string, op: string) => {
        if (op === "createMany") return { after: jest.fn() };
        return null;
      });
      baseController = new BaseController("Post");

      const mockBody = [{ title: "Post 1" }];
      const mockResult = { count: 1 };
      mockRequest.body = mockBody;
      mockArkosPrismaService.createMany.mockResolvedValue(mockResult as any);

      await baseController.createMany(mockRequest, mockResponse, mockNext);

      expect(mockRequest.responseData).toEqual({
        data: mockResult,
        results: mockResult.count,
      });
      expect(mockRequest.responseStatus).toBe(201);
      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.json).not.toHaveBeenCalled();
    });
  });

  describe("findMany", () => {
    beforeEach(() => {
      mockArkosPrismaService.relationFields = {
        singular: [
          {
            name: "category",
            type: "Category",
            foreignKeyField: "categoryId",
            isArray: false,
            isRelation: true,
            isOptional: false,
            attributes: [],
            rawLine: "",
          },
        ],
        list: [],
      };
    });

    it("should fetch records and return 200 status", async () => {
      const mockData = [{ id: 1, title: "Post 1" }];
      const mockTotal = 1;
      mockArkosPrismaService.findMany.mockResolvedValue(mockData);
      mockArkosPrismaService.count.mockResolvedValue(mockTotal);
      mockRequest.query = { published: true };

      await baseController.findMany(mockRequest, mockResponse, mockNext);

      expect(APIFeatures).toHaveBeenCalled();
      expect(mockArkosPrismaService.findMany).toHaveBeenCalledWith(
        { published: true },
        { take: 30, skip: 0 },
        {
          accessToken: undefined,
          user: undefined,
        }
      );
      expect(mockArkosPrismaService.count).toHaveBeenCalledWith(
        { published: true },
        {
          accessToken: undefined,
          user: undefined,
        }
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        total: mockTotal,
        results: mockData.length,
        data: mockData,
        hasNextPage: false,
        hasPrevPage: false,
        limit: 30,
        page: 1,
        pages: 1,
      });
    });

    it("should call next with responseData if afterFindMany hook exists", async () => {
      mockGetItem.mockReturnValue({ afterFindMany: jest.fn() });
      mockGetHooks.mockImplementation((_: string, op: string) => {
        if (op === "findMany") return { after: jest.fn() };
        return null;
      });
      baseController = new BaseController("Post");

      const mockData = [{ id: 1, title: "Post 1" }];
      const mockTotal = 1;
      mockArkosPrismaService.findMany.mockResolvedValue(mockData);
      mockArkosPrismaService.count.mockResolvedValue(mockTotal);

      await baseController.findMany(mockRequest, mockResponse, mockNext);

      expect(mockRequest.responseData).toEqual({
        total: mockTotal,
        results: mockData.length,
        data: mockData,
        hasNextPage: false,
        hasPrevPage: false,
        limit: 30,
        page: 1,
        pages: 1,
      });
      expect(mockRequest.responseStatus).toBe(200);
      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.json).not.toHaveBeenCalled();
    });

    it("should handle case with no relation fields", async () => {
      (mockArkosPrismaService.relationFields as any) = null;
      const mockData = [{ id: 1, title: "Post 1" }];
      const mockTotal = 1;
      mockArkosPrismaService.findMany.mockResolvedValue(mockData);
      mockArkosPrismaService.count.mockResolvedValue(mockTotal);

      await baseController.findMany(mockRequest, mockResponse, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        total: mockTotal,
        results: mockData.length,
        data: mockData,
        hasNextPage: false,
        hasPrevPage: false,
        limit: 30,
        page: 1,
        pages: 1,
      });
    });
  });

  describe("findOne", () => {
    it("should fetch a record by id and return 200 status", async () => {
      const mockParams = { id: "1" };
      const mockData = { id: 1, title: "Test Post" };
      mockRequest.params = mockParams;
      mockArkosPrismaService.findOne.mockResolvedValue(mockData);

      await baseController.findOne(mockRequest, mockResponse, mockNext);

      expect(mockArkosPrismaService.findOne).toHaveBeenCalledWith(
        mockParams,
        {},
        {
          accessToken: undefined,
          user: undefined,
        }
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({ data: mockData });
    });

    it("should fetch a record by id and and req.query return 200 status", async () => {
      const mockParams = { id: "1" };
      const mockData = { id: 1, title: "Test Post" };
      mockRequest.query = { published: true };
      mockRequest.params = mockParams;
      mockArkosPrismaService.findOne.mockResolvedValue(mockData);

      await baseController.findOne(mockRequest, mockResponse, mockNext);

      expect(mockArkosPrismaService.findOne).toHaveBeenCalledWith(
        { ...mockParams, published: true },
        {},
        {
          accessToken: undefined,
          user: undefined,
        }
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({ data: mockData });
    });

    it("should call next with error if record not found with single id param", async () => {
      const mockParams = { id: "1" };
      mockRequest.params = mockParams;
      mockArkosPrismaService.findOne.mockResolvedValue(null as any);

      await baseController.findOne(mockRequest, mockResponse, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
      expect(mockResponse.json).not.toHaveBeenCalled();
    });

    it("should call next with error if record not found with multiple params", async () => {
      const mockParams = { slug: "test-post", category: "tech" };
      mockRequest.params = mockParams;
      mockArkosPrismaService.findOne.mockResolvedValue(null as any);

      await baseController.findOne(mockRequest, mockResponse, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
      expect(mockResponse.json).not.toHaveBeenCalled();
    });

    it("should not return error if id param is 'me'", async () => {
      const mockParams = { id: "me" };
      mockRequest.params = mockParams;
      mockArkosPrismaService.findOne.mockResolvedValue(null as any);

      await baseController.findOne(mockRequest, mockResponse, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
      expect(mockResponse.json).not.toHaveBeenCalled();
    });

    it("should call next with responseData if afterFindOne hook exists", async () => {
      mockGetItem.mockReturnValue({ afterFindOne: jest.fn() });
      mockGetHooks.mockImplementation((_: string, op: string) => {
        if (op === "findOne") return { after: jest.fn() };
        return null;
      });
      baseController = new BaseController("Post");

      const mockParams = { id: "1" };
      const mockData = { id: 1, title: "Test Post" };
      mockRequest.params = mockParams;
      mockArkosPrismaService.findOne.mockResolvedValue(mockData);

      await baseController.findOne(mockRequest, mockResponse, mockNext);

      expect(mockRequest.responseData).toEqual({ data: mockData });
      expect(mockRequest.responseStatus).toBe(200);
      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.json).not.toHaveBeenCalled();
    });
  });

  describe("updateOne", () => {
    it("should update a record and return 200 status", async () => {
      const mockParams = { id: "1" };
      const mockBody = { title: "Updated Post" };
      const mockData = { id: 1, ...mockBody };
      mockRequest.params = mockParams;
      mockRequest.body = mockBody;
      mockArkosPrismaService.updateOne.mockResolvedValue(mockData);

      await baseController.updateOne(mockRequest, mockResponse, mockNext);

      expect(mockArkosPrismaService.updateOne).toHaveBeenCalledWith(
        mockParams,
        mockBody,
        {},
        {
          accessToken: undefined,
          user: undefined,
        }
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({ data: mockData });
    });

    it("should update a record with id and req.query and return 200 status", async () => {
      const mockParams = { id: "1" };
      const mockBody = { title: "Updated Post" };
      const mockData = { id: 1, ...mockBody };
      mockRequest.params = mockParams;
      mockRequest.query = { published: true };
      mockRequest.body = mockBody;
      mockArkosPrismaService.updateOne.mockResolvedValue(mockData);

      await baseController.updateOne(mockRequest, mockResponse, mockNext);

      expect(mockArkosPrismaService.updateOne).toHaveBeenCalledWith(
        { ...mockParams, published: true },
        mockBody,
        {},
        {
          accessToken: undefined,
          user: undefined,
        }
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({ data: mockData });
    });

    it("should call next with error if record not found with single id param", async () => {
      const mockParams = { id: "1" };
      mockRequest.params = mockParams;
      mockRequest.body = { title: "Updated Post" };
      mockArkosPrismaService.updateOne.mockResolvedValue(null as any);

      await baseController.updateOne(mockRequest, mockResponse, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
      expect(mockResponse.json).not.toHaveBeenCalled();
    });

    it("should call next with error if record not found with multiple params", async () => {
      const mockParams = { slug: "test-post", category: "tech" };
      mockRequest.params = mockParams;
      mockRequest.body = { title: "Updated Post" };
      mockArkosPrismaService.updateOne.mockResolvedValue(null as any);

      await baseController.updateOne(mockRequest, mockResponse, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
      expect(mockResponse.json).not.toHaveBeenCalled();
    });

    it("should call next with responseData if afterUpdateOne hook exists", async () => {
      mockGetItem.mockReturnValue({ afterUpdateOne: jest.fn() });
      mockGetHooks.mockImplementation((_: string, op: string) => {
        if (op === "updateOne") return { after: jest.fn() };
        return null;
      });
      baseController = new BaseController("Post");

      const mockParams = { id: "1" };
      const mockBody = { title: "Updated Post" };
      const mockData = { id: 1, ...mockBody };
      mockRequest.params = mockParams;
      mockRequest.body = mockBody;
      mockArkosPrismaService.updateOne.mockResolvedValue(mockData);

      await baseController.updateOne(mockRequest, mockResponse, mockNext);

      expect(mockRequest.responseData).toEqual({ data: mockData });
      expect(mockRequest.responseStatus).toBe(200);
      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.json).not.toHaveBeenCalled();
    });
  });

  describe("updateMany", () => {
    it("should return error if no filter criteria provided", async () => {
      await baseController.updateMany(mockRequest, mockResponse, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
      expect(mockResponse.json).not.toHaveBeenCalled();
    });

    it("should return error if only prismaQueryOptions provided", async () => {
      mockRequest.query = { prismaQueryOptions: {} };

      await baseController.updateMany(mockRequest, mockResponse, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
      expect(mockResponse.json).not.toHaveBeenCalled();
    });

    it("should update multiple records and return 200 status", async () => {
      mockRequest.query = { title: "Test" };
      const mockBody = { published: true };
      const mockResult = { count: 2 };
      mockRequest.body = mockBody;
      mockArkosPrismaService.updateMany.mockResolvedValue(mockResult as any);

      await baseController.updateMany(mockRequest, mockResponse, mockNext);

      expect(mockArkosPrismaService.updateMany).toHaveBeenCalled();
      expect(mockArkosPrismaService.updateMany).toHaveBeenCalledWith(
        { AND: { title: "Test" } },
        { published: true },
        {},
        expect.any(Object)
      );
      expect(mockRequest.query.filterMode).toBe("AND");
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        results: mockResult.count,
        data: mockResult,
      });
    });

    it("should throw error when req.query.filterMode === OR", async () => {
      mockRequest.query = { title: "Test", filterMode: "OR" };
      const mockBody = { published: true };
      const mockResult = { count: 2 };
      mockRequest.body = mockBody;
      mockArkosPrismaService.updateMany.mockResolvedValue(mockResult as any);

      await baseController.updateMany(mockRequest, mockResponse, mockNext);

      expect(mockRequest.query.filterMode).toBe("OR");
      expect(mockNext).toHaveBeenCalled();
    });

    it("should call next with error if no records updated", async () => {
      mockRequest.query = { title: "Test" };
      const mockResult = { count: 0 };
      mockRequest.body = { published: true };
      mockArkosPrismaService.updateMany.mockResolvedValue(mockResult as any);

      await baseController.updateMany(mockRequest, mockResponse, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
      expect(mockResponse.json).not.toHaveBeenCalled();
    });

    it("should call next with error if updateMany returns null", async () => {
      mockRequest.query = { title: "Test" };
      mockRequest.body = { published: true };
      mockArkosPrismaService.updateMany.mockResolvedValue(null as any);

      await baseController.updateMany(mockRequest, mockResponse, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
      expect(mockResponse.json).not.toHaveBeenCalled();
    });

    it("should call next with responseData if afterUpdateMany hook exists", async () => {
      mockGetItem.mockReturnValue({ afterUpdateMany: jest.fn() });
      mockGetHooks.mockImplementation((_: string, op: string) => {
        if (op === "updateMany") return { after: jest.fn() };
        return null;
      });
      baseController = new BaseController("Post");

      mockRequest.query = { title: "Test" };
      const mockBody = { published: true };
      const mockResult = { count: 2 };
      mockRequest.body = mockBody;
      mockArkosPrismaService.updateMany.mockResolvedValue(mockResult as any);

      await baseController.updateMany(mockRequest, mockResponse, mockNext);

      expect(mockRequest.responseData).toEqual({
        results: mockResult.count,
        data: mockResult,
      });
      expect(mockRequest.responseStatus).toBe(200);
      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.json).not.toHaveBeenCalled();
    });
  });

  describe("deleteOne", () => {
    it("should delete a record and return 204 status", async () => {
      const mockParams = { id: "1" };
      mockRequest.params = mockParams;
      mockArkosPrismaService.deleteOne.mockResolvedValue({ id: 1 });

      await baseController.deleteOne(mockRequest, mockResponse, mockNext);

      expect(mockArkosPrismaService.deleteOne).toHaveBeenCalledWith(mockParams, {
        accessToken: undefined,
        user: undefined,
      });
      expect(mockResponse.status).toHaveBeenCalledWith(204);
      expect(mockResponse.send).toHaveBeenCalled();
    });

    it("should delete a record with id and req.query and return 204 status", async () => {
      const mockParams = { id: "1" };
      mockRequest.params = mockParams;
      mockRequest.query = { published: true };
      mockArkosPrismaService.deleteOne.mockResolvedValue({ id: 1 });

      await baseController.deleteOne(mockRequest, mockResponse, mockNext);

      expect(mockArkosPrismaService.deleteOne).toHaveBeenCalledWith(
        { ...mockParams, published: true },
        {
          accessToken: undefined,
          user: undefined,
        }
      );
      expect(mockResponse.status).toHaveBeenCalledWith(204);
      expect(mockResponse.send).toHaveBeenCalled();
    });

    it("should call next with error if record not found with single id param", async () => {
      const mockParams = { id: "1" };
      mockRequest.params = mockParams;
      mockArkosPrismaService.deleteOne.mockResolvedValue(null as any);

      await baseController.deleteOne(mockRequest, mockResponse, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
      expect(mockResponse.send).not.toHaveBeenCalled();
    });

    it("should call next with error if record not found with multiple params", async () => {
      const mockParams = { slug: "test-post", category: "tech" };
      mockRequest.params = mockParams;
      mockArkosPrismaService.deleteOne.mockResolvedValue(null as any);

      await baseController.deleteOne(mockRequest, mockResponse, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
      expect(mockResponse.send).not.toHaveBeenCalled();
    });

    it("should call next with additionalData if afterDeleteOne hook exists", async () => {
      mockGetItem.mockReturnValue({ afterDeleteOne: jest.fn() });
      mockGetHooks.mockImplementation((_: string, op: string) => {
        if (op === "deleteOne") return { after: jest.fn() };
        return null;
      });
      baseController = new BaseController("Post");

      const mockParams = { id: "1" };
      const mockData = { id: 1 };
      mockRequest.params = mockParams;
      mockArkosPrismaService.deleteOne.mockResolvedValue(mockData);

      await baseController.deleteOne(mockRequest, mockResponse, mockNext);

      expect(mockRequest.additionalData).toEqual({ data: mockData });
      expect(mockRequest.responseStatus).toBe(204);
      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.send).not.toHaveBeenCalled();
    });
  });

  describe("deleteMany", () => {
    it("should return error if no filter criteria provided", async () => {
      await baseController.deleteMany(mockRequest, mockResponse, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
      expect(mockResponse.json).not.toHaveBeenCalled();
    });

    it("should return error if only prismaQueryOptions provided", async () => {
      mockRequest.query = { prismaQueryOptions: {} };

      await baseController.deleteMany(mockRequest, mockResponse, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
      expect(mockResponse.json).not.toHaveBeenCalled();
    });

    it("should delete multiple records and return 200 status", async () => {
      mockRequest.query = { title: "Test" };
      const mockResult = { count: 2 };
      mockArkosPrismaService.deleteMany.mockResolvedValue(mockResult as any);

      await baseController.deleteMany(mockRequest, mockResponse, mockNext);

      expect(mockArkosPrismaService.deleteMany).toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        results: mockResult.count,
        data: mockResult,
      });
    });

    it("should throw an error when trying to use OR as filterMode", async () => {
      mockRequest.query = { title: "Test", filterMode: "OR" };
      const mockResult = { count: 2 };
      mockArkosPrismaService.deleteMany.mockResolvedValue(mockResult as any);

      await baseController.deleteMany(mockRequest, mockResponse, mockNext);
      expect(mockNext).toHaveBeenCalled();
    });

    it("should call next with error if no records deleted", async () => {
      mockRequest.query = { title: "Test" };
      const mockResult = { count: 0 };
      mockArkosPrismaService.deleteMany.mockResolvedValue(mockResult as any);

      await baseController.deleteMany(mockRequest, mockResponse, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
      expect(mockResponse.json).not.toHaveBeenCalled();
    });

    it("should call next with error if deleteMany returns null", async () => {
      mockRequest.query = { title: "Test" };
      mockArkosPrismaService.deleteMany.mockResolvedValue(null as any);

      await baseController.deleteMany(mockRequest, mockResponse, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
      expect(mockResponse.json).not.toHaveBeenCalled();
    });

    it("should call next with responseData if afterDeleteMany hook exists", async () => {
      mockGetItem.mockReturnValue({ afterDeleteMany: jest.fn() });
      mockGetHooks.mockImplementation((_: string, op: string) => {
        if (op === "deleteMany") return { after: jest.fn() };
        return null;
      });
      baseController = new BaseController("Post");

      mockRequest.query = { title: "Test" };
      const mockResult = { count: 2 };
      mockArkosPrismaService.deleteMany.mockResolvedValue(mockResult as any);

      await baseController.deleteMany(mockRequest, mockResponse, mockNext);

      expect(mockRequest.responseData).toEqual({
        results: mockResult.count,
        data: mockResult,
      });
      expect(mockRequest.responseStatus).toBe(200);
      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.json).not.toHaveBeenCalled();
    });
  });

  describe("batchUpdate", () => {
    it("should update multiple records with different data and return 200 status", async () => {
      const mockBody = [
        { id: "1", title: "Updated Post 1" },
        { id: "2", title: "Updated Post 2" },
      ];
      const mockResult = [
        { id: 1, title: "Updated Post 1" },
        { id: 2, title: "Updated Post 2" },
      ];
      mockRequest.body = mockBody;
      mockArkosPrismaService.batchUpdate.mockResolvedValue(mockResult as any);

      await baseController.batchUpdate(mockRequest, mockResponse, mockNext);

      expect(mockArkosPrismaService.batchUpdate).toHaveBeenCalledWith(
        mockBody,
        {},
        {
          accessToken: undefined,
          user: undefined,
        }
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        results: mockResult.length,
        data: mockResult,
      });
    });

    it("should call next with error if batchUpdate returns null", async () => {
      mockRequest.body = [{ id: "1", title: "Updated Post 1" }];
      mockArkosPrismaService.batchUpdate.mockResolvedValue(null as any);

      await baseController.batchUpdate(mockRequest, mockResponse, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
      expect(mockResponse.json).not.toHaveBeenCalled();
    });

    it("should call next with error if batchUpdate returns empty array", async () => {
      mockRequest.body = [{ id: "1", title: "Updated Post 1" }];
      mockArkosPrismaService.batchUpdate.mockResolvedValue([]);

      await baseController.batchUpdate(mockRequest, mockResponse, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
      expect(mockResponse.json).not.toHaveBeenCalled();
    });

    it("should call next with responseData if afterBatchUpdate hook exists", async () => {
      mockGetItem.mockReturnValue({ afterBatchUpdate: jest.fn() });
      mockGetHooks.mockImplementation((_: string, op: string) => {
        if (op === "batchUpdate") return { after: jest.fn() };
        return null;
      });
      baseController = new BaseController("Post");

      const mockBody = [{ id: "1", title: "Updated Post 1" }];
      const mockResult = [{ id: 1, title: "Updated Post 1" }];
      mockRequest.body = mockBody;
      mockArkosPrismaService.batchUpdate.mockResolvedValue(mockResult as any);

      await baseController.batchUpdate(mockRequest, mockResponse, mockNext);

      expect(mockRequest.responseData).toEqual({
        results: mockResult.length,
        data: mockResult,
      });
      expect(mockRequest.responseStatus).toBe(200);
      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.json).not.toHaveBeenCalled();
    });
  });

  describe("batchDelete", () => {
    it("should delete multiple records and return 200 status", async () => {
      const mockBody = [{ id: "1" }, { id: "2" }];
      const mockResult = [{ id: 1 }, { id: 2 }];
      mockRequest.body = mockBody;
      mockArkosPrismaService.batchDelete.mockResolvedValue(mockResult as any);

      await baseController.batchDelete(mockRequest, mockResponse, mockNext);

      expect(mockArkosPrismaService.batchDelete).toHaveBeenCalledWith(mockBody, {
        accessToken: undefined,
        user: undefined,
      });
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        results: mockResult.length,
        data: mockResult,
      });
    });

    it("should call next with error if batchDelete returns null", async () => {
      mockRequest.body = [{ id: "1" }];
      mockArkosPrismaService.batchDelete.mockResolvedValue(null as any);

      await baseController.batchDelete(mockRequest, mockResponse, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
      expect(mockResponse.json).not.toHaveBeenCalled();
    });

    it("should call next with error if batchDelete returns empty array", async () => {
      mockRequest.body = [{ id: "1" }];
      mockArkosPrismaService.batchDelete.mockResolvedValue([]);

      await baseController.batchDelete(mockRequest, mockResponse, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
      expect(mockResponse.json).not.toHaveBeenCalled();
    });

    it("should call next with responseData if afterBatchDelete hook exists", async () => {
      mockGetItem.mockReturnValue({ afterBatchDelete: jest.fn() });
      mockGetHooks.mockImplementation((_: string, op: string) => {
        if (op === "batchDelete") return { after: jest.fn() };
        return null;
      });
      baseController = new BaseController("Post");

      const mockBody = [{ id: "1" }, { id: "2" }];
      const mockResult = [{ id: 1 }, { id: 2 }];
      mockRequest.body = mockBody;
      mockArkosPrismaService.batchDelete.mockResolvedValue(mockResult as any);

      await baseController.batchDelete(mockRequest, mockResponse, mockNext);

      expect(mockRequest.responseData).toEqual({
        results: mockResult.length,
        data: mockResult,
      });
      expect(mockRequest.responseStatus).toBe(200);
      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.json).not.toHaveBeenCalled();
    });
  });
});
