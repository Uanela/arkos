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
  beforeEach(() => {
    jest.clearAllMocks();
    mockedGetUserFileExtension.mockReturnValue("ts");

  describe("generateTemplate main function", () => {
    it("should throw error for unknown template type", () => {
      expect(() =>
        generateTemplate("unknown", { modelName: {} as any })
      ).toThrow("Unknown template type: unknown");
    });
  });
});
