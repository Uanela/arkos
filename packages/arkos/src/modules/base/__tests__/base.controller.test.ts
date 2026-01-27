import { BaseController } from "../base.controller";
import { BaseService } from "../base.service";
import AppError from "../../error-handler/utils/app-error";
import APIFeatures from "../../../utils/features/api.features";
import { getModuleComponents } from "../../../utils/dynamic-loader";
import prismaSchemaParser from "../../../utils/prisma/prisma-schema-parser";

jest.mock("fs", () => ({
  ...jest.requireActual("fs"),
  readdirSync: jest.fn(),
  readFileSync: jest.fn(),
}));
jest.mock("../base.service");
jest.mock("../../error-handler/utils/app-error");
jest.mock("../../../utils/features/api.features");
jest.mock("../../../server");
jest.mock("../../../utils/dynamic-loader");
jest.mock("../../../utils/sheu");
jest.mock("../../../utils/prisma/prisma-schema-parser", () => ({
  parse: jest.fn(),
  getModelsAsArrayOfStrings: jest.fn(() => []),
}));

describe("BaseController", () => {
  let baseController: BaseController;
  let mockRequest: any;
  let mockResponse: any;
  let mockNext: jest.Mock;
  let mockBaseService: jest.Mocked<BaseService<any>>;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup mock service
    mockBaseService = new BaseService("Post") as jest.Mocked<BaseService<any>>;
    (BaseService as jest.Mock).mockImplementation(() => mockBaseService);

    // Setup mocked model modules
    (getModuleComponents as jest.Mock).mockReturnValue({
      interceptors: {
        // Empty object for most tests, will be populated when testing middleware flows
      },
    });

    // Setup mock for API features
    (APIFeatures as jest.Mock).mockImplementation(function (
      req: any,
      modelName: string
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

    // Setup mock request, response, and next
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

    // Create instance for testing
    baseController = new BaseController("Post");
  });

  describe("constructor", () => {
    it("should initialize controller with correct model name and service", () => {
      expect(BaseService).toHaveBeenCalledWith("Post");
      expect(getModuleComponents).toHaveBeenCalledWith("Post");
    });

    it("should initialize with empty interceptors when model modules return null", () => {
      (getModuleComponents as jest.Mock).mockReturnValue(null);
      new BaseController("User");
      expect(BaseService).toHaveBeenCalledWith("User");
    });

    it("should initialize with empty interceptors when model modules return undefined interceptors", () => {
      (getModuleComponents as jest.Mock).mockReturnValue({});
      new BaseController("User");
      expect(BaseService).toHaveBeenCalledWith("User");
    });
  });

  describe("createOne", () => {
    it("should create a record and return 201 status", async () => {
      const mockBody = { title: "Test Post" };
      const mockData = { id: 1, ...mockBody };
      mockRequest.body = mockBody;
      mockBaseService.createOne.mockResolvedValue(mockData);

      await baseController.createOne(mockRequest, mockResponse, mockNext);

      expect(mockBaseService.createOne).toHaveBeenCalledWith(
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

    it("should call next with responseData if afterCreateOne middleware exists", async () => {
      // Set up the middleware
      (getModuleComponents as jest.Mock).mockReturnValue({
        interceptors: { afterCreateOne: true },
      });
      baseController = new BaseController("Post");

      const mockData = { id: 1, title: "Test Post" };
      mockBaseService.createOne.mockResolvedValue(mockData);

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
      mockBaseService.createMany.mockResolvedValue(mockResult);

      await baseController.createMany(mockRequest, mockResponse, mockNext);

      expect(mockBaseService.createMany).toHaveBeenCalledWith(
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

    it("should call next with error if createMany returns null", async () => {
      const mockBody = [{ title: "Post 1" }];
      mockRequest.body = mockBody;
      mockBaseService.createMany.mockResolvedValue(null);

      await baseController.createMany(mockRequest, mockResponse, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
      expect(mockResponse.json).not.toHaveBeenCalled();
    });

    it("should call next with responseData if afterCreateMany middleware exists", async () => {
      (getModuleComponents as jest.Mock).mockReturnValue({
        interceptors: { afterCreateMany: true },
      });
      baseController = new BaseController("Post");

      const mockBody = [{ title: "Post 1" }];
      const mockResult = { count: 1 };
      mockRequest.body = mockBody;
      mockBaseService.createMany.mockResolvedValue(mockResult);

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
      mockBaseService.relationFields = {
        singular: [
          {
            name: "category",
            type: "Category",
            foreignKeyField: "categoryId",
            isArray: false,
            isRelation: true,
            isOptional: false,
            attributes: [],
          },
        ],
        list: [],
      };
    });

    it("should fetch records and return 200 status", async () => {
      const mockData = [{ id: 1, title: "Post 1" }];
      const mockTotal = 1;
      mockBaseService.findMany.mockResolvedValue(mockData);
      mockBaseService.count.mockResolvedValue(mockTotal);
      mockRequest.query = { published: true };

      await baseController.findMany(mockRequest, mockResponse, mockNext);

      expect(APIFeatures).toHaveBeenCalled();
      expect(mockBaseService.findMany).toHaveBeenCalledWith(
        { published: true },
        { take: 30, skip: 0 },
        {
          accessToken: undefined,
          user: undefined,
        }
      );
      expect(mockBaseService.count).toHaveBeenCalledWith(
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
      });
    });

    it("should call next with responseData if afterFindMany middleware exists", async () => {
      (getModuleComponents as jest.Mock).mockReturnValue({
        interceptors: { afterFindMany: true },
      });
      baseController = new BaseController("Post");

      const mockData = [{ id: 1, title: "Post 1" }];
      const mockTotal = 1;
      mockBaseService.findMany.mockResolvedValue(mockData);
      mockBaseService.count.mockResolvedValue(mockTotal);

      await baseController.findMany(mockRequest, mockResponse, mockNext);

      expect(mockRequest.responseData).toEqual({
        total: mockTotal,
        results: mockData.length,
        data: mockData,
      });
      expect(mockRequest.responseStatus).toBe(200);
      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.json).not.toHaveBeenCalled();
    });

    it("should handle case with no relation fields", async () => {
      (mockBaseService.relationFields as any) = null;
      const mockData = [{ id: 1, title: "Post 1" }];
      const mockTotal = 1;
      mockBaseService.findMany.mockResolvedValue(mockData);
      mockBaseService.count.mockResolvedValue(mockTotal);

      await baseController.findMany(mockRequest, mockResponse, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        total: mockTotal,
        results: mockData.length,
        data: mockData,
      });
    });
  });

  describe("findOne", () => {
    it("should fetch a record by id and return 200 status", async () => {
      const mockParams = { id: "1" };
      const mockData = { id: 1, title: "Test Post" };
      mockRequest.params = mockParams;
      mockBaseService.findOne.mockResolvedValue(mockData);

      await baseController.findOne(mockRequest, mockResponse, mockNext);

      expect(mockBaseService.findOne).toHaveBeenCalledWith(
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
      mockBaseService.findOne.mockResolvedValue(mockData);

      await baseController.findOne(mockRequest, mockResponse, mockNext);

      expect(mockBaseService.findOne).toHaveBeenCalledWith(
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
      mockBaseService.findOne.mockResolvedValue(null);

      await baseController.findOne(mockRequest, mockResponse, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
      expect(mockResponse.json).not.toHaveBeenCalled();
    });

    it("should call next with error if record not found with multiple params", async () => {
      const mockParams = { slug: "test-post", category: "tech" };
      mockRequest.params = mockParams;
      mockBaseService.findOne.mockResolvedValue(null);

      await baseController.findOne(mockRequest, mockResponse, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
      expect(mockResponse.json).not.toHaveBeenCalled();
    });

    it("should not return error if id param is 'me'", async () => {
      const mockParams = { id: "me" };
      mockRequest.params = mockParams;
      mockBaseService.findOne.mockResolvedValue(null);

      await baseController.findOne(mockRequest, mockResponse, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
      expect(mockResponse.json).not.toHaveBeenCalled();
    });

    it("should call next with responseData if afterFindOne middleware exists", async () => {
      (getModuleComponents as jest.Mock).mockReturnValue({
        interceptors: { afterFindOne: true },
      });
      baseController = new BaseController("Post");

      const mockParams = { id: "1" };
      const mockData = { id: 1, title: "Test Post" };
      mockRequest.params = mockParams;
      mockBaseService.findOne.mockResolvedValue(mockData);

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
      mockBaseService.updateOne.mockResolvedValue(mockData);

      await baseController.updateOne(mockRequest, mockResponse, mockNext);

      expect(mockBaseService.updateOne).toHaveBeenCalledWith(
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
      mockBaseService.updateOne.mockResolvedValue(mockData);

      await baseController.updateOne(mockRequest, mockResponse, mockNext);

      expect(mockBaseService.updateOne).toHaveBeenCalledWith(
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
      mockBaseService.updateOne.mockResolvedValue(null);

      await baseController.updateOne(mockRequest, mockResponse, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
      expect(mockResponse.json).not.toHaveBeenCalled();
    });

    it("should call next with error if record not found with multiple params", async () => {
      const mockParams = { slug: "test-post", category: "tech" };
      mockRequest.params = mockParams;
      mockRequest.body = { title: "Updated Post" };
      mockBaseService.updateOne.mockResolvedValue(null);

      await baseController.updateOne(mockRequest, mockResponse, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
      expect(mockResponse.json).not.toHaveBeenCalled();
    });

    it("should call next with responseData if afterUpdateOne middleware exists", async () => {
      (getModuleComponents as jest.Mock).mockReturnValue({
        interceptors: { afterUpdateOne: true },
      });
      baseController = new BaseController("Post");

      const mockParams = { id: "1" };
      const mockBody = { title: "Updated Post" };
      const mockData = { id: 1, ...mockBody };
      mockRequest.params = mockParams;
      mockRequest.body = mockBody;
      mockBaseService.updateOne.mockResolvedValue(mockData);

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
      mockRequest.query = { title: "Test" }; // Add filter criteria
      const mockBody = { published: true };
      const mockResult = { count: 2 };
      mockRequest.body = mockBody;
      mockBaseService.updateMany.mockResolvedValue(mockResult);
      // const baseControllerExecuteOperationSpy = jest.spyOn(
      //   baseController,
      //   "executeOperation" as any
      // );

      await baseController.updateMany(mockRequest, mockResponse, mockNext);

      expect(mockBaseService.updateMany).toHaveBeenCalled();
      expect(mockBaseService.updateMany).toHaveBeenCalledWith(
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
      mockBaseService.updateMany.mockResolvedValue(mockResult);

      await baseController.updateMany(mockRequest, mockResponse, mockNext);

      expect(mockRequest.query.filterMode).toBe("OR");
      expect(mockNext).toHaveBeenCalled();
    });

    it("should call next with error if no records updated", async () => {
      mockRequest.query = { title: "Test" };
      const mockResult = { count: 0 };
      mockRequest.body = { published: true };
      mockBaseService.updateMany.mockResolvedValue(mockResult);

      await baseController.updateMany(mockRequest, mockResponse, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
      expect(mockResponse.json).not.toHaveBeenCalled();
    });

    it("should call next with error if updateMany returns null", async () => {
      mockRequest.query = { title: "Test" };
      mockRequest.body = { published: true };
      mockBaseService.updateMany.mockResolvedValue(null);

      await baseController.updateMany(mockRequest, mockResponse, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
      expect(mockResponse.json).not.toHaveBeenCalled();
    });

    it("should call next with responseData if afterUpdateMany middleware exists", async () => {
      (getModuleComponents as jest.Mock).mockReturnValue({
        interceptors: { afterUpdateMany: true },
      });
      baseController = new BaseController("Post");

      mockRequest.query = { title: "Test" };
      const mockBody = { published: true };
      const mockResult = { count: 2 };
      mockRequest.body = mockBody;
      mockBaseService.updateMany.mockResolvedValue(mockResult);

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
      mockBaseService.deleteOne.mockResolvedValue({ id: 1 });

      await baseController.deleteOne(mockRequest, mockResponse, mockNext);

      expect(mockBaseService.deleteOne).toHaveBeenCalledWith(mockParams, {
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
      mockBaseService.deleteOne.mockResolvedValue({ id: 1 });

      await baseController.deleteOne(mockRequest, mockResponse, mockNext);

      expect(mockBaseService.deleteOne).toHaveBeenCalledWith(
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
      mockBaseService.deleteOne.mockResolvedValue(null);

      await baseController.deleteOne(mockRequest, mockResponse, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
      expect(mockResponse.send).not.toHaveBeenCalled();
    });

    it("should call next with error if record not found with multiple params", async () => {
      const mockParams = { slug: "test-post", category: "tech" };
      mockRequest.params = mockParams;
      mockBaseService.deleteOne.mockResolvedValue(null);

      await baseController.deleteOne(mockRequest, mockResponse, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
      expect(mockResponse.send).not.toHaveBeenCalled();
    });

    it("should call next with additionalData if afterDeleteOne middleware exists", async () => {
      (getModuleComponents as jest.Mock).mockReturnValue({
        interceptors: { afterDeleteOne: true },
      });
      baseController = new BaseController("Post");

      const mockParams = { id: "1" };
      const mockData = { id: 1 };
      mockRequest.params = mockParams;
      mockBaseService.deleteOne.mockResolvedValue(mockData);

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
      mockRequest.query = { title: "Test" }; // Add filter criteria
      const mockResult = { count: 2 };
      mockBaseService.deleteMany.mockResolvedValue(mockResult);

      await baseController.deleteMany(mockRequest, mockResponse, mockNext);

      expect(mockBaseService.deleteMany).toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        results: mockResult.count,
        data: mockResult,
      });
    });

    it("should throw an error when trying to use OR as filterMode", async () => {
      mockRequest.query = { title: "Test", filterMode: "OR" };
      const mockResult = { count: 2 };
      mockBaseService.deleteMany.mockResolvedValue(mockResult);

      await baseController.deleteMany(mockRequest, mockResponse, mockNext);
      expect(mockNext).toHaveBeenCalled(); // Means that req.query.filterMode OR was rejected
    });

    it("should call next with error if no records deleted", async () => {
      mockRequest.query = { title: "Test" };
      const mockResult = { count: 0 };
      mockBaseService.deleteMany.mockResolvedValue(mockResult);

      await baseController.deleteMany(mockRequest, mockResponse, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
      expect(mockResponse.json).not.toHaveBeenCalled();
    });

    it("should call next with error if deleteMany returns null", async () => {
      mockRequest.query = { title: "Test" };
      mockBaseService.deleteMany.mockResolvedValue(null);

      await baseController.deleteMany(mockRequest, mockResponse, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
      expect(mockResponse.json).not.toHaveBeenCalled();
    });

    it("should call next with responseData if afterDeleteMany middleware exists", async () => {
      (getModuleComponents as jest.Mock).mockReturnValue({
        interceptors: { afterDeleteMany: true },
      });
      baseController = new BaseController("Post");

      mockRequest.query = { title: "Test" };
      const mockResult = { count: 2 };
      mockBaseService.deleteMany.mockResolvedValue(mockResult);

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

  describe("getAvailableResources", () => {
    it("should return available resources", async () => {
      const { getAvailableResources } = require("../base.controller");
      const mockModels = ["Post", "User", "Comment", "AuthRole"];
      jest
        .spyOn(prismaSchemaParser, "getModelsAsArrayOfStrings")
        .mockReturnValue(mockModels);

      await getAvailableResources(mockRequest, mockResponse, mockNext);

      expect(
        jest.spyOn(prismaSchemaParser, "getModelsAsArrayOfStrings")
      ).toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        data: ["post", "user", "comment", "auth-role", "file-upload"],
      });
    });
  });
});
