import { generateClassValidatorJsonSchemas } from "../generate-class-validator-json-schemas";
import * as swaggerRouterHelpers from "../../swagger.router.helpers";
import prismaSchemaParser from "../../../../../../utils/prisma/prisma-schema-parser";
import loadableRegistry from "../../../../../../components/arkos-loadable-registry";
import { routeHookReader } from "../../../../../../components/arkos-route-hook/reader";
import * as classValidatorJsonSchema from "class-validator-jsonschema";
import * as classValidator from "class-validator";
import { IsString, IsEmail } from "class-validator";

jest.mock("../../../../../../utils/prisma/prisma-schema-parser", () => ({
  __esModule: true,
  default: {
    parse: jest.fn(),
    getModelsAsArrayOfStrings: jest.fn(() => []),
  },
}));

jest.mock("class-validator-jsonschema");
jest.mock("class-validator", () => ({
  ...jest.requireActual("class-validator"),
  getMetadataStorage: jest.fn(() => ({})),
}));
jest.mock("class-transformer/cjs/storage.js", () => ({
  defaultMetadataStorage: {},
}));
jest.mock("../../../../../../components/arkos-loadable-registry", () => ({
  __esModule: true,
  default: { getItem: jest.fn() },
}));
jest.mock("../../../../../../components/arkos-route-hook/reader", () => ({
  routeHookReader: { getFullConfig: jest.fn() },
}));
jest.mock("../../../../../../utils/helpers/fs.helpers", () => ({
  getUserFileExtension: jest.fn(() => "ts"),
}));
jest.mock("fs");

const mockGetModels = prismaSchemaParser.getModelsAsArrayOfStrings as jest.Mock;
const mockGetItem = loadableRegistry.getItem as jest.Mock;
const mockGetFullConfig = routeHookReader.getFullConfig as jest.Mock;
const mockValidationMetadatasToSchemas =
  classValidatorJsonSchema.validationMetadatasToSchemas as jest.Mock;
let mockGetCorrectJsonSchemaName: jest.SpyInstance = jest.spyOn(
  swaggerRouterHelpers,
  "getCorrectJsonSchemaName"
);

function makeRouteHook(dtos: Record<string, any>) {
  const hook: Record<string, any> = {
    __type: "ArkosRouteHook",
    _store: {},
  };
  for (const key of Object.keys(dtos)) {
    hook[key] = jest.fn();
  }
  mockGetFullConfig.mockImplementation(
    (_moduleName: string, operation: string) => {
      const dto = dtos[operation];
      if (!dto) return null;
      return { validation: { body: dto } };
    }
  );
  return hook;
}

