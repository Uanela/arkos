import sheu from "../../../../../sheu";
import { generateCommand } from "../../../../generate";
import generateMultipleComponents from "../generate-multiple-components";

jest.mock("../../../../generate", () => ({
  generateCommand: {
    service: jest.fn(),
    controller: jest.fn(),
    router: jest.fn(),
    baseSchema: jest.fn(),
    createSchema: jest.fn(),
    updateSchema: jest.fn(),
    querySchema: jest.fn(),
    baseDto: jest.fn(),
    createDto: jest.fn(),
    updateDto: jest.fn(),
    queryDto: jest.fn(),
    prismaModel: jest.fn(),
    authConfigs: jest.fn(),
    queryOptions: jest.fn(),
    interceptors: jest.fn(),
    hooks: jest.fn(),
    policy: jest.fn(),
    loginSchema: jest.fn(),
    signupSchema: jest.fn(),
    updateMeSchema: jest.fn(),
    updatePasswordSchema: jest.fn(),
    loginDto: jest.fn(),
    signupDto: jest.fn(),
    updateMeDto: jest.fn(),
    updatePasswordDto: jest.fn(),
  },
}));

jest.mock("../../../../../sheu");
jest.mock("../../../../../helpers/exit-error", () =>
  jest.fn((msg: string) => {
    throw new Error(msg);
  })
);

