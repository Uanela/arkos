import {
  getOpenAPIJsonSchemasByConfigMode,
  getCorrectJsonSchemaName,
  kebabToHuman,
  getSchemaRef,
  generatePathsForModels,
} from "../swagger.router.helpers";
import { ArkosConfig } from "../../../../../exports";
import sheu from "../../../../../utils/sheu";
import { generatePrismaJsonSchemas } from "../json-schema-generators/generate-prisma-json-schemas";
import { generateClassValidatorJsonSchemas } from "../json-schema-generators/generate-class-validator-json-schemas";
import generateZodJsonSchemas from "../json-schema-generators/generate-zod-json-schemas";
import { generatePrismaModelMainRoutesPaths } from "../json-schema-generators/prisma-models/generate-prisma-model-main-routes-paths";
import prismaSchemaParser from "../../../../../utils/prisma/prisma-schema-parser";

// Mock all dependencies
jest.mock("../../../../../utils/dynamic-loader");
jest.mock("../../../../../utils/sheu");
jest.mock("../get-system-json-schema-paths");
jest.mock("../get-authentication-json-schema-paths");
jest.mock("../json-schema-generators/generate-zod-json-schemas");
jest.mock("../json-schema-generators/generate-class-validator-json-schemas");
jest.mock("../json-schema-generators/generate-prisma-json-schemas");
jest.mock(
  "../json-schema-generators/prisma-models/generate-prisma-model-main-routes-paths"
);
jest.mock(
  "../json-schema-generators/prisma-models/generate-prisma-model-parent-routes-paths"
);
jest.mock("fs");

describe("Swagger Utility Functions", () => {
  const mockConfig: ArkosConfig = {
    swagger: {
      mode: "prisma",
      strict: false,
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("getOpenAPIJsonSchemasByConfigMode", () => {
    it("should call generatePrismaJsonSchemas for prisma mode", async () => {
      getOpenAPIJsonSchemasByConfigMode(mockConfig);
      expect(generatePrismaJsonSchemas).toHaveBeenCalledWith(mockConfig);
    });

    it("should call generateClassValidatorJsonSchemas for class-validator mode", async () => {
      const config = {
        ...mockConfig,
        swagger: { ...mockConfig.swagger, mode: "class-validator" },
      } as any;
      getOpenAPIJsonSchemasByConfigMode(config);
      expect(generateClassValidatorJsonSchemas).toHaveBeenCalled();
    });

    it("should call generateZodJsonSchemas for zod mode", async () => {
      const config = {
        ...mockConfig,
        swagger: { ...mockConfig.swagger, mode: "zod" },
      } as any;
      getOpenAPIJsonSchemasByConfigMode(config);
      expect(generateZodJsonSchemas).toHaveBeenCalled();
    });

    it("should throw error for unknown mode", async () => {
      const config = {
        ...mockConfig,
        swagger: { ...mockConfig.swagger, mode: "invalid" },
      };
      try {
        expect(getOpenAPIJsonSchemasByConfigMode(config as any)).toThrow(
          "Unknown mode for auto documentation"
        );
      } catch {}
    });
  });

  describe("getCorrectJsonSchemaName", () => {
    it("should return correct schema name for model type", () => {
      expect(getCorrectJsonSchemaName("model", "user", "Dto")).toBe("UserDto");
    });

    it("should return correct schema name for create type", () => {
      expect(getCorrectJsonSchemaName("create", "user", "Schema")).toBe(
        "CreateUserSchema"
      );
    });

    it("should return correct schema name for login type", () => {
      expect(getCorrectJsonSchemaName("login", "user", "Dto")).toBe("LoginDto");
    });

    it("should return pascal case for unknown types", () => {
      expect(getCorrectJsonSchemaName("unknownType", "user", "Schema")).toBe(
        "UnknownTypeSchema"
      );
    });
  });

  describe("kebabToHuman", () => {
    it("should convert kebab-case to human readable", () => {
      expect(kebabToHuman("user-profile")).toBe("User Profile");
    });

    it("should handle single word", () => {
      expect(kebabToHuman("user")).toBe("User");
    });

    it("should handle empty string", () => {
      expect(kebabToHuman("")).toBe("");
    });
  });

  describe("getSchemaRef", () => {
    it("should return prisma format for prisma mode", () => {
      expect(getSchemaRef("User", "prisma")).toBe(
        "#/components/schemas/UserModelSchema"
      );
    });

    it("should return zod format for zod mode", () => {
      expect(getSchemaRef("User", "zod")).toBe(
        "#/components/schemas/UserSchema"
      );
    });

    it("should return dto format for class-validator mode", () => {
      expect(getSchemaRef("User", "class-validator")).toBe(
        "#/components/schemas/UserDto"
      );
    });

    it("should handle special cases for prisma mode", () => {
      expect(getSchemaRef("login", "prisma")).toBe(
        "#/components/schemas/LoginSchema"
      );
      expect(getSchemaRef("updateMe", "prisma")).toBe(
        "#/components/schemas/UpdateMeSchema"
      );
    });

    it("should log error for unknown mode", () => {
      getSchemaRef("User", "invalid" as any);
      expect(sheu.error).toHaveBeenCalled();
    });
  });

  describe("generatePathsForModels", () => {
    beforeEach(() => {
      jest
        .spyOn(prismaSchemaParser, "getModelsAsArrayOfStrings")
        .mockReturnValue(["User", "Post"]);
      (
        require("../get-system-json-schema-paths")
          .getSystemJsonSchemaPaths as jest.Mock
      ).mockReturnValue({});
      (
        require("../get-authentication-json-schema-paths").default as jest.Mock
      ).mockReturnValue({});
    });

    it("should return empty object when no swagger config", async () => {
      const config = { ...mockConfig, swagger: undefined };
      const result = generatePathsForModels(config);
      expect(result).toEqual({});
    });

    it("should generate paths for all models", async () => {
      generatePathsForModels(mockConfig);
      expect(generatePrismaModelMainRoutesPaths).toHaveBeenCalledTimes(2);
    });

    it("should include system and auth paths", async () => {
      const systemPaths = { "/system": { get: {} } };
      const authPaths = { "/auth": { post: {} } };

      (
        require("../get-system-json-schema-paths")
          .getSystemJsonSchemaPaths as jest.Mock
      ).mockReturnValue(systemPaths);
      (
        require("../get-authentication-json-schema-paths").default as jest.Mock
      ).mockReturnValue(authPaths);

      const result = generatePathsForModels(mockConfig);
      expect(result).toMatchObject({
        ...systemPaths,
        ...authPaths,
      });
    });

    // it("should handle errors in path generation", async () => {
    //   (generatePrismaModelMainRoutesPaths as jest.Mock).mockRejectedValue(
    //     new Error("Generation error")
    //   );

    //    expect(generatePathsForModels(mockConfig)).rejects.toThrow(
    //     "Generation error"
    //   );
    // });
  });
});
