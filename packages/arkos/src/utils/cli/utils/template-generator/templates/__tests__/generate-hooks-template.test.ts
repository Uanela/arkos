import { TemplateOptions } from "../../../template-generators";
import { getUserFileExtension } from "../../../../../helpers/fs.helpers";
import generateHooksTemplate from "../hooks-template";

jest.mock("../../../../../helpers/fs.helpers", () => ({
  getUserFileExtension: jest.fn().mockReturnValue("ts"),
}));

describe("generateHooksTemplate", () => {
  const mockModelName = {
    camel: "user",
    pascal: "User",
    kebab: "user",
  };

  const baseOptions: TemplateOptions = {
    modelName: mockModelName,
  };

  it("should throw error when modelName is not provided", () => {
    expect(() => generateHooksTemplate({} as TemplateOptions)).toThrow(
      "Module name is required for hooks template"
    );
  });

  describe("TypeScript output", () => {
    const tsOptions: TemplateOptions = {
      ...baseOptions,
      modelName: mockModelName,
    };

    it("should include service import without extension", () => {
      const result = generateHooksTemplate(tsOptions);
      expect(result).toContain('import userService from "./user.service";');
    });

    it("should generate all hook arrays", () => {
      const result = generateHooksTemplate(tsOptions);

      expect(result).toContain("export const beforeFindOne = []");
      expect(result).toContain("export const afterFindOne = []");
      expect(result).toContain("export const beforeUpdateOne = []");
      expect(result).toContain("export const afterUpdateOne = []");
      expect(result).toContain("export const beforeCreateOne = []");
      expect(result).toContain("export const afterCreateOne = []");
      expect(result).toContain("export const beforeCreateMany = []");
      expect(result).toContain("export const afterCreateMany = []");
      expect(result).toContain("export const beforeCount = []");
      expect(result).toContain("export const afterCount = []");
      expect(result).toContain("export const beforeFindMany = []");
      expect(result).toContain("export const afterFindMany = []");
      expect(result).toContain("export const beforeUpdateMany = []");
      expect(result).toContain("export const afterUpdateMany = []");
      expect(result).toContain("export const beforeDeleteOne = []");
      expect(result).toContain("export const afterDeleteOne = []");
      expect(result).toContain("export const beforeDeleteMany = []");
      expect(result).toContain("export const afterDeleteMany = []");
    });
  });

  describe("JavaScript output", () => {
    const jsOptions: TemplateOptions = {
      ...baseOptions,
      modelName: mockModelName,
    };

    beforeAll(() => {
      (getUserFileExtension as jest.Mock).mockReturnValue("js");
    });

    afterAll(() => {
      (getUserFileExtension as jest.Mock).mockReset();
    });

    it("should include service import with .js extension", () => {
      const result = generateHooksTemplate(jsOptions);
      expect(result).toContain('import userService from "./user.service.js";');
    });
  });

  it("should handle different model name cases correctly", () => {
    const customModelName = {
      camel: "blogPost",
      pascal: "BlogPost",
      kebab: "blog-post",
    };

    const options: TemplateOptions = {
      modelName: customModelName,
    };

    (getUserFileExtension as jest.Mock).mockReturnValue("ts");

    const result = generateHooksTemplate(options);

    expect(result).toContain(
      'import blogPostService from "./blog-post.service";'
    );
  });
});
