import path from "path";
import inquirer from "inquirer";
import chalk from "chalk";

export interface ProjectConfig {
  projectName: string;
  argProjectName?: string;
  typescript: boolean;
  validation?: {
    type?: "zod" | "class-validator";
  };
  authentication?: {
    type?: "static" | "dynamic" | "none";
    usernameField?: string;
    multipleRoles: boolean;
  };
  prisma: {
    provider:
      | "postgresql"
      | "mysql"
      | "sqlite"
      | "sqlserver"
      | "cockroachdb"
      | "mongodb"
      | "none";
    idDatabaseType: string;
    defaultDatabaseUrl: string;
  };
  projectPath: string;
  routing?: {
    strict?: boolean;
  };
}

class ProjectConfigInquirer {
  private config: ProjectConfig;

  constructor() {
    this.config = {} as ProjectConfig;
  }

  async run() {
    await this.promptProjectName();
    await this.promptTypescript();
    await this.promptPrismaProvider();
    await this.promptValidation();
    await this.promptAuthentication();
    await this.promptStrictRouting();

    if (this.config.projectName === ".") {
      this.config.projectName = path.basename(process.cwd());
      this.config.projectPath = path.resolve(process.cwd());
    } else
      this.config.projectPath = path.resolve(
        process.cwd(),
        this.config.projectName
      );

    if (this.config.prisma.defaultDatabaseUrl)
      this.config.prisma.defaultDatabaseUrl =
        this.config.prisma.defaultDatabaseUrl.replaceAll(
          "{{projectName}}",
          this.config.projectName
        );

    return this.config;
  }

  private async promptProjectName() {
    let projectName = process?.argv?.[2];
    this.config.argProjectName = process?.argv?.[2];

    if (!projectName) {
      const result = await inquirer.prompt([
        {
          type: "input",
          name: "projectName",
          message: "What is the name of your project?",
          default: "my-arkos-project",
          validate: this.validateProjectName,
        },
      ]);
      projectName = result.projectName;
    } else {
      const validation = this.validateProjectName(projectName);
      if (validation !== true) {
        console.error(chalk.red(`\nError: ${validation}`));
        process.exit(1);
      }
    }

    this.config.projectName = projectName;
  }

  private validateProjectName(input: string): boolean | string {
    if (input === ".") return true;

    if (!input || input.length === 0) {
      return "Project name cannot be empty";
    }

    if (!/^[a-zA-Z0-9_-]+$/.test(input)) {
      return "Project name can only contain letters, numbers, hyphens, and underscores";
    }

    if (!/^[a-zA-Z0-9]/.test(input)) {
      return "Project name must start with a letter or number";
    }

    if (!/[a-zA-Z0-9]$/.test(input)) {
      return "Project name must end with a letter or number";
    }

    if (input.length > 50) {
      return "Project name must be 50 characters or less";
    }

    const reservedNames = ["node_modules"];
    if (reservedNames.includes(input.toLowerCase())) {
      return "Project name cannot be a reserved name";
    }

    return true;
  }

  private async promptTypescript() {
    const { typescript } = await inquirer.prompt([
      {
        type: "confirm",
        name: "typescript",
        message: `Would you like to use ${chalk.cyan("TypeScript")}?`,
        default: false,
      },
    ]);
    this.config.typescript = typescript;
  }

