import catchAsync from "../catch-async";
import {
  ArkosRequest,
  ArkosResponse,
  ArkosNextFunction,
} from "../../../../types";

describe("catchAsync", () => {
  let mockRequest: Partial<ArkosRequest>;
  let mockResponse: Partial<ArkosResponse>;
  let mockNext: ArkosNextFunction;
  let mockError: Error;

  beforeEach(() => {
    mockRequest = {};
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    mockNext = jest.fn();
    mockError = new Error("Original error");
  });

  describe("Normal request handlers", () => {
    it("should execute the handler function correctly when no error is thrown", async () => {
      // Arrange
      const mockHandler = jest.fn().mockResolvedValue(undefined);
      const wrappedHandler = catchAsync(mockHandler);

      // Act
      await wrappedHandler(
        mockRequest as ArkosRequest,
        mockResponse as ArkosResponse,
        mockNext
      );

      // Assert
      expect(mockHandler).toHaveBeenCalledWith(
        mockRequest,
        mockResponse,
        mockNext
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    it("should call next with the error when an error is thrown", async () => {
      // Arrange
      const testError = new Error("Test error");
      const mockHandler = jest.fn().mockRejectedValue(testError);
      const wrappedHandler = catchAsync(mockHandler);

      // Act
      await wrappedHandler(
        mockRequest as ArkosRequest,
        mockResponse as ArkosResponse,
        mockNext
      );

      // Assert
      expect(mockHandler).toHaveBeenCalledWith(
        mockRequest,
        mockResponse,
        mockNext
      );
      expect(mockNext).toHaveBeenCalledWith(testError);
    });

    it("should work with synchronous errors too", async () => {
      // Arrange
      const testError = new Error("Sync error");
      const mockHandler = jest.fn().mockImplementation(() => {
        throw testError;
      });
      const wrappedHandler = catchAsync(mockHandler);

      // Act
      await wrappedHandler(
        mockRequest as ArkosRequest,
        mockResponse as ArkosResponse,
        mockNext
      );

      // Assert
      expect(mockHandler).toHaveBeenCalledWith(
        mockRequest,
        mockResponse,
        mockNext
      );
      expect(mockNext).toHaveBeenCalledWith(testError);
    });

    it("should pass response data correctly", async () => {
      // Arrange
      const mockData = { data: [{ id: 1, title: "Test" }] };
      const mockHandler = jest.fn().mockImplementation(async (_, res) => {
        res.status(200).json(mockData);
      });
      const wrappedHandler = catchAsync(mockHandler);

      // Act
      await wrappedHandler(
        mockRequest as ArkosRequest,
        mockResponse as ArkosResponse,
        mockNext
      );

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith(mockData);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it("should default to normal type when no options are provided", async () => {
      // Arrange
      const mockHandler = jest.fn().mockResolvedValue(undefined);
      const wrappedHandler = catchAsync(mockHandler);

      // Act
      await wrappedHandler(
        mockRequest as ArkosRequest,
        mockResponse as ArkosResponse,
        mockNext
      );

      // Assert
      expect(mockHandler).toHaveBeenCalledWith(
        mockRequest,
        mockResponse,
        mockNext
      );
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe("Error request handlers", () => {
    it("should execute error handler correctly when no error is thrown", async () => {
      // Arrange
      const mockErrorHandler = jest.fn().mockResolvedValue(undefined);
      const wrappedHandler = catchAsync(mockErrorHandler, { type: "error" });

      // Act
      await wrappedHandler(
        mockError,
        mockRequest as ArkosRequest,
        mockResponse as ArkosResponse,
        mockNext
      );

      // Assert
      expect(mockErrorHandler).toHaveBeenCalledWith(
        mockError,
        mockRequest,
        mockResponse,
        mockNext
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    it("should call next with new error when error handler throws", async () => {
      // Arrange
      const handlerError = new Error("Handler error");
      const mockErrorHandler = jest.fn().mockRejectedValue(handlerError);
      const wrappedHandler = catchAsync(mockErrorHandler, { type: "error" });

      // Act
      await wrappedHandler(
        mockError,
        mockRequest as ArkosRequest,
        mockResponse as ArkosResponse,
        mockNext
      );

      // Assert
      expect(mockErrorHandler).toHaveBeenCalledWith(
        mockError,
        mockRequest,
        mockResponse,
        mockNext
      );
      expect(mockNext).toHaveBeenCalledWith(handlerError);
    });

    it("should handle synchronous errors in error handler", async () => {
      // Arrange
      const handlerError = new Error("Sync handler error");
      const mockErrorHandler = jest.fn().mockImplementation(() => {
        throw handlerError;
      });
      const wrappedHandler = catchAsync(mockErrorHandler, { type: "error" });

      // Act
      await wrappedHandler(
        mockError,
        mockRequest as ArkosRequest,
        mockResponse as ArkosResponse,
        mockNext
      );

      // Assert
      expect(mockErrorHandler).toHaveBeenCalledWith(
        mockError,
        mockRequest,
        mockResponse,
        mockNext
      );
      expect(mockNext).toHaveBeenCalledWith(handlerError);
    });

    it("should allow error handler to send response without calling next", async () => {
      // Arrange
      const mockErrorHandler = jest
        .fn()
        .mockImplementation(async (err, _, res) => {
          res.status(500).json({ error: err.message });
        });
      const wrappedHandler = catchAsync(mockErrorHandler, { type: "error" });

      // Act
      await wrappedHandler(
        mockError,
        mockRequest as ArkosRequest,
        mockResponse as ArkosResponse,
        mockNext
      );

      // Assert
      expect(mockErrorHandler).toHaveBeenCalledWith(
        mockError,
        mockRequest,
        mockResponse,
        mockNext
      );
      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: "Original error",
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it("should handle error handler that calls next to pass error along", async () => {
      // Arrange
      const mockErrorHandler = jest
        .fn()
        .mockImplementation(async (err, _, _1, next) => {
          // Error handler decides to pass the error along
          next(err);
        });
      const wrappedHandler = catchAsync(mockErrorHandler, { type: "error" });

      // Act
      await wrappedHandler(
        mockError,
        mockRequest as ArkosRequest,
        mockResponse as ArkosResponse,
        mockNext
      );

      // Assert
      expect(mockErrorHandler).toHaveBeenCalledWith(
        mockError,
        mockRequest,
        mockResponse,
        mockNext
      );
      expect(mockNext).toHaveBeenCalledWith(mockError);
    });

    it("should preserve error types and properties in error handler", async () => {
      // Arrange
      const customError = new Error("Custom error");
      customError.name = "ValidationError";
      (customError as any).statusCode = 400;

      const mockErrorHandler = jest
        .fn()
        .mockImplementation(async (err, _1, res) => {
          res.status(err.statusCode || 500).json({
            error: err.message,
            type: err.name,
          });
        });
      const wrappedHandler = catchAsync(mockErrorHandler, { type: "error" });

      // Act
      await wrappedHandler(
        customError,
        mockRequest as ArkosRequest,
        mockResponse as ArkosResponse,
        mockNext
      );

      // Assert
      expect(mockErrorHandler).toHaveBeenCalledWith(
        customError,
        mockRequest,
        mockResponse,
        mockNext
      );
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: "Custom error",
        type: "ValidationError",
      });
    });

    it("should handle async error handler operations correctly", async () => {
      // Arrange
      const mockAsyncOperation = jest.fn().mockResolvedValue("logged");
      const mockErrorHandler = jest
        .fn()
        .mockImplementation(async (err, _1, res) => {
          await mockAsyncOperation(err.message);
          res.status(500).json({ error: "Internal server error" });
        });
      const wrappedHandler = catchAsync(mockErrorHandler, { type: "error" });

      // Act
      await wrappedHandler(
        mockError,
        mockRequest as ArkosRequest,
        mockResponse as ArkosResponse,
        mockNext
      );

      // Assert
      expect(mockErrorHandler).toHaveBeenCalledWith(
        mockError,
        mockRequest,
        mockResponse,
        mockNext
      );
      expect(mockAsyncOperation).toHaveBeenCalledWith("Original error");
      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: "Internal server error",
      });
    });
  });

  describe("Options parameter", () => {
    it("should handle explicit normal type option", async () => {
      // Arrange
      const mockHandler = jest.fn().mockResolvedValue(undefined);
      const wrappedHandler = catchAsync(mockHandler, { type: "normal" });

      // Act
      await wrappedHandler(
        mockRequest as ArkosRequest,
        mockResponse as ArkosResponse,
        mockNext
      );

      // Assert
      expect(mockHandler).toHaveBeenCalledWith(
        mockRequest,
        mockResponse,
        mockNext
      );
    });

    it("should handle undefined options gracefully", async () => {
      // Arrange
      const mockHandler = jest.fn().mockResolvedValue(undefined);
      const wrappedHandler = catchAsync(mockHandler, undefined);

      // Act
      await wrappedHandler(
        mockRequest as ArkosRequest,
        mockResponse as ArkosResponse,
        mockNext
      );

      // Assert
      expect(mockHandler).toHaveBeenCalledWith(
        mockRequest,
        mockResponse,
        mockNext
      );
    });
  });
});
