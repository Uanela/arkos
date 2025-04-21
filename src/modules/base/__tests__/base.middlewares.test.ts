import { NextFunction, Request, Response } from "express";
import {
  callNext,
  sendResponse,
  addPrismaQueryOptionsToRequestQuery,
  handleRequestLogs,
} from "../base.middlewares"; // Update with the correct path

// Mock console.info for testing log output
jest.spyOn(console, "info").mockImplementation(() => {});
// jest.spyOn(global, "Date").mock(new Date());
jest.mock("fs");

describe("Express Middleware Functions", () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let nextFunction: NextFunction;

  beforeEach(() => {
    mockRequest = {
      method: "GET",
      originalUrl: "/test",
      query: {},
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
      callNext(mockRequest as Request, mockResponse as Response, nextFunction);
      expect(nextFunction).toHaveBeenCalledTimes(1);
    });
  });

  describe("sendResponse", () => {
    it("should send response with status and data when both are provided", () => {
      (mockRequest as any).responseStatus = 200;
      (mockRequest as any).responseData = { success: true };

      sendResponse(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({ success: true });
    });

    it("should send empty response with status when only status is provided", () => {
      (mockRequest as any).responseStatus = 204;

      sendResponse(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockResponse.status).toHaveBeenCalledWith(204);
      expect(mockResponse.send).toHaveBeenCalled();
    });

    it("should send 500 error when no status or data is attached", () => {
      sendResponse(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: "No status or data attached to the response",
      });
    });
  });

  describe("addPrismaQueryOptionsToRequestQuery", () => {
    it("should add the general query options when action has no specific options", () => {
      const prismaQueryOptions = {
        queryOptions: {
          include: { profile: true },
        },
      };

      const middleware = addPrismaQueryOptionsToRequestQuery(
        prismaQueryOptions,
        "findMany"
      );
      middleware(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockRequest.query!.prismaQueryOptions).toBe(
        JSON.stringify({ include: { profile: true } })
      );
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

      const middleware = addPrismaQueryOptionsToRequestQuery(
        prismaQueryOptions,
        "findMany"
      );
      middleware(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockRequest.query!.prismaQueryOptions).toBe(
        JSON.stringify({
          include: { profile: true },
          orderBy: { createdAt: "desc" },
        })
      );
      expect(nextFunction).toHaveBeenCalledTimes(1);
    });

    it("should handle undefined prismaQueryOptions", () => {
      const middleware = addPrismaQueryOptionsToRequestQuery(
        undefined as any,
        "findMany"
      );
      middleware(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      expect(mockRequest.query!.prismaQueryOptions).toBe(JSON.stringify({}));
      expect(nextFunction).toHaveBeenCalledTimes(1);
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
        mockRequest as Request,
        mockResponse as Response,
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
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      const postCall = (console.info as jest.Mock).mock.calls[0][0];
      expect(postCall).toContain("POST");

      jest.clearAllMocks();

      mockRequest.method = "DELETE";
      handleRequestLogs(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      const deleteCall = (console.info as jest.Mock).mock.calls[0][0];
      expect(deleteCall).toContain("DELETE");
    });

    it("should properly decode URL in the log", () => {
      mockRequest.originalUrl = "/test%20with%20spaces";
      handleRequestLogs(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction
      );

      const consoleCall = (console.info as jest.Mock).mock.calls[0][0];
      expect(consoleCall).toContain("/test with spaces");
    });
  });
});
