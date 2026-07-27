import { getUserFileExtension } from "../../../../../helpers/fs.helpers";
import { generateRouterTemplate } from "../router-template";

jest.mock("../../../../../helpers/fs.helpers");
jest.mock("../../../../generate", () => ({
  kebabPrismaModels: ["user", "blog-post", "order-item"],
  knownModules: ["user", "blog-post", "order-item", "file-upload", "auth"],
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

  beforeEach(() => {
    // getUserFileExtension is no longer consulted by generateRouterTemplate,
    // but we still mock it since it's imported by the module under test's
    // dependency graph in other tests of this suite family.
    mockedGetUserFileExtension.mockReturnValue("ts");
  });

  describe("imports", () => {
    it("should always import ArkosRouter", () => {
      const result = generateRouterTemplate({ modelName: userModelName });
      expect(result).toContain("import { ArkosRouter");
      expect(result).toContain("from 'arkos'");
    });

    it("should import ArkosRouteHook for a known/prisma module", () => {
      const result = generateRouterTemplate({ modelName: userModelName });
      expect(result).toContain(
        "import { ArkosRouter, ArkosRouteHook } from 'arkos';"
      );
    });

    it("should not import ArkosRouteHook for a non-known module", () => {
      const result = generateRouterTemplate({ modelName: dashboardModelName });
      expect(result).toContain("import { ArkosRouter } from 'arkos';");
      expect(result).not.toContain("ArkosRouteHook");
    });

    it("should import arkos.config only for the file-upload module", () => {
      const fileUploadResult = generateRouterTemplate({
        modelName: fileUploadModelName,
      });
      expect(fileUploadResult).toContain("import config from '@/arkos.config'");

      const userResult = generateRouterTemplate({ modelName: userModelName });
      expect(userResult).not.toContain("import config from '@/arkos.config'");
    });
  });

  describe("router instance generation", () => {
    it("should generate router instance with camelCase name", () => {
      const result = generateRouterTemplate({ modelName: userModelName });
      expect(result).toContain(`const userRouter = ArkosRouter({`);
      expect(result).toContain(`openapi: { tags: ["Users"] }`);
      expect(result).toContain("export default userRouter");
    });

    it("should use '/auth' as the prefix for the auth module", () => {
      const result = generateRouterTemplate({ modelName: authModelName });
      expect(result).toContain(`prefix: "/auth"`);
      expect(result).toContain(`openapi: { tags: ["Authentication"] }`);
    });

    it("should use the configured upload route as the prefix for file-upload", () => {
      const result = generateRouterTemplate({ modelName: fileUploadModelName });
      expect(result).toContain(
        `prefix: config?.fileUpload?.baseUploadRoute || "/uploads"`
      );
      expect(result).toContain(`openapi: { tags: ["File Uploads"] }`);
    });

    it("should pluralize the kebab name for the prefix of a normal module", () => {
      const result = generateRouterTemplate({ modelName: dashboardModelName });
      expect(result).toContain(`prefix: "/dashboards"`);
      expect(result).toContain(`openapi: { tags: ["Dashboards"] }`);
    });

    it("should handle kebab-case model names", () => {
      const result = generateRouterTemplate({
        modelName: {
          pascal: "BlogPost",
          camel: "blogPost",
          kebab: "blog-post",
        },
      });
      expect(result).toContain(`const blogPostRouter = ArkosRouter({`);
      expect(result).toContain(`openapi: { tags: ["Blog Posts"] }`);
      expect(result).toContain("export default blogPostRouter");
    });
  });

  describe("route hook wiring for known modules", () => {
    it("should generate and load a RouteHook for a prisma model", () => {
      const result = generateRouterTemplate({ modelName: userModelName });
      expect(result).toContain(`const userRouteHook = ArkosRouteHook("user")`);
      expect(result).toContain("userRouter.load(userRouteHook)");
    });

    it("should generate and load a RouteHook for the file-upload module", () => {
      const result = generateRouterTemplate({ modelName: fileUploadModelName });
      expect(result).toContain(
        `const fileUploadRouteHook = ArkosRouteHook("file-upload")`
      );
      expect(result).toContain("fileUploadRouter.load(fileUploadRouteHook)");
    });

    it("should generate and load a RouteHook for the auth module", () => {
      const result = generateRouterTemplate({ modelName: authModelName });
      expect(result).toContain(`const authRouteHook = ArkosRouteHook("auth")`);
      expect(result).toContain("authRouter.load(authRouteHook)");
    });

    it("should not generate or load a RouteHook for a non-known module", () => {
      const result = generateRouterTemplate({ modelName: dashboardModelName });
      expect(result).not.toContain("RouteHook");
      expect(result).not.toContain(".load(");
    });
  });

  describe("error handling", () => {
    it("should throw if modelName is not provided", () => {
      expect(() => generateRouterTemplate({} as any)).toThrow(
        "Module name is required for router template"
      );
    });
  });
});
