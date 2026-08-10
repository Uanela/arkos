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

jest.mock('../../prisma/prisma-schema-parser', () => ({
  __esModule: true,
  default: { getModelsAsArrayOfStrings: jest.fn(() => []), parse: jest.fn() },
}));

jest.mock('../utils/cli.helpers', () => ({
  getVersion: jest.fn(() => '1.2.3'),
}));

jest.mock('../../helpers/arkos-config.helpers', () => ({
  readArkosConfig: jest.fn().mockResolvedValue({}),
  getArkosConfig: jest.fn(),
}));

jest.mock('../build', () => ({ buildCommand: jest.fn() }));
jest.mock('../dev', () => ({ devCommand: jest.fn() }));
jest.mock('../start', () => ({ startCommand: jest.fn() }));

jest.mock('../generate', () => ({
  generateCommand: mockGenerateCommand,
}));

jest.mock('../prisma-generate', () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock('../export-auth-action', () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock('../../dotenv.helpers', () => ({
  loadEnvironmentVariables: jest.fn(() => []),
}));
jest.mock('../../helpers/fs.helpers');
const ORIGINAL_ARGV = process.argv;
const ORIGINAL_ENV = process.env;

async function run(argv: string[]) {
  let mod: any;
  process.argv = ['node', 'arkos', ...argv];
  jest.isolateModules(() => {
    mod = require('../index');
  });
  return mod;
}

describe('CLI Index', () => {
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

  describe('generate subcommands — action delegation', () => {
    const subcommandCases: Array<
      [string, string, keyof typeof mockGenerateCommand]
    > = [
      ['controller', 'c', 'controller'],
      ['service', 's', 'service'],
      ['router', 'r', 'router'],
      ['create-dto', 'cd', 'createDto'],
      ['update-dto', 'ud', 'updateDto'],
      ['dto', 'd', 'baseDto'],
      ['query-dto', 'qd', 'queryDto'],
      ['model', 'm', 'prismaModel'],
      ['policy', 'p', 'policy'],
      ['login-dto', 'ld', 'loginDto'],
      ['signup-dto', 'sd', 'signupDto'],
      ['update-me-dto', 'umd', 'updateMeDto'],
      ['update-password-dto', 'upd', 'updatePasswordDto'],
    ];

    it.each(subcommandCases)(
      'generate %s (alias %s) delegates to generateCommand.%s',
      (subName, alias, method) => {
        jest.isolateModules(() => {
          require('../index');
        });
        const generateSub = findSub(mockProgram, 'generate');
        expect(generateSub?.command).toHaveBeenCalledWith(subName);
        const sub = findSub(generateSub, `generate:${subName}`);
        expect(sub?.alias).toHaveBeenCalledWith(alias);
        sub?.action.mock.calls[0]?.[0]({});
        expect(mockGenerateCommand[method]).toHaveBeenCalled();
      },
    );
  });

  describe('generate components subcommand', () => {
    it('registers components with alias co and -a/--all and -n/--names options', () => {
      jest.isolateModules(() => {
        require('../index');
      });
      const generateSub = findSub(mockProgram, 'generate');
      expect(generateSub?.command).toHaveBeenCalledWith('components');
      const componentsSub = findSub(generateSub, 'generate:components');
      expect(componentsSub?.alias).toHaveBeenCalledWith('co');
      expect(componentsSub?.option).toHaveBeenCalledWith(
        '-a, --all',
        expect.any(String),
      );
      expect(componentsSub?.option).toHaveBeenCalledWith(
        '-n, --names <names>',
        expect.any(String),
      );
    });

    it('defaults build --module to cjs', async () => {
      const { buildCommand } = require('../build');
      await run(['build']);
      expect(buildCommand.mock.calls[0][0]).toEqual(
        expect.objectContaining({ module: 'cjs' }),
      );
    });

    it('dispatches dev with port/host options', async () => {
      const { devCommand } = require('../dev');
      await run(['dev', '-p', '4000', '-h', '0.0.0.0']);
      expect(devCommand.mock.calls[0][0]).toEqual(
        expect.objectContaining({ port: '4000', host: '0.0.0.0' }),
      );
    });

    it('dispatches export auth-action with default path', async () => {
      const exportAuthActionCommand = require('../export-auth-action').default;
      await run(['export', 'auth-action']);
      expect(exportAuthActionCommand.mock.calls[0][0]).toEqual(
        expect.objectContaining({ path: 'src/modules/auth/utils' }),
      );
    });

    it('respects a custom --path for export auth-action', async () => {
      const exportAuthActionCommand = require('../export-auth-action').default;
      await run(['export', 'auth-action', '-p', 'custom/dir']);
      expect(exportAuthActionCommand.mock.calls[0][0]).toEqual(
        expect.objectContaining({ path: 'custom/dir' }),
      );
    });

    it('dispatches start', async () => {
      const { startCommand } = require('../start');
      await run(['start']);
      expect(startCommand).toHaveBeenCalled();
    });
  });

  describe('preAction hook', () => {
    // it("sets NO_CLI and loads env vars before the command runs", async () => {
    //   const { loadEnvironmentVariables } = require("../../dotenv.helpers");
    //   await run(["dev"]);
    //   expect(process.env.NO_CLI).toBe("true");
    //   expect(loadEnvironmentVariables).toHaveBeenCalled();
    // });

    it('defaults NODE_ENV per command', async () => {
      await run(['build']);
      expect(process.env.NODE_ENV).toBe('production');
    });

    it('does not override an already-set NODE_ENV', async () => {
      process.env.NODE_ENV = 'test';
      await run(['dev']);
      expect(process.env.NODE_ENV).toBe('test');
    });

    it('falls back to development for commands with no explicit default', async () => {
      await run(['generate', 'controller']);
      expect(process.env.NODE_ENV).toBe('development');
    });
  });

  describe('generate subcommands', () => {
    it('merges parent and child options for controller', async () => {
      await run(['generate', 'controller', '-m', 'post', '-o']);
      expect(mockGenerateCommand.controller).toHaveBeenCalledWith(
        expect.objectContaining({ module: 'post', overwrite: true }),
      );
    });

    it('supports the g/c aliases', async () => {
      await run(['g', 'c', '-m', 'user']);
      expect(mockGenerateCommand.controller).toHaveBeenCalledWith(
        expect.objectContaining({ module: 'user' }),
      );
    });

    it('resolves comma-separated shorthand via multipleComponents', async () => {
      await run(['generate', 'r,c,service', '-m', 'post']);
      expect(mockGenerateCommand.multipleComponents).toHaveBeenCalledWith(
        expect.objectContaining({ module: 'post', names: 'r,c,service' }),
      );
    });

    it('exits with an error on a genuinely unknown subcommand', async () => {
      const exitSpy = jest
        .spyOn(process, 'exit')
        .mockImplementation(() => undefined as never);
      const errorSpy = jest
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      await run(['generate', 'not a real command']);

      expect(errorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Unknown command'),
      );
      expect(exitSpy).toHaveBeenCalledWith(1);
      exitSpy.mockRestore();
      errorSpy.mockRestore();
    });

    it('generates all components with --all flag', async () => {
      await run(['generate', 'all', '-m', 'post']);
      expect(mockGenerateCommand.multipleComponents).toHaveBeenCalledWith(
        expect.objectContaining({ module: 'post', all: true }),
      );
    });
  });

  describe('prisma and export commands', () => {
    it('dispatches prisma generate', async () => {
      const prismaGenerateCommand = require('../prisma-generate').default;
      await run(['prisma', 'generate']);
      expect(prismaGenerateCommand).toHaveBeenCalled();
    });

    it('dispatches export auth-action with default path', async () => {
      const exportAuthActionCommand = require('../export-auth-action').default;
      await run(['export', 'auth-action']);
      expect(exportAuthActionCommand.mock.calls[0][0]).toEqual(
        expect.objectContaining({ path: 'src/modules/auth/utils' }),
      );
    });

    it('respects a custom --path for export auth-action', async () => {
      const exportAuthActionCommand = require('../export-auth-action').default;
      await run(['export', 'auth-action', '-p', 'custom/dir']);
      expect(exportAuthActionCommand.mock.calls[0][0]).toEqual(
        expect.objectContaining({ path: 'custom/dir' }),
      );
    });
  });

  describe('exports', () => {
    it('exposes program and command functions', async () => {
      const exports = await run(['dev']);
      expect(exports).toHaveProperty('program');
      expect(exports).toHaveProperty('buildCommand');
      expect(exports).toHaveProperty('devCommand');
      expect(exports).toHaveProperty('startCommand');
      expect(exports).toHaveProperty('generateCommand');
    });
  });
});

