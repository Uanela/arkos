import validateDto from "../validate-dto";
import AppError from "../../modules/error-handler/utils/app-error";
import { validate } from "class-validator";

// Mock dependencies
jest.mock("class-transformer", () => ({
  plainToInstance: jest.fn((cls, data) => data),
}));

jest.mock("class-validator", () => ({
  validate: jest.fn(),
  ValidatorOptions: {},
}));

jest.mock("../../modules/error-handler/utils/app-error", () => {
  return jest.fn().mockImplementation((message, statusCode, errors) => {
    return {
      message,
      statusCode,
      errors,
    };
  });
});

// Create a test DTO class without actual decorators
class TestUserDto {
  name!: string;
  email!: string;
}

describe("validateDto", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return validated data when validation passes", async () => {
    // Arrange
    const mockData = { name: "John Doe", email: "john@example.com" };
    const { validate } = require("class-validator");
    validate.mockResolvedValue([]);

    // Act
    const result = await validateDto(TestUserDto, mockData);

    // Assert
    expect(validate).toHaveBeenCalled();
    expect(result).toEqual(mockData);
  });

  it("should throw AppError when validation fails", async () => {
    // Arrange
    const mockData = { name: "John Doe", email: "invalid-email" };
    const mockErrors = [
      {
        property: "email",
        constraints: { isEmail: "email must be a valid email" },
      },
    ];

    (validate as jest.Mock).mockResolvedValue(mockErrors);

    // Act & Assert
    try {
      expect(await validateDto(TestUserDto, mockData)).rejects.toThrow();
    } catch (err) {}

    expect(AppError).toHaveBeenCalledWith(
      "Invalid request body",
      400,
      mockErrors,
      "InvalidRequestBody"
    );
  });

  it("should pass custom validation options to validate function", async () => {
    // Arrange
    const mockData = { name: "John Doe", email: "john@example.com" };
    const customOptions = { forbidUnknownValues: true };
    const { validate } = require("class-validator");
    validate.mockResolvedValue([]);

    // Act
    await validateDto(TestUserDto, mockData, customOptions);

    // Assert
    expect(validate).toHaveBeenCalledWith(mockData, customOptions);
  });

  it("should use default validation options when none are provided", async () => {
    // Arrange
    const mockData = { name: "John Doe", email: "john@example.com" };
    const { validate } = require("class-validator");
    validate.mockResolvedValue([]);

    // Act
    await validateDto(TestUserDto, mockData);

    // Assert
    expect(validate).toHaveBeenCalledWith(mockData, undefined);
  });
});
