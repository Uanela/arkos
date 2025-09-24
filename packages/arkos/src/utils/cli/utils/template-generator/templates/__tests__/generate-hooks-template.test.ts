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

    it("should generate TypeScript template with correct imports", () => {
      const result = generateHooksTemplate(tsOptions);

      expect(result).toContain("import {");
      expect(result).toContain("BeforeFindOneHookArgs");
      expect(result).toContain("AfterFindOneHookArgs");
      expect(result).toContain('from "arkos/services"');
    });

    it("should include service import without extension", () => {
      const result = generateHooksTemplate(tsOptions);
      expect(result).toContain('import userService from "./user.service";');
    });

    it("should generate all hook functions with TypeScript types", () => {
      const result = generateHooksTemplate(tsOptions);

      expect(result).toContain(
        "async ({ context, filters, queryOptions }: BeforeFindOneHookArgs<Prisma.UserDelegate>) => {}"
      );
      expect(result).toContain(
        "async ({ context, result, filters, queryOptions }: AfterFindOneHookArgs<Prisma.UserDelegate>) => {}"
      );
      expect(result).toContain(
        "async ({ context, filters, data, queryOptions }: BeforeUpdateOneHookArgs<Prisma.UserDelegate>) => {}"
      );
    });

    it("should generate all hook arrays", () => {
      const result = generateHooksTemplate(tsOptions);

      expect(result).toContain("export const beforeFindOne = [");
      expect(result).toContain("export const afterFindOne = [");
      expect(result).toContain("export const beforeUpdateOne = [");
      expect(result).toContain("export const afterUpdateOne = [");
      expect(result).toContain("export const beforeCreateOne = [");
      expect(result).toContain("export const afterCreateOne = [");
      expect(result).toContain("export const beforeCreateMany = [");
      expect(result).toContain("export const afterCreateMany = [");
      expect(result).toContain("export const beforeCount = [");
      expect(result).toContain("export const afterCount = [");
      expect(result).toContain("export const beforeFindMany = [");
      expect(result).toContain("export const afterFindMany = [");
      expect(result).toContain("export const beforeUpdateMany = [");
      expect(result).toContain("export const afterUpdateMany = [");
      expect(result).toContain("export const beforeDeleteOne = [");
      expect(result).toContain("export const afterDeleteOne = [");
      expect(result).toContain("export const beforeDeleteMany = [");
      expect(result).toContain("export const afterDeleteMany = [");
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

    it("should generate JavaScript template without TypeScript imports", () => {
      const result = generateHooksTemplate(jsOptions);

      expect(result).not.toContain("BeforeFindOneHookArgs");
      expect(result).not.toContain("AfterFindOneHookArgs");
      expect(result).not.toContain('from "arkos/services"');
    });

    it("should include service import with .js extension", () => {
      const result = generateHooksTemplate(jsOptions);
      expect(result).toContain('import userService from "./user.service.js";');
    });

    it("should not include delegate export for JavaScript", () => {
      const result = generateHooksTemplate(jsOptions);
      expect(result).not.toContain(
        "export type UserDelegate = typeof prisma.user;"
      );
    });

    it("should generate all hook functions without TypeScript types", () => {
      const result = generateHooksTemplate(jsOptions);

      expect(result).toContain(
        "async ({ context, filters, queryOptions }) => {}"
      );
      expect(result).toContain(
        "async ({ context, result, filters, queryOptions }) => {}"
      );
      expect(result).toContain(
        "async ({ context, filters, data, queryOptions }) => {}"
      );
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
    expect(result).toContain(
      "async ({ context, filters, queryOptions }: BeforeFindOneHookArgs<Prisma.BlogPostDelegate>) => {}"
    );
  });
});
