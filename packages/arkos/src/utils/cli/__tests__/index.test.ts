import { Command } from "commander";
import prismaGenerateCommand from "../prisma-generate";
import exportAuthActionCommand from "../export-auth-action";

const mockGenerateCommand = {
  controller: jest.fn(),
  service: jest.fn(),
  router: jest.fn(),
  authConfigs: jest.fn(),
  queryOptions: jest.fn(),
  interceptors: jest.fn(),
  hooks: jest.fn(),
  createSchema: jest.fn(),
  updateSchema: jest.fn(),
  baseSchema: jest.fn(),
  querySchema: jest.fn(),
  createDto: jest.fn(),
  updateDto: jest.fn(),
  baseDto: jest.fn(),
  queryDto: jest.fn(),
  prismaModel: jest.fn(),
  policy: jest.fn(),
  loginSchema: jest.fn(),
  signupSchema: jest.fn(),
  updateMeSchema: jest.fn(),
  updatePasswordSchema: jest.fn(),
  loginDto: jest.fn(),
  signupDto: jest.fn(),
  updateMeDto: jest.fn(),
  updatePasswordDto: jest.fn(),
  multipleComponents: jest.fn(),
};

jest.mock("../../prisma/prisma-schema-parser", () => ({
  __esModule: true,
  default: {
    getModelsAsArrayOfStrings: jest.fn(() => []),
    parse: jest.fn(),
  },
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

jest.mock("commander", () => {
  const actions: Record<string, Function> = {};
  const commandHandlers: Record<string, Function> = {};
  let onCommandStarHandler: Function | null = null;

  const makeSubCmd = (name: string) => {
    const sub: any = {
      _name: name,
      alias: jest.fn().mockReturnThis(),
      description: jest.fn().mockReturnThis(),
      option: jest.fn().mockReturnThis(),
      opts: jest.fn().mockReturnValue({}),
      action: jest.fn().mockImplementation((fn) => {
        actions[name] = fn;
        return sub;
      }),
      command: jest.fn().mockImplementation((n) => makeSubCmd(`${name}:${n}`)),
      on: jest.fn().mockImplementation((event, fn) => {
        if (event === "command:*") onCommandStarHandler = fn;
        return sub;
      }),
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
    on: jest.fn().mockImplementation((event, fn) => {
      if (event === "command:*") onCommandStarHandler = fn;
      return mockProgram;
    }),
    command: jest.fn().mockImplementation((n) => {
      const sub = makeSubCmd(n);
      commandHandlers[n] = sub;
      return sub;
    }),
    _actions: actions,
    _commandHandlers: commandHandlers,
    _getOnCommandStar: () => onCommandStarHandler,
  };

  return { Command: jest.fn().mockImplementation(() => mockProgram) };
});

jest.mock("fs", () => ({
  ...jest.requireActual("fs"),
  readFileSync: jest.fn(() => '{"version":"1.2.3"}'),
  readdirSync: jest.fn(),
}));

jest.mock("path", () => ({
  join: jest.fn().mockReturnValue("/mocked/path/to/package.json"),
  resolve: jest.fn(),
}));

describe("CLI index — missing coverage", () => {
  let mockProgram: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockProgram = new Command();
  });

  describe("generate command registration", () => {
    it("registers the generate command with alias g", () => {
      jest.isolateModules(() => {
        require("../index");
      });
      expect(mockProgram.command).toHaveBeenCalledWith("generate");
      const generateSub = mockProgram.command.mock.results.find(
        (r: any) => r.value._name === "generate"
      )?.value;
      expect(generateSub?.alias).toHaveBeenCalledWith("g");
    });

    it("registers generate with -m/--module and --model options", () => {
      jest.isolateModules(() => {
        require("../index");
      });
      const generateSub = mockProgram.command.mock.results.find(
        (r: any) => r.value._name === "generate"
      )?.value;
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
      ["auth-configs", "a", "authConfigs"],
      ["query-options", "q", "queryOptions"],
      ["interceptors", "i", "interceptors"],
      ["hooks", "h", "hooks"],
      ["create-schema", "cs", "createSchema"],
      ["update-schema", "us", "updateSchema"],
      ["schema", "sc", "baseSchema"],
      ["query-schema", "qs", "querySchema"],
      ["create-dto", "cd", "createDto"],
      ["update-dto", "ud", "updateDto"],
      ["dto", "d", "baseDto"],
      ["query-dto", "qd", "queryDto"],
      ["model", "m", "prismaModel"],
      ["policy", "p", "policy"],
      ["login-schema", "ls", "loginSchema"],
      ["signup-schema", "ss", "signupSchema"],
      ["update-me-schema", "ums", "updateMeSchema"],
      ["update-password-schema", "ups", "updatePasswordSchema"],
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
        const generateSub = mockProgram.command.mock.results.find(
          (r: any) => r.value._name === "generate"
        )?.value;
        expect(generateSub?.command).toHaveBeenCalledWith(subName);
        const sub = generateSub?.command.mock.results.find(
          (r: any) => r.value._name === `generate:${subName}`
        )?.value;
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
      const generateSub = mockProgram.command.mock.results.find(
        (r: any) => r.value._name === "generate"
      )?.value;
      expect(generateSub?.command).toHaveBeenCalledWith("components");
      const componentsSub = generateSub?.command.mock.results.find(
        (r: any) => r.value._name === "generate:components"
      )?.value;
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
      const generateSub = mockProgram.command.mock.results.find(
        (r: any) => r.value._name === "generate"
      )?.value;
      const componentsSub = generateSub?.command.mock.results.find(
        (r: any) => r.value._name === "generate:components"
      )?.value;
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
      const generateSub = mockProgram.command.mock.results.find(
        (r: any) => r.value._name === "generate"
      )?.value;
      expect(generateSub?.command).toHaveBeenCalledWith("all");
    });

    it("delegates to generateCommand.multipleComponents with all: true", () => {
      jest.isolateModules(() => {
        require("../index");
      });
      const generateSub = mockProgram.command.mock.results.find(
        (r: any) => r.value._name === "generate"
      )?.value;
      const allSub = generateSub?.command.mock.results.find(
        (r: any) => r.value._name === "generate:all"
      )?.value;
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
      const generateSub = mockProgram.command.mock.results.find(
        (r: any) => r.value._name === "generate"
      )?.value;
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
        .mockImplementation(() => {});
      jest.isolateModules(() => {
        require("../index");
      });
      const generateSub = mockProgram.command.mock.results.find(
        (r: any) => r.value._name === "generate"
      )?.value;
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
      const prismaSub = mockProgram.command.mock.results.find(
        (r: any) => r.value._name === "prisma"
      )?.value;
      expect(prismaSub?.command).toHaveBeenCalledWith("generate");
    });

    it("delegates to prismaGenerateCommand", () => {
      jest.isolateModules(() => {
        require("../index");
      });
      const prismaSub = mockProgram.command.mock.results.find(
        (r: any) => r.value._name === "prisma"
      )?.value;
      const prismaGenerateSub = prismaSub?.command.mock.results.find(
        (r: any) => r.value._name === "prisma:generate"
      )?.value;
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
      const exportSub = mockProgram.command.mock.results.find(
        (r: any) => r.value._name === "export"
      )?.value;
      expect(exportSub?.command).toHaveBeenCalledWith("auth-action");
      const authActionSub = exportSub?.command.mock.results.find(
        (r: any) => r.value._name === "export:auth-action"
      )?.value;
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
      const exportSub = mockProgram.command.mock.results.find(
        (r: any) => r.value._name === "export"
      )?.value;
      const authActionSub = exportSub?.command.mock.results.find(
        (r: any) => r.value._name === "export:auth-action"
      )?.value;
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