  private async promptPrismaProvider() {
    const { prismaProvider } = await inquirer.prompt([
      {
        type: "list",
        name: "prismaProvider",
        message: `What db provider will be used for ${chalk.cyan("Prisma")}?`,
        choices: [
          "postgresql",
          "mongodb",
          "mysql",
          "sqlite",
          "sqlserver",
          "cockroachdb",
          "none",
        ],
      },
    ]);

    let idDatabaseType: string;
    let defaultDatabaseUrl: string;

    switch (prismaProvider) {
      case "mongodb":
        idDatabaseType = '@id @default(auto()) @map("_id") @db.ObjectId';
        defaultDatabaseUrl = `mongodb://localhost:27017/{{projectName}}`;
        break;
      case "sqlite":
        idDatabaseType = "@id @default(cuid())";
        defaultDatabaseUrl = "file:../../file.db";
        break;
      case "mysql":
        idDatabaseType = "@id @default(uuid())";
        defaultDatabaseUrl = `mysql://username:password@localhost:3306/{{projectName}}`;
        break;
      case "postgresql":
        idDatabaseType = "@id @default(uuid())";
        defaultDatabaseUrl = `postgresql://username:password@localhost:5432/{{projectName}}`;
        break;
      case "sqlserver":
        idDatabaseType = "@id @default(uuid())";
        defaultDatabaseUrl = `sqlserver://localhost:1433;database={{projectName}};username=sa;password=password;encrypt=DANGER_PLAINTEXT`;
        break;
      case "cockroachdb":
        idDatabaseType = "@id @default(uuid())";
        defaultDatabaseUrl = `postgresql://username:password@localhost:26257/{{projectName}}?sslmode=require`;
        break;
      default:
        idDatabaseType = "@id @default(uuid())";
        defaultDatabaseUrl = `postgresql://username:password@localhost:5432/{{projectName}}`;
    }

    this.config.prisma = {
      provider: prismaProvider,
      idDatabaseType,
      defaultDatabaseUrl,
    };
  }

  private async promptValidation() {
    // For JS projects, class-validator is not supported — skip the choice
    const choices = this.config.typescript
      ? ["zod", "class-validator", "none"]
      : ["zod", "none"];

    const { validationType } = await inquirer.prompt([
      {
        type: "list",
        name: "validationType",
        message: `Which ${chalk.cyan("Validation")} library would you like to use?`,
        choices,
        default: "zod",
      },
    ]);

    if (validationType !== "none") {
      this.config.validation = {
        type: validationType as "zod" | "class-validator",
      };
    }
    // validation stays undefined when "none" is chosen — matches original behaviour
  }

  private async promptAuthentication() {
    if (this.config.prisma.provider === "none") {
      console.info(`Skipping authentication setup as it requires prisma.`);
      return;
    }

    const { authenticationType } = await inquirer.prompt([
      {
        type: "list",
        name: "authenticationType",
        message: `Which ${chalk.cyan("Authentication")} mode would you like to use?`,
        choices: ["static", "dynamic", "none"],
        default: "static",
      },
    ]);

    if (authenticationType === "none") {
      this.config.authentication = { type: "none", multipleRoles: false };
      return;
    }

    const { usernameField } = await inquirer.prompt([
      {
        type: "input",
        name: "usernameField",
        message: "Enter the Prisma field name to use as the login username:",
        default: "email",
        validate: (input: string) => {
          if (!input || input.length === 0) return "Field name cannot be empty";
          if (!/^[a-z][a-zA-Z0-9]*$/.test(input))
            return "Must be a valid Prisma field name (camelCase, starts with lowercase, letters and numbers only)";
          return true;
        },
      },
    ]);

    this.config.authentication = {
      type: authenticationType as "static" | "dynamic",
      usernameField,
      multipleRoles: false,
    };

    if (
      authenticationType !== "static" &&
      this.config.prisma.provider !== "sqlite"
    ) {
      const { multipleRoles } = await inquirer.prompt([
        {
          type: "confirm",
          name: "multipleRoles",
          default: true,
          message: `Would you like to use authentication with ${chalk.cyan("Multiple Roles")}?`,
        },
      ]);

      this.config.authentication = {
        ...this.config.authentication,
        multipleRoles,
      };
    } else if (this.config.prisma.provider === "sqlite") {
      console.info(
        `Skipping multiple roles option because it is not supported with sqlite prisma provider and static authentication mode.`
      );
    }
  }

  private async promptStrictRouting() {
    const { strictRouting } = await inquirer.prompt([
      {
        type: "confirm",
        name: "strictRouting",
        message: `Would you like to use ${chalk.cyan("Strict Routing")}?`,
        default: false,
      },
    ]);
    this.config.routing = {
      strict: strictRouting,
    };
  }
}

const projectConfigInquirer = new ProjectConfigInquirer();

export default projectConfigInquirer;
