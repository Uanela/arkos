import { Command } from "commander";
import prismaGenerateCommand from "../prisma-generate";
import exportAuthActionCommand from "../export-auth-action";

const mockGenerateCommand = {
  controller: jest.fn(),
  service: jest.fn(),
  router: jest.fn(),
  createDto: jest.fn(),
  updateDto: jest.fn(),
  baseDto: jest.fn(),
  queryDto: jest.fn(),
  prismaModel: jest.fn(),
  policy: jest.fn(),
  loginDto: jest.fn(),
  signupDto: jest.fn(),
  updateMeDto: jest.fn(),
  updatePasswordDto: jest.fn(),
  multipleComponents: jest.fn(),
};

jest.mock("../../prisma/prisma-schema-parser", () => ({
  __esModule: true,
  default: { getModelsAsArrayOfStrings: jest.fn(() => []), parse: jest.fn() },
}));

jest.mock("../utils/cli.helpers", () => ({
  getVersion: jest.fn(() => "1.2.3"),
}));

jest.mock("../generate", () => ({ generateCommand: mockGenerateCommand }));
jest.mock("../prisma-generate", () => ({
  __esModule: true,
  default: jest.fn(),
}));
jest.mock("../export-auth-action", () => ({
  __esModule: true,
  default: jest.fn(),
}));
jest.mock("../build", () => ({ buildCommand: jest.fn() }));
jest.mock("../dev", () => ({ devCommand: jest.fn() }));
jest.mock("../start", () => ({ startCommand: jest.fn() }));
jest.mock("../../dotenv.helpers", () => ({
  loadEnvironmentVariables: jest.fn(() => []),
}));

jest.mock("commander", () => {
  const makeSubCmd = (name: string) => {
    const sub: any = {
      _name: name,
      alias: jest.fn().mockReturnThis(),
      description: jest.fn().mockReturnThis(),
      option: jest.fn().mockReturnThis(),
      opts: jest.fn().mockReturnValue({}),
      action: jest.fn().mockReturnThis(),
      command: jest.fn().mockImplementation((n: string) => makeSubCmd(`${name}:${n}`)),
      on: jest.fn().mockReturnThis(),
    };
    return sub;
  };

  const mockProgram: any = {
    name: jest.fn().mockReturnThis(),
    description: jest.fn().mockReturnThis(),
    version: jest.fn().mockReturnThis(),
    option: jest.fn().mockReturnThis(),
    action: jest.fn().mockReturnThis(),
    parse: jest.fn().mockReturnThis(),
    alias: jest.fn().mockReturnThis(),
    requiredOption: jest.fn().mockReturnThis(),
    opts: jest.fn().mockReturnValue({}),
    hook: jest.fn().mockReturnThis(),
    on: jest.fn().mockReturnThis(),
    command: jest.fn().mockImplementation((n: string) => makeSubCmd(n)),
  };

  return { Command: jest.fn().mockImplementation(() => mockProgram) };
});

