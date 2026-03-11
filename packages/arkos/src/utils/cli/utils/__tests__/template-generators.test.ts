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
  });

  describe("generateQueryOptionsTemplate", () => {
    it("should generate regular TypeScript query options template", () => {
      mockedGetUserFileExtension.mockReturnValue("ts");
      const result = generateTemplate("query-options", {
        modelName: mockModelName,
      });

      expect(result).toContain('import { Prisma } from "@prisma/client"');
      expect(result).toContain(
        "import { PrismaQueryOptions } from 'arkos/prisma'"
      );
      expect(result).toContain(": PrismaQueryOptions<Prisma.UserDelegate>");
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
        "import { PrismaQueryOptions } from 'arkos/prisma'"
      );
      expect(result).toContain(
        `: PrismaQueryOptions<Prisma.UserDelegate, "auth">`
      );
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

      expect(result).not.toContain(
        "import { ArkosRequest, ArkosResponse, ArkosNextFunction }"
      );
      expect(result).not.toContain(
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
      expect(result).toContain("[]");
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
  });
});
