import fs from "fs";
import path from "path";
import { generateTemplate } from "../utils/template-generators";
import { ensureDirectoryExists } from "../utils/cli.helpers";
import { generateCommand } from "../generate";
import { getUserFileExtension } from "../../helpers/fs.helpers";
import sheu from "../../sheu";

// Mock all dependencies
jest.mock("fs");
jest.mock("path", () => ({
  ...jest.requireActual("path"),
  join: jest.fn((...args) => args.join("/")),
  resolve: jest.fn((...args) => args.join("/")),
}));
jest.mock("../utils/template-generators");
jest.mock("../../sheu");
jest.mock("../utils/cli.helpers");
jest.mock("../../helpers/fs.helpers", () => ({
  ...jest.requireActual("../../helpers/fs.helpers"),
  getUserFileExtension: jest.fn(),
}));
jest.mock("../../../utils/prisma/prisma-schema-parser", () => ({
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

const mockedFs = fs as jest.Mocked<typeof fs>;
const mockedPath = path as jest.Mocked<typeof path>;
const mockedGenerateTemplate = generateTemplate as jest.MockedFunction<
  typeof generateTemplate
>;
const mockedEnsureDirectoryExists =
  ensureDirectoryExists as jest.MockedFunction<typeof ensureDirectoryExists>;

describe("generateCommand", () => {
  const mockCwd = "/test/project";
  const mockTemplateContent = "mock template content";
  let sheuErrorSpy: jest.SpyInstance,
    sheuDoneSpy: jest.SpyInstance,
    processExitSpy: jest.SpyInstance;
  // jest
  //   .spyOn(prismaSchemaParser, "getModelsAsArrayOfStrings")
  //   .mockImplementation(() => ["user"]);

  beforeEach(() => {
    jest.clearAllMocks();

    jest.spyOn(console, "info").mockImplementation(jest.fn());
    sheuErrorSpy = jest.spyOn(sheu, "error").mockImplementation();
    sheuDoneSpy = jest.spyOn(sheu, "done").mockImplementation();
    processExitSpy = jest.spyOn(process, "exit").mockImplementation();
    jest.spyOn(sheu, "bold").mockImplementation((text: string) => text);
    // Setup default mocks
    jest.spyOn(process, "cwd").mockReturnValue(mockCwd);
    mockedPath.join.mockImplementation((...args) => args.join("/"));
    mockedGenerateTemplate.mockReturnValue(mockTemplateContent);
    // (fullCleanCwd as jest.Mock).mockImplementation((text: string) =>
    //   text.replace(mockCwd, "")
    // );
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

    it("should generate controller with custom path and with filename and without module-name", async () => {
      const options = {
        model: "product",
        path: "custom/modules/controller.ts",
      } as any;

      await generateCommand.controller(options);

      expect(mockedEnsureDirectoryExists).toHaveBeenCalledWith(
        `${mockCwd}/custom/modules`
      );
      expect(mockedFs.writeFileSync).toHaveBeenCalledWith(
        `${mockCwd}/custom/modules/controller.ts`,
        mockTemplateContent
      );
    });

    it("should generate controller with custom path and with filename", async () => {
      const options = {
        model: "product",
        path: "custom/modules/{{module-name}}/controller.ts",
      } as any;

      await generateCommand.controller(options);

      expect(mockedEnsureDirectoryExists).toHaveBeenCalledWith(
        `${mockCwd}/custom/modules/product`
      );
      expect(mockedFs.writeFileSync).toHaveBeenCalledWith(
        `${mockCwd}/custom/modules/product/controller.ts`,
        mockTemplateContent
      );
    });

    it("should generate controller with custom path", async () => {
      const options = {
        model: "product",
        path: "custom/modules/{{module-name}}",
      } as any;

      await generateCommand.controller(options);

      expect(mockedEnsureDirectoryExists).toHaveBeenCalledWith(
        `${mockCwd}/custom/modules/product`
      );
      expect(mockedFs.writeFileSync).toHaveBeenCalledWith(
        `${mockCwd}/custom/modules/product/product.controller.ts`,
        mockTemplateContent
      );
    });

    it("should handle file system errors", async () => {
      const options = { model: "user" };
      const error = new Error("Permission denied");
      mockedFs.writeFileSync.mockImplementation(() => {
        throw error;
      });

      await generateCommand.controller(options);

      expect(sheuErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining("permission denied")
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
        expect.stringContaining("cannot create directory")
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

      try {
        await generateCommand.service(options);

        expect(sheuErrorSpy).toHaveBeenCalledWith("Module name is required!");
        expect(processExitSpy).toHaveBeenCalledWith(1);
      } catch {}
    });

    it("should handle template generation errors", async () => {
      const options = { model: "user" };
      const error = new Error("Template generation failed");
      mockedGenerateTemplate.mockImplementation(() => {
        throw error;
      });

      await generateCommand.service(options);

      expect(sheuErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining("template generation failed")
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
      });
      expect(mockedFs.writeFileSync).toHaveBeenCalledWith(
        `${mockCwd}/src/modules/order/order.router.ts`,
        mockTemplateContent
      );
    });

    it("should exit with error when model name is missing", async () => {
      const options = { model: "" };

      try {
        await generateCommand.router(options);

        expect(sheuErrorSpy).toHaveBeenCalledWith("Module name is required!");
        expect(processExitSpy).toHaveBeenCalledWith(1);
      } catch {}
    });
  });

  describe("edge cases and validation", () => {
    it("should handle special characters in model names", async () => {
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

      const options = { model: "very long model name with many parts" };

      await generateCommand.router(options);

      expect(mockedGenerateTemplate).toHaveBeenCalledWith("router", {
        modelName: {
          pascal: "VeryLongModelNameWithManyParts",
          camel: "veryLongModelNameWithManyParts",
          kebab: longModelName,
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
  });

  describe("file path construction", () => {
    it("should construct correct file paths for all commands", async () => {
      const options = { model: "user", path: "custom/path" };

      await generateCommand.controller(options);
      expect(mockedFs.writeFileSync).toHaveBeenLastCalledWith(
        expect.stringContaining("user.controller.ts"),
        expect.any(String)
      );

      await generateCommand.service(options);
      expect(mockedFs.writeFileSync).toHaveBeenLastCalledWith(
        expect.stringContaining("user.service.ts"),
        expect.any(String)
      );

      await generateCommand.router(options);
      expect(mockedFs.writeFileSync).toHaveBeenLastCalledWith(
        expect.stringContaining("user.router.ts"),
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

  describe("--modules flag (multi-module)", () => {
    it("should generate controller for multiple modules", async () => {
      (getUserFileExtension as jest.Mock).mockReturnValue("ts");

      await generateCommand.controller({ modules: "user,product,order" });

      expect(mockedFs.writeFileSync).toHaveBeenCalledTimes(3);
      expect(mockedFs.writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining("user.controller.ts"),
        mockTemplateContent
      );
      expect(mockedFs.writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining("product.controller.ts"),
        mockTemplateContent
      );
      expect(mockedFs.writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining("order.controller.ts"),
        mockTemplateContent
      );
    });

    it("should generate service for multiple modules", async () => {
      (getUserFileExtension as jest.Mock).mockReturnValue("ts");

      await generateCommand.service({ modules: "user,product" });

      expect(mockedFs.writeFileSync).toHaveBeenCalledTimes(2);
      expect(mockedFs.writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining("user.service.ts"),
        mockTemplateContent
      );
      expect(mockedFs.writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining("product.service.ts"),
        mockTemplateContent
      );
    });

    it("should generate router for multiple modules", async () => {
      (getUserFileExtension as jest.Mock).mockReturnValue("ts");

      await generateCommand.router({ modules: "user,order" });

      expect(mockedFs.writeFileSync).toHaveBeenCalledTimes(2);
      expect(mockedFs.writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining("user.router.ts"),
        mockTemplateContent
      );
      expect(mockedFs.writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining("order.router.ts"),
        mockTemplateContent
      );
    });

    it("should trim whitespace from module names", async () => {
      (getUserFileExtension as jest.Mock).mockReturnValue("ts");

      await generateCommand.controller({ modules: "user, product , order" });

      expect(mockedFs.writeFileSync).toHaveBeenCalledTimes(3);
      expect(mockedFs.writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining("user.controller.ts"),
        mockTemplateContent
      );
      expect(mockedFs.writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining("product.controller.ts"),
        mockTemplateContent
      );
    });

    it("should call process.exit(1) when at least one module fails", async () => {
      (getUserFileExtension as jest.Mock).mockReturnValue("ts");
      mockedFs.writeFileSync
        .mockImplementationOnce(() => {}) // user succeeds
        .mockImplementationOnce(() => {
          throw new Error("Permission denied");
        }); // product fails

      await generateCommand.controller({ modules: "user,product" });

      expect(processExitSpy).toHaveBeenCalledWith(1);
    });

    it("should continue generating remaining modules when one fails", async () => {
      (getUserFileExtension as jest.Mock).mockReturnValue("ts");
      mockedFs.writeFileSync
        .mockImplementationOnce(() => {
          throw new Error("Permission denied");
        }) // user fails
        .mockImplementationOnce(() => {}); // product succeeds

      await generateCommand.controller({ modules: "user,product" });

      expect(mockedFs.writeFileSync).toHaveBeenCalledTimes(2);
    });

    it("should handle single module in --modules flag", async () => {
      (getUserFileExtension as jest.Mock).mockReturnValue("ts");

      await generateCommand.controller({ modules: "user" });

      expect(mockedFs.writeFileSync).toHaveBeenCalledTimes(1);
      expect(mockedFs.writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining("user.controller.ts"),
        mockTemplateContent
      );
    });
  });

  describe("comma in --module validation", () => {
    it("should error when -m contains comma for controller", async () => {
      try {
        await generateCommand.controller({ module: "post,user" });
      } catch {}

      expect(sheuErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining("Use -ms/--modules instead")
      );
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });

    it("should error when -m contains comma for service", async () => {
      try {
        await generateCommand.service({ module: "post,user" });
      } catch {}

      expect(sheuErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining("Use -ms/--modules instead")
      );
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });

    it("should error when -m contains comma for router", async () => {
      try {
        await generateCommand.router({ module: "post,user" });
      } catch {}

      expect(sheuErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining("Use -ms/--modules instead")
      );
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });

    it("should error when --model contains comma", async () => {
      try {
        await generateCommand.controller({ model: "post,user" });
      } catch {}

      expect(sheuErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining("Use -ms/--modules instead")
      );
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });
  });
});