describe("CLI index — registration structure (fake Commander)", () => {
  let mockProgram: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockProgram = new Command();
  });

  const findSub = (parent: any, name: string) =>
    parent.command.mock.results.find((r: any) => r.value._name === name)
      ?.value;

  describe("generate command registration", () => {
    it("registers the generate command with alias g", () => {
      jest.isolateModules(() => {
        require("../index");
      });
      expect(mockProgram.command).toHaveBeenCalledWith("generate");
      const generateSub = findSub(mockProgram, "generate");
      expect(generateSub?.alias).toHaveBeenCalledWith("g");
    });

    it("registers generate with -m/--module and --model options", () => {
      jest.isolateModules(() => {
        require("../index");
      });
      const generateSub = findSub(mockProgram, "generate");
      expect(generateSub?.option).toHaveBeenCalledWith(
        "-m, --module <name>",
        expect.any(String)
      );
      expect(generateSub?.option).toHaveBeenCalledWith(
        "--model <name>",
        expect.any(String)
      );
      expect(generateSub?.option).toHaveBeenCalledWith(
        "-p, --path <path>",
        expect.any(String)
      );
      expect(generateSub?.option).toHaveBeenCalledWith(
        "-o, --overwrite",
        expect.any(String)
      );
    });
  });

  describe("generate subcommands — action delegation", () => {
    const subcommandCases: Array<
      [string, string, keyof typeof mockGenerateCommand]
    > = [
        ["controller", "c", "controller"],
        ["service", "s", "service"],
        ["router", "r", "router"],
        ["create-dto", "cd", "createDto"],
        ["update-dto", "ud", "updateDto"],
        ["dto", "d", "baseDto"],
        ["query-dto", "qd", "queryDto"],
        ["model", "m", "prismaModel"],
        ["policy", "p", "policy"],
        ["login-dto", "ld", "loginDto"],
        ["signup-dto", "sd", "signupDto"],
        ["update-me-dto", "umd", "updateMeDto"],
        ["update-password-dto", "upd", "updatePasswordDto"],
      ];

    it.each(subcommandCases)(
      "generate %s (alias %s) delegates to generateCommand.%s",
      (subName, alias, method) => {
        jest.isolateModules(() => {
          require("../index");
        });
        const generateSub = findSub(mockProgram, "generate");
        expect(generateSub?.command).toHaveBeenCalledWith(subName);
        const sub = findSub(generateSub, `generate:${subName}`);
        expect(sub?.alias).toHaveBeenCalledWith(alias);
        sub?.action.mock.calls[0]?.[0]({});
        expect(mockGenerateCommand[method]).toHaveBeenCalled();
      }
    );
  });

  describe("generate components subcommand", () => {
    it("registers components with alias co and -a/--all and -n/--names options", () => {
      jest.isolateModules(() => {
        require("../index");
      });
      const generateSub = findSub(mockProgram, "generate");
      expect(generateSub?.command).toHaveBeenCalledWith("components");
      const componentsSub = findSub(generateSub, "generate:components");
      expect(componentsSub?.alias).toHaveBeenCalledWith("co");
      expect(componentsSub?.option).toHaveBeenCalledWith(
        "-a, --all",
        expect.any(String)
      );
      expect(componentsSub?.option).toHaveBeenCalledWith(
        "-n, --names <names>",
        expect.any(String)
      );
    });

    it("delegates components action to generateCommand.multipleComponents", () => {
      jest.isolateModules(() => {
        require("../index");
      });
      const generateSub = findSub(mockProgram, "generate");
      const componentsSub = findSub(generateSub, "generate:components");
      componentsSub?.action.mock.calls[0]?.[0]({ all: true });
      expect(mockGenerateCommand.multipleComponents).toHaveBeenCalledWith(
        expect.objectContaining({ all: true })
      );
    });
  });

  describe("generate all subcommand", () => {
    it("registers the all subcommand", () => {
      jest.isolateModules(() => {
        require("../index");
      });
      const generateSub = findSub(mockProgram, "generate");
      expect(generateSub?.command).toHaveBeenCalledWith("all");
    });

    it("delegates to generateCommand.multipleComponents with all: true", () => {
      jest.isolateModules(() => {
        require("../index");
      });
      const generateSub = findSub(mockProgram, "generate");
      const allSub = findSub(generateSub, "generate:all");
      allSub?.action.mock.calls[0]?.[0]();
      expect(mockGenerateCommand.multipleComponents).toHaveBeenCalledWith(
        expect.objectContaining({ all: true })
      );
    });
  });

  describe("generate command:* handler", () => {
    it("calls multipleComponents with names when command contains a comma", () => {
      jest.isolateModules(() => {
        require("../index");
      });
      const generateSub = findSub(mockProgram, "generate");
      const handler = generateSub?.on.mock.calls.find(
        (c: any) => c[0] === "command:*"
      )?.[1];
      handler?.(["controller,service,router"]);
      expect(mockGenerateCommand.multipleComponents).toHaveBeenCalledWith(
        expect.objectContaining({ names: "controller,service,router" })
      );
    });

    it("calls process.exit(1) for unknown commands without commas", () => {
      const exitSpy = jest.spyOn(process, "exit").mockImplementation(() => {
        throw new Error("process.exit");
      });
      const consoleSpy = jest
        .spyOn(console, "error")
        .mockImplementation(() => { });
      jest.isolateModules(() => {
        require("../index");
      });
      const generateSub = findSub(mockProgram, "generate");
      const handler = generateSub?.on.mock.calls.find(
        (c: any) => c[0] === "command:*"
      )?.[1];
      expect(() => handler?.(["unknown-cmd"])).toThrow("process.exit");
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("unknown-cmd")
      );
      expect(exitSpy).toHaveBeenCalledWith(1);
      exitSpy.mockRestore();
      consoleSpy.mockRestore();
    });
  });

  describe("prisma generate command", () => {
    it("registers prisma > generate with correct description", () => {
      jest.isolateModules(() => {
        require("../index");
      });
      expect(mockProgram.command).toHaveBeenCalledWith("prisma");
      const prismaSub = findSub(mockProgram, "prisma");
      expect(prismaSub?.command).toHaveBeenCalledWith("generate");
    });

    it("delegates to prismaGenerateCommand", () => {
      jest.isolateModules(() => {
        require("../index");
      });
      const prismaSub = findSub(mockProgram, "prisma");
      const prismaGenerateSub = findSub(prismaSub, "prisma:generate");
      prismaGenerateSub?.action.mock.calls[0]?.[0]();
      expect(prismaGenerateCommand).toHaveBeenCalled();
    });
  });

  describe("export auth-action command", () => {
    it("registers export > auth-action with correct description and options", () => {
      jest.isolateModules(() => {
        require("../index");
      });
      expect(mockProgram.command).toHaveBeenCalledWith("export");
      const exportSub = findSub(mockProgram, "export");
      expect(exportSub?.command).toHaveBeenCalledWith("auth-action");
      const authActionSub = findSub(exportSub, "export:auth-action");
      expect(authActionSub?.option).toHaveBeenCalledWith(
        "-o, --overwrite",
        expect.any(String)
      );
      expect(authActionSub?.option).toHaveBeenCalledWith(
        "-p, --path <path>",
        expect.any(String),
        "src/modules/auth/utils"
      );
    });

    it("delegates to exportAuthActionCommand", () => {
      jest.isolateModules(() => {
        require("../index");
      });
      const exportSub = findSub(mockProgram, "export");
      const authActionSub = findSub(exportSub, "export:auth-action");
      authActionSub?.action.mock.calls[0]?.[0]();
      expect(exportAuthActionCommand).toHaveBeenCalled();
    });
  });

  describe("exports", () => {
    it("exports generateCommand", () => {
      let mod: any;
      jest.isolateModules(() => {
        mod = require("../index");
      });
      expect(mod).toHaveProperty("generateCommand");
    });
  });
});
