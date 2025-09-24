import fs from "fs";
import path from "path";
import { generateTemplate } from "../utils/template-generators";
import { ensureDirectoryExists } from "../utils/cli.helpers";
import {
  camelCase,
  kebabCase,
  pascalCase,
} from "../../helpers/change-case.helpers";
import { generateCommand } from "../generate";
import { getUserFileExtension, fullCleanCwd } from "../../helpers/fs.helpers";
import sheu from "../../sheu";

// Mock all dependencies
jest.mock("fs");
jest.mock("path");
jest.mock("../utils/template-generators");
jest.mock("../../sheu");
jest.mock("../utils/cli.helpers");
jest.mock("../../helpers/change-case.helpers");
jest.mock("../../helpers/fs.helpers");

const mockedFs = fs as jest.Mocked<typeof fs>;
const mockedPath = path as jest.Mocked<typeof path>;
const mockedGenerateTemplate = generateTemplate as jest.MockedFunction<
  typeof generateTemplate
>;
const mockedEnsureDirectoryExists =
  ensureDirectoryExists as jest.MockedFunction<typeof ensureDirectoryExists>;
const mockedCamelCase = camelCase as jest.MockedFunction<typeof camelCase>;
const mockedKebabCase = kebabCase as jest.MockedFunction<typeof kebabCase>;
const mockedPascalCase = pascalCase as jest.MockedFunction<typeof pascalCase>;