describe("generateMultipleComponents", () => {
  let processExitSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    (generateCommand.service as jest.Mock).mockResolvedValue(undefined);
    (generateCommand.controller as jest.Mock).mockResolvedValue(undefined);
    (generateCommand.router as jest.Mock).mockResolvedValue(undefined);
    console.log = jest.fn();
    console.info = jest.fn();
    processExitSpy = jest.spyOn(process, "exit").mockImplementation(() => {
      throw new Error("process.exit(1)");
    });
  });

  afterEach(() => {
    processExitSpy.mockRestore();
  });

  describe("validation", () => {
    it("should throw when module name is missing", async () => {
      await expect(
        generateMultipleComponents({ all: true } as any)
      ).rejects.toThrow("Module name is required");
    });

    it("should throw when neither --all nor --names is provided", async () => {
      await expect(
        generateMultipleComponents({ module: "user" } as any)
      ).rejects.toThrow("Please specify either --all or --names flag");
    });

    it("should throw when --module contains comma", async () => {
      await expect(
        generateMultipleComponents({ module: "post,user", all: true } as any)
      ).rejects.toThrow("Use -ms/--modules instead");
    });

    it("should throw when --model contains comma", async () => {
      await expect(
        generateMultipleComponents({ model: "post,user", all: true } as any)
      ).rejects.toThrow("Use -ms/--modules instead");
    });

    it("should throw when names provided but none are valid", async () => {
      await expect(
        generateMultipleComponents({ module: "user", names: "xyz,abc" })
      ).rejects.toThrow("No valid components specified.");
    });
  });

  describe("single module — --all", () => {
    it("should generate all prisma components for a prisma model", async () => {
      await generateMultipleComponents({ module: "user", all: true });

      expect(generateCommand.service).toHaveBeenCalled();
      expect(generateCommand.controller).toHaveBeenCalled();
      expect(generateCommand.router).toHaveBeenCalled();
      expect(generateCommand.prismaModel).toHaveBeenCalled();
      expect(generateCommand.createSchema).toHaveBeenCalled();
      expect(generateCommand.queryOptions).toHaveBeenCalled();
      expect(sheu.done).toHaveBeenCalled();
    });

    it("should not generate auth-only components when --all for prisma model", async () => {
      await generateMultipleComponents({ module: "user", all: true });

      expect(generateCommand.loginSchema).not.toHaveBeenCalled();
      expect(generateCommand.signupSchema).not.toHaveBeenCalled();
      expect(generateCommand.updateMeSchema).not.toHaveBeenCalled();
      expect(generateCommand.updatePasswordSchema).not.toHaveBeenCalled();
    });

    it("should generate all auth components when --all for auth module", async () => {
      await generateMultipleComponents({ module: "auth", all: true });

      expect(generateCommand.loginSchema).toHaveBeenCalled();
      expect(generateCommand.signupSchema).toHaveBeenCalled();
      expect(generateCommand.updateMeSchema).toHaveBeenCalled();
      expect(generateCommand.updatePasswordSchema).toHaveBeenCalled();
      expect(generateCommand.loginDto).toHaveBeenCalled();
      expect(generateCommand.interceptors).toHaveBeenCalled();
      expect(generateCommand.hooks).toHaveBeenCalled();
    });

    it("should not generate prisma-only components when --all for auth module", async () => {
      await generateMultipleComponents({ module: "auth", all: true });

      expect(generateCommand.prismaModel).not.toHaveBeenCalled();
      expect(generateCommand.createSchema).not.toHaveBeenCalled();
      expect(generateCommand.createDto).not.toHaveBeenCalled();
    });
  });

  describe("single module — --names", () => {
    it("should generate specific components using shorthand codes", async () => {
      await generateMultipleComponents({ module: "user", names: "s,c,r" });

      expect(generateCommand.service).toHaveBeenCalledWith(
        expect.objectContaining({ module: "user", isBulk: true })
      );
      expect(generateCommand.controller).toHaveBeenCalled();
      expect(generateCommand.router).toHaveBeenCalled();
      expect(generateCommand.prismaModel).not.toHaveBeenCalled();
    });

    it("should generate specific components using full names", async () => {
      await generateMultipleComponents({
        module: "user",
        names: "service,controller,create-schema",
      });

      expect(generateCommand.service).toHaveBeenCalled();
      expect(generateCommand.controller).toHaveBeenCalled();
      expect(generateCommand.createSchema).toHaveBeenCalled();
    });

    it("should warn and skip unknown components", async () => {
      await generateMultipleComponents({
        module: "user",
        names: "service,invalid-comp",
      });

      expect(sheu.warn).toHaveBeenCalledWith(
        expect.stringContaining('Unknown component: "invalid-comp"')
      );
      expect(generateCommand.service).toHaveBeenCalled();
    });

    it("should use correct default paths for components", async () => {
      await generateMultipleComponents({
        module: "user",
        names: "model,create-dto,create-schema",
      });

      expect(generateCommand.prismaModel).toHaveBeenCalledWith(
        expect.objectContaining({ path: "prisma/schema" })
      );
      expect(generateCommand.createDto).toHaveBeenCalledWith(
        expect.objectContaining({ path: "src/modules/{{module-name}}/dtos" })
      );
      expect(generateCommand.createSchema).toHaveBeenCalledWith(
        expect.objectContaining({ path: "src/modules/{{module-name}}/schemas" })
      );
    });

    it("should deduplicate components when alias and full name both provided", async () => {
      await generateMultipleComponents({
        module: "user",
        names: "s,service",
      });

      expect(generateCommand.service).toHaveBeenCalledTimes(1);
    });

    it("should skip auth-only components for non-auth module with warning", async () => {
      await generateMultipleComponents({
        module: "user",
        names: "s,login-schema",
      });

      expect(generateCommand.service).toHaveBeenCalled();
      expect(generateCommand.loginSchema).not.toHaveBeenCalled();
      expect(sheu.warn).toHaveBeenCalledWith(
        expect.stringContaining('Skipping "login-schema" for module "user"')
      );
    });

    it("should skip prisma-only components for auth module with warning", async () => {
      await generateMultipleComponents({
        module: "auth",
        names: "login-schema,create-schema",
      });

      expect(generateCommand.loginSchema).toHaveBeenCalled();
      expect(generateCommand.createSchema).not.toHaveBeenCalled();
      expect(sheu.warn).toHaveBeenCalledWith(
        expect.stringContaining('Skipping "create-schema" for module "auth"')
      );
    });
  });

  describe("multiple modules — --modules", () => {
    it("should generate components for each module", async () => {
      await generateMultipleComponents({
        module: "user,post",
        names: "s,c",
      });

      expect(generateCommand.service).toHaveBeenCalledTimes(2);
      expect(generateCommand.controller).toHaveBeenCalledTimes(2);

      expect(generateCommand.service).toHaveBeenCalledWith(
        expect.objectContaining({ module: "user" })
      );
      expect(generateCommand.service).toHaveBeenCalledWith(
        expect.objectContaining({ module: "post" })
      );
    });

    it("should generate --all for each module with correct filtering", async () => {
      await generateMultipleComponents({
        module: "user,auth",
        all: true,
      });

      // prisma components called for user
      expect(generateCommand.service).toHaveBeenCalledWith(
        expect.objectContaining({ module: "user" })
      );
      expect(generateCommand.prismaModel).toHaveBeenCalledWith(
        expect.objectContaining({ module: "user" })
      );

      // auth components called for auth
      expect(generateCommand.loginSchema).toHaveBeenCalledWith(
        expect.objectContaining({ module: "auth" })
      );

      // auth-only not called for user
      expect(generateCommand.loginSchema).not.toHaveBeenCalledWith(
        expect.objectContaining({ module: "user" })
      );

      // prisma-only not called for auth
      expect(generateCommand.prismaModel).not.toHaveBeenCalledWith(
        expect.objectContaining({ module: "auth" })
      );
    });

    it("should trim whitespace from module names", async () => {
      await generateMultipleComponents({
        module: "user, post , order",
        names: "s",
      });

      expect(generateCommand.service).toHaveBeenCalledTimes(3);
      expect(generateCommand.service).toHaveBeenCalledWith(
        expect.objectContaining({ module: "user" })
      );
      expect(generateCommand.service).toHaveBeenCalledWith(
        expect.objectContaining({ module: "post" })
      );
      expect(generateCommand.service).toHaveBeenCalledWith(
        expect.objectContaining({ module: "order" })
      );
    });

    it("should continue generating other modules when one component fails", async () => {
      (generateCommand.service as jest.Mock)
        .mockResolvedValueOnce(undefined) // user succeeds
        .mockRejectedValueOnce(new Error("Disk Full")); // post fails

      await expect(
        generateMultipleComponents({ module: "user,post", names: "s" })
      ).rejects.toThrow("process.exit(1)");

      expect(generateCommand.service).toHaveBeenCalledTimes(2);
      expect(sheu.error).toHaveBeenCalledWith(
        expect.stringContaining("Failed to generate service for post")
      );
    });

    it("should call process.exit(1) when any component fails across modules", async () => {
      (generateCommand.service as jest.Mock).mockRejectedValue(
        new Error("Disk Full")
      );

      await expect(
        generateMultipleComponents({ module: "user,post", names: "s" })
      ).rejects.toThrow("process.exit(1)");
    });

    it("should show done message listing all modules", async () => {
      await generateMultipleComponents({
        module: "user,post",
        names: "s",
      });
      expect(sheu.done).toHaveBeenCalledWith(expect.stringContaining("user"));
      expect(sheu.done).toHaveBeenCalledWith(expect.stringContaining("post"));
    });
  });

  describe("isBulk and module passing", () => {
    it("should pass isBulk: true to all generated components", async () => {
      await generateMultipleComponents({ module: "user", names: "s,c" });
      expect(generateCommand.service).toHaveBeenCalledWith(
        expect.objectContaining({ isBulk: true })
      );
      expect(generateCommand.controller).toHaveBeenCalledWith(
        expect.objectContaining({ isBulk: true })
      );
    });

    it("should pass shouldExit: false and shouldPrintError: false", async () => {
      await generateMultipleComponents({ module: "user", names: "s" });
      expect(generateCommand.service).toHaveBeenCalledWith(
        expect.objectContaining({ shouldExit: false, shouldPrintError: false })
      );
    });

    it("should clear model field and pass module explicitly", async () => {
      await generateMultipleComponents({ model: "user", names: "s" });
      expect(generateCommand.service).toHaveBeenCalledWith(
        expect.objectContaining({ module: "user", model: undefined })
      );
    });
  });
});
