import { z } from "zod";
import validateSchema from "../validate-schema";
import AppError from "../../modules/error-handler/utils/app-error";

// Mock AppError
jest.mock("../../modules/error-handler/utils/app-error", () => {
  return jest.fn().mockImplementation((message, statusCode, errors) => {
    return {
      message,
      statusCode,
      errors,
    };
  });
});

describe("validateSchema", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return validated data when validation succeeds", async () => {
    // Arrange
    const testSchema = z.object({
      name: z.string(),
      email: z.string().email(),
    });
    const validData = { name: "John Doe", email: "john@example.com" };

    // Act
    const result = await validateSchema(testSchema, validData);

    // Assert
    expect(result).toEqual(validData);
  });

  it("should throw AppError when validation fails", async () => {
    // Arrange
    const testSchema = z.object({
      name: z.string(),
      email: z.string().email(),
    });
    const invalidData = { name: "John Doe", email: "invalid-email" };

    // Act & Assert
    try {
      expect(await validateSchema(testSchema, invalidData)).rejects.toThrow();
    } catch {}

    expect(AppError).toHaveBeenCalledWith(
      "Invalid Data",
      400,
      expect.objectContaining({
        email: expect.anything(),
      })
    );
  });

  it("should validate complex nested objects", async () => {
    // Arrange
    const addressSchema = z.object({
      street: z.string(),
      city: z.string(),
      zipCode: z.string(),
    });

    const userSchema = z.object({
      name: z.string(),
      age: z.number().min(18),
      address: addressSchema,
    });

    const validData = {
      name: "Jane Doe",
      age: 25,
      address: {
        street: "123 Main St",
        city: "New York",
        zipCode: "10001",
      },
    };

    // Act
    const result = await validateSchema(userSchema, validData);

    // Assert
    expect(result).toEqual(validData);
  });

  it("should handle array validations", async () => {
    // Arrange
    const arraySchema = z.object({
      items: z.array(z.string()),
    });

    const validData = {
      items: ["item1", "item2", "item3"],
    };

    // Act
    const result = await validateSchema(arraySchema, validData);

    // Assert
    expect(result).toEqual(validData);
  });

  it("should include all validation errors in the AppError", async () => {
    // Arrange
    const userSchema = z.object({
      name: z.string().min(3),
      age: z.number().min(18),
      email: z.string().email(),
    });

    const invalidData = {
      name: "Jo",
      age: 16,
      email: "invalid-email",
    };

    // Act & Assert
    try {
      expect(await validateSchema(userSchema, invalidData)).rejects.toThrow();
    } catch {}

    expect(AppError).toHaveBeenCalledWith(
      "Invalid Data",
      400,
      expect.objectContaining({
        name: expect.anything(),
        age: expect.anything(),
        email: expect.anything(),
      })
    );
  });
});
