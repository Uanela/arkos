import path from "path";
import inquirer from "inquirer";
import chalk from "chalk";

export interface ProjectConfig {
  projectName: string;
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

    const projectPath = path.resolve(process.cwd(), this.config.projectName);
    this.config.projectPath = projectPath;

    return this.config;
  }

  private async promptProjectName() {
    let projectName = process.argv[2];

    if (!projectName) {
      const result = await inquirer.prompt([
        {
          type: "input",
          name: "projectName",
          message: "What is the name of your project?",
          default: "my-arkos-project",
          validate: (input) =>
            input.length > 0 ? true : "Project name cannot be empty",
        },
      ]);
      projectName = result.projectName;
    }
    this.config.projectName = projectName;
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

    switch (prismaProvider) {
      case "mongodb":
        idDatabaseType = '@id @default(auto()) @map("_id") @db.ObjectId';
        break;
      case "sqlite":
        idDatabaseType = "@id @default(cuid())";
        break;
      default:
        idDatabaseType = "@id @default(uuid())";
    }

    this.config.prisma = {
      provider: prismaProvider,
      idDatabaseType: idDatabaseType,
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
      const { validationType } = await inquirer.prompt([
        {
          type: "list",
          name: "validationType",
          message: "Choose validation library:",
          choices: ["zod", "class-validator"],
        },
      ]);
      this.config.validation = {
        type: validationType,
      };
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

      if (authenticationType !== "define later") {
        const { multipleRoles } = await inquirer.prompt([
          {
            type: "confirm",
            name: "multipleRoles",
            default: true,
            message: `Would you like to use authentication with ${chalk.cyan("Multiple Roles")}?`,
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
          multipleRoles,
        };
      }
    }
  }
}

const projectConfigInquirer = new ProjectConfigInquirer();

export default projectConfigInquirer;
