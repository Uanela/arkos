import { loadEnvironmentVariables } from "../../dotenv.helpers";

jest.mock("../../prisma/prisma-schema-parser", () => ({
  __esModule: true,
  default: { getModelsAsArrayOfStrings: jest.fn(() => []), parse: jest.fn() },
}));

jest.mock("../utils/cli.helpers", () => ({
  getVersion: jest.fn(() => "1.2.3"),
}));

jest.mock("../build", () => ({ buildCommand: jest.fn() }));
jest.mock("../dev", () => ({ devCommand: jest.fn() }));
jest.mock("../start", () => ({ startCommand: jest.fn() }));

jest.mock("../generate", () => ({
  generateCommand: {
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
  },
}));

jest.mock("../prisma-generate", () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock("../export-auth-action", () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock("../../dotenv.helpers", () => ({
  loadEnvironmentVariables: jest.fn(() => ["/project/.env"]),
}));

const ORIGINAL_ARGV = process.argv;
const ORIGINAL_ENV = process.env;

function run(argv: string[]) {
  let mod: any;
  process.argv = ["node", "arkos", ...argv];
  jest.isolateModules(() => {
    mod = require("../index");
  });
  return mod;
}

describe("CLI Index", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...ORIGINAL_ENV };
    delete process.env.NODE_ENV;
    delete process.env.NO_CLI;
  });

  afterAll(() => {
    process.argv = ORIGINAL_ARGV;
    process.env = ORIGINAL_ENV;
  });

  describe("top-level commands", () => {
    it("dispatches build with parsed options", () => {
      const { buildCommand } = require("../build");
      run(["build", "-m", "esm"]);
      expect(buildCommand.mock.calls[0][0]).toEqual(
        expect.objectContaining({ module: "esm" })
      );
    });

    it("defaults build --module to cjs", () => {
      const { buildCommand } = require("../build");
      run(["build"]);
      expect(buildCommand.mock.calls[0][0]).toEqual(
        expect.objectContaining({ module: "cjs" })
      );
    });

    it("dispatches dev with port/host options", () => {
      const { devCommand } = require("../dev");
      run(["dev", "-p", "4000", "-h", "0.0.0.0"]);
      expect(devCommand.mock.calls[0][0]).toEqual(
        expect.objectContaining({ port: "4000", host: "0.0.0.0" })
      );
    });

    it("dispatches export auth-action with default path", () => {
      const exportAuthActionCommand = require("../export-auth-action").default;
      run(["export", "auth-action"]);
      expect(exportAuthActionCommand.mock.calls[0][0]).toEqual(
        expect.objectContaining({ path: "src/modules/auth/utils" })
      );
    });

    it("respects a custom --path for export auth-action", () => {
      const exportAuthActionCommand = require("../export-auth-action").default;
      run(["export", "auth-action", "-p", "custom/dir"]);
      expect(exportAuthActionCommand.mock.calls[0][0]).toEqual(
        expect.objectContaining({ path: "custom/dir" })
      );
    });

    it("dispatches start", () => {
      const { startCommand } = require("../start");
      run(["start"]);
      expect(startCommand).toHaveBeenCalled();
    });
  });

  describe("preAction hook", () => {
    it("sets NO_CLI and loads env vars before the command runs", () => {
      run(["dev"]);
      expect(process.env.NO_CLI).toBe("true");
      expect(loadEnvironmentVariables).toHaveBeenCalled();
    });

    it("defaults NODE_ENV per command", () => {
      run(["build"]);
      expect(process.env.NODE_ENV).toBe("production");
    });

    it("does not override an already-set NODE_ENV", () => {
      process.env.NODE_ENV = "test";
      run(["dev"]);
      expect(process.env.NODE_ENV).toBe("test");
    });

    it("falls back to development for commands with no explicit default", () => {
      run(["generate", "controller"]);
      expect(process.env.NODE_ENV).toBe("development");
    });
  });

  describe("generate subcommands", () => {
    it("merges parent and child options for controller", () => {
      const { generateCommand } = require("../generate");
      run(["generate", "controller", "-m", "post", "-o"]);
      expect(generateCommand.controller).toHaveBeenCalledWith(
        expect.objectContaining({ module: "post", overwrite: true })
      );
    });

    it("supports the g/c aliases", () => {
      const { generateCommand } = require("../generate");
      run(["g", "c", "-m", "user"]);
      expect(generateCommand.controller).toHaveBeenCalledWith(
        expect.objectContaining({ module: "user" })
      );
    });

    it("resolves comma-separated shorthand via multipleComponents", () => {
      const { generateCommand } = require("../generate");
      run(["generate", "r,c,service", "-m", "post"]);
      expect(generateCommand.multipleComponents).toHaveBeenCalledWith(
        expect.objectContaining({ module: "post", names: "r,c,service" })
      );
    });

    it("exits with an error on a genuinely unknown subcommand", () => {
      const exitSpy = jest
        .spyOn(process, "exit")
        .mockImplementation(() => undefined as never);
      const errorSpy = jest.spyOn(console, "error").mockImplementation(() => { });
      run(["generate", "not a real command"]);
      expect(errorSpy).toHaveBeenCalledWith(
        expect.stringContaining("Unknown command")
      );
      expect(exitSpy).toHaveBeenCalledWith(1);
      exitSpy.mockRestore();
      errorSpy.mockRestore();
    });

    it("generates all components with --all flag", () => {
      const { generateCommand } = require("../generate");
      run(["generate", "all", "-m", "post"]);
      expect(generateCommand.multipleComponents).toHaveBeenCalledWith(
        expect.objectContaining({ module: "post", all: true })
      );
    });
  });

  describe("prisma and export commands", () => {
    it("dispatches prisma generate", () => {
      const prismaGenerateCommand = require("../prisma-generate").default;
      run(["prisma", "generate"]);
      expect(prismaGenerateCommand).toHaveBeenCalled();
    });

    it("dispatches export auth-action with default path", () => {
      const exportAuthActionCommand = require("../export-auth-action").default;
      run(["export", "auth-action"]);
      expect(exportAuthActionCommand.mock.calls[0][0]).toEqual(
        expect.objectContaining({ path: "src/modules/auth/utils" })
      );
    });

    it("respects a custom --path for export auth-action", () => {
      const exportAuthActionCommand = require("../export-auth-action").default;
      run(["export", "auth-action", "-p", "custom/dir"]);
      expect(exportAuthActionCommand.mock.calls[0][0]).toEqual(
        expect.objectContaining({ path: "custom/dir" })
      );
    });
  });

  describe("exports", () => {
    it("exposes program and command functions", () => {
      const exports = run(["--version"].length ? ["dev"] : []); // any valid subcommand
      expect(exports).toHaveProperty("program");
      expect(exports).toHaveProperty("buildCommand");
      expect(exports).toHaveProperty("devCommand");
      expect(exports).toHaveProperty("startCommand");
      expect(exports).toHaveProperty("generateCommand");
    });
  });
});
