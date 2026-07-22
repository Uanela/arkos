import { getUserFileExtension } from "../../../helpers/fs.helpers";
import { generateTemplate } from "../template-generators";
import { generateControllerTemplate } from "../template-generator/templates/generate-controller-template";
import { generateAuthConfigsTemplate } from "../template-generator/templates/auth-configs-template";
import { generateMiddlewaresTemplate } from "../template-generator/templates/interceptors-template";
import { generateQueryOptionsTemplate } from "../template-generator/templates/query-options-template";
import { generateRouterTemplate } from "../template-generator/templates/router-template";
import { generateServiceTemplate } from "../template-generator/templates/service-template";
import generateHooksTemplate from "../template-generator/templates/hooks-template";
import classValidatorDtoGenerator from "../template-generator/templates/class-validator-dto-generator";
import zodSchemaGenerator from "../template-generator/templates/zod-schema-generator";
import prismaSchemaParser from "../../../prisma/prisma-schema-parser";
import { generatePolicyTemplate } from "../template-generator/templates/policy-template";

jest.mock("fs");
jest.mock("../../../helpers/fs.helpers");
jest.mock("../template-generator/templates/generate-controller-template");
jest.mock("../template-generator/templates/auth-configs-template");
jest.mock("../template-generator/templates/interceptors-template");
jest.mock("../template-generator/templates/query-options-template");
jest.mock("../template-generator/templates/router-template");
jest.mock("../template-generator/templates/service-template");
jest.mock("../template-generator/templates/hooks-template");
jest.mock("../template-generator/templates/policy-template");
jest.mock(
  "../template-generator/templates/class-validator-dto-generator",
  () => ({
    __esModule: true,
    default: {
      generateCreateDto: jest.fn(),
      generateUpdateDto: jest.fn(),
      generateBaseDto: jest.fn(),
      generateQueryDto: jest.fn(),
      generateLoginDto: jest.fn(),
      generateSignupDto: jest.fn(),
      generateUpdateMeDto: jest.fn(),
      generateUpdatePasswordDto: jest.fn(),
    },
  })
);
jest.mock("../template-generator/templates/zod-schema-generator", () => ({
  __esModule: true,
  default: {
    generateCreateSchema: jest.fn(),
    generateUpdateSchema: jest.fn(),
    generateBaseSchema: jest.fn(),
    generateQuerySchema: jest.fn(),
    generateLoginSchema: jest.fn(),
    generateSignupSchema: jest.fn(),
    generateUpdateMeSchema: jest.fn(),
    generateUpdatePasswordSchema: jest.fn(),
  },
}));
jest.mock("../../../prisma/prisma-schema-parser", () => ({
  __esModule: true,
  default: {
    getModelsAsArrayOfStrings: jest.fn(() => [
      "user",
      "very-long-model-name-with-many-parts",
      "user-profile",
      "product",
      "order",
    ]),
    parse: jest.fn(),
    generatePrismaModel: jest.fn(),
  },
}));

const mockedGetUserFileExtension = getUserFileExtension as jest.MockedFunction<
  typeof getUserFileExtension
>;

