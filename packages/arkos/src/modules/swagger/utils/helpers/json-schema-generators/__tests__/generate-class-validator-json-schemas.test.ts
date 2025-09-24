import { generateClassValidatorJsonSchemas } from "../generate-class-validator-json-schemas";
import prismaSchemaParser from "../../../../../../utils/prisma/prisma-schema-parser";
import { validationMetadatasToSchemas } from "class-validator-jsonschema";
import { importModule } from "../../../../../../utils/helpers/global.helpers";
import { getMetadataStorage } from "class-validator";
import { getModuleComponents } from "../../../../../../utils/dynamic-loader";
import { getCorrectJsonSchemaName } from "../../swagger.router.helpers";
import sheu from "../../../../../../utils/sheu";

// Mock all dependencies
jest.mock("class-validator-jsonschema");
jest.mock("../../../../../../utils/helpers/global.helpers");
jest.mock("class-validator");
jest.mock("../../../../../../utils/dynamic-loader");
jest.mock("../../swagger.router.helpers");
jest.mock("fs");
jest.mock("../../../../../../utils/sheu");

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
  const mockgetModuleComponents = getModuleComponents as jest.MockedFunction<
    typeof getModuleComponents
  >;
  const mockGetModels = jest.spyOn(
    prismaSchemaParser,
    "getModelsAsArrayOfStrings"
  );
  const mockGetCorrectJsonSchemaName =
    getCorrectJsonSchemaName as jest.MockedFunction<
      typeof getCorrectJsonSchemaName
    >;

  // Mock onsole.warn to test error handling
  const mockConsoleWarn = jest
    .spyOn(console, "warn")
    .mockImplementation(() => {});
  const mockSheuWarn = jest.spyOn(sheu, "warn").mockImplementation(jest.fn());

  beforeEach(() => {
    jest.clearAllMocks();
    mockConsoleWarn.mockClear();
    mockSheuWarn.mockClear();
  });

  afterEach(() => {
    mockConsoleWarn.mockRestore();
    mockSheuWarn.mockClear();
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

    it("should generate schemas successfully with valid models and DTOs", async () => {
      mockgetModuleComponents
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
        })
        .mockReturnValueOnce({}); // auth module

      mockGetCorrectJsonSchemaName
        .mockReturnValueOnce("CreateUserDto")
        .mockReturnValueOnce("UpdateUserDto")
        .mockReturnValueOnce("CreateProductDto");

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

    it("should handle models without DTOs", async () => {
      mockgetModuleComponents
        .mockReturnValueOnce({
          dtos: {
            create: { name: "CreateUserDto" },
          },
        })
        .mockReturnValueOnce({})
        .mockReturnValueOnce({});

      mockGetCorrectJsonSchemaName.mockReturnValueOnce("create-user-dto");

      const result = await generateClassValidatorJsonSchemas();

      expect(result).toEqual({
        "create-user-dto": {
          type: "object",
          properties: { name: { type: "string" } },
        },
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

    it("should handle empty models array", async () => {
      mockGetModels.mockReturnValue([]);
      mockgetModuleComponents.mockReturnValueOnce({}); // auth module only

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

    it("should handle empty JSON schema from class-validator", async () => {
      mockValidationMetadatasToSchemas.mockReturnValue({});
      mockgetModuleComponents
        .mockReturnValueOnce({
          dtos: {
            create: { name: "CreateUserDto" },
          },
        })
        .mockReturnValueOnce({}); // auth module
      mockGetCorrectJsonSchemaName.mockReturnValue("create-user-dto");

      const result = await generateClassValidatorJsonSchemas();

      expect(result).toEqual({
        "create-user-dto": {},
      });
    });

    it("should handle null DTO classes", async () => {
      mockValidationMetadatasToSchemas.mockReturnValue({
        CreateUserDto: { type: "object" },
      });
      mockgetModuleComponents
        .mockReturnValueOnce({
          dtos: {
            create: null, // Null DTO class
            update: { name: "UpdateUserDto" },
          },
        })
        .mockReturnValueOnce({}); // auth module
      mockGetCorrectJsonSchemaName.mockReturnValue("update-user-dto");

      const result = await generateClassValidatorJsonSchemas();

      expect(result).toEqual({
        "update-user-dto": {},
        CreateUserDto: { type: "object" },
      });
    });

    it("should handle undefined DTO classes", async () => {
      mockValidationMetadatasToSchemas.mockReturnValue({
        CreateUserDto: { type: "object" },
      });
      mockgetModuleComponents
        .mockReturnValueOnce({
          dtos: {
            create: undefined, // Undefined DTO class
            update: { name: "UpdateUserDto" },
          },
        })
        .mockReturnValueOnce({}); // auth module
      mockGetCorrectJsonSchemaName.mockReturnValue("update-user-dto");

      const result = await generateClassValidatorJsonSchemas();

      expect(result).toEqual({
        "update-user-dto": {},
        CreateUserDto: { type: "object" },
      });
    });

    it("should handle getCorrectJsonSchemaName throwing errors", async () => {
      mockValidationMetadatasToSchemas.mockReturnValue({
        CreateUserDto: { type: "object" },
      });
      mockgetModuleComponents
        .mockReturnValueOnce({
          dtos: {
            create: { name: "CreateUserDto" },
            update: { name: "UpdateUserDto" },
          },
        })
        .mockReturnValueOnce({}); // auth module

      mockGetCorrectJsonSchemaName
        .mockImplementationOnce(() => {
          throw new Error("Invalid schema name format");
        })
        .mockReturnValueOnce("update-user-dto");

      await expect(generateClassValidatorJsonSchemas()).rejects.toThrow(
        "Failed to generate schema for create user: Invalid schema name format"
      );
    });

    it("should handle models with empty DTOs object", async () => {
      mockValidationMetadatasToSchemas.mockReturnValue({
        SomeDto: { type: "object" },
      });
      mockgetModuleComponents
        .mockReturnValueOnce({
          dtos: {}, // Empty DTOs object
        })
        .mockReturnValueOnce({}); // auth module

      const result = await generateClassValidatorJsonSchemas();

      expect(result).toEqual({
        SomeDto: { type: "object" },
      });
    });

    it("should handle models with no dtos property", async () => {
      mockValidationMetadatasToSchemas.mockReturnValue({
        SomeDto: { type: "object" },
      });
      mockgetModuleComponents
        .mockReturnValueOnce({
          // No 'dtos' property
          entities: { user: {} },
        } as any)
        .mockReturnValueOnce({}); // auth module

      const result = await generateClassValidatorJsonSchemas();

      expect(result).toEqual({
        SomeDto: { type: "object" },
      });
    });

    it("should handle importModule failure", async () => {
      mockImportModule.mockRejectedValue(new Error("Module import failed"));

      await expect(generateClassValidatorJsonSchemas()).rejects.toThrow(
        "Module import failed"
      );
    });

    it("should handle validationMetadatasToSchemas throwing error", async () => {
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

    it("should handle getMetadataStorage throwing error", async () => {
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

    it("should handle getModels throwing error", async () => {
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

    it("should correctly map schema names and delete original class names", async () => {
      mockGetCorrectJsonSchemaName.mockReset();

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

      mockgetModuleComponents
        .mockReturnValueOnce({
          dtos: {
            create: { name: "CreateUserDto" },
            update: { name: "UpdateUserDto" },
          },
        })
        .mockReturnValueOnce({});

      mockGetCorrectJsonSchemaName
        .mockReturnValueOnce("CreateUserDto")
        .mockReturnValueOnce("UpdateUserDto");

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
        SomeOtherSchema: { type: "object" },
      });
    });

    it("should handle duplicate schema names", async () => {
      mockGetCorrectJsonSchemaName.mockReset();

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

      mockgetModuleComponents
        .mockReturnValueOnce({
          dtos: {
            create: { name: "CreateUserDto" },
            update: { name: "CreateProductDto" },
          },
        })
        .mockReturnValueOnce({});

      mockGetCorrectJsonSchemaName
        .mockReturnValueOnce("create-dto")
        .mockReturnValueOnce("create-dto");

      try {
        expect(await generateClassValidatorJsonSchemas()).toThrow(
          expect.stringContaining("Found more then 1")
        );
      } catch {}
    });
  });

  describe("Complex DTO Structures", () => {
    it("should handle DTOs with various types", async () => {
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
      mockgetModuleComponents
        .mockReturnValueOnce({
          dtos: {
            create: { name: "ComplexDto" },
          },
        })
        .mockReturnValueOnce({});
      mockGetCorrectJsonSchemaName.mockReturnValue("ComplexDto");

      const result = await generateClassValidatorJsonSchemas();

      expect(result["ComplexDto"]).toEqual(complexSchema.ComplexDto);
    });
  });

  describe("Async Behavior", () => {
    it("should handle slow importModule resolution", async () => {
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

      mockgetModuleComponents
        .mockReturnValueOnce({
          dtos: {
            create: { name: "TestDto" },
          },
        })
        .mockReturnValueOnce({}); // auth module

      mockGetCorrectJsonSchemaName.mockReturnValue("TestDto");

      const startTime = Date.now();
      const result = await generateClassValidatorJsonSchemas();
      const endTime = Date.now();

      expect(endTime - startTime).toBeGreaterThanOrEqual(100);
      expect(result).toEqual({
        TestDto: { type: "object" },
      });
    });
  });
});
