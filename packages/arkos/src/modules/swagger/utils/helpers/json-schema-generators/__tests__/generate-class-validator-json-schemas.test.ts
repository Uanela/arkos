import { generateClassValidatorJsonSchemas } from "../generate-class-validator-json-schemas";
import { validationMetadatasToSchemas } from "class-validator-jsonschema";
import { importModule } from "../../../../../../utils/helpers/global.helpers";
import { getMetadataStorage } from "class-validator";
import {
  getModelModules,
  getModels,
} from "../../../../../../utils/helpers/models.helpers";
import { getCorrectJsonSchemaName } from "../../swagger.router.helpers";

// Mock all dependencies
jest.mock("class-validator-jsonschema");
jest.mock("../../../../../../utils/helpers/global.helpers");
jest.mock("class-validator");
jest.mock("../../../../../../utils/helpers/models.helpers");
jest.mock("../../swagger.router.helpers");
jest.mock("fs");

describe("generateClassValidatorJsonSchemas", () => {
  // Mock functions
  const mockValidationMetadatasToSchemas =
    validationMetadatasToSchemas as jest.MockedFunction<
      typeof validationMetadatasToSchemas
    >;
  const mockImportModule = importModule as jest.MockedFunction<
    typeof importModule
  >;
  const mockGetMetadataStorage = getMetadataStorage as jest.MockedFunction<
    typeof getMetadataStorage
  >;
  const mockGetModelModules = getModelModules as jest.MockedFunction<
    typeof getModelModules
  >;
  const mockGetModels = getModels as jest.MockedFunction<typeof getModels>;
  const mockGetCorrectJsonSchemaName =
    getCorrectJsonSchemaName as jest.MockedFunction<
      typeof getCorrectJsonSchemaName
    >;

  // Mock onsole.warn to test error handling
  const mockConsoleWarn = jest
    .spyOn(console, "warn")
    .mockImplementation(() => {});

  beforeEach(() => {
    jest.clearAllMocks();
    mockConsoleWarn.mockClear();
  });

  afterEach(() => {
    mockConsoleWarn.mockRestore();
  });

  describe("Happy Path Tests", () => {
    beforeEach(() => {
      // Setup default mocks for happy path
      mockGetModels.mockReturnValue(["user", "product"]);
      mockGetMetadataStorage.mockReturnValue({} as any);
      mockImportModule.mockResolvedValue({
        defaultMetadataStorage: { mock: "storage" },
      });
      mockValidationMetadatasToSchemas.mockReturnValue({
        CreateUserDto: {
          type: "object",
          properties: { name: { type: "string" } },
        },
        UpdateUserDto: {
          type: "object",
          properties: { id: { type: "number" } },
        },
        CreateProductDto: {
          type: "object",
          properties: { title: { type: "string" } },
        },
      });
    });

    test("should generate schemas successfully with valid models and DTOs", async () => {
      mockGetModelModules
        .mockReturnValueOnce({
          dtos: {
            create: { name: "CreateUserDto" },
            update: { name: "UpdateUserDto" },
          },
        })
        .mockReturnValueOnce({
          dtos: {
            create: { name: "CreateProductDto" },
          },
        });

      mockGetCorrectJsonSchemaName
        .mockReturnValueOnce("create-user-dto")
        .mockReturnValueOnce("update-user-dto")
        .mockReturnValueOnce("create-product-dto");

      const result = await generateClassValidatorJsonSchemas();

      expect(result).toEqual({
        "create-user-dto": {
          type: "object",
          properties: { name: { type: "string" } },
        },
        "update-user-dto": {
          type: "object",
          properties: { id: { type: "number" } },
        },
        "create-product-dto": {
          type: "object",
          properties: { title: { type: "string" } },
        },
      });

      expect(mockValidationMetadatasToSchemas).toHaveBeenCalledWith({
        classValidatorMetadataStorage: {},
        classTransformerMetadataStorage: { mock: "storage" },
        refPointerPrefix: "#/components/schemas/",
      });
    });

    test("should handle models without DTOs", async () => {
      mockGetModelModules
        .mockReturnValueOnce({
          dtos: {
            create: { name: "CreateUserDto" },
          },
        })
        .mockReturnValueOnce({}); // No model modules for second model

      mockGetCorrectJsonSchemaName.mockReturnValueOnce("create-user-dto");

      const result = await generateClassValidatorJsonSchemas();

      expect(result).toEqual({
        "create-user-dto": {
          type: "object",
          properties: { name: { type: "string" } },
        },
        UpdateUserDto: {
          type: "object",
          properties: { id: { type: "number" } },
        },
        CreateProductDto: {
          type: "object",
          properties: { title: { type: "string" } },
        },
      });
    });

    test("should handle empty models array", async () => {
      mockGetModels.mockReturnValue([]);

      const result = await generateClassValidatorJsonSchemas();

      expect(result).toEqual({
        CreateUserDto: {
          type: "object",
          properties: { name: { type: "string" } },
        },
        UpdateUserDto: {
          type: "object",
          properties: { id: { type: "number" } },
        },
        CreateProductDto: {
          type: "object",
          properties: { title: { type: "string" } },
        },
      });
    });
  });

  describe("Edge Cases and Error Handling", () => {
    beforeEach(() => {
      mockGetModels.mockReturnValue(["user"]);
      mockGetMetadataStorage.mockReturnValue({} as any);
      mockImportModule.mockResolvedValue({
        defaultMetadataStorage: { mock: "storage" },
      });
    });

    test("should handle empty JSON schema from class-validator", async () => {
      mockValidationMetadatasToSchemas.mockReturnValue({});
      mockGetModelModules.mockReturnValue({
        dtos: {
          create: { name: "CreateUserDto" },
        },
      });
      mockGetCorrectJsonSchemaName.mockReturnValue("create-user-dto");

      const result = await generateClassValidatorJsonSchemas();

      expect(result).toEqual({
        "create-user-dto": {},
      });
    });

    test("should handle null DTO classes", async () => {
      mockValidationMetadatasToSchemas.mockReturnValue({
        CreateUserDto: { type: "object" },
      });
      mockGetModelModules.mockReturnValue({
        dtos: {
          create: null, // Null DTO class
          update: { name: "UpdateUserDto" },
        },
      });
      mockGetCorrectJsonSchemaName.mockReturnValue("update-user-dto");

      const result = await generateClassValidatorJsonSchemas();

      expect(result).toEqual({
        "update-user-dto": {},
        CreateUserDto: { type: "object" },
      });
    });

    test("should handle undefined DTO classes", async () => {
      mockValidationMetadatasToSchemas.mockReturnValue({
        CreateUserDto: { type: "object" },
      });
      mockGetModelModules.mockReturnValue({
        dtos: {
          create: undefined, // Undefined DTO class
          update: { name: "UpdateUserDto" },
        },
      });
      mockGetCorrectJsonSchemaName.mockReturnValue("update-user-dto");

      const result = await generateClassValidatorJsonSchemas();

      expect(result).toEqual({
        "update-user-dto": {},
        CreateUserDto: { type: "object" },
      });
    });

    test("should handle getCorrectJsonSchemaName throwing errors", async () => {
      mockValidationMetadatasToSchemas.mockReturnValue({
        CreateUserDto: { type: "object" },
      });
      mockGetModelModules.mockReturnValue({
        dtos: {
          create: { name: "CreateUserDto" },
          update: { name: "UpdateUserDto" },
        },
      });

      mockGetCorrectJsonSchemaName
        .mockImplementationOnce(() => {
          throw new Error("Invalid schema name format");
        })
        .mockReturnValueOnce("update-user-dto");

      const result = await generateClassValidatorJsonSchemas();

      // await new Promise(setImmediate);

      expect(result).toEqual({
        "update-user-dto": {},
        CreateUserDto: { type: "object" },
      });
      // expect(mockConsoleWarn).toHaveBeenCalledWith(
      //   "Failed to generate schema for create user:",
      //   expect.any(Error)
      // );
    });

    test("should handle models with empty DTOs object", async () => {
      mockValidationMetadatasToSchemas.mockReturnValue({
        SomeDto: { type: "object" },
      });
      mockGetModelModules.mockReturnValue({
        dtos: {}, // Empty DTOs object
      });

      const result = await generateClassValidatorJsonSchemas();

      expect(result).toEqual({
        SomeDto: { type: "object" },
      });
    });

    test("should handle models with no dtos property", async () => {
      mockValidationMetadatasToSchemas.mockReturnValue({
        SomeDto: { type: "object" },
      });
      mockGetModelModules.mockReturnValue({
        // No 'dtos' property
        entities: { user: {} },
      } as any);

      const result = await generateClassValidatorJsonSchemas();

      expect(result).toEqual({
        SomeDto: { type: "object" },
      });
    });

    test("should handle importModule failure", async () => {
      mockImportModule.mockRejectedValue(new Error("Module import failed"));

      await expect(generateClassValidatorJsonSchemas()).rejects.toThrow(
        "Module import failed"
      );
    });

    test("should handle validationMetadatasToSchemas throwing error", async () => {
      mockImportModule.mockResolvedValue({
        defaultMetadataStorage: { mock: "storage" },
      });
      mockValidationMetadatasToSchemas.mockImplementation(() => {
        throw new Error("Schema generation failed");
      });

      await expect(generateClassValidatorJsonSchemas()).rejects.toThrow(
        "Schema generation failed"
      );
    });

    test("should handle getMetadataStorage throwing error", async () => {
      mockImportModule.mockResolvedValue({
        defaultMetadataStorage: { mock: "storage" },
      });
      mockGetMetadataStorage.mockImplementation(() => {
        throw new Error("Metadata storage error");
      });

      await expect(generateClassValidatorJsonSchemas()).rejects.toThrow(
        "Metadata storage error"
      );
    });

    test("should handle getModels throwing error", async () => {
      mockImportModule.mockResolvedValue({
        defaultMetadataStorage: { mock: "storage" },
      });
      mockValidationMetadatasToSchemas.mockReturnValue({});
      mockGetModels.mockImplementation(() => {
        throw new Error("Models retrieval failed");
      });

      await expect(generateClassValidatorJsonSchemas()).rejects.toThrow(
        "Models retrieval failed"
      );
    });
  });

  describe("Schema Name Mapping", () => {
    beforeEach(() => {
      mockGetModels.mockReturnValue(["user"]);
      mockGetMetadataStorage.mockReturnValue({} as any);
      mockImportModule.mockResolvedValue({
        defaultMetadataStorage: { mock: "storage" },
      });
    });

    test("should correctly map schema names and delete original class names", async () => {
      mockValidationMetadatasToSchemas.mockReturnValue({
        CreateUserDto: {
          type: "object",
          properties: { name: { type: "string" } },
        },
        UpdateUserDto: {
          type: "object",
          properties: { id: { type: "number" } },
        },
        SomeOtherSchema: { type: "object" },
      });

      mockGetModelModules.mockReturnValue({
        dtos: {
          create: { name: "CreateUserDto" },
          update: { name: "UpdateUserDto" },
        },
      });

      mockGetCorrectJsonSchemaName
        .mockReturnValueOnce("create-user-dto")
        .mockReturnValueOnce("update-user-dto");

      const result = await generateClassValidatorJsonSchemas();

      expect(result).toEqual({
        "create-user-dto": {
          type: "object",
          properties: { name: { type: "string" } },
        },
        "update-user-dto": {
          type: "object",
          properties: { id: { type: "number" } },
        },
        SomeOtherSchema: { type: "object" },
      });

      // Original class names should be deleted
      expect(result.CreateUserDto).toBeUndefined();
      expect(result.UpdateUserDto).toBeUndefined();
    });

    test("should handle duplicate schema names", async () => {
      mockValidationMetadatasToSchemas.mockReturnValue({
        CreateUserDto: {
          type: "object",
          properties: { name: { type: "string" } },
        },
        CreateProductDto: {
          type: "object",
          properties: { title: { type: "string" } },
        },
      });

      mockGetModelModules.mockReturnValue({
        dtos: {
          create: { name: "CreateUserDto" },
          update: { name: "CreateProductDto" }, // Different DTO with same pattern
        },
      });

      // Both return the same schema name (edge case)
      mockGetCorrectJsonSchemaName
        .mockReturnValueOnce("create-dto")
        .mockReturnValueOnce("create-dto");

      const result = await generateClassValidatorJsonSchemas();

      // Second one should overwrite the first
      expect(result["create-dto"]).toEqual({
        type: "object",
        properties: { title: { type: "string" } },
      });
    });
  });

  describe("Complex DTO Structures", () => {
    test("should handle DTOs with various types", async () => {
      mockGetModels.mockReturnValue(["complex"]);
      mockGetMetadataStorage.mockReturnValue({} as any);
      mockImportModule.mockResolvedValue({
        defaultMetadataStorage: { mock: "storage" },
      });

      const complexSchema = {
        ComplexDto: {
          type: "object",
          properties: {
            stringField: { type: "string" },
            numberField: { type: "number" },
            arrayField: { type: "array", items: { type: "string" } },
            nestedObject: {
              type: "object",
              properties: {
                nestedField: { type: "boolean" },
              },
            },
          },
          required: ["stringField", "numberField"],
        },
      };

      mockValidationMetadatasToSchemas.mockReturnValue(complexSchema as any);
      mockGetModelModules.mockReturnValue({
        dtos: {
          complex: { name: "ComplexDto" },
        },
      });
      mockGetCorrectJsonSchemaName.mockReturnValue("complex-dto");

      const result = await generateClassValidatorJsonSchemas();

      expect(result["complex-dto"]).toEqual(complexSchema.ComplexDto);
    });
  });

  describe("Async Behavior", () => {
    test("should handle slow importModule resolution", async () => {
      mockGetModels.mockReturnValue(["user"]);
      mockGetMetadataStorage.mockReturnValue({} as any);

      // Simulate slow module import
      mockImportModule.mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () => resolve({ defaultMetadataStorage: { mock: "storage" } }),
              100
            )
          )
      );

      mockValidationMetadatasToSchemas.mockReturnValue({
        TestDto: { type: "object" },
      });

      mockGetModelModules.mockReturnValue({
        dtos: {
          test: { name: "TestDto" },
        },
      });

      mockGetCorrectJsonSchemaName.mockReturnValue("test-dto");

      const startTime = Date.now();
      const result = await generateClassValidatorJsonSchemas();
      const endTime = Date.now();

      expect(endTime - startTime).toBeGreaterThanOrEqual(100);
      expect(result).toEqual({
        "test-dto": { type: "object" },
      });
    });
  });
});