describe("generateTemplate", () => {
  const mockModelName = {
    pascal: "User",
    camel: "user",
    kebab: "user",
  };

  const mockOptions = { modelName: mockModelName };

  beforeEach(() => {
    jest.clearAllMocks();
    mockedGetUserFileExtension.mockReturnValue("ts");
    (generateControllerTemplate as jest.Mock).mockReturnValue(
      "controller-output"
    );
    (generateAuthConfigsTemplate as jest.Mock).mockReturnValue(
      "auth-configs-output"
    );
    (generateMiddlewaresTemplate as jest.Mock).mockReturnValue(
      "interceptors-output"
    );
    (generateQueryOptionsTemplate as jest.Mock).mockReturnValue(
      "query-options-output"
    );
    (generateRouterTemplate as jest.Mock).mockReturnValue("router-output");
    (generateServiceTemplate as jest.Mock).mockReturnValue("service-output");
    (generateHooksTemplate as jest.Mock).mockReturnValue("hooks-output");
    (generatePolicyTemplate as jest.Mock).mockReturnValue("policy-output");
    (zodSchemaGenerator.generateCreateSchema as jest.Mock).mockReturnValue(
      "create-schema-output"
    );
    (zodSchemaGenerator.generateUpdateSchema as jest.Mock).mockReturnValue(
      "update-schema-output"
    );
    (zodSchemaGenerator.generateBaseSchema as jest.Mock).mockReturnValue(
      "schema-output"
    );
    (zodSchemaGenerator.generateQuerySchema as jest.Mock).mockReturnValue(
      "query-schema-output"
    );
    (zodSchemaGenerator.generateLoginSchema as jest.Mock).mockReturnValue(
      "login-schema-output"
    );
    (zodSchemaGenerator.generateSignupSchema as jest.Mock).mockReturnValue(
      "signup-schema-output"
    );
    (zodSchemaGenerator.generateUpdateMeSchema as jest.Mock).mockReturnValue(
      "update-me-schema-output"
    );
    (
      zodSchemaGenerator.generateUpdatePasswordSchema as jest.Mock
    ).mockReturnValue("update-password-schema-output");
    (classValidatorDtoGenerator.generateCreateDto as jest.Mock).mockReturnValue(
      "create-dto-output"
    );
    (classValidatorDtoGenerator.generateUpdateDto as jest.Mock).mockReturnValue(
      "update-dto-output"
    );
    (classValidatorDtoGenerator.generateBaseDto as jest.Mock).mockReturnValue(
      "dto-output"
    );
    (classValidatorDtoGenerator.generateQueryDto as jest.Mock).mockReturnValue(
      "query-dto-output"
    );
    (classValidatorDtoGenerator.generateLoginDto as jest.Mock).mockReturnValue(
      "login-dto-output"
    );
    (classValidatorDtoGenerator.generateSignupDto as jest.Mock).mockReturnValue(
      "signup-dto-output"
    );
    (
      classValidatorDtoGenerator.generateUpdateMeDto as jest.Mock
    ).mockReturnValue("update-me-dto-output");
    (
      classValidatorDtoGenerator.generateUpdatePasswordDto as jest.Mock
    ).mockReturnValue("update-password-dto-output");
    (prismaSchemaParser.generatePrismaModel as jest.Mock).mockReturnValue(
      "prisma-model-output"
    );
  });

  describe("generateTemplate main function", () => {
    it("should generate query-options template", () => {
      const result = generateTemplate("query-options", {
        modelName: mockModelName,
      });
      expect(result).toContain("query-options");
    });

    it("should generate interceptors template", () => {
      const result = generateTemplate("interceptors", {
        modelName: mockModelName,
      });
      expect(result).toContain("interceptors");
    });

    it("should throw error for unknown template type", () => {
      expect(() =>
        generateTemplate("unknown", { modelName: {} as any })
      ).toThrow("Unknown template type: unknown");
    });
  });

  describe("delegation — each type calls the correct function", () => {
    it("controller delegates to generateControllerTemplate", () => {
      const result = generateTemplate("controller", mockOptions);
      expect(generateControllerTemplate).toHaveBeenCalledWith(mockOptions);
      expect(result).toBe("controller-output");
    });

    it("service delegates to generateServiceTemplate", () => {
      const result = generateTemplate("service", mockOptions);
      expect(generateServiceTemplate).toHaveBeenCalledWith(mockOptions);
      expect(result).toBe("service-output");
    });

    it("router delegates to generateRouterTemplate", () => {
      const result = generateTemplate("router", mockOptions);
      expect(generateRouterTemplate).toHaveBeenCalledWith(mockOptions);
      expect(result).toBe("router-output");
    });

    it("auth-configs delegates to generateAuthConfigsTemplate", () => {
      const result = generateTemplate("auth-configs", mockOptions);
      expect(generateAuthConfigsTemplate).toHaveBeenCalledWith(mockOptions);
      expect(result).toBe("auth-configs-output");
    });

    it("query-options delegates to generateQueryOptionsTemplate", () => {
      const result = generateTemplate("query-options", mockOptions);
      expect(generateQueryOptionsTemplate).toHaveBeenCalledWith(mockOptions);
      expect(result).toBe("query-options-output");
    });

    it("interceptors delegates to generateMiddlewaresTemplate", () => {
      const result = generateTemplate("interceptors", mockOptions);
      expect(generateMiddlewaresTemplate).toHaveBeenCalledWith(mockOptions);
      expect(result).toBe("interceptors-output");
    });

    it("hooks delegates to generateHooksTemplate", () => {
      const result = generateTemplate("hooks", mockOptions);
      expect(generateHooksTemplate).toHaveBeenCalledWith(mockOptions);
      expect(result).toBe("hooks-output");
    });

    it("policy delegates to generatePolicyTemplate", () => {
      const result = generateTemplate("policy", mockOptions);
      expect(generatePolicyTemplate).toHaveBeenCalledWith(mockOptions);
      expect(result).toBe("policy-output");
    });

    it("create-schema delegates to zodSchemaGenerator.generateCreateSchema", () => {
      const result = generateTemplate("create-schema", mockOptions);
      expect(zodSchemaGenerator.generateCreateSchema).toHaveBeenCalledWith(
        mockOptions
      );
      expect(result).toBe("create-schema-output");
    });

    it("update-schema delegates to zodSchemaGenerator.generateUpdateSchema", () => {
      const result = generateTemplate("update-schema", mockOptions);
      expect(zodSchemaGenerator.generateUpdateSchema).toHaveBeenCalledWith(
        mockOptions
      );
      expect(result).toBe("update-schema-output");
    });

    it("schema delegates to zodSchemaGenerator.generateBaseSchema", () => {
      const result = generateTemplate("schema", mockOptions);
      expect(zodSchemaGenerator.generateBaseSchema).toHaveBeenCalledWith(
        mockOptions
      );
      expect(result).toBe("schema-output");
    });

    it("query-schema delegates to zodSchemaGenerator.generateQuerySchema", () => {
      const result = generateTemplate("query-schema", mockOptions);
      expect(zodSchemaGenerator.generateQuerySchema).toHaveBeenCalledWith(
        mockOptions
      );
      expect(result).toBe("query-schema-output");
    });

    it("login-schema delegates to zodSchemaGenerator.generateLoginSchema", () => {
      const result = generateTemplate("login-schema", mockOptions);
      expect(zodSchemaGenerator.generateLoginSchema).toHaveBeenCalledWith(
        mockOptions
      );
      expect(result).toBe("login-schema-output");
    });

    it("signup-schema delegates to zodSchemaGenerator.generateSignupSchema", () => {
      const result = generateTemplate("signup-schema", mockOptions);
      expect(zodSchemaGenerator.generateSignupSchema).toHaveBeenCalledWith(
        mockOptions
      );
      expect(result).toBe("signup-schema-output");
    });

    it("update-me-schema delegates to zodSchemaGenerator.generateUpdateMeSchema", () => {
      const result = generateTemplate("update-me-schema", mockOptions);
      expect(zodSchemaGenerator.generateUpdateMeSchema).toHaveBeenCalledWith(
        mockOptions
      );
      expect(result).toBe("update-me-schema-output");
    });

    it("update-password-schema delegates to zodSchemaGenerator.generateUpdatePasswordSchema", () => {
      const result = generateTemplate("update-password-schema", mockOptions);
      expect(
        zodSchemaGenerator.generateUpdatePasswordSchema
      ).toHaveBeenCalledWith(mockOptions);
      expect(result).toBe("update-password-schema-output");
    });

    it("create-dto delegates to classValidatorDtoGenerator.generateCreateDto", () => {
      const result = generateTemplate("create-dto", mockOptions);
      expect(classValidatorDtoGenerator.generateCreateDto).toHaveBeenCalledWith(
        mockOptions
      );
      expect(result).toBe("create-dto-output");
    });

    it("update-dto delegates to classValidatorDtoGenerator.generateUpdateDto", () => {
      const result = generateTemplate("update-dto", mockOptions);
      expect(classValidatorDtoGenerator.generateUpdateDto).toHaveBeenCalledWith(
        mockOptions
      );
      expect(result).toBe("update-dto-output");
    });

    it("dto delegates to classValidatorDtoGenerator.generateBaseDto", () => {
      const result = generateTemplate("dto", mockOptions);
      expect(classValidatorDtoGenerator.generateBaseDto).toHaveBeenCalledWith(
        mockOptions
      );
      expect(result).toBe("dto-output");
    });

    it("query-dto delegates to classValidatorDtoGenerator.generateQueryDto", () => {
      const result = generateTemplate("query-dto", mockOptions);
      expect(classValidatorDtoGenerator.generateQueryDto).toHaveBeenCalledWith(
        mockOptions
      );
      expect(result).toBe("query-dto-output");
    });

    it("login-dto delegates to classValidatorDtoGenerator.generateLoginDto", () => {
      const result = generateTemplate("login-dto", mockOptions);
      expect(classValidatorDtoGenerator.generateLoginDto).toHaveBeenCalledWith(
        mockOptions
      );
      expect(result).toBe("login-dto-output");
    });

    it("signup-dto delegates to classValidatorDtoGenerator.generateSignupDto", () => {
      const result = generateTemplate("signup-dto", mockOptions);
      expect(classValidatorDtoGenerator.generateSignupDto).toHaveBeenCalledWith(
        mockOptions
      );
      expect(result).toBe("signup-dto-output");
    });

    it("update-me-dto delegates to classValidatorDtoGenerator.generateUpdateMeDto", () => {
      const result = generateTemplate("update-me-dto", mockOptions);
      expect(
        classValidatorDtoGenerator.generateUpdateMeDto
      ).toHaveBeenCalledWith(mockOptions);
      expect(result).toBe("update-me-dto-output");
    });

    it("update-password-dto delegates to classValidatorDtoGenerator.generateUpdatePasswordDto", () => {
      const result = generateTemplate("update-password-dto", mockOptions);
      expect(
        classValidatorDtoGenerator.generateUpdatePasswordDto
      ).toHaveBeenCalledWith(mockOptions);
      expect(result).toBe("update-password-dto-output");
    });

    it("prisma-model delegates to prismaSchemaParser.generatePrismaModel", () => {
      const result = generateTemplate("prisma-model", mockOptions);
      expect(prismaSchemaParser.generatePrismaModel).toHaveBeenCalledWith(
        mockOptions
      );
      expect(result).toBe("prisma-model-output");
    });
  });
});
