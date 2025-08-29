import { NextFunction, Request, Response } from "express";
import AppError from "../utils/app-error";
import errorHandler from "../error-handler.controller";
import * as errorControllerHelper from "../utils/error-handler.helpers";
import { server } from "../../../server";

// Mock the error helper functions
jest.mock("../utils/error-handler.helpers", () => {
  return {
    handleJWTError: jest.fn(() => new AppError("Invalid token", 401)),
    handleJWTExpired: jest.fn(() => new AppError("Token expired", 401)),
    handlePrismaClientValidationError: jest.fn(
      () => new AppError("Validation error", 400)
    ),
    handleAuthenticationError: jest.fn(
      () => new AppError("Authentication error", 401)
    ),
    handleServerNotReachableError: jest.fn(
      () => new AppError("Server not reachable", 500)
    ),
    handleConnectionTimeoutError: jest.fn(
      () => new AppError("Connection timeout", 504)
    ),
    handleDatabaseNotFoundError: jest.fn(
      () => new AppError("Database not found", 500)
    ),
    handleFieldValueTooLargeError: jest.fn(
      () => new AppError("Field value too large", 400)
    ),
    handleRecordNotFoundError: jest.fn(
      () => new AppError("Record not found", 404)
    ),
    handleUniqueConstraintError: jest.fn(
      () => new AppError("Unique constraint failed", 400)
    ),
    handleForeignKeyConstraintError: jest.fn(
      () => new AppError("Foreign key constraint failed", 400)
    ),
    handleConstraintFailedError: jest.fn(
      () => new AppError("Constraint failed", 400)
    ),
    handleSchemaCreationFailedError: jest.fn(
      () => new AppError("Schema creation failed", 500)
    ),
    handleMigrationAlreadyAppliedError: jest.fn(
      () => new AppError("Migration already applied", 400)
    ),
    handleMigrationScriptFailedError: jest.fn(
      () => new AppError("Migration script failed", 500)
    ),
    handleVersionMismatchError: jest.fn(
      () => new AppError("Version mismatch", 400)
    ),
    handleNetworkError: jest.fn(() => new AppError("Network error", 503)),
  };
});

// Mock the server's close method
jest.mock("../../../server", () => ({
  server: {
    close: jest.fn((callback) => callback()),
  },
}));

// Mock console.error to prevent noise during tests
jest.spyOn(console, "error").mockImplementation(() => {});

