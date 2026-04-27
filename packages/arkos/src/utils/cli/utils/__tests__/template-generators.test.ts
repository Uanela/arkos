import { getUserFileExtension } from "../../../helpers/fs.helpers";
import { generateTemplate } from "../template-generators";

// Mock the fs helpers
jest.mock("fs");
jest.mock("../../../helpers/fs.helpers");
const mockedGetUserFileExtension = getUserFileExtension as jest.MockedFunction<
  typeof getUserFileExtension
>;
jest.mock("../../../prisma/prisma-schema-parser", () => ({
  __esModule: true,
  default: {
    getModelsAsArrayOfStrings: jest.fn(() => {
      return [
        "user",
        "very-long-model-name-with-many-parts",
        "user-profile",
        "product",
        "order",
      ];
    }),
    parse: jest.fn(),
  },
}));

describe("generateTemplate", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedGetUserFileExtension.mockReturnValue("ts"); // Default to TypeScript
  });

  describe("generateTemplate main function", () => {
    it("should throw error for unknown template type", () => {
      expect(() =>
        generateTemplate("unknown", { modelName: {} as any })
      ).toThrow("Unknown template type: unknown");
    });
  });
});
