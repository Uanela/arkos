import { getUserFileExtension } from "../../../../../helpers/fs.helpers";
import { generateRouterTemplate } from "../router-template";

jest.mock("../../../../../helpers/fs.helpers");
jest.mock("../../../../generate", () => ({
  kebabPrismaModels: ["user", "blog-post", "order-item"],
}));

const mockedGetUserFileExtension = getUserFileExtension as jest.MockedFunction<
  typeof getUserFileExtension
>;

describe("generateRouterTemplate", () => {
  const userModelName = {
    pascal: "User",
    camel: "user",
    kebab: "user",
  };

  const dashboardModelName = {
    pascal: "Dashboard",
    camel: "dashboard",
    kebab: "dashboard",
  };

  const fileUploadModelName = {
    pascal: "FileUpload",
    camel: "fileUpload",
    kebab: "file-upload",
  };

  const authModelName = {
    pascal: "Auth",
    camel: "auth",
    kebab: "auth",
  };

  describe("TypeScript generation", () => {
    beforeEach(() => {
      mockedGetUserFileExtension.mockReturnValue("ts");
    });

    it("should always import ArkosRouter", () => {
      const result = generateRouterTemplate({ modelName: userModelName });
      expect(result).toContain("import { ArkosRouter } from 'arkos'");
    });

    it("should always import RouterConfig in TypeScript", () => {
      const result = generateRouterTemplate({ modelName: userModelName });
      expect(result).toContain("import { RouterConfig } from 'arkos'");
    });

    it("should generate router instance with camelCase name", () => {
      const result = generateRouterTemplate({ modelName: userModelName });
      expect(result).toContain("const userRouter = ArkosRouter()");
      expect(result).toContain("export default userRouter");
    });

    it("should generate prisma RouterConfig type for prisma model", () => {
      const result = generateRouterTemplate({ modelName: userModelName });
      expect(result).toContain(
        'export const config: RouterConfig<"prisma"> = {'
      );
    });

    it("should generate file-upload RouterConfig type for file-upload module", () => {
      const result = generateRouterTemplate({ modelName: fileUploadModelName });
      expect(result).toContain(
        "export const config: RouterConfig<file-upload> = {"
      );
    });

    it("should generate auth RouterConfig type for auth module", () => {
      const result = generateRouterTemplate({ modelName: authModelName });
      expect(result).toContain("export const config: RouterConfig<auth> = {");
    });

    it("should generate config for prisma model", () => {
      const result = generateRouterTemplate({ modelName: userModelName });
      expect(result).toContain("export const config");
    });

    it("should generate config for file-upload module", () => {
      const result = generateRouterTemplate({ modelName: fileUploadModelName });
      expect(result).toContain("export const config");
    });

    it("should generate config for auth module", () => {
      const result = generateRouterTemplate({ modelName: authModelName });
      expect(result).toContain("export const config");
    });

    it("should not generate config for non-prisma non-special module", () => {
      const result = generateRouterTemplate({ modelName: dashboardModelName });
      expect(result).not.toContain("export const config");
    });

    it("should handle kebab-case model names", () => {
      const result = generateRouterTemplate({
        modelName: {
          pascal: "BlogPost",
          camel: "blogPost",
          kebab: "blog-post",
        },
      });
      expect(result).toContain("const blogPostRouter = ArkosRouter()");
      expect(result).toContain("export default blogPostRouter");
    });
  });

  describe("JavaScript generation", () => {
    beforeEach(() => {
      mockedGetUserFileExtension.mockReturnValue("js");
    });

    it("should not import RouterConfig in JavaScript", () => {
      const result = generateRouterTemplate({ modelName: userModelName });
      expect(result).not.toContain("import { RouterConfig }");
    });

    it("should not add type annotation to config in JavaScript", () => {
      const result = generateRouterTemplate({ modelName: userModelName });
      expect(result).not.toContain("RouterConfig<");
      expect(result).toContain("export const config = {");
    });

    it("should still generate config for prisma model in JavaScript", () => {
      const result = generateRouterTemplate({ modelName: userModelName });
      expect(result).toContain("export const config = {");
    });

    it("should not generate config for non-prisma module in JavaScript", () => {
      const result = generateRouterTemplate({ modelName: dashboardModelName });
      expect(result).not.toContain("export const config");
    });

    it("should always import ArkosRouter in JavaScript", () => {
      const result = generateRouterTemplate({ modelName: userModelName });
      expect(result).toContain("import { ArkosRouter } from 'arkos'");
    });
  });

  describe("normal vs non-normal module", () => {
    beforeEach(() => {
      mockedGetUserFileExtension.mockReturnValue("ts");
    });

    it("should treat file-upload as normal module", () => {
      const result = generateRouterTemplate({ modelName: fileUploadModelName });
      expect(result).toContain("export const config");
    });

    it("should treat auth as normal module", () => {
      const result = generateRouterTemplate({ modelName: authModelName });
      expect(result).toContain("export const config");
    });

    it("should treat prisma model as normal module", () => {
      const result = generateRouterTemplate({ modelName: userModelName });
      expect(result).toContain("export const config");
    });

    it("should treat non-prisma non-special module as non-normal", () => {
      const result = generateRouterTemplate({ modelName: dashboardModelName });
      expect(result).not.toContain("export const config");
    });
  });

  describe("error handling", () => {
    beforeEach(() => {
      mockedGetUserFileExtension.mockReturnValue("ts");
    });

    it("should throw if modelName is not provided", () => {
      expect(() => generateRouterTemplate({} as any)).toThrow(
        "Module name is required for router template"
      );
    });
  });
});