describe("Error Handler Middleware", () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;
  let originalNodeEnv: string | undefined;
  let originalProcessExit: (code?: number) => never;
  let mockProcessExit: jest.Mock;

  beforeEach(() => {
    mockRequest = {
      originalUrl: "/api/test",
    };

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    mockNext = jest.fn();

    // Store original NODE_ENV and restore after each test
    originalNodeEnv = process.env.NODE_ENV;

    // Mock process.exit for SIGTERM handler testing
    originalProcessExit = process.exit;
    mockProcessExit = jest.fn() as any;
    (process as any).exit = mockProcessExit;
  });

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
    process.exit = originalProcessExit;
    jest.clearAllMocks();
  });

  describe("Development Mode", () => {
    beforeEach(() => {
      process.env.NODE_ENV = "development";
    });

    it("should send detailed error for API routes", () => {
      const error = new AppError("Test error", 400);
      error.stack = "Error: Test error\n    at Test.stack";

      errorHandler(
        error,
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 400,
          message: "Test error",
          stack: expect.arrayContaining([
            "Error: Test error",
            "    at Test.stack",
          ]),
        })
      );
    });

    it("should handle multi-line error messages and take the last line", () => {
      const error = new AppError("Line 1\nLine 2\nTest error", 400);

      errorHandler(
        error,
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: "Test error" })
      );
    });

    it("should send generic error for non-API routes", () => {
      mockRequest.originalUrl = "/some-page";
      const error = new AppError("Test error", 400);

      errorHandler(
        error,
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        title: "Internal server error",
        message: "Test error",
      });
    });
  });

  describe("Production Mode", () => {
    beforeEach(() => {
      process.env.NODE_ENV = "production";
    });

    it("should send operational error details for API routes", () => {
      const error = new AppError("Test operational error", 400);
      error.isOperational = true;
      mockRequest.originalUrl = "/api/tests/uanela";

      errorHandler(
        error,
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        code: "Unknown",
        status: "fail",
        message: "Test operational error",
        meta: {},
      });
    });

    it("should send generic error for non-operational errors in API routes", () => {
      const error = new AppError("Internal error", 500);
      error.isOperational = false;

      errorHandler(
        error,
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        code: "Unknown",
        status: "error",
        message: expect.stringMatching("Internal server error"),
        meta: {},
      });
    });

    it("should handle operational errors for non-API routes", () => {
      mockRequest.originalUrl = "/some-page/2";
      const error = new AppError("Test operational error", 400);
      error.isOperational = true;
      process.env.NODE_ENV = "production";

      errorHandler(
        error,
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        title: "Internal server error",
        message: "Test operational error",
      });
    });

    it("should handle non-operational errors for non-API routes", () => {
      mockRequest.originalUrl = "/some-page/3";
      const error = new AppError("Internal error", 500);
      error.isOperational = false;

      errorHandler(
        error,
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        title: "Internal server error",
        message: "Internal server error",
      });
    });
  });

  describe("Error Type Handling", () => {
    beforeEach(() => {
      process.env.NODE_ENV = "production";
    });

    it("should handle JWT error", () => {
      const error = new AppError("Invalid token", 401);
      error.name = "JsonWebTokenError";

      errorHandler(
        error,
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(errorControllerHelper.handleJWTError).toHaveBeenCalled();
    });

    it("should handle expired JWT", () => {
      const error = new AppError("Token expired", 401);
      error.name = "TokenExpiredError";

      errorHandler(
        error,
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(errorControllerHelper.handleJWTExpired).toHaveBeenCalled();
    });

    it("should handle Prisma validation error", () => {
      const error = new AppError("Validation error", 400);
      error.name = "PrismaClientValidationError";

      errorHandler(
        error,
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(
        errorControllerHelper.handlePrismaClientValidationError
      ).toHaveBeenCalledWith(expect.any(AppError));
    });

    it("should handle database errors based on error code", () => {
      const databaseErrorCodes = [
        {
          code: "P1000",
          handler: errorControllerHelper.handleAuthenticationError,
        },
        {
          code: "P1001",
          handler: errorControllerHelper.handleServerNotReachableError,
        },
        {
          code: "P1002",
          handler: errorControllerHelper.handleConnectionTimeoutError,
        },
        {
          code: "P1003",
          handler: errorControllerHelper.handleDatabaseNotFoundError,
        },
        {
          code: "P2000",
          handler: errorControllerHelper.handleFieldValueTooLargeError,
        },
        {
          code: "P2001",
          handler: errorControllerHelper.handleRecordNotFoundError,
        },
        {
          code: "P2002",
          handler: errorControllerHelper.handleUniqueConstraintError,
        },
        {
          code: "P2003",
          handler: errorControllerHelper.handleForeignKeyConstraintError,
        },
        {
          code: "P2004",
          handler: errorControllerHelper.handleConstraintFailedError,
        },
        {
          code: "P3000",
          handler: errorControllerHelper.handleSchemaCreationFailedError,
        },
        {
          code: "P3001",
          handler: errorControllerHelper.handleMigrationAlreadyAppliedError,
        },
        {
          code: "P3002",
          handler: errorControllerHelper.handleMigrationScriptFailedError,
        },
        {
          code: "P3003",
          handler: errorControllerHelper.handleVersionMismatchError,
        },
      ];

      for (const { code, handler } of databaseErrorCodes) {
        jest.clearAllMocks();

        const error = new AppError("Database error", 500);
        error.code = code;

        errorHandler(
          error,
          mockRequest as Request,
          mockResponse as Response,
          mockNext
        );

        expect(handler).toHaveBeenCalledWith(expect.any(AppError));
      }
    });

    it("should handle network error", () => {
      const error = new AppError("Network error", 503);
      error.name = "NetworkError";

      errorHandler(
        error,
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(errorControllerHelper.handleNetworkError).toHaveBeenCalledWith(
        expect.any(AppError)
      );
    });

    it("should fallback to generic error", () => {
      const error = new AppError("Unknown error", 500);
      error.name = "UnknownError";

      errorHandler(
        error,
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalled();
      expect(mockResponse.json).toHaveBeenCalled();
    });
  });

  describe("Process Signal Handling", () => {
    it("should exit immediately in development mode", () => {
      process.env.NODE_ENV = "development";

      // Manually trigger the SIGTERM handler
      const sigTermListeners = process.listeners("SIGTERM");
      const sigTermHandler = sigTermListeners[sigTermListeners.length - 1];
      (sigTermHandler as any)();

      expect(mockProcessExit).toHaveBeenCalled();
      expect(server.close).not.toHaveBeenCalled();
    });

    it("should gracefully shut down in production mode", () => {
      process.env.NODE_ENV = "production";

      // Manually trigger the SIGTERM handler
      const sigTermListeners = process.listeners("SIGTERM");
      const sigTermHandler = sigTermListeners[sigTermListeners.length - 1];
      (sigTermHandler as any)();

      expect(mockProcessExit).toHaveBeenCalled();
      expect(server.close).toHaveBeenCalled();
    });

    it("should gracefully shut down in staging mode", () => {
      process.env.NODE_ENV = "staging";

      // Manually trigger the SIGTERM handler
      const sigTermListeners = process.listeners("SIGTERM");
      const sigTermHandler = sigTermListeners[sigTermListeners.length - 1];
      (sigTermHandler as any)();

      expect(mockProcessExit).toHaveBeenCalled();
      expect(server.close).toHaveBeenCalled();
    });
  });
});
