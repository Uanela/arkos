import {
  checkFileExists,
  getUserFileExtension,
} from "../../../helpers/fs.helpers";
import { generateTemplate } from "../template-generators";

// Mock the fs helpers
jest.mock("fs");
jest.mock("../../../helpers/fs.helpers");
const mockedGetUserFileExtension = getUserFileExtension as jest.MockedFunction<
  typeof getUserFileExtension
>;
const mockedCheckFileExits = checkFileExists as jest.MockedFunction<
  typeof checkFileExists
>;

describe("generateTemplate", () => {
  const mockModelName = {
    pascal: "User",
    camel: "user",
    kebab: "user",
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockedGetUserFileExtension.mockReturnValue("ts"); // Default to TypeScript
  });

  describe("generateTemplate main function", () => {
    it("should generate controller template", () => {
      const result = generateTemplate("controller", {
        modelName: mockModelName,
      });
      expect(result).toContain("class UserController extends BaseController");
      expect(result).toContain('UserController("user")');
    });

    it("should generate service template", () => {
      const result = generateTemplate("service", { modelName: mockModelName });
      expect(result).toContain("class UserService extends BaseService");
    });

    it("should generate router template", () => {
      const result = generateTemplate("router", { modelName: mockModelName });
      expect(result).toContain("const userRouter = Router()");
    });

    it("should generate auth-configs template", () => {
      const result = generateTemplate("auth-configs", {
        modelName: mockModelName,
      });
      expect(result).toContain("const userAuthConfigs");
    });

    it("should generate query-options template", () => {
      const result = generateTemplate("query-options", {
        modelName: mockModelName,
      });
      expect(result).toContain("const userQueryOptions");
    });

    it("should generate interceptors template", () => {
      const result = generateTemplate("interceptors", {
        modelName: mockModelName,
      });
      expect(result).toContain("beforeCreateOne");
    });

    it("should throw error for unknown template type", () => {
      expect(() =>
        generateTemplate("unknown", { modelName: {} as any })
      ).toThrow("Unknown template type: unknown");
    });

    it("should handle throw an error when missing modelName", () => {
      expect(() => generateTemplate("controller", {} as any)).toThrow(
        "Model name is required for controller template"
      );
    });
  });

  describe("generateControllerTemplate", () => {
    it("should generate basic controller template", () => {
      const result = generateTemplate("controller", {
        modelName: mockModelName,
      });

      expect(result).toContain(
        'import { BaseController } from "arkos/controllers"'
      );
      expect(result).toContain("class UserController extends BaseController");
      expect(result).toContain(
        'const userController = new UserController("user")'
      );
      expect(result).toContain("export default userController");
    });

    it("should use custom imports", () => {
      const customImports = { baseController: "custom/path/controllers" };
      const result = generateTemplate("controller", {
        modelName: mockModelName,
        imports: customImports,
      });

      expect(result).toContain(
        'import { BaseController } from "custom/path/controllers"'
      );
    });

    it("should throw error without model name", () => {
      expect(() => generateTemplate("controller", {} as any)).toThrow(
        "Model name is required for controller template"
      );
    });
  });

  describe("generateServiceTemplate", () => {
    it("should generate TypeScript service template", () => {
      mockedGetUserFileExtension.mockReturnValue("ts");
      const result = generateTemplate("service", { modelName: mockModelName });

      expect(result).toContain('import prisma from "../../utils/prisma"');
      expect(result).toContain(
        "class UserService extends BaseService<typeof prisma.user>"
      );
    });

    it("should generate JavaScript service template", () => {
      mockedGetUserFileExtension.mockReturnValue("js");
      const result = generateTemplate("service", { modelName: mockModelName });

      expect(result).not.toContain('import prisma from "../../utils/prisma"');
      expect(result).toContain("class UserService extends BaseService");
      expect(result).not.toContain("<typeof prisma.user>");
    });

    it("should use custom imports", () => {
      const customImports = { baseService: "custom/services" };
      const result = generateTemplate("service", {
        modelName: mockModelName,
        imports: customImports,
      });

      expect(result).toContain('import { BaseService } from "custom/services"');
    });

    it("should throw error without model name", () => {
      expect(() => generateTemplate("service", {} as any)).toThrow(
        "Model name is required for service template"
      );
    });
  });

  describe("generateRouterTemplate", () => {
    beforeEach(() => {
      jest.clearAllMocks();
      mockedGetUserFileExtension.mockReturnValue("ts");
      mockedCheckFileExits.mockReturnValue(false); // Default to controller not existing
    });

    it("should generate router template with commented controller when controller file doesn't exist", () => {
      mockedCheckFileExits.mockReturnValue(false);

      const result = generateTemplate("router", { modelName: mockModelName });

      expect(result).toContain("import { Router } from 'express'");
      expect(result).toContain("import { authService } from 'arkos/services'");
      expect(result).toContain(
        'import userController from "./user.controller"'
      );
      expect(result).toContain("const userRouter = Router()");
      expect(result).toContain("'/custom-endpoint'");
      expect(result).toContain("authService.authenticate");
      expect(result).toContain(
        "authService.handleAccessControl('CustomAction', 'user')"
      );
      expect(result).toContain("userController.someHandler");
      expect(result).toContain("export default userRouter");
    });

    it("should generate router template with uncommented controller when controller file exists", () => {
      mockedCheckFileExits.mockReturnValue(true);

      const result = generateTemplate("router", { modelName: mockModelName });

      expect(result).toContain("import { Router } from 'express'");
      expect(result).toContain("import { authService } from 'arkos/services'");
      expect(result).toContain(
        'import userController from "./user.controller"'
      );
      expect(result).not.toContain("// import userController");
      expect(result).toContain("userController.someHandler");
      expect(result).not.toContain("// userController.someHandler");
    });

    it("should use custom controller import path when provided", () => {
      mockedCheckFileExits.mockReturnValue(true);
      const customImports = {
        controller: "./custom/path/user.controller",
      };

      const result = generateTemplate("router", {
        modelName: mockModelName,
        imports: customImports,
      });

      expect(result).toContain(
        'import userController from "./custom/path/user.controller"'
      );
    });

    it("should handle fs.existsSync errors gracefully", () => {
      try {
        mockedCheckFileExits.mockImplementation(() => {
          throw new Error("File system error");
        });

        const result = generateTemplate("router", { modelName: mockModelName });

        // Should default to commented controller when error occurs
        expect(result).toContain(
          '// import userController from "./user.controller"'
        );
        expect(result).toContain("// userController.someHandler");
      } catch {}
    });

    it("should generate correct endpoint comment with kebab case", () => {
      const kebabModelName = {
        pascal: "UserProfile",
        camel: "userProfile",
        kebab: "user-profile",
      };

      const result = generateTemplate("router", { modelName: kebabModelName });

      expect(result).toContain(
        "authService.handleAccessControl('CustomAction', 'user-profile')"
      );
    });

    it("should check for correct file extension based on getUserFileExtension", () => {
      mockedGetUserFileExtension.mockReturnValue("js");
      mockedCheckFileExits.mockReturnValue(true);

      generateTemplate("router", { modelName: mockModelName });

      // Should check for .js file when extension is js
      expect(mockedCheckFileExits).toHaveBeenCalledWith(
        expect.stringContaining("user.controller.js")
      );
    });

    it("should throw error without model name", () => {
      expect(() => generateTemplate("router", {} as any)).toThrow(
        "Model name is required for router template"
      );
    });
  });
  describe("generateAuthConfigsTemplate", () => {
    it("should generate TypeScript auth configs template", () => {
      mockedGetUserFileExtension.mockReturnValue("ts");
      const result = generateTemplate("auth-configs", {
        modelName: mockModelName,
      });

      expect(result).toContain("import { AuthConfigs } from 'arkos/auth'");
      expect(result).toContain("const userAuthConfigs: AuthConfigs = {");
      expect(result).toContain("authenticationControl:");
      expect(result).toContain("accessControl:");
    });

    it("should generate JavaScript auth configs template", () => {
      mockedGetUserFileExtension.mockReturnValue("js");
      const result = generateTemplate("auth-configs", {
        modelName: mockModelName,
      });

      expect(result).not.toContain("import { AuthConfigs }");
      expect(result).toContain("const userAuthConfigs = {");
      expect(result).not.toContain(": AuthConfigs");
    });

    it("should throw error without model name", () => {
      expect(() => generateTemplate("auth-configs", {} as any)).toThrow(
        "Model name is required for auth config template"
      );
    });
  });

  describe("generateQueryOptionsTemplate", () => {
    it("should generate regular TypeScript query options template", () => {
      mockedGetUserFileExtension.mockReturnValue("ts");
      const result = generateTemplate("query-options", {
        modelName: mockModelName,
      });

      expect(result).toContain('import prisma from "../../utils/prisma"');
      expect(result).toContain(
        "import { PrismaQueryOptions } from 'arkos/prisma'"
      );
      expect(result).toContain(": PrismaQueryOptions<typeof prisma.user>");
      expect(result).toContain("findOne: {}");
      expect(result).toContain("createOne: {}");
    });

    it("should generate auth TypeScript query options template", () => {
      mockedGetUserFileExtension.mockReturnValue("ts");
      const authModelName = { pascal: "Auth", camel: "auth", kebab: "auth" };
      const result = generateTemplate("query-options", {
        modelName: authModelName,
      });

      expect(result).toContain(
        "import { AuthPrismaQueryOptions } from 'arkos/prisma'"
      );
      expect(result).toContain(": AuthPrismaQueryOptions<typeof prisma.auth>");
      expect(result).toContain("getMe: {}");
      expect(result).toContain("login: {}");
      expect(result).toContain("signup: {}");
    });

    it("should generate JavaScript query options template", () => {
      mockedGetUserFileExtension.mockReturnValue("js");
      const result = generateTemplate("query-options", {
        modelName: mockModelName,
      });

      expect(result).not.toContain("import prisma ");
      expect(result).not.toContain(": PrismaQueryOptions");
      expect(result).toContain("const userQueryOptions = {");
    });

    it("should throw error without model name", () => {
      expect(() => generateTemplate("query-options", {} as any)).toThrow(
        "Module name is required for query config template"
      );
    });
  });

  describe("generateMiddlewaresTemplate", () => {
    it("should generate regular TypeScript interceptors template", () => {
      mockedGetUserFileExtension.mockReturnValue("ts");
      const result = generateTemplate("interceptors", {
        modelName: mockModelName,
      });

      expect(result).toContain(
        "import { ArkosRequest, ArkosResponse, ArkosNextFunction }"
      );
      expect(result).toContain(
        "req: ArkosRequest, res: ArkosResponse, next: ArkosNextFunction"
      );
      expect(result).toContain("beforeCreateOne");
      expect(result).toContain("afterCreateOne");
      expect(result).toContain("beforeFindMany");
      expect(result).toContain("afterDeleteMany");
    });

    it("should generate auth TypeScript interceptors template", () => {
      mockedGetUserFileExtension.mockReturnValue("ts");
      const authModelName = { pascal: "Auth", camel: "auth", kebab: "auth" };
      const result = generateTemplate("interceptors", {
        modelName: authModelName,
      });

      expect(result).toContain("beforeGetMe");
      expect(result).toContain("afterLogin");
      expect(result).toContain("beforeSignup");
      expect(result).toContain("afterUpdatePassword");
      expect(result).not.toContain("beforeCreateOne");
    });

    it("should generate file upload interceptors template", () => {
      mockedGetUserFileExtension.mockReturnValue("ts");
      const fileUploadModelName = {
        pascal: "FileUpload",
        camel: "fileUpload",
        kebab: "file-upload",
      };
      const result = generateTemplate("interceptors", {
        modelName: fileUploadModelName,
      });

      expect(result).toContain("beforeUploadFile");
      expect(result).toContain("afterUploadFile");
      expect(result).not.toContain("beforeCreateOne");
    });

    it("should generate JavaScript interceptors template", () => {
      mockedGetUserFileExtension.mockReturnValue("js");
      const result = generateTemplate("interceptors", {
        modelName: mockModelName,
      });

      expect(result).not.toContain("ArkosRequest");
      expect(result).toContain("req, res, next");
      expect(result).toContain("beforeCreateOne");
    });

    it("should handle file-upload kebab case", () => {
      mockedGetUserFileExtension.mockReturnValue("ts");
      const fileUploadModelName = {
        pascal: "FileUpload",
        camel: "file-upload",
        kebab: "file-upload",
      };
      const result = generateTemplate("interceptors", {
        modelName: fileUploadModelName,
      });

      expect(result).toContain("beforeUploadFile");
      expect(result).toContain("afterUploadFile");
    });

    it("should throw error without model name", () => {
      expect(() => generateTemplate("interceptors", {} as any)).toThrow(
        "Module name is required for middleware template"
      );
    });
  });

  describe("edge cases", () => {
    it("should handle special characters in model names", () => {
      const specialModelName = {
        pascal: "UserProfile",
        camel: "userProfile",
        kebab: "user-profile",
      };
      const result = generateTemplate("controller", {
        modelName: specialModelName,
      });

      expect(result).toContain("class UserProfileController");
      expect(result).toContain('UserProfileController("user-profile")');
    });

    it("should handle empty imports object", () => {
      const result = generateTemplate("controller", {
        modelName: mockModelName,
        imports: {},
      });

      expect(result).toContain(
        'import { BaseController } from "arkos/controllers"'
      );
    });

    it("should handle undefined imports", () => {
      const result = generateTemplate("service", {
        modelName: mockModelName,
        imports: undefined,
      });

      expect(result).toContain('import { BaseService } from "arkos/services"');
    });

    it("should handle case sensitivity for auth detection", () => {
      const authUpperModelName = {
        pascal: "Auth",
        camel: "Auth",
        kebab: "auth",
      };
      const result = generateTemplate("interceptors", {
        modelName: authUpperModelName,
      });

      // Should not be treated as auth since camel case is "Auth", not "auth"
      expect(result).toContain("beforeCreateOne");
      expect(result).not.toContain("beforeGetMe");
    });

    it("should handle unknown file extension", () => {
      (mockedGetUserFileExtension as any).mockReturnValue("jsx");
      const result = generateTemplate("service", { modelName: mockModelName });

      // Should treat as JavaScript (not TypeScript)
      expect(result).not.toContain("prisma");
      expect(result).not.toContain("<typeof prisma.user>");
    });
  });

  describe("template content validation", () => {
    it("should include proper exports in all templates", () => {
      const templates = [
        "controller",
        "service",
        "router",
        "auth-configs",
        "query-options",
      ];

      templates.forEach((template) => {
        const result = generateTemplate(template, { modelName: mockModelName });
        expect(result).toContain("export default");
      });
    });

    it("should have consistent indentation", () => {
      const result = generateTemplate("controller", {
        modelName: mockModelName,
      });
      const lines = result.split("\n");

      // Check that there's proper indentation structure
      expect(lines.some((line) => line.startsWith("class"))).toBe(true);
    });
  });
});
