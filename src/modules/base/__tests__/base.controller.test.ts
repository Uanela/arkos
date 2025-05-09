import { BaseController } from "../base.controller";
import { BaseService } from "../base.service";
import AppError from "../../error-handler/utils/app-error";
import APIFeatures from "../../../utils/features/api.features";
import { getExpressApp } from "../../../server";
import {
  getModelModules,
  getModels,
} from "../../../utils/helpers/models.helpers";
import { kebabCase } from "../../../utils/helpers/change-case.helpers";

// Mock dependencies
jest.mock("fs", () => ({
  ...jest.requireActual("fs"),
  readdirSync: jest.fn(),
}));
jest.mock("../base.service");
jest.mock("../../error-handler/utils/app-error");
jest.mock("../../../utils/features/api.features");
jest.mock("../../../server");
jest.mock("../../../utils/helpers/models.helpers");
jest.mock("../../../utils/helpers/change-case.helpers");

describe("BaseController", () => {
  let baseController: BaseController;
  let mockRequest: any;
  let mockResponse: any;
  let mockNext: jest.Mock;
  let mockBaseService: jest.Mocked<BaseService>;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup mock service
    mockBaseService = new BaseService("Post") as jest.Mocked<BaseService>;
    (BaseService as jest.Mock).mockImplementation(() => mockBaseService);

    // Setup mocked model modules
    (getModelModules as jest.Mock).mockReturnValue({
      middlewares: {
        // Empty object for most tests, will be populated when testing middleware flows
      },
    });

    // Setup mock for API features
    (APIFeatures as jest.Mock).mockImplementation(() => ({
      filter: jest.fn().mockReturnThis(),
      sort: jest.fn().mockReturnThis(),
      limitFields: jest.fn().mockReturnThis(),
      paginate: jest.fn().mockReturnThis(),
      filters: { where: { published: true } },
    }));

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
    };
    mockNext = jest.fn();

    // Create instance for testing
    baseController = new BaseController("Post");
  });

  describe("constructor", () => {
    it("should initialize controller with correct model name and service", () => {
      expect(BaseService).toHaveBeenCalledWith("Post");
      expect(getModelModules).toHaveBeenCalledWith("Post");
    });
  });

  describe("createOne", () => {
    it("should create a record and return 201 status", async () => {
      const mockBody = { title: "Test Post" };
      const mockData = { id: 1, ...mockBody };
      mockRequest.body = mockBody;
      mockBaseService.createOne.mockResolvedValue(mockData);

      await baseController.createOne(mockRequest, mockResponse, mockNext);

      expect(mockBaseService.createOne).toHaveBeenCalledWith(mockBody, {});
      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith({ data: mockData });
    });

    it("should call next with responseData if afterCreateOne middleware exists", async () => {
      // Set up the middleware
      (getModelModules as jest.Mock).mockReturnValue({
        middlewares: { afterCreateOne: true },
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
      const mockResult: any = { data: { count: 2 }, total: 5 };
      mockRequest.body = mockBody;
      mockBaseService.createMany.mockResolvedValue(mockResult);

      await baseController.createMany(mockRequest, mockResponse, mockNext);

      expect(mockBaseService.createMany).toHaveBeenCalledWith(mockBody, {});
      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith({
        data: {
          data: {
            count: 2,
          },
          total: 5,
        },
      });
    });
  });

  describe("findMany", () => {
    it("should fetch records and return 200 status", async () => {
      const mockData = [{ id: 1, title: "Post 1" }];
      const mockResult = { data: mockData, total: 1 };
      mockBaseService.relationFields = {
        singular: [{ name: "category", type: "Category" }],
        list: [],
      };
      mockBaseService.findMany.mockResolvedValue(mockResult);

      await baseController.findMany(mockRequest, mockResponse, mockNext);

      expect(APIFeatures).toHaveBeenCalled();
      expect(mockBaseService.findMany).toHaveBeenCalledWith(
        {
          published: true,
        },
        expect.any(Object)
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        data: mockResult,
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

      expect(mockBaseService.findOne).toHaveBeenCalledWith(mockParams, {});
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({ data: mockData });
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
        {}
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({ data: mockData });
    });
  });

  describe("updateMany", () => {
    it("should return error if no filter criteria provided", async () => {
      await baseController.updateMany(mockRequest, mockResponse, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
      expect(mockResponse.json).not.toHaveBeenCalled();
    });

    it("should update multiple records and return 200 status", async () => {
      mockRequest.query = { title: "Test" }; // Add filter criteria
      const mockBody = { published: true };
      const mockResult: any = { data: { count: 2 }, total: 2 };
      mockRequest.body = mockBody;
      mockBaseService.updateMany.mockResolvedValue(mockResult);

      await baseController.updateMany(mockRequest, mockResponse, mockNext);

      expect(mockBaseService.updateMany).toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        data: mockResult,
      });
    });
  });

  describe("deleteOne", () => {
    it("should delete a record and return 204 status", async () => {
      const mockParams = { id: "1" };
      mockRequest.params = mockParams;
      mockBaseService.deleteOne.mockResolvedValue({ id: 1 });

      await baseController.deleteOne(mockRequest, mockResponse, mockNext);

      expect(mockBaseService.deleteOne).toHaveBeenCalledWith(mockParams);
      expect(mockResponse.status).toHaveBeenCalledWith(204);
      expect(mockResponse.send).toHaveBeenCalled();
    });
  });

  describe("deleteMany", () => {
    it("should return error if no filter criteria provided", async () => {
      await baseController.deleteMany(mockRequest, mockResponse, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
      expect(mockResponse.json).not.toHaveBeenCalled();
    });

    it("should delete multiple records and return 200 status", async () => {
      mockRequest.query = { title: "Test" }; // Add filter criteria
      const mockResult: any = { data: { count: 2 }, total: 2 };
      mockBaseService.deleteMany.mockResolvedValue(mockResult);

      await baseController.deleteMany(mockRequest, mockResponse, mockNext);

      expect(mockBaseService.deleteMany).toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        data: mockResult,
      });
    });
  });

  describe("getAvailableResources", () => {
    it("should return available resources", async () => {
      const { getAvailableResources } = require("../base.controller");
      const mockModels = ["Post", "User", "Comment"];
      (getModels as jest.Mock).mockReturnValue(mockModels);
      (kebabCase as jest.Mock).mockImplementation((str) => str.toLowerCase());

      await getAvailableResources(mockRequest, mockResponse, mockNext);

      expect(getModels).toHaveBeenCalled();
      expect(kebabCase).toHaveBeenCalledTimes(3);
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        data: ["post", "user", "comment", "file-upload"],
      });
    });
  });

  describe("getAvalibleRoutes", () => {
    it("should return available routes", () => {
      const { getAvalibleRoutes } = require("../base.controller");

      const mockApp = {
        _router: {
          stack: [
            {
              route: {
                path: "/posts",
                methods: { get: true },
              },
            },
            {
              handle: {
                stack: [
                  {
                    route: {
                      path: "/users",
                      methods: { post: true },
                    },
                  },
                ],
              },
            },
          ],
        },
      };

      (getExpressApp as jest.Mock).mockReturnValue(mockApp);

      getAvalibleRoutes(mockRequest, mockResponse, mockNext);

      expect(getExpressApp).toHaveBeenCalled();
      expect(mockResponse.json).toHaveBeenCalledWith([
        { method: "GET", path: "/posts" },
        { method: "POST", path: "/users" },
      ]);
    });
  });
});