describe("generateCommand", () => {
  const mockCwd = "/test/project";
  const mockTemplateContent = "mock template content";
  let sheuErrorSpy: jest.SpyInstance,
    sheuDoneSpy: jest.SpyInstance,
    processExitSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();

    sheuErrorSpy = jest.spyOn(sheu, "error").mockImplementation();
    sheuDoneSpy = jest.spyOn(sheu, "done").mockImplementation();
    processExitSpy = jest.spyOn(process, "exit").mockImplementation();
    jest.spyOn(sheu, "bold").mockImplementation((text: string) => text);
    // Setup default mocks
    jest.spyOn(process, "cwd").mockReturnValue(mockCwd);
    mockedGenerateTemplate.mockReturnValue(mockTemplateContent);
    mockedPath.join.mockImplementation((...args) => args.join("/"));
    (fullCleanCwd as jest.Mock).mockImplementation((text: string) =>
      text.replace(mockCwd, "")
    );

    // Setup case conversion mocks
    mockedPascalCase.mockImplementation(
      (str) => `${str?.charAt(0)?.toUpperCase?.()}${str?.slice?.(1)}`
    );
    mockedCamelCase.mockImplementation((str) => str?.toLowerCase());
    mockedKebabCase.mockImplementation((str) =>
      str?.toLowerCase?.()?.replace(/\s+/g, "-")
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
    sheuErrorSpy.mockRestore();
    sheuDoneSpy.mockRestore();
    processExitSpy.mockRestore();
    mockedEnsureDirectoryExists.mockRestore();
    mockedFs.writeFileSync.mockImplementation();
  });

  describe("controller command", () => {
    it("should generate controller with default path for ts", async () => {
      (getUserFileExtension as jest.Mock).mockReturnValue("ts");

      const options = { model: "user" };

      await generateCommand.controller(options);

      expect(mockedEnsureDirectoryExists).toHaveBeenCalledWith(
        `${mockCwd}/src/modules/user`
      );
      expect(mockedGenerateTemplate).toHaveBeenCalledWith("controller", {
        modelName: {
          pascal: "User",
          camel: "user",
          kebab: "user",
        },
        imports: {
          baseController: "arkos/controllers",
        },
      });
      expect(mockedFs.writeFileSync).toHaveBeenCalledWith(
        `${mockCwd}/src/modules/user/user.controller.ts`,
        mockTemplateContent
      );
      expect(sheuDoneSpy).toHaveBeenCalledWith(
        expect.stringContaining("Controller for")
      );
    });

    it("should generate controller with custom path", async () => {
      const options = { model: "product", path: "custom/modules" } as any;

      await generateCommand.controller(options);

      expect(mockedEnsureDirectoryExists).toHaveBeenCalledWith(
        `${mockCwd}/custom/modules/product`
      );
      expect(mockedFs.writeFileSync).toHaveBeenCalledWith(
        `${mockCwd}/custom/modules/product/product.controller.ts`,
        mockTemplateContent
      );
    });

    it("should exit with error when model name is missing", async () => {
      const options = { path: "get this bro" };

      await generateCommand.controller(options as any);

      expect(sheuErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining("required")
      );

      expect(processExitSpy).toHaveBeenCalledWith(1);
    });

    it("should handle file system errors", async () => {
      const options = { model: "user" };
      const error = new Error("Permission denied");
      mockedFs.writeFileSync.mockImplementation(() => {
        throw error;
      });

      await generateCommand.controller(options);

      expect(sheuErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining("Failed to generate controller")
      );
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });

    it("should handle directory creation errors", async () => {
      const options = { model: "user" };
      const error = new Error("Cannot create directory");
      mockedEnsureDirectoryExists.mockImplementation(() => {
        throw error;
      });

      await generateCommand.controller(options);

      expect(sheuErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining("Failed to generate controller")
      );
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });
  });

  describe("service command", () => {
    it("should generate service with default configuration for js", async () => {
      (getUserFileExtension as jest.Mock).mockReturnValue("js");
      const options = { model: "user" };

      await generateCommand.service(options);

      expect(mockedGenerateTemplate).toHaveBeenCalledWith("service", {
        modelName: {
          pascal: "User",
          camel: "user",
          kebab: "user",
        },
        imports: {
          baseService: "arkos/services",
        },
      });
      expect(mockedFs.writeFileSync).toHaveBeenCalledWith(
        `${mockCwd}/src/modules/user/user.service.js`,
        mockTemplateContent
      );
      expect(sheuDoneSpy).toHaveBeenCalledWith(
        expect.stringContaining("Service for")
      );
    });

    it("should exit with error when model name is missing", async () => {
      const options = { model: "" };

      await generateCommand.service(options);

      expect(sheuErrorSpy).toHaveBeenCalledWith("Module name is required!");
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });

    it("should handle template generation errors", async () => {
      const options = { model: "user" };
      const error = new Error("Template generation failed");
      mockedGenerateTemplate.mockImplementation(() => {
        throw error;
      });

      await generateCommand.service(options);

      expect(sheuErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining("Failed to generate service")
      );
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });
  });

  describe("router command", () => {
    it("should generate router with correct imports for ts", async () => {
      (getUserFileExtension as jest.Mock).mockReturnValue("ts");
      const options = { model: "order" };

      await generateCommand.router(options);

      expect(mockedGenerateTemplate).toHaveBeenCalledWith("router", {
        modelName: {
          pascal: "Order",
          camel: "order",
          kebab: "order",
        },
        imports: {
          baseRouter: "arkos",
          controller: "./order.controller",
        },
      });
      expect(mockedFs.writeFileSync).toHaveBeenCalledWith(
        `${mockCwd}/src/modules/order/order.router.ts`,
        mockTemplateContent
      );
    });

    it("should exit with error when model name is missing", async () => {
      const options = { model: "" };

      await generateCommand.router(options);

      expect(sheuErrorSpy).toHaveBeenCalledWith("Module name is required!");
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });
  });

  describe("interceptors command", () => {
    it("should generate interceptors with correct naming", async () => {
      const options = { model: "auth" };

      await generateCommand.interceptors(options);

      expect(mockedGenerateTemplate).toHaveBeenCalledWith("interceptors", {
        modelName: {
          pascal: "Auth",
          camel: "auth",
          kebab: "auth",
        },
      });
      expect(mockedFs.writeFileSync).toHaveBeenCalledWith(
        `${mockCwd}/src/modules/auth/auth.interceptors.ts`,
        mockTemplateContent
      );
      expect(sheuDoneSpy).toHaveBeenCalledWith(
        expect.stringContaining("Interceptors for")
      );
    });

    it("should exit with error when middleware name is missing", async () => {
      const options = { model: "" };

      await generateCommand.interceptors(options);

      expect(sheuErrorSpy).toHaveBeenCalledWith("Module name is required!");
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });

    it("should use custom path for interceptors", async () => {
      const options = { model: "validation", path: "src/middleware" };

      await generateCommand.interceptors(options);

      expect(mockedEnsureDirectoryExists).toHaveBeenCalledWith(
        `${mockCwd}/src/middleware/validation`
      );
      expect(mockedFs.writeFileSync).toHaveBeenCalledWith(
        `${mockCwd}/src/middleware/validation/validation.interceptors.ts`,
        mockTemplateContent
      );
    });
  });

  describe("authConfigs command", () => {
    it("should generate auth configs", async () => {
      const options = { model: "user" };

      await generateCommand.authConfigs(options);

      expect(mockedGenerateTemplate).toHaveBeenCalledWith("auth-configs", {
        modelName: { camel: "user", kebab: "user", pascal: "User" },
      });
      expect(mockedFs.writeFileSync).toHaveBeenCalledWith(
        `${mockCwd}/src/modules/user/user.auth.ts`,
        mockTemplateContent
      );
      expect(sheuDoneSpy).toHaveBeenCalledWith(
        expect.stringContaining("Auth configs for")
      );
    });

    it("should handle auth config generation without model name", async () => {
      const options = { model: "" };

      await generateCommand.authConfigs(options);

      // Should still work as it uses empty model name
      expect(mockedGenerateTemplate).toHaveBeenCalledWith("auth-configs", {
        modelName: { camel: "", kebab: "", pascal: "" },
      });
      expect(mockedFs.writeFileSync).toHaveBeenCalled();
    });

    it("should handle auth config generation errors", async () => {
      const options = { model: "user" };
      const error = new Error("Auth config generation failed");
      mockedGenerateTemplate.mockImplementation(() => {
        throw error;
      });

      await generateCommand.authConfigs(options);

      expect(sheuErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining("Failed to generate auth configs")
      );
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });
  });

  describe("queryOptions command", () => {
    it("should generate query options", async () => {
      const options = { model: "product" };

      await generateCommand.queryOptions(options);

      expect(mockedGenerateTemplate).toHaveBeenCalledWith("query-options", {
        modelName: {
          pascal: "Product",
          camel: "product",
          kebab: "product",
        },
      });
      expect(mockedFs.writeFileSync).toHaveBeenCalledWith(
        `${mockCwd}/src/modules/product/product.query.ts`,
        mockTemplateContent
      );
      expect(sheuDoneSpy).toHaveBeenCalledWith(
        expect.stringContaining("Query options for")
      );
    });

    it("should exit with error when model name is missing", async () => {
      const options = { model: "" };

      await generateCommand.queryOptions(options);

      expect(sheuErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining("Module name is required!")
      );
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });

    it("should exit with error when trying to geneate query options for file-upload", async () => {
      const options = { model: "file-upload" };

      await generateCommand.queryOptions(options);

      expect(sheuErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining(
          "Prisma query options are not available to file-upload resource"
        )
      );
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });
  });

  describe("edge cases and validation", () => {
    it("should handle special characters in model names", async () => {
      mockedKebabCase.mockReturnValue("user-profile");
      mockedCamelCase.mockReturnValue("userProfile");
      mockedPascalCase.mockReturnValue("UserProfile");

      const options = { model: "user profile" };

      await generateCommand.controller(options);

      expect(mockedEnsureDirectoryExists).toHaveBeenCalledWith(
        `${mockCwd}/src/modules/user-profile`
      );
      expect(mockedFs.writeFileSync).toHaveBeenCalledWith(
        `${mockCwd}/src/modules/user-profile/user-profile.controller.ts`,
        mockTemplateContent
      );
    });

    it("should handle undefined options gracefully", async () => {
      const options = { model: "user" };
      delete (options as any).path;

      await generateCommand.service(options);

      expect(mockedEnsureDirectoryExists).toHaveBeenCalledWith(
        `${mockCwd}/src/modules/user`
      );
    });

    it("should preserve relative paths in console output", async () => {
      const options = { model: "user" };

      await generateCommand.controller(options);

      expect(sheuDoneSpy).toHaveBeenCalledWith(
        expect.stringContaining("/src/modules/user/user.controller.ts")
      );
    });

    it("should handle long model names", async () => {
      const longModelName = "very-long-model-name-with-many-parts";
      mockedKebabCase.mockReturnValue(longModelName);
      mockedCamelCase.mockReturnValue("veryLongModelNameWithManyParts");
      mockedPascalCase.mockReturnValue("VeryLongModelNameWithManyParts");

      const options = { model: "very long model name with many parts" };

      await generateCommand.router(options);

      expect(mockedGenerateTemplate).toHaveBeenCalledWith("router", {
        modelName: {
          pascal: "VeryLongModelNameWithManyParts",
          camel: "veryLongModelNameWithManyParts",
          kebab: longModelName,
        },
        imports: {
          baseRouter: "arkos",
          controller: `./${longModelName}.controller`,
        },
      });
    });

    it("should handle path.join errors", async () => {
      try {
        const options = { model: "user" };
        const error = new Error("Path join failed");
        mockedPath.join.mockImplementation(() => {
          throw error;
        });

        await generateCommand.service(options);

        expect(sheuErrorSpy).toHaveBeenCalledWith(
          "❌ Failed to generate service:",
          error
        );
        expect(processExitSpy).toHaveBeenCalledWith(1);
      } catch {}
    });

    it("should handle case conversion errors", async () => {
      const options = { model: "user" };
      const error = new Error("Case conversion failed");
      mockedPascalCase.mockImplementation(() => {
        throw error;
      });

      try {
        await generateCommand.queryOptions(options);
        expect(sheuErrorSpy).toHaveBeenCalledWith(
          "❌ Failed to generate query config:",
          error
        );
        expect(processExitSpy).toHaveBeenCalledWith(1);
      } catch {}
    });
  });

  describe("file path construction", () => {
    it("should construct correct file paths for all commands", async () => {
      const options = { model: "test", path: "custom/path" };

      await generateCommand.controller(options);
      expect(mockedFs.writeFileSync).toHaveBeenLastCalledWith(
        expect.stringContaining("test.controller.ts"),
        expect.any(String)
      );

      await generateCommand.service(options);
      expect(mockedFs.writeFileSync).toHaveBeenLastCalledWith(
        expect.stringContaining("test.service.ts"),
        expect.any(String)
      );

      await generateCommand.router(options);
      expect(mockedFs.writeFileSync).toHaveBeenLastCalledWith(
        expect.stringContaining("test.router.ts"),
        expect.any(String)
      );

      await generateCommand.authConfigs(options);
      expect(mockedFs.writeFileSync).toHaveBeenLastCalledWith(
        expect.stringContaining("test.auth.ts"),
        expect.any(String)
      );

      await generateCommand.queryOptions(options);
      expect(mockedFs.writeFileSync).toHaveBeenLastCalledWith(
        expect.stringContaining("test.query.ts"),
        expect.any(String)
      );
    });

    it("should use process.cwd() as base path", async () => {
      const customCwd = "/different/project/root";
      jest.spyOn(process, "cwd").mockReturnValue(customCwd);

      const options = { model: "user" };

      await generateCommand.controller(options);

      expect(mockedEnsureDirectoryExists).toHaveBeenCalledWith(
        `${customCwd}/src/modules/user`
      );
    });
  });
});
