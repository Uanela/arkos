import { NextFunction } from "express";
import {
  callNext,
  sendResponse,
  addPrismaQueryOptionsToRequest,
  handleRequestLogs,
} from "../base.middlewares"; // Update with the correct path
import {
  ArkosRequest,
  ArkosResponse,
  AuthPrismaQueryOptions,
} from "../../../types";

// Mock the config helper
jest.mock("../../../server", () => ({
  getArkosConfig: jest.fn().mockReturnValue({
    request: {
      parameters: {
        allowDangerousPrismaQueryOptions: false,
      },
    },
  }),
}));

// Mock console.info for testing log output
jest.spyOn(console, "info").mockImplementation(() => {});
jest.mock("fs");

describe("Express Middleware Functions", () => {
  let mockRequest: Partial<ArkosRequest>;
  let mockResponse: Partial<ArkosResponse>;
  let nextFunction: NextFunction;

  beforeEach(() => {
    mockRequest = {
      method: "GET",
      originalUrl: "/test",
      query: {},
      prismaQueryOptions: {},
    };

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
      on: jest.fn().mockImplementation((event, callback) => {
        if (event === "finish") {
          callback();
        }
        return mockResponse;
      }),
    };

    nextFunction = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("callNext", () => {
    it("should call the next middleware function", () => {
      callNext(
        mockRequest as ArkosRequest,
        mockResponse as ArkosResponse,
        nextFunction
      );
      expect(nextFunction).toHaveBeenCalledTimes(1);
    });
  });

  describe("sendResponse", () => {
    it("should send response with status and data when both are provided", () => {
      (mockRequest as any).responseStatus = 200;
      (mockRequest as any).responseData = { success: true };

      sendResponse(
        mockRequest as ArkosRequest,
        mockResponse as ArkosResponse,
        nextFunction
      );

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({ success: true });
    });

    it("should send empty response with status when only status is provided", () => {
      (mockRequest as any).responseStatus = 204;

      sendResponse(
        mockRequest as ArkosRequest,
        mockResponse as ArkosResponse,
        nextFunction
      );

      expect(mockResponse.status).toHaveBeenCalledWith(204);
      expect(mockResponse.send).toHaveBeenCalled();
    });

    it("should send 500 error when no status or data is attached", () => {
      sendResponse(
        mockRequest as ArkosRequest,
        mockResponse as ArkosResponse,
        nextFunction
      );

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: "No status or data attached to the response",
      });
    });
  });

  describe("addPrismaQueryOptionsToRequest", () => {
    describe("Standard PrismaQueryOptions", () => {
      it("should add the general query options when action has no specific options", () => {
        const prismaQueryOptions = {
          queryOptions: {
            include: { profile: true },
          },
        };

        const middleware = addPrismaQueryOptionsToRequest(
          prismaQueryOptions,
          "findMany"
        );
        middleware(
          mockRequest as ArkosRequest,
          mockResponse as ArkosResponse,
          nextFunction
        );

        expect(mockRequest!.prismaQueryOptions).toEqual({
          include: { profile: true },
        });
        expect(nextFunction).toHaveBeenCalledTimes(1);
      });

      it("should merge general and action-specific query options", () => {
        const prismaQueryOptions = {
          queryOptions: {
            include: { profile: true },
          },
          findMany: {
            orderBy: { createdAt: "desc" },
          },
        };

        const middleware = addPrismaQueryOptionsToRequest(
          prismaQueryOptions,
          "findMany"
        );
        middleware(
          mockRequest as ArkosRequest,
          mockResponse as ArkosResponse,
          nextFunction
        );

        expect(mockRequest.prismaQueryOptions).toEqual({
          include: { profile: true },
          orderBy: { createdAt: "desc" },
        });
        expect(nextFunction).toHaveBeenCalledTimes(1);
      });

      it("should handle undefined prismaQueryOptions", () => {
        const middleware = addPrismaQueryOptionsToRequest(
          undefined as any,
          "findMany"
        );
        middleware(
          mockRequest as ArkosRequest,
          mockResponse as ArkosResponse,
          nextFunction
        );

        expect(mockRequest.prismaQueryOptions).toEqual({});
        expect(nextFunction).toHaveBeenCalledTimes(1);
      });
    });

    describe("Auth PrismaQueryOptions", () => {
      it("should handle auth-specific query options like getMe", () => {
        const authPrismaQueryOptions: AuthPrismaQueryOptions<any> = {
          getMe: {
            include: { profile: true, roles: true },
            select: { email: true, id: true },
          },
        };

        const middleware = addPrismaQueryOptionsToRequest(
          authPrismaQueryOptions,
          "getMe"
        );
        middleware(
          mockRequest as ArkosRequest,
          mockResponse as ArkosResponse,
          nextFunction
        );

        expect(mockRequest.prismaQueryOptions).toEqual({
          include: { profile: true, roles: true },
          select: { email: true, id: true },
        });
        expect(nextFunction).toHaveBeenCalledTimes(1);
      });

      it("should handle auth-specific query options like login", () => {
        const authPrismaQueryOptions: AuthPrismaQueryOptions<any> = {
          login: {
            select: { id: true, passwordHash: true, salt: true },
          },
        };

        const middleware = addPrismaQueryOptionsToRequest(
          authPrismaQueryOptions,
          "login"
        );
        middleware(
          mockRequest as ArkosRequest,
          mockResponse as ArkosResponse,
          nextFunction
        );

        expect(mockRequest.prismaQueryOptions).toEqual({
          select: { id: true, passwordHash: true, salt: true },
        });
        expect(nextFunction).toHaveBeenCalledTimes(1);
      });

      it("should handle auth-specific query options like signup", () => {
        const authPrismaQueryOptions: AuthPrismaQueryOptions<any> = {
          signup: {
            data: {
              defaultRole: "USER",
              status: "ACTIVE",
            },
          },
        };

        const middleware = addPrismaQueryOptionsToRequest(
          authPrismaQueryOptions,
          "signup"
        );
        middleware(
          mockRequest as ArkosRequest,
          mockResponse as ArkosResponse,
          nextFunction
        );

        expect(mockRequest.prismaQueryOptions).toEqual({
          data: {
            defaultRole: "USER",
            status: "ACTIVE",
          },
        });
        expect(nextFunction).toHaveBeenCalledTimes(1);
      });

      it("should handle auth-specific query options like updatePassword", () => {
        const authPrismaQueryOptions: AuthPrismaQueryOptions<any> = {
          updatePassword: {
            select: { passwordUpdatedAt: true },
          },
        };

        const middleware = addPrismaQueryOptionsToRequest(
          authPrismaQueryOptions,
          "updatePassword"
        );
        middleware(
          mockRequest as ArkosRequest,
          mockResponse as ArkosResponse,
          nextFunction
        );

        expect(mockRequest.prismaQueryOptions).toEqual({
          select: { passwordUpdatedAt: true },
        });
        expect(nextFunction).toHaveBeenCalledTimes(1);
      });
    });

    describe("Dynamic PrismaQueryOptions from Request", () => {
      beforeEach(() => {
        // Mock the config helper to allow dangerous query options
        jest.requireMock("../../../server").getArkosConfig.mockReturnValue({
          request: {
            parameters: {
              allowDangerousPrismaQueryOptions: true,
            },
          },
        });
      });

      it("should merge query options from request parameters when allowed", () => {
        mockRequest.query = {
          prismaQueryOptions: JSON.stringify({
            where: { status: "ACTIVE" },
          }),
        };

        const prismaQueryOptions = {
          queryOptions: {
            include: { profile: true },
          },
          findMany: {
            orderBy: { createdAt: "desc" },
          },
        };

        const middleware = addPrismaQueryOptionsToRequest(
          prismaQueryOptions,
          "findMany"
        );
        middleware(
          mockRequest as ArkosRequest,
          mockResponse as ArkosResponse,
          nextFunction
        );

        expect(mockRequest.prismaQueryOptions).toEqual({
          include: { profile: true },
          orderBy: { createdAt: "desc" },
          where: { status: "ACTIVE" },
        });
      });

      it("should handle malformed JSON in request parameters", () => {
        mockRequest.query = {
          prismaQueryOptions: "not-json",
        };

        const prismaQueryOptions = {
          queryOptions: {
            include: { profile: true },
          },
        };

        const middleware = addPrismaQueryOptionsToRequest(
          prismaQueryOptions,
          "findMany"
        );

        expect(() => {
          middleware(
            mockRequest as ArkosRequest,
            mockResponse as ArkosResponse,
            nextFunction
          );
        }).toThrow(); // Should throw JSON parse error
      });

      it("should handle empty request parameters", () => {
        mockRequest.query = {};

        const prismaQueryOptions = {
          queryOptions: {
            include: { profile: true },
          },
        };

        const middleware = addPrismaQueryOptionsToRequest(
          prismaQueryOptions,
          "findMany"
        );
        middleware(
          mockRequest as ArkosRequest,
          mockResponse as ArkosResponse,
          nextFunction
        );

        expect(mockRequest.prismaQueryOptions).toEqual({
          include: { profile: true },
        });
      });
    });
  });

  describe("handleRequestLogs", () => {
    let originalDateNow: any;
    let originalDate: any;

    beforeEach(() => {
      // Store original Date and Date.now
      originalDate = global.Date;
      originalDateNow = Date.now;

      // Mock Date.now first
      let callCount = 0;
      const mockNow = jest.fn(() => {
        callCount++;
        return callCount === 1 ? 1000 : 1500; // First call 1000, second call 1500 (500ms difference)
      });

      // Create a mock Date constructor
      const mockDate = new Date(2023, 0, 1, 12, 0, 0); // January 1, 2023, 12:00:00

      // Add necessary mock methods to the date instance
      mockDate.getDay = jest.fn(() => 0); // Sunday
      mockDate.getDate = jest.fn(() => 1); // 1st day of month
      mockDate.toTimeString = jest.fn(() => "12:00:00 GMT+0000");

      // Create a mock Date constructor function
      const MockDateConstructor: any = function () {
        return mockDate;
      };

      // Copy all properties from original Date
      Object.setPrototypeOf(MockDateConstructor, Date);
      MockDateConstructor.now = mockNow;

      // Replace global Date
      global.Date = MockDateConstructor as DateConstructor;
    });

    afterEach(() => {
      // Restore original Date and Date.now
      global.Date = originalDate;
      Date.now = originalDateNow;

      jest.clearAllMocks();
    });

    it("should log request details on response finish", () => {
      handleRequestLogs(
        mockRequest as ArkosRequest,
        mockResponse as ArkosResponse,
        nextFunction
      );

      // Verify next was called
      expect(nextFunction).toHaveBeenCalledTimes(1);

      // Verify that console.info was called with the expected log format
      expect(console.info).toHaveBeenCalledTimes(1);

      // Since we can't easily test the exact string with ANSI colors, let's check for key elements
      const consoleCall = (console.info as jest.Mock).mock.calls[0][0];
      expect(consoleCall).toContain("INFO");
      expect(consoleCall).toContain("GET");
      expect(consoleCall).toContain("/test");
      expect(consoleCall).toContain("500ms");
    });

    it("should use the correct color for different HTTP methods", () => {
      mockRequest.method = "POST";
      handleRequestLogs(
        mockRequest as ArkosRequest,
        mockResponse as ArkosResponse,
        nextFunction
      );

      const postCall = (console.info as jest.Mock).mock.calls[0][0];
      expect(postCall).toContain("POST");

      jest.clearAllMocks();

      mockRequest.method = "DELETE";
      handleRequestLogs(
        mockRequest as ArkosRequest,
        mockResponse as ArkosResponse,
        nextFunction
      );

      const deleteCall = (console.info as jest.Mock).mock.calls[0][0];
      expect(deleteCall).toContain("DELETE");
    });

    it("should properly decode URL in the log", () => {
      mockRequest.originalUrl = "/test%20with%20spaces";
      handleRequestLogs(
        mockRequest as ArkosRequest,
        mockResponse as ArkosResponse,
        nextFunction
      );

      const consoleCall = (console.info as jest.Mock).mock.calls[0][0];
      expect(consoleCall).toContain("/test with spaces");
    });
  });
});
