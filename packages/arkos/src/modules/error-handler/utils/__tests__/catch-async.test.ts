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

  beforeEach(() => {
    mockRequest = {};
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    mockNext = jest.fn();
  });

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
    const mockHandler = jest.fn().mockImplementation(async (req, res) => {
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
});