describe("generateClassValidatorJsonSchemas", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockValidationMetadatasToSchemas.mockReturnValue({});
  });

  describe("Edge Case: Empty models list", () => {
    it("should handle empty models list and return only auth schemas", () => {
      class LoginDto {
        @IsEmail() email!: string;
        @IsString() password!: string;
      }

      mockGetModels.mockReturnValue([]);
      mockGetItem.mockImplementation((_: string, modelName: string) => {
        if (modelName === "auth") return makeRouteHook({ login: LoginDto });
        return null;
      });
      mockValidationMetadatasToSchemas.mockReturnValue({
        LoginDto: { type: "object", properties: { email: { type: "string" } } },
      });
      mockGetCorrectJsonSchemaName.mockReturnValue("LoginDto");

      const result = generateClassValidatorJsonSchemas();

      expect(mockGetItem).toHaveBeenCalledWith("ArkosRouteHook", "auth");
      expect(result).toHaveProperty("LoginDto");
    });
  });

  describe("Edge Case: Models with no route hook", () => {
    it("should skip models with no route hook registered", () => {
      mockGetModels.mockReturnValue(["user", "post"]);
      mockGetItem.mockReturnValue(null);
      mockValidationMetadatasToSchemas.mockReturnValue({});

      const result = generateClassValidatorJsonSchemas();

      expect(result).toEqual({});
      expect(mockGetCorrectJsonSchemaName).not.toHaveBeenCalled();
    });

    it("should handle route hook with no validation body", () => {
      mockGetModels.mockReturnValue(["user"]);
      mockGetItem.mockImplementation((_: string, modelName: string) => {
        if (modelName === "user") return makeRouteHook({});
        return null;
      });

      const result = generateClassValidatorJsonSchemas();

      expect(result).toEqual({});
    });
  });

  describe("Edge Case: Duplicate schema names", () => {
    it("should throw when two dtos generate the same schema name", () => {
      class CreateUserDto {
        @IsString() name!: string;
      }

      mockGetModels.mockReturnValue(["user"]);
      mockGetItem.mockImplementation((_: string, modelName: string) => {
        if (modelName === "user")
          return makeRouteHook({ createOne: CreateUserDto });
        return null;
      });
      mockValidationMetadatasToSchemas.mockReturnValue({
        CreateUserDto: { type: "object" },
      });
      mockGetCorrectJsonSchemaName.mockReturnValue("CreateUserDto");

      // first call registers it, second would duplicate
      mockGetFullConfig
        .mockReturnValueOnce({ validation: { body: CreateUserDto } })
        .mockReturnValueOnce({ validation: { body: CreateUserDto } });

      expect(() => generateClassValidatorJsonSchemas()).toThrow();
    });
  });

  describe("Edge Case: Null/undefined dto classes", () => {
    it("should skip null dto classes", () => {
      mockGetModels.mockReturnValue(["user"]);
      mockGetItem.mockImplementation((_: string, modelName: string) => {
        if (modelName === "user")
          return makeRouteHook({ createOne: null, updateOne: null });
        return null;
      });

      const result = generateClassValidatorJsonSchemas();

      expect(result).toEqual({});
      expect(mockGetCorrectJsonSchemaName).not.toHaveBeenCalled();
    });
  });

  describe("Edge Case: Auth model special handling", () => {
    it("should always include auth model even when not in getModels result", () => {
      class LoginDto {
        @IsEmail() email!: string;
      }
      class SignupDto {
        @IsEmail() email!: string;
        @IsString() password!: string;
      }

      mockGetModels.mockReturnValue(["user"]);
      mockGetItem.mockImplementation((_: string, modelName: string) => {
        if (modelName === "user") return makeRouteHook({});
        if (modelName === "auth")
          return makeRouteHook({ login: LoginDto, signup: SignupDto });
        return null;
      });
      mockValidationMetadatasToSchemas.mockReturnValue({
        LoginDto: { type: "object" },
        SignupDto: { type: "object" },
      });
      mockGetCorrectJsonSchemaName
        .mockReturnValueOnce("LoginDto")
        .mockReturnValueOnce("SignupDto");

      const result = generateClassValidatorJsonSchemas();

      expect(mockGetItem).toHaveBeenCalledWith("ArkosRouteHook", "auth");
      expect(Object.keys(result)).toContain("LoginDto");
      expect(Object.keys(result)).toContain("SignupDto");
    });

    it("should handle auth model with no route hook", () => {
      mockGetModels.mockReturnValue([]);
      mockGetItem.mockReturnValue(null);

      const result = generateClassValidatorJsonSchemas();

      expect(mockGetItem).toHaveBeenCalledWith("ArkosRouteHook", "auth");
      expect(result).toEqual({});
    });
  });

  describe("Edge Case: Global jsonSchema passthrough", () => {
    it("should include global class-validator schemas not already in result", () => {
      mockGetModels.mockReturnValue([]);
      mockGetItem.mockReturnValue(null);
      mockValidationMetadatasToSchemas.mockReturnValue({
        SomeGlobalDto: {
          type: "object",
          properties: { id: { type: "number" } },
        },
      });

      const result = generateClassValidatorJsonSchemas();

      expect(result).toHaveProperty("SomeGlobalDto");
    });

    it("should not overwrite already registered schemas with global ones", () => {
      class LoginDto {
        @IsEmail() email!: string;
      }

      mockGetModels.mockReturnValue([]);
      mockGetItem.mockImplementation((_: string, modelName: string) => {
        if (modelName === "auth") return makeRouteHook({ login: LoginDto });
        return null;
      });
      mockValidationMetadatasToSchemas.mockReturnValue({
        LoginDto: { type: "object", properties: { email: { type: "string" } } },
        SomeOtherDto: { type: "object" },
      });
      mockGetCorrectJsonSchemaName.mockReturnValue("LoginDto");

      const result = generateClassValidatorJsonSchemas();

      expect(result.LoginDto).toBeDefined();
      expect(result.SomeOtherDto).toBeDefined();
    });
  });

  describe("Integration scenarios", () => {
    it("should handle a realistic scenario with multiple models", () => {
      class CreateUserDto {
        @IsString() name!: string;
      }
      class UpdateUserDto {
        @IsString() name!: string;
      }
      class CreatePostDto {
        @IsString() title!: string;
      }

      mockGetModels.mockReturnValue(["user", "post"]);
      mockGetItem.mockImplementation((_: string, modelName: string) => {
        if (modelName === "user")
          return makeRouteHook({
            createOne: CreateUserDto,
            updateOne: UpdateUserDto,
          });
        if (modelName === "post")
          return makeRouteHook({ createOne: CreatePostDto });
        if (modelName === "auth") return null;
        return null;
      });
      mockValidationMetadatasToSchemas.mockReturnValue({
        CreateUserDto: {
          type: "object",
          properties: { name: { type: "string" } },
        },
        UpdateUserDto: {
          type: "object",
          properties: { name: { type: "string" } },
        },
        CreatePostDto: {
          type: "object",
          properties: { title: { type: "string" } },
        },
      });
      mockGetCorrectJsonSchemaName
        .mockReturnValueOnce("CreateUserDto")
        .mockReturnValueOnce("UpdateUserDto")
        .mockReturnValueOnce("CreatePostDto");

      const result = generateClassValidatorJsonSchemas();

      expect(Object.keys(result)).toHaveLength(3);
      expect(result.CreateUserDto).toBeDefined();
      expect(result.UpdateUserDto).toBeDefined();
      expect(result.CreatePostDto).toBeDefined();
    });
  });
});
