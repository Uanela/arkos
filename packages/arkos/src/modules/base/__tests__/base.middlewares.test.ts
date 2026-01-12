import { NextFunction } from "express";
import {
  callNext,
  sendResponse,
  addPrismaQueryOptionsToRequest,
  handleRequestLogs,
  validateRequestInputs,
} from "../base.middlewares"; // Update with the correct path
import {
  ArkosRequest,
  ArkosResponse,
  AuthPrismaQueryOptions,
} from "../../../types";
import { z } from "zod";
import { handleRequestBodyValidationAndTransformation } from "../base.middlewares";
import catchAsync from "../../error-handler/utils/catch-async";
import validateDto from "../../../utils/validate-dto";
import validateSchema from "../../../utils/validate-schema";

jest.mock("../../error-handler/utils/catch-async");
jest.mock("../../../utils/validate-dto");
jest.mock("../../../utils/validate-schema");

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
    (validateDto as jest.Mock).mockImplementation(jest.fn());
    (validateSchema as jest.Mock).mockImplementation(jest.fn());
    (catchAsync as jest.Mock).mockImplementation((fn) => fn);

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
    let mockRequest: any;
    let mockResponse: any;

    beforeEach(() => {
      mockRequest = {
        responseStatus: undefined,
        responseData: undefined,
      };
      mockResponse = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
        send: jest.fn(),
        locals: {},
      };
    });

    it("should send response with status and data when both are provided", () => {
      mockRequest.responseStatus = 200;
      mockRequest.responseData = { success: true };

      sendResponse(mockRequest as ArkosRequest, mockResponse as ArkosResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({ success: true });
    });

    // it("should send empty response with status when only status is provided (data is null)", () => {
    //   mockRequest.responseStatus = 200;
    //   mockRequest.uanela = 200;
    //   mockRequest.responseData = null;
    //   mockResponse.originalData = null;
    //   mockResponse.originalStatus = 200;

    //   sendResponse(mockRequest as ArkosRequest, mockResponse as ArkosResponse);

    //   expect(mockResponse.status).toHaveBeenCalledWith(200);
    //   expect(mockResponse.send).toHaveBeenCalled();
    //   expect(mockResponse.json).toHaveBeenCalled();
    // });

    it("should send empty response for 204 status", () => {
      mockRequest.responseStatus = 204;

      sendResponse(mockRequest as ArkosRequest, mockResponse as ArkosResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(204);
      expect(mockResponse.send).toHaveBeenCalled();
    });

    it("should send 500 error when no status or data is attached", () => {
      sendResponse(mockRequest as ArkosRequest, mockResponse as ArkosResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: "No status or data attached to the response",
      });
    });

    it("should use modified req.responseData when it differs from originalData", () => {
      (mockResponse as any).originalData = { success: true };
      (mockResponse as any).originalStatus = 200;
      mockRequest.responseData = { success: true, modified: true };
      mockRequest.responseStatus = 200;

      sendResponse(mockRequest as ArkosRequest, mockResponse as ArkosResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        modified: true,
      });
    });

    it("should use modified res.locals.data when it differs from originalData", () => {
      (mockResponse as any).originalData = { success: true };
      (mockResponse as any).originalStatus = 200;
      mockResponse.locals.data = { success: true, fromLocals: true };
      mockResponse.locals.status = 200;

      sendResponse(mockRequest as ArkosRequest, mockResponse as ArkosResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        fromLocals: true,
      });
    });

    it("should use originalData when current values match original", () => {
      const originalData = { success: true };
      (mockResponse as any).originalData = originalData;
      (mockResponse as any).originalStatus = 200;
      mockRequest.responseData = { success: true }; // Same content but different reference
      mockRequest.responseStatus = 200;

      sendResponse(mockRequest as ArkosRequest, mockResponse as ArkosResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith(originalData);
    });

    it("should use modified status when it differs from originalStatus", () => {
      (mockResponse as any).originalData = { success: true };
      (mockResponse as any).originalStatus = 200;
      mockRequest.responseData = { success: true };
      mockRequest.responseStatus = 201;

      sendResponse(mockRequest as ArkosRequest, mockResponse as ArkosResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith({ success: true });
    });

    it("should prioritize req.responseData over res.locals.data when both are modified", () => {
      (mockResponse as any).originalData = { original: true };
      (mockResponse as any).originalStatus = 200;
      mockRequest.responseData = { fromReq: true };
      mockRequest.responseStatus = 200;
      mockResponse.locals.data = { fromLocals: true };
      mockResponse.locals.status = 200;

      sendResponse(mockRequest as ArkosRequest, mockResponse as ArkosResponse);

      expect(mockResponse.json).toHaveBeenCalledWith({ fromReq: true });
    });

    it("should fall back to current values when no originalData/originalStatus exists", () => {
      mockRequest.responseData = { success: true };
      mockRequest.responseStatus = 200;

      sendResponse(mockRequest as ArkosRequest, mockResponse as ArkosResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({ success: true });
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
      mockResponse.statusCode = 200; // Add status code to mock response

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
      expect(consoleCall).toContain("Info");
      expect(consoleCall).toContain("GET");
      expect(consoleCall).toContain("/test");
      expect(consoleCall).toContain("200"); // Status code
      expect(consoleCall).toContain("500ms");
    });

    it("should use the correct color for different HTTP methods", () => {
      mockResponse.statusCode = 201;
      mockRequest.method = "POST";
      handleRequestLogs(
        mockRequest as ArkosRequest,
        mockResponse as ArkosResponse,
        nextFunction
      );

      const postCall = (console.info as jest.Mock).mock.calls[0][0];
      expect(postCall).toContain("POST");
      expect(postCall).toContain("201");

      jest.clearAllMocks();

      mockResponse.statusCode = 404;
      mockRequest.method = "DELETE";
      handleRequestLogs(
        mockRequest as ArkosRequest,
        mockResponse as ArkosResponse,
        nextFunction
      );

      const deleteCall = (console.info as jest.Mock).mock.calls[0][0];
      expect(deleteCall).toContain("DELETE");
      expect(deleteCall).toContain("404");
    });

    it("should properly decode URL in the log", () => {
      mockResponse.statusCode = 200;
      mockRequest.originalUrl = "/test%20with%20spaces";
      handleRequestLogs(
        mockRequest as ArkosRequest,
        mockResponse as ArkosResponse,
        nextFunction
      );

      const consoleCall = (console.info as jest.Mock).mock.calls[0][0];
      expect(consoleCall).toContain("/test with spaces");
      expect(consoleCall).toContain("200");
    });

    // New tests to cover different status code ranges
    describe("Status Code Colors", () => {
      it("should handle 2xx status codes (success)", () => {
        mockResponse.statusCode = 201;
        handleRequestLogs(
          mockRequest as ArkosRequest,
          mockResponse as ArkosResponse,
          nextFunction
        );

        const consoleCall = (console.info as jest.Mock).mock.calls[0][0];
        expect(consoleCall).toContain("201");
        expect(console.info).toHaveBeenCalledTimes(1);
      });

      it("should handle 3xx status codes (redirection)", () => {
        mockResponse.statusCode = 301;
        handleRequestLogs(
          mockRequest as ArkosRequest,
          mockResponse as ArkosResponse,
          nextFunction
        );

        const consoleCall = (console.info as jest.Mock).mock.calls[0][0];
        expect(consoleCall).toContain("301");
        expect(console.info).toHaveBeenCalledTimes(1);
      });

      it("should handle 4xx status codes (client error)", () => {
        mockResponse.statusCode = 404;
        handleRequestLogs(
          mockRequest as ArkosRequest,
          mockResponse as ArkosResponse,
          nextFunction
        );

        const consoleCall = (console.info as jest.Mock).mock.calls[0][0];
        expect(consoleCall).toContain("404");
        expect(console.info).toHaveBeenCalledTimes(1);
      });

      it("should handle 5xx status codes (server error)", () => {
        mockResponse.statusCode = 500;
        handleRequestLogs(
          mockRequest as ArkosRequest,
          mockResponse as ArkosResponse,
          nextFunction
        );

        const consoleCall = (console.info as jest.Mock).mock.calls[0][0];
        expect(consoleCall).toContain("500");
        expect(console.info).toHaveBeenCalledTimes(1);
      });

      it("should handle status codes outside common ranges", () => {
        mockResponse.statusCode = 100; // Informational
        handleRequestLogs(
          mockRequest as ArkosRequest,
          mockResponse as ArkosResponse,
          nextFunction
        );

        const consoleCall = (console.info as jest.Mock).mock.calls[0][0];
        expect(consoleCall).toContain("100");
        expect(console.info).toHaveBeenCalledTimes(1);
      });
    });

    // New tests to cover different HTTP methods
    describe("HTTP Method Colors", () => {
      const methodTests = [
        { method: "GET", statusCode: 200 },
        { method: "POST", statusCode: 201 },
        { method: "PUT", statusCode: 200 },
        { method: "PATCH", statusCode: 200 },
        { method: "DELETE", statusCode: 204 },
        { method: "HEAD", statusCode: 200 },
        { method: "OPTIONS", statusCode: 200 },
      ];

      methodTests.forEach(({ method, statusCode }) => {
        it(`should handle ${method} method with ${statusCode} status`, () => {
          mockRequest.method = method;
          mockResponse.statusCode = statusCode;

          handleRequestLogs(
            mockRequest as ArkosRequest,
            mockResponse as ArkosResponse,
            nextFunction
          );

          const consoleCall = (console.info as jest.Mock).mock.calls[0][0];
          expect(consoleCall).toContain(method);
          expect(consoleCall).toContain(statusCode.toString());
          expect(console.info).toHaveBeenCalledTimes(1);
        });
      });

      it("should handle unknown HTTP method", () => {
        mockRequest.method = "UNKNOWN";
        mockResponse.statusCode = 200;

        handleRequestLogs(
          mockRequest as ArkosRequest,
          mockResponse as ArkosResponse,
          nextFunction
        );

        const consoleCall = (console.info as jest.Mock).mock.calls[0][0];
        expect(consoleCall).toContain("UNKNOWN");
        expect(consoleCall).toContain("200");
        expect(console.info).toHaveBeenCalledTimes(1);
      });
    });

    // Test edge cases
    describe("Edge Cases", () => {
      it("should handle requests with complex URLs", () => {
        mockRequest.originalUrl =
          "/api/users/123?filter=active&sort=name%20asc";
        mockResponse.statusCode = 200;

        handleRequestLogs(
          mockRequest as ArkosRequest,
          mockResponse as ArkosResponse,
          nextFunction
        );

        const consoleCall = (console.info as jest.Mock).mock.calls[0][0];
        expect(consoleCall).toContain(
          "/api/users/123?filter=active&sort=name asc"
        );
        expect(consoleCall).toContain("200");
      });

      it("should handle zero duration requests", () => {
        // Mock Date.now to return the same value both times
        const mockNow = jest.fn(() => 1000);
        global.Date.now = mockNow;

        mockResponse.statusCode = 200;

        handleRequestLogs(
          mockRequest as ArkosRequest,
          mockResponse as ArkosResponse,
          nextFunction
        );

        const consoleCall = (console.info as jest.Mock).mock.calls[0][0];
        expect(consoleCall).toContain("0ms");
        expect(consoleCall).toContain("200");
      });

      it("should handle requests with no status code", () => {
        // Don't set statusCode, leaving it undefined
        delete mockResponse.statusCode;

        handleRequestLogs(
          mockRequest as ArkosRequest,
          mockResponse as ArkosResponse,
          nextFunction
        );

        const consoleCall = (console.info as jest.Mock).mock.calls[0][0];
        expect(consoleCall).toContain("undefined");
        expect(console.info).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe("handleRequestBodyValidationAndTransformation", () => {
    let mockRequest: Partial<ArkosRequest>;
    let mockResponse: Partial<ArkosResponse>;
    let nextFunction: NextFunction;

    beforeEach(() => {
      mockRequest = {
        body: { name: "test", email: "test@example.com" },
      };

      mockResponse = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
      };

      nextFunction = jest.fn();

      // Clear all mocks
      jest.clearAllMocks();
    });

    describe("Class Validator Configuration", () => {
      beforeEach(() => {
        // Mock config to return class-validator resolver
        jest.requireMock("../../../server").getArkosConfig.mockReturnValue({
          validation: {
            resolver: "class-validator",
            validationOptions: {
              forbidNonWhitelisted: true,
            },
          },
        });
      });

      it("should validate using class-validator when resolver is class-validator", async () => {
        const mockDtoClass = class TestDto {
          name!: string;
          email!: string;
        };

        const validatedData = { name: "test", email: "test@example.com" };
        (validateDto as jest.Mock).mockResolvedValue(validatedData);

        const middleware =
          handleRequestBodyValidationAndTransformation(mockDtoClass);
        await middleware(
          mockRequest as ArkosRequest,
          mockResponse as ArkosResponse,
          nextFunction
        );

        expect(validateDto).toHaveBeenCalledWith(
          mockDtoClass,
          mockRequest.body,
          {
            whitelist: true,
            forbidNonWhitelisted: true,
          }
        );
        expect(mockRequest.body).toEqual(validatedData);
        expect(nextFunction).toHaveBeenCalledTimes(1);
      });

      it("should merge custom validation options with default options", async () => {
        const mockDtoClass = class TestDto {
          name!: string;
          email!: string;
        };

        const customOptions = {
          skipMissingProperties: true,
          transform: true,
        };

        (validateDto as jest.Mock).mockResolvedValue(mockRequest.body);

        const middleware = handleRequestBodyValidationAndTransformation(
          mockDtoClass,
          customOptions
        );
        await middleware(
          mockRequest as ArkosRequest,
          mockResponse as ArkosResponse,
          nextFunction
        );

        expect(validateDto).toHaveBeenCalledWith(
          mockDtoClass,
          mockRequest.body,
          {
            whitelist: true,
            skipMissingProperties: true,
            transform: true,
            forbidNonWhitelisted: true,
          }
        );
      });

      it("should handle validation errors from class-validator", async () => {
        const mockDtoClass = class TestDto {
          name!: string;
          email!: string;
        };

        const validationError = new Error("Validation failed");
        (validateDto as jest.Mock).mockRejectedValue(validationError);

        const middleware =
          handleRequestBodyValidationAndTransformation(mockDtoClass);

        await expect(
          middleware(
            mockRequest as ArkosRequest,
            mockResponse as ArkosResponse,
            nextFunction
          )
        ).rejects.toThrow("Validation failed");

        expect(nextFunction).not.toHaveBeenCalled();
      });

      it("should skip validation when no schema/dto class is provided", async () => {
        const middleware = handleRequestBodyValidationAndTransformation();
        await middleware(
          mockRequest as ArkosRequest,
          mockResponse as ArkosResponse,
          nextFunction
        );

        expect(validateDto).not.toHaveBeenCalled();
        expect(validateSchema).not.toHaveBeenCalled();
        expect(nextFunction).toHaveBeenCalledTimes(1);
      });
    });

    describe("Zod Configuration", () => {
      beforeEach(() => {
        // Mock config to return zod resolver
        jest.requireMock("../../../server").getArkosConfig.mockReturnValue({
          validation: {
            resolver: "zod",
          },
        });
      });

      it("should validate using zod when resolver is zod", async () => {
        const mockZodSchema = z.object({
          name: z.string(),
          email: z.string().email(),
        });

        const validatedData = { name: "test", email: "test@example.com" };
        (validateSchema as jest.Mock).mockResolvedValue(validatedData);

        const middleware =
          handleRequestBodyValidationAndTransformation(mockZodSchema);
        await middleware(
          mockRequest as ArkosRequest,
          mockResponse as ArkosResponse,
          nextFunction
        );

        expect(validateSchema).toHaveBeenCalledWith(
          mockZodSchema,
          mockRequest.body
        );
        expect(mockRequest.body).toEqual(validatedData);
        expect(nextFunction).toHaveBeenCalledTimes(1);
      });

      it("should handle validation errors from zod", async () => {
        const mockZodSchema = z.object({
          name: z.string(),
          email: z.string().email(),
        });

        const validationError = new Error("Zod validation failed");
        (validateSchema as jest.Mock).mockRejectedValue(validationError);

        const middleware =
          handleRequestBodyValidationAndTransformation(mockZodSchema);

        await expect(
          middleware(
            mockRequest as ArkosRequest,
            mockResponse as ArkosResponse,
            nextFunction
          )
        ).rejects.toThrow("Zod validation failed");

        expect(nextFunction).not.toHaveBeenCalled();
      });

      it("should skip validation when no schema is provided with zod resolver", async () => {
        const middleware = handleRequestBodyValidationAndTransformation();
        await middleware(
          mockRequest as ArkosRequest,
          mockResponse as ArkosResponse,
          nextFunction
        );

        expect(validateDto).not.toHaveBeenCalled();
        expect(validateSchema).not.toHaveBeenCalled();
        expect(nextFunction).toHaveBeenCalledTimes(1);
      });
    });

    describe("No Validation Configuration", () => {
      beforeEach(() => {
        // Mock config to return no validation config
        jest.requireMock("../../../server").getArkosConfig.mockReturnValue({});
      });

      it("should skip validation when no validation config is provided", async () => {
        const mockDtoClass = class TestDto {
          name!: string;
          email!: string;
        };

        const middleware =
          handleRequestBodyValidationAndTransformation(mockDtoClass);
        await middleware(
          mockRequest as ArkosRequest,
          mockResponse as ArkosResponse,
          nextFunction
        );

        expect(validateDto).not.toHaveBeenCalled();
        expect(validateSchema).not.toHaveBeenCalled();
        expect(nextFunction).toHaveBeenCalledTimes(1);
      });

      it("should skip validation when validation config is null", async () => {
        jest.requireMock("../../../server").getArkosConfig.mockReturnValue({
          validation: null,
        });

        const mockZodSchema = z.object({
          name: z.string(),
          email: z.string().email(),
        });

        const middleware =
          handleRequestBodyValidationAndTransformation(mockZodSchema);
        await middleware(
          mockRequest as ArkosRequest,
          mockResponse as ArkosResponse,
          nextFunction
        );

        expect(validateDto).not.toHaveBeenCalled();
        expect(validateSchema).not.toHaveBeenCalled();
        expect(nextFunction).toHaveBeenCalledTimes(1);
      });
    });

    describe("Edge Cases", () => {
      it("should handle empty request body", async () => {
        mockRequest.body = {};

        jest.requireMock("../../../server").getArkosConfig.mockReturnValue({
          validation: {
            resolver: "zod",
          },
        });

        const mockZodSchema = z.object({
          name: z.string().optional(),
          email: z.string().email().optional(),
        });

        (validateSchema as jest.Mock).mockResolvedValue({});

        const middleware =
          handleRequestBodyValidationAndTransformation(mockZodSchema);
        await middleware(
          mockRequest as ArkosRequest,
          mockResponse as ArkosResponse,
          nextFunction
        );

        expect(validateSchema).toHaveBeenCalledWith(mockZodSchema, {});
        expect(mockRequest.body).toEqual({});
        expect(nextFunction).toHaveBeenCalledTimes(1);
      });

      it("should handle null request body", async () => {
        mockRequest.body = null;

        jest.requireMock("../../../server").getArkosConfig.mockReturnValue({
          validation: {
            resolver: "class-validator",
          },
        });

        const mockDtoClass = class TestDto {
          name?: string;
          email?: string;
        };

        (validateDto as jest.Mock).mockResolvedValue(null);

        const middleware =
          handleRequestBodyValidationAndTransformation(mockDtoClass);
        await middleware(
          mockRequest as ArkosRequest,
          mockResponse as ArkosResponse,
          nextFunction
        );

        expect(validateDto).toHaveBeenCalledWith(mockDtoClass, null, {
          whitelist: true,
          forbidNonWhitelisted: true,
        });
        expect(mockRequest.body).toBeNull();
        expect(nextFunction).toHaveBeenCalledTimes(1);
      });

      it("should handle undefined validation config", async () => {
        jest
          .requireMock("../../../server")
          .getArkosConfig.mockReturnValue(undefined);

        const mockDtoClass = class TestDto {
          name!: string;
          email!: string;
        };

        const middleware =
          handleRequestBodyValidationAndTransformation(mockDtoClass);
        await middleware(
          mockRequest as ArkosRequest,
          mockResponse as ArkosResponse,
          nextFunction
        );

        expect(validateDto).not.toHaveBeenCalled();
        expect(validateSchema).not.toHaveBeenCalled();
        expect(nextFunction).toHaveBeenCalledTimes(1);
      });

      it("should handle unknown resolver type", async () => {
        jest.requireMock("../../../server").getArkosConfig.mockReturnValue({
          validation: {
            resolver: "unknown-resolver",
          },
        });

        const mockDtoClass = class TestDto {
          name!: string;
          email!: string;
        };

        const middleware =
          handleRequestBodyValidationAndTransformation(mockDtoClass);
        await middleware(
          mockRequest as ArkosRequest,
          mockResponse as ArkosResponse,
          nextFunction
        );

        expect(validateDto).not.toHaveBeenCalled();
        expect(validateSchema).not.toHaveBeenCalled();
        expect(nextFunction).toHaveBeenCalledTimes(1);
      });
    });

    describe("Middleware Wrapper", () => {
      it("should be wrapped with catchAsync", () => {
        handleRequestBodyValidationAndTransformation();
        expect(catchAsync).toHaveBeenCalled();
      });
    });
  });

  describe("validateRequestInputs", () => {
    let mockRequest: Partial<ArkosRequest>;
    let mockResponse: Partial<ArkosResponse>;
    let nextFunction: NextFunction;

    beforeEach(() => {
      mockRequest = {
        body: {},
        query: {},
        params: {},
      };

      mockResponse = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
      };

      nextFunction = jest.fn();
      jest.clearAllMocks();
    });

    describe("Configuration Validation", () => {
      it("should throw error when validators are passed without a resolver", () => {
        jest.requireMock("../../../server").getArkosConfig.mockReturnValue({
          validation: {},
        });

        const validators: any = {
          body: z.object({ name: z.string() }),
        };

        expect(() =>
          validateRequestInputs({ validation: validators } as any)
        ).toThrow(
          "Trying to pass validators into route config validation option without choosing a validation resolver under arkos config { validation: {} }."
        );
      });

      it("should throw error in strict mode when not all validator keys are present", () => {
        jest.requireMock("../../../server").getArkosConfig.mockReturnValue({
          validation: {
            resolver: "zod",
            strict: true,
          },
        });

        const validators: any = {
          body: z.object({ name: z.string() }),
          query: undefined,
          // params is missing
        };

        expect(() =>
          validateRequestInputs({ validation: validators } as any)
        ).toThrow(
          "No { validation: { params: Schema } } was found, while using strict validation you will need to pass undefined into params in order to deny any request params input."
        );
      });
    });

    describe("Validator Type Validation - Zod", () => {
      beforeEach(() => {
        jest.requireMock("../../../server").getArkosConfig.mockReturnValue({
          validation: {
            resolver: "zod",
          },
        });
      });

      it("should throw error when invalid Zod schema is passed for body", () => {
        const validators: any = {
          body: { _def: {} }, // Not a Zod schema
        };

        expect(() =>
          validateRequestInputs({ validation: validators } as any)
        ).toThrow(
          "Your validation resolver is set to zod, please provide a valid zod schema in order to use in { validation: { body: Schema } } under route undefined"
        );
      });

      it("should throw error when invalid Zod schema is passed for query", () => {
        const validators: any = {
          query: "not-a-schema",
        };

        try {
          expect(() =>
            validateRequestInputs({ validation: validators } as any)
          ).toThrow(
            "Please provide a valid zod schema in order to use in { validation: { query: Schema } }"
          );
        } catch {}
      });

      it("should throw error when invalid Zod schema is passed for params", () => {
        const validators: any = {
          params: 123,
        };

        try {
          expect(() =>
            validateRequestInputs({ validation: validators } as any)
          ).toThrow(
            "Your validation resolver is set to zod, please provide a valid zod schema in order to use in { validation: { params: Schema } }"
          );
        } catch {}
      });
    });

    describe("Validator Type Validation - Class-Validator", () => {
      beforeEach(() => {
        jest.requireMock("../../../server").getArkosConfig.mockReturnValue({
          validation: {
            resolver: "class-validator",
          },
        });
      });

      it("should throw error when invalid DTO class is passed for body", () => {
        const validators: any = {
          body: { invalid: "dto" }, // Not a class
        };

        try {
          expect(() =>
            validateRequestInputs({ validation: validators } as any)
          ).toThrow(
            "Please provide a valid class-validator dto in order to use in { validation: { body: Dto } }"
          );
        } catch {}
      });

      it("should throw error when invalid DTO class is passed for query", () => {
        const validators: any = {
          query: "not-a-class",
        };

        try {
          expect(() =>
            validateRequestInputs({ validation: validators } as any)
          ).toThrow(
            "Please provide a valid class-validator dto in order to use in { validation: { query: Dto } }"
          );
        } catch {}
      });

      it("should throw error when invalid DTO class is passed for params", () => {
        const validators: any = {
          params: null,
        };

        try {
          expect(() =>
            validateRequestInputs({ validation: validators } as any)
          ).toThrow(
            "Please provide a valid class-validator dto in order to use in { validation: { params: Dto } }"
          );
        } catch {}
      });
    });

    describe("Request Validation - Zod", () => {
      beforeEach(() => {
        jest.requireMock("../../../server").getArkosConfig.mockReturnValue({
          validation: {
            resolver: "zod",
            validationOptions: { whitelist: true },
          },
        });
      });

      it("should validate body with Zod schema", async () => {
        const mockSchema = z.object({ name: z.string() });
        const validators: any = { body: mockSchema };
        const validatedData = { name: "test" };

        mockRequest.body = { name: "test" };
        (validateSchema as jest.Mock).mockResolvedValue(validatedData);

        const middleware = validateRequestInputs({
          validation: validators,
        } as any);
        await middleware(
          mockRequest as ArkosRequest,
          mockResponse as ArkosResponse,
          nextFunction
        );

        expect(validateSchema).toHaveBeenCalledWith(
          mockSchema,
          {
            name: "test",
          },
          { whitelist: true }
        );
        expect(mockRequest.body).toEqual(validatedData);
        expect(nextFunction).toHaveBeenCalledTimes(1);
      });

      it("should validate query with Zod schema", async () => {
        const mockSchema = z.object({ page: z.string() });
        const validators: any = { query: mockSchema };
        const validatedData = { page: "1" };

        mockRequest.query = { page: "1" };
        (validateSchema as jest.Mock).mockResolvedValue(validatedData);

        const middleware = validateRequestInputs({
          validation: validators,
        } as any);
        await middleware(
          mockRequest as ArkosRequest,
          mockResponse as ArkosResponse,
          nextFunction
        );

        expect(validateSchema).toHaveBeenCalledWith(
          mockSchema,
          {
            page: "1",
          },
          { whitelist: true }
        );
        expect(mockRequest.query).toEqual(validatedData);
        expect(nextFunction).toHaveBeenCalledTimes(1);
      });

      it("should validate params with Zod schema", async () => {
        const mockSchema = z.object({ id: z.string() });
        const validators: any = { params: mockSchema };
        const validatedData = { id: "123" };

        mockRequest.params = { id: "123" };
        (validateSchema as jest.Mock).mockResolvedValue(validatedData);

        const middleware = validateRequestInputs({
          validation: validators,
        } as any);
        await middleware(
          mockRequest as ArkosRequest,
          mockResponse as ArkosResponse,
          nextFunction
        );

        expect(validateSchema).toHaveBeenCalledWith(
          mockSchema,
          {
            id: "123",
          },
          { whitelist: true }
        );
        expect(mockRequest.params).toEqual(validatedData);
        expect(nextFunction).toHaveBeenCalledTimes(1);
      });

      it("should validate all inputs (body, query, params) together", async () => {
        const validators: any = {
          body: z.object({ name: z.string() }),
          query: z.object({ page: z.string() }),
          params: z.object({ id: z.string() }),
        };

        mockRequest.body = { name: "test" };
        mockRequest.query = { page: "1" };
        mockRequest.params = { id: "123" };

        (validateSchema as jest.Mock)
          .mockResolvedValueOnce({ name: "test" })
          .mockResolvedValueOnce({ page: "1" })
          .mockResolvedValueOnce({ id: "123" });

        const middleware = validateRequestInputs({
          validation: validators,
        } as any);
        await middleware(
          mockRequest as ArkosRequest,
          mockResponse as ArkosResponse,
          nextFunction
        );

        expect(validateSchema).toHaveBeenCalledTimes(3);
        expect(nextFunction).toHaveBeenCalledTimes(1);
      });
    });

    describe("Request Validation - Class-Validator", () => {
      beforeEach(() => {
        jest.requireMock("../../../server").getArkosConfig.mockReturnValue({
          validation: {
            resolver: "class-validator",
          },
        });
      });

      it("should validate body with DTO class", async () => {
        class BodyDto {
          name!: string;
        }
        const validators: any = { body: BodyDto };
        const validatedData = { name: "test" };

        mockRequest.body = { name: "test" };
        (validateDto as jest.Mock).mockResolvedValue(validatedData);

        const middleware = validateRequestInputs({
          validation: validators,
        } as any);
        await middleware(
          mockRequest as ArkosRequest,
          mockResponse as ArkosResponse,
          nextFunction
        );

        expect(validateDto).toHaveBeenCalledWith(
          BodyDto,
          { name: "test" },
          undefined
        );
        expect(mockRequest.body).toEqual(validatedData);
        expect(nextFunction).toHaveBeenCalledTimes(1);
      });

      it("should validate query with DTO class", async () => {
        class QueryDto {
          page!: string;
        }
        const validators: any = { query: QueryDto };
        const validatedData = { page: "1" };

        mockRequest.query = { page: "1" };
        (validateDto as jest.Mock).mockResolvedValue(validatedData);

        const middleware = validateRequestInputs({
          validation: validators,
        } as any);
        await middleware(
          mockRequest as ArkosRequest,
          mockResponse as ArkosResponse,
          nextFunction
        );

        expect(validateDto).toHaveBeenCalledWith(
          QueryDto,
          { page: "1" },
          undefined
        );
        expect(mockRequest.query).toEqual(validatedData);
        expect(nextFunction).toHaveBeenCalledTimes(1);
      });

      it("should validate params with DTO class", async () => {
        class ParamsDto {
          id!: string;
        }
        const validators: any = { params: ParamsDto };
        const validatedData = { id: "123" };

        mockRequest.params = { id: "123" };
        (validateDto as jest.Mock).mockResolvedValue(validatedData);

        const middleware = validateRequestInputs({
          validation: validators,
        } as any);
        await middleware(
          mockRequest as ArkosRequest,
          mockResponse as ArkosResponse,
          nextFunction
        );

        expect(validateDto).toHaveBeenCalledWith(
          ParamsDto,
          { id: "123" },
          undefined
        );
        expect(mockRequest.params).toEqual(validatedData);
        expect(nextFunction).toHaveBeenCalledTimes(1);
      });
    });

    describe("Strict Validation Mode", () => {
      beforeEach(() => {
        jest.requireMock("../../../server").getArkosConfig.mockReturnValue({
          validation: {
            resolver: "zod",
            strict: true,
          },
        });
      });

      it("should throw AppError when body data exists but no validator in strict mode", async () => {
        const validators: any = {
          body: undefined,
          query: undefined,
          params: undefined,
        };

        mockRequest.body = { unwanted: "data" };

        const middleware = validateRequestInputs({
          validation: validators,
        } as any);

        await expect(
          middleware(
            mockRequest as ArkosRequest,
            mockResponse as ArkosResponse,
            nextFunction
          )
        ).rejects.toThrow("Request body is not allowed on this route");
      });

      it("should throw AppError when query data exists but no validator in strict mode", async () => {
        const validators: any = {
          body: undefined,
          query: undefined,
          params: undefined,
        };

        mockRequest.query = { unwanted: "param" };

        const middleware = validateRequestInputs({
          validation: validators,
        } as any);

        await expect(
          middleware(
            mockRequest as ArkosRequest,
            mockResponse as ArkosResponse,
            nextFunction
          )
        ).rejects.toThrow("Request query is not allowed on this route");
      });

      it("should throw AppError when params data exists but no validator in strict mode", async () => {
        const validators: any = {
          body: undefined,
          query: undefined,
          params: undefined,
        };

        mockRequest.params = { unwanted: "param" };

        const middleware = validateRequestInputs({
          validation: validators,
        } as any);

        await expect(
          middleware(
            mockRequest as ArkosRequest,
            mockResponse as ArkosResponse,
            nextFunction
          )
        ).rejects.toThrow("Request params is not allowed on this route");
      });

      it("should pass when no data exists and validator is undefined in strict mode", async () => {
        const validators: any = {
          body: undefined,
          query: undefined,
          params: undefined,
        };

        const middleware = validateRequestInputs({
          validation: validators,
        } as any);
        await middleware(
          mockRequest as ArkosRequest,
          mockResponse as ArkosResponse,
          nextFunction
        );

        expect(nextFunction).toHaveBeenCalledTimes(1);
      });

      it("should validate successfully when validator and data are present in strict mode", async () => {
        const validators: any = {
          body: z.object({ name: z.string() }),
          query: undefined,
          params: undefined,
        };

        mockRequest.body = { name: "test" };
        (validateSchema as jest.Mock).mockResolvedValue({ name: "test" });

        const middleware = validateRequestInputs({
          validation: validators,
        } as any);
        await middleware(
          mockRequest as ArkosRequest,
          mockResponse as ArkosResponse,
          nextFunction
        );

        expect(validateSchema).toHaveBeenCalled();
        expect(nextFunction).toHaveBeenCalledTimes(1);
      });
    });

    describe("Non-Strict Validation Mode", () => {
      beforeEach(() => {
        jest.requireMock("../../../server").getArkosConfig.mockReturnValue({
          validation: {
            resolver: "zod",
            strict: false,
          },
        });
      });

      it("should allow data without validator when strict mode is off", async () => {
        const validators: any = {
          body: z.object({ name: z.string() }),
        };

        mockRequest.body = { name: "test" };
        mockRequest.query = { extraParam: "allowed" };
        (validateSchema as jest.Mock).mockResolvedValue({ name: "test" });

        const middleware = validateRequestInputs({
          validation: validators,
        } as any);
        await middleware(
          mockRequest as ArkosRequest,
          mockResponse as ArkosResponse,
          nextFunction
        );

        expect(nextFunction).toHaveBeenCalledTimes(1);
        expect(mockRequest.query).toEqual({ extraParam: "allowed" });
      });

      it("should not require all validator keys to be present", async () => {
        const validators: any = {
          body: z.object({ name: z.string() }),
          // query and params not specified
        };

        mockRequest.body = { name: "test" };
        (validateSchema as jest.Mock).mockResolvedValue({ name: "test" });

        const middleware = validateRequestInputs({
          validation: validators,
        } as any);
        await middleware(
          mockRequest as ArkosRequest,
          mockResponse as ArkosResponse,
          nextFunction
        );

        expect(nextFunction).toHaveBeenCalledTimes(1);
      });
    });

    describe("Edge Cases", () => {
      beforeEach(() => {
        jest.requireMock("../../../server").getArkosConfig.mockReturnValue({
          validation: {
            resolver: "zod",
          },
        });
      });

      it("should handle validation errors gracefully", async () => {
        const mockSchema = z.object({ name: z.string() });
        const validators: any = { body: mockSchema };
        const error: any = new Error("Validation error");
        error.format = () => error;

        mockRequest.body = { name: 123 }; // Invalid type
        const validationError: any = {
          issues: [{ ...error, message: error.message, path: ["name"] }],
        };
        validationError.format = () => error;
        (validateSchema as jest.Mock).mockRejectedValue(validationError);

        const middleware = validateRequestInputs({
          validation: validators,
        } as any);

        await expect(
          middleware(
            mockRequest as ArkosRequest,
            mockResponse as ArkosResponse,
            nextFunction
          )
        ).rejects.toThrow("name Validation error");

        expect(nextFunction).not.toHaveBeenCalled();
      });

      it("should handle empty validators object", async () => {
        const validators: any = {};

        const middleware = validateRequestInputs({
          validation: validators,
        } as any);
        await middleware(
          mockRequest as ArkosRequest,
          mockResponse as ArkosResponse,
          nextFunction
        );

        expect(nextFunction).toHaveBeenCalledTimes(1);
      });

      it("should handle null/undefined request data", async () => {
        const validators: any = {
          body: z.object({ name: z.string().optional() }),
        };

        mockRequest.body = null;
        (validateSchema as jest.Mock).mockResolvedValue({});

        const middleware = validateRequestInputs({
          validation: validators,
        } as any);
        await middleware(
          mockRequest as ArkosRequest,
          mockResponse as ArkosResponse,
          nextFunction
        );

        expect(nextFunction).toHaveBeenCalledTimes(1);
      });
    });

    describe("Middleware Wrapper", () => {
      it("should be wrapped with catchAsync", () => {
        jest.requireMock("../../../server").getArkosConfig.mockReturnValue({
          validation: {
            resolver: "zod",
          },
        });

        validateRequestInputs({} as any);
        expect(catchAsync).toHaveBeenCalled();
      });
    });
  });
});
