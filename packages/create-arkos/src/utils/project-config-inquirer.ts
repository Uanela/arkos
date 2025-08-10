import path from "path";
import inquirer from "inquirer";
import chalk from "chalk";

export interface ProjectConfig {
  projectName: string;
  argProjectName?: string;
  typescript: boolean;
  validation: {
    type?: "zod" | "class-validator";
  };
  authentication: {
    type?: "static" | "dynamic" | "define later";
    usernameField?: "username" | "email" | "custom";
    multipleRoles: boolean;
  };
  prisma: {
    provider:
      | "postgresql"
      | "mysql"
      | "sqlite"
      | "sqlserver"
      | "cockroachdb"
      | "mongodb";
    idDatabaseType: string;
    defaultDBurl: string;
  };
  projectPath: string;
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

    // If user passed ".", use current directory name
    if (this.config.projectName === ".") {
      this.config.projectName = path.basename(process.cwd());
      this.config.projectPath = path.resolve(process.cwd());
    } else
      this.config.projectPath = path.resolve(
        process.cwd(),
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
      // Validate the project name from command line args
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

    // Check for valid characters (letters, numbers, hyphens, underscores)
    if (!/^[a-zA-Z0-9_-]+$/.test(input)) {
      return "Project name can only contain letters, numbers, hyphens, and underscores";
    }

    // Check if it starts with a letter or number (not hyphen or underscore)
    if (!/^[a-zA-Z0-9]/.test(input)) {
      return "Project name must start with a letter or number";
    }

    // Check if it ends with a letter or number (not hyphen or underscore)
    if (!/[a-zA-Z0-9]$/.test(input)) {
      return "Project name must end with a letter or number";
    }

    // Check length (reasonable limits)
    if (input.length > 50) {
      return "Project name must be 50 characters or less";
    }

    // Check for reserved names
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
        ],
      },
    ]);

    // Set the correct idDatabaseType based on provider
    let idDatabaseType: string;
    let defaultDBurl: string;

    switch (prismaProvider) {
      case "mongodb":
        idDatabaseType = '@id @default(auto()) @map("_id") @db.ObjectId';
        defaultDBurl = `mongodb://localhost:27017/${this.config.projectName}`;
        break;
      case "sqlite":
        idDatabaseType = "@id @default(cuid())";
        defaultDBurl = "file:../../file.db";
        break;
      case "mysql":
        idDatabaseType = "@id @default(uuid())";
        defaultDBurl = `mysql://username:password@localhost:3306/${this.config.projectName}`;
        break;
      case "postgresql":
        idDatabaseType = "@id @default(uuid())";
        defaultDBurl = `postgresql://username:password@localhost:5432/${this.config.projectName}`;
        break;
      case "sqlserver":
        idDatabaseType = "@id @default(uuid())";
        defaultDBurl = `sqlserver://localhost:1433;database=${this.config.projectName};username=sa;password=password;encrypt=DANGER_PLAINTEXT`;
        break;
      case "cockroachdb":
        idDatabaseType = "@id @default(uuid())";
        defaultDBurl = `postgresql://username:password@localhost:26257/${this.config.projectName}?sslmode=require`;
        break;
      default:
        idDatabaseType = "@id @default(uuid())";
        defaultDBurl = `postgresql://username:password@localhost:5432/${this.config.projectName}`;
    }

    this.config.prisma = {
      provider: prismaProvider,
      idDatabaseType: idDatabaseType,
      defaultDBurl: defaultDBurl,
    };
  }

  private async promptValidation() {
    const { useValidation } = await inquirer.prompt([
      {
        type: "confirm",
        name: "useValidation",
        message: `Would you like to set up ${chalk.cyan("Validation")}?`,
        default: true,
      },
    ]);

    if (useValidation) {
      let validationTypeResponse: {
        validationType: "zod" | "class-validator";
      } = { validationType: "zod" };

      if (this.config.typescript)
        validationTypeResponse = await inquirer.prompt([
          {
            type: "list",
            name: "validationType",
            message: "Choose validation library:",
            choices: ["zod", "class-validator"],
          },
        ]);
      else {
        console.info(
          chalk.bold(
            `${chalk.greenBright("?")} Validation library set to zod (class-validator is not supported on JavaScript):`
          ),
          chalk.cyan("zod")
        );
      }
      this.config.validation = {
        type: validationTypeResponse.validationType,
      };
    } else if (!this.config.typescript) {
    }
  }

  private async promptAuthentication() {
    const { useAuthentication } = await inquirer.prompt([
      {
        type: "confirm",
        name: "useAuthentication",
        message: `Would you like to set up ${chalk.cyan("Authentication")}?`,
        default: true,
      },
    ]);

    if (useAuthentication) {
      const { authenticationType } = await inquirer.prompt([
        {
          type: "list",
          name: "authenticationType",
          message: "Choose authentication type:",
          choices: ["static", "dynamic", "define later"],
        },
      ]);

      const { usernameField } = await inquirer.prompt([
        {
          type: "list",
          name: "usernameField",
          message: "Choose default username field for login:",
          choices: ["email", "username", "define later"],
        },
      ]);

      this.config.authentication = {
        type: authenticationType,
        usernameField:
          usernameField === "define later" ? "custom" : usernameField,
        multipleRoles: false,
      };

      if (
        authenticationType !== "define later" ||
        (this.config.prisma.provider !== "sqlite" &&
          authenticationType !== "static")
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
          `\nSkipping multiple roles option because it is not supported with sqlite prisma provider and static authentication mode.`
        );
      }
    }
  }
}

const projectConfigInquirer = new ProjectConfigInquirer();

export default projectConfigInquirer;
