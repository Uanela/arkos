import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import path from "path";
import inquirer from "inquirer";
import chalk from "chalk";

// Mock dependencies
vi.mock("path");
vi.mock("inquirer");
vi.mock("chalk", () => ({
  default: {
    cyan: vi.fn((text: string) => text),
    red: vi.fn((text: string) => text),
    bold: vi.fn((text: string) => text),
    greenBright: vi.fn((text: string) => text),
  },
}));

describe("ProjectConfigInquirer", () => {
  let ProjectConfigInquirer: any;
  let projectConfigInquirer: any;
  let originalArgv: string[];
  let originalCwd: string;
  let originalConsoleInfo: typeof console.info;
  let originalConsoleError: typeof console.error;
  let originalProcessExit: typeof process.exit;
  let consoleInfoSpy: ReturnType<typeof vi.fn>;
  let consoleErrorSpy: ReturnType<typeof vi.fn>;
  let processExitSpy: ReturnType<typeof vi.fn>;

  const mockedPath = vi.mocked(path);
  const mockedInquirer = vi.mocked(inquirer);
  const mockedChalk: any = vi.mocked(chalk);

  beforeEach(async () => {
    // Store original values
    originalArgv = process.argv;
    originalCwd = process.cwd();
    originalConsoleInfo = console.info;
    originalConsoleError = console.error;
    originalProcessExit = process.exit;

    // Create spies
    consoleInfoSpy = vi.fn();
    consoleErrorSpy = vi.fn();
    processExitSpy = vi.fn();

    // Replace functions
    console.info = consoleInfoSpy;
    console.error = consoleErrorSpy;
    process.exit = processExitSpy as any;

    // Reset mocks
    vi.clearAllMocks();

    // Setup default mocks
    mockedPath.basename.mockReturnValue("current-dir");
    mockedPath.resolve.mockImplementation((...args: string[]) =>
      args.join("/")
    );
    mockedChalk.cyan.mockImplementation((text: string) => text);
    mockedChalk.red.mockImplementation((text: string) => text);
    mockedChalk.bold.mockImplementation((text: string) => text);
    mockedChalk.greenBright.mockImplementation((text: string) => text);

    // Import the module after mocks are set up
    const module = await import("../project-config-inquirer");
    ProjectConfigInquirer = (module.default as any).constructor;
    projectConfigInquirer = new ProjectConfigInquirer();
  });

  afterEach(() => {
    // Restore original values
    process.argv = originalArgv;
    process.cwd = () => originalCwd;
    console.info = originalConsoleInfo;
    console.error = originalConsoleError;
    process.exit = originalProcessExit;
  });

  describe("run method", () => {
    it("should run through all prompts and return complete config", async () => {
      // Mock process.argv to not have project name
      process.argv = ["node", "script.js"];

      // Mock all inquirer prompts
      mockedInquirer.prompt
        .mockResolvedValueOnce({ projectName: "test-project" })
        .mockResolvedValueOnce({ typescript: true })
        .mockResolvedValueOnce({ prismaProvider: "postgresql" })
        .mockResolvedValueOnce({ useValidation: true })
        .mockResolvedValueOnce({ validationType: "zod" })
        .mockResolvedValueOnce({ useAuthentication: true })
        .mockResolvedValueOnce({ authenticationType: "dynamic" })
        .mockResolvedValueOnce({ usernameField: "email" })
        .mockResolvedValueOnce({ multipleRoles: true })
        .mockResolvedValueOnce({ strictRouting: true });

      const config = await projectConfigInquirer.run();

      expect(config).toEqual({
        projectName: "test-project",
        argProjectName: undefined,
        typescript: true,
        validation: { type: "zod" },
        authentication: {
          type: "dynamic",
          usernameField: "email",
          multipleRoles: true,
        },
        prisma: {
          provider: "postgresql",
          idDatabaseType: "@id @default(uuid())",
          defaultDBurl:
            "postgresql://username:password@localhost:5432/test-project",
        },
        projectPath: expect.stringContaining("test-project"),
        routing: {
          strict: true,
        },
      });
    });

    it("should handle project name from command line args", async () => {
      // Mock process.argv with project name
      process.argv = ["node", "script.js", "my-cli-project"];

      mockedInquirer.prompt
        .mockResolvedValueOnce({ typescript: false })
        .mockResolvedValueOnce({ prismaProvider: "sqlite" })
        .mockResolvedValueOnce({ useValidation: false })
        .mockResolvedValueOnce({ useAuthentication: false })
        .mockResolvedValueOnce({ strictRouting: false });

      const config = await projectConfigInquirer.run();

      expect(config.projectName).toBe("my-cli-project");
      expect(config.argProjectName).toBe("my-cli-project");
      expect(mockedInquirer.prompt).not.toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ name: "projectName" }),
        ])
      );
    });

    it("should handle current directory (.) project name", async () => {
      process.argv = ["node", "script.js", "."];

      mockedInquirer.prompt
        .mockResolvedValueOnce({ typescript: false })
        .mockResolvedValueOnce({ prismaProvider: "sqlite" })
        .mockResolvedValueOnce({ useValidation: false })
        .mockResolvedValueOnce({ useAuthentication: false })
        .mockResolvedValueOnce({ strictRouting: false });

      const config = await projectConfigInquirer.run();

      expect(config.projectName).toBe("current-dir");
      expect(config.argProjectName).toBe(".");
      expect(mockedPath.basename).toHaveBeenCalledWith(process.cwd());
      expect(mockedPath.resolve).toHaveBeenCalledWith(process.cwd());
    });
  });

  describe("validateProjectName", () => {
    it("should allow current directory (.)", () => {
      const result = projectConfigInquirer.validateProjectName(".");
      expect(result).toBe(true);
    });

    it("should validate valid project names", () => {
      const validNames = ["test-project", "my_project", "Project123", "a1"];

      validNames.forEach((name) => {
        const result = projectConfigInquirer.validateProjectName(name);
        expect(result).toBe(true);
      });
    });

    it("should reject empty project names", () => {
      const result = projectConfigInquirer.validateProjectName("");
      expect(result).toBe("Project name cannot be empty");
    });

    it("should reject names with invalid characters", () => {
      const invalidNames = [
        "test@project",
        "my project",
        "test.project",
        "test/project",
      ];

      invalidNames.forEach((name) => {
        const result = projectConfigInquirer.validateProjectName(name);
        expect(result).toBe(
          "Project name can only contain letters, numbers, hyphens, and underscores"
        );
      });
    });

    it("should reject names not starting with letter or number", () => {
      const invalidNames = ["-test", "_test", "-project"];

      invalidNames.forEach((name) => {
        const result = projectConfigInquirer.validateProjectName(name);
        expect(result).toBe("Project name must start with a letter or number");
      });
    });

    it("should reject names not ending with letter or number", () => {
      const invalidNames = ["test-", "test_", "project-"];

      invalidNames.forEach((name) => {
        const result = projectConfigInquirer.validateProjectName(name);
        expect(result).toBe("Project name must end with a letter or number");
      });
    });

    it("should reject names that are too long", () => {
      const longName = "a".repeat(51);
      const result = projectConfigInquirer.validateProjectName(longName);
      expect(result).toBe("Project name must be 50 characters or less");
    });

    it("should reject reserved names", () => {
      const result = projectConfigInquirer.validateProjectName("node_modules");
      expect(result).toBe("Project name cannot be a reserved name");
    });
  });

  describe("project name validation with CLI args", () => {
    it("should exit process when CLI project name is invalid", async () => {
      process.argv = ["node", "script.js", "@invalid-name"];

      await expect(projectConfigInquirer.run()).rejects.toThrow();

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining("Error:")
      );
      expect(processExitSpy).toHaveBeenCalledWith(1);
    });
  });

  describe("TypeScript prompting", () => {
    beforeEach(() => {
      process.argv = ["node", "script.js", "test-project"];
    });

    it("should prompt for TypeScript and set config", async () => {
      mockedInquirer.prompt
        .mockResolvedValueOnce({ typescript: true })
        .mockResolvedValueOnce({ prismaProvider: "postgresql" })
        .mockResolvedValueOnce({ useValidation: false })
        .mockResolvedValueOnce({ useAuthentication: false })
        .mockResolvedValueOnce({ strictRouting: false });

      const config = await projectConfigInquirer.run();

      expect(mockedInquirer.prompt).toHaveBeenCalledWith([
        expect.objectContaining({
          type: "confirm",
          name: "typescript",
          default: false,
        }),
      ]);
      expect(config.typescript).toBe(true);
    });
  });

  describe("Prisma provider prompting", () => {
    beforeEach(() => {
      process.argv = ["node", "script.js", "test-project"];
    });

    it("should configure MongoDB correctly", async () => {
      mockedInquirer.prompt
        .mockResolvedValueOnce({ typescript: false })
        .mockResolvedValueOnce({ prismaProvider: "mongodb" })
        .mockResolvedValueOnce({ useValidation: false })
        .mockResolvedValueOnce({ useAuthentication: false })
        .mockResolvedValueOnce({ strictRouting: false });

      const config = await projectConfigInquirer.run();

      expect(config.prisma).toEqual({
        provider: "mongodb",
        idDatabaseType: '@id @default(auto()) @map("_id") @db.ObjectId',
        defaultDBurl: "mongodb://localhost:27017/test-project",
      });
    });

    it("should configure SQLite correctly", async () => {
      mockedInquirer.prompt
        .mockResolvedValueOnce({ typescript: false })
        .mockResolvedValueOnce({ prismaProvider: "sqlite" })
        .mockResolvedValueOnce({ useValidation: false })
        .mockResolvedValueOnce({ useAuthentication: false })
        .mockResolvedValueOnce({ strictRouting: false });

      const config = await projectConfigInquirer.run();

      expect(config.prisma).toEqual({
        provider: "sqlite",
        idDatabaseType: "@id @default(cuid())",
        defaultDBurl: "file:../../file.db",
      });
    });

    it("should configure MySQL correctly", async () => {
      mockedInquirer.prompt
        .mockResolvedValueOnce({ typescript: false })
        .mockResolvedValueOnce({ prismaProvider: "mysql" })
        .mockResolvedValueOnce({ useValidation: false })
        .mockResolvedValueOnce({ useAuthentication: false })
        .mockResolvedValueOnce({ strictRouting: false });

      const config = await projectConfigInquirer.run();

      expect(config.prisma).toEqual({
        provider: "mysql",
        idDatabaseType: "@id @default(uuid())",
        defaultDBurl: "mysql://username:password@localhost:3306/test-project",
      });
    });

    it("should configure SQL Server correctly", async () => {
      mockedInquirer.prompt
        .mockResolvedValueOnce({ typescript: false })
        .mockResolvedValueOnce({ prismaProvider: "sqlserver" })
        .mockResolvedValueOnce({ useValidation: false })
        .mockResolvedValueOnce({ useAuthentication: false })
        .mockResolvedValueOnce({ strictRouting: false });

      const config = await projectConfigInquirer.run();

      expect(config.prisma).toEqual({
        provider: "sqlserver",
        idDatabaseType: "@id @default(uuid())",
        defaultDBurl:
          "sqlserver://localhost:1433;database=test-project;username=sa;password=password;encrypt=DANGER_PLAINTEXT",
      });
    });

    it("should configure CockroachDB correctly", async () => {
      mockedInquirer.prompt
        .mockResolvedValueOnce({ typescript: false })
        .mockResolvedValueOnce({ prismaProvider: "cockroachdb" })
        .mockResolvedValueOnce({ useValidation: false })
        .mockResolvedValueOnce({ useAuthentication: false })
        .mockResolvedValueOnce({ strictRouting: false });

      const config = await projectConfigInquirer.run();

      expect(config.prisma).toEqual({
        provider: "cockroachdb",
        idDatabaseType: "@id @default(uuid())",
        defaultDBurl:
          "postgresql://username:password@localhost:26257/test-project?sslmode=require",
      });
    });
  });

  describe("Validation prompting", () => {
    beforeEach(() => {
      process.argv = ["node", "script.js", "test-project"];
    });

    it("should skip validation when user chooses not to use it", async () => {
      mockedInquirer.prompt
        .mockResolvedValueOnce({ typescript: true })
        .mockResolvedValueOnce({ prismaProvider: "postgresql" })
        .mockResolvedValueOnce({ useValidation: false })
        .mockResolvedValueOnce({ useAuthentication: false })
        .mockResolvedValueOnce({ strictRouting: false });

      const config = await projectConfigInquirer.run();

      expect(config.validation).toBeUndefined();
    });

    it("should allow validation type choice with TypeScript", async () => {
      mockedInquirer.prompt
        .mockResolvedValueOnce({ typescript: true })
        .mockResolvedValueOnce({ prismaProvider: "postgresql" })
        .mockResolvedValueOnce({ useValidation: true })
        .mockResolvedValueOnce({ validationType: "class-validator" })
        .mockResolvedValueOnce({ useAuthentication: false })
        .mockResolvedValueOnce({ strictRouting: false });

      const config = await projectConfigInquirer.run();

      expect(config.validation).toEqual({ type: "class-validator" });
    });

    it("should default to zod for JavaScript projects", async () => {
      mockedInquirer.prompt
        .mockResolvedValueOnce({ typescript: false })
        .mockResolvedValueOnce({ prismaProvider: "postgresql" })
        .mockResolvedValueOnce({ useValidation: true })
        .mockResolvedValueOnce({ useAuthentication: false })
        .mockResolvedValueOnce({ strictRouting: false });

      const config = await projectConfigInquirer.run();

      expect(config.validation).toEqual({ type: "zod" });
      expect(consoleInfoSpy).toHaveBeenCalledWith(
        expect.stringContaining("Validation library set to zod"),
        expect.stringContaining("zod")
      );
    });
  });

  describe("Authentication prompting", () => {
    beforeEach(() => {
      process.argv = ["node", "script.js", "test-project"];
      vi.resetAllMocks();
    });

    it("should skip authentication when user chooses not to use it", async () => {
      mockedInquirer.prompt
        .mockResolvedValueOnce({ typescript: false })
        .mockResolvedValueOnce({ prismaProvider: "postgresql" })
        .mockResolvedValueOnce({ useValidation: false })
        .mockResolvedValueOnce({ useAuthentication: false })
        .mockResolvedValueOnce({ strictRouting: false });

      const config = await projectConfigInquirer.run();

      expect(config.authentication).toBeUndefined();
    });

    it("should configure authentication with multiple roles", async () => {
      mockedInquirer.prompt
        .mockResolvedValueOnce({ typescript: false })
        .mockResolvedValueOnce({ prismaProvider: "postgresql" })
        .mockResolvedValueOnce({ useValidation: false })
        .mockResolvedValueOnce({ useAuthentication: true })
        .mockResolvedValueOnce({ authenticationType: "dynamic" })
        .mockResolvedValueOnce({ usernameField: "username" })
        .mockResolvedValueOnce({ multipleRoles: true })
        .mockResolvedValueOnce({ strictRouting: false });

      const config = await projectConfigInquirer.run();

      expect(config.authentication).toEqual({
        type: "dynamic",
        usernameField: "username",
        multipleRoles: true,
      });
    });

    it("should handle custom username field", async () => {
      mockedInquirer.prompt
        .mockResolvedValueOnce({ typescript: false })
        .mockResolvedValueOnce({ prismaProvider: "postgresql" })
        .mockResolvedValueOnce({ useValidation: false })
        .mockResolvedValueOnce({ useAuthentication: true })
        .mockResolvedValueOnce({ authenticationType: "static" })
        .mockResolvedValueOnce({ usernameField: "define later" })
        .mockResolvedValueOnce({ multipleRoles: false });

      const config = await projectConfigInquirer.run();

      expect(config.authentication?.usernameField).toBe("custom");
    });

    it("should skip multiple roles for sqlite with static auth", async () => {
      process.argv = ["node", "script.js", "sheu-project"];

      mockedInquirer.prompt
        .mockResolvedValueOnce({ typescript: false })
        .mockResolvedValueOnce({ prismaProvider: "sqlite" })
        .mockResolvedValueOnce({ useValidation: false })
        .mockResolvedValueOnce({ useAuthentication: true })
        .mockResolvedValueOnce({ authenticationType: "static" })
        .mockResolvedValueOnce({ usernameField: "armando" })
        .mockResolvedValueOnce({ strictRouting: false });

      const config = await projectConfigInquirer.run();

      expect(consoleInfoSpy).toHaveBeenCalledWith(
        expect.stringContaining("Skipping multiple roles option")
      );
      expect(config.authentication?.multipleRoles).toBe(false);
    });

    it("should skip multiple roles for define later auth", async () => {
      mockedInquirer.prompt
        .mockResolvedValueOnce({ typescript: false })
        .mockResolvedValueOnce({ prismaProvider: "postgresql" })
        .mockResolvedValueOnce({ useValidation: false })
        .mockResolvedValueOnce({ useAuthentication: true })
        .mockResolvedValueOnce({ authenticationType: "define later" })
        .mockResolvedValueOnce({ usernameField: "email" })
        .mockResolvedValueOnce({ strictRouting: false });

      const config = await projectConfigInquirer.run();

      expect(config.authentication?.multipleRoles).toBe(false);
      // Should not prompt for multiple roles
      expect(mockedInquirer.prompt).not.toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ name: "multipleRoles" }),
        ])
      );
    });
  });

  describe("Error handling", () => {
    it("should handle inquirer errors gracefully", async () => {
      process.argv = ["node", "script.js"];

      const inquirerError = new Error("Inquirer failed");
      mockedInquirer.prompt.mockRejectedValue(inquirerError);

      await expect(projectConfigInquirer.run()).rejects.toThrow(
        "Inquirer failed"
      );
    });

    it("should handle path resolution errors", async () => {
      process.argv = ["node", "script.js", "test-project"];

      mockedInquirer.prompt
        .mockResolvedValueOnce({ typescript: false })
        .mockResolvedValueOnce({ prismaProvider: "postgresql" })
        .mockResolvedValueOnce({ useValidation: false })
        .mockResolvedValueOnce({ useAuthentication: false })
        .mockResolvedValueOnce({ strictRouting: false });

      const pathError = new Error("Path resolution failed");
      mockedPath.resolve.mockImplementation(() => {
        throw pathError;
      });

      await expect(projectConfigInquirer.run()).rejects.toThrow(
        "Path resolution failed"
      );
    });
  });

  describe("Edge cases", () => {
    it("should handle all database providers", async () => {
      const providers = [
        "postgresql",
        "mongodb",
        "mysql",
        "sqlite",
        "sqlserver",
        "cockroachdb",
      ];

      for (const provider of providers) {
        process.argv = ["node", "script.js", `test-${provider}`];

        mockedInquirer.prompt
          .mockResolvedValueOnce({ typescript: false })
          .mockResolvedValueOnce({ prismaProvider: provider })
          .mockResolvedValueOnce({ useValidation: false })
          .mockResolvedValueOnce({ useAuthentication: false })
          .mockResolvedValueOnce({ strictRouting: false });

        const config = await projectConfigInquirer.run();

        expect(config.prisma.provider).toBe(provider);
        expect(config.prisma.idDatabaseType).toBeDefined();
        expect(config.prisma.defaultDBurl).toBeDefined();

        vi.clearAllMocks();
        mockedInquirer.prompt.mockClear();
      }
    });

    it("should handle complex authentication scenarios", async () => {
      process.argv = ["node", "script.js", "test-project"];

      // Test non-sqlite with non-static auth (should show multiple roles)
      mockedInquirer.prompt
        .mockResolvedValueOnce({ typescript: false })
        .mockResolvedValueOnce({ prismaProvider: "postgresql" })
        .mockResolvedValueOnce({ useValidation: false })
        .mockResolvedValueOnce({ useAuthentication: true })
        .mockResolvedValueOnce({ authenticationType: "dynamic" })
        .mockResolvedValueOnce({ usernameField: "email" })
        .mockResolvedValueOnce({ multipleRoles: true })
        .mockResolvedValueOnce({ strictRouting: false });

      const config = await projectConfigInquirer.run();

      expect(config.authentication?.multipleRoles).toBe(true);
      expect(mockedInquirer.prompt).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ name: "multipleRoles" }),
        ])
      );
    });
  });
});
