#!/usr/bin/env node
import fs from "fs-extra";
import path from "path";
import inquirer from "inquirer";
import { execSync } from "child_process";

interface ProjectConfig {
  projectName: string;
  typescript: boolean;
  validation: {
    enabled: boolean;
    type?: "zod" | "class-validator";
  };
  authentication: {
    enabled: boolean;
    type?: "static-rbac" | "dynamic-rbac";
    usernameField?: "username" | "email" | "custom";
  };
}

class ArkosApiGenerator {
  private config: ProjectConfig;

  constructor() {
    this.config = {} as ProjectConfig;
  }

  async run() {
    await this.promptProjectName();
    await this.promptTypescript();
    await this.promptValidation();
    await this.promptAuthentication();
    this.generateProject();
  }

  private async promptProjectName() {
    const { projectName } = await inquirer.prompt([
      {
        type: "input",
        name: "projectName",
        message: "What is the name of your Arkos API project?",
        default: "my-arkos-project",
        validate: (input) =>
          input.length > 0 ? true : "Project name cannot be empty",
      },
    ]);
    this.config.projectName = projectName;
  }

  private async promptTypescript() {
    const { typescript } = await inquirer.prompt([
      {
        type: "confirm",
        name: "typescript",
        message: "Would you like to use TypeScript?",
        default: true,
      },
    ]);
    this.config.typescript = typescript;
  }

  private async promptValidation() {
    const { useValidation } = await inquirer.prompt([
      {
        type: "confirm",
        name: "useValidation",
        message: "Would you like to set up validation?",
        default: false,
      },
    ]);

    this.config.validation = { enabled: useValidation };

    if (useValidation) {
      const { validationType } = await inquirer.prompt([
        {
          type: "list",
          name: "validationType",
          message: "Choose validation library:",
          choices: ["zod", "class-validator"],
        },
      ]);
      this.config.validation.type = validationType;
    }
  }

  private async promptAuthentication() {
    const { useAuthentication } = await inquirer.prompt([
      {
        type: "confirm",
        name: "useAuthentication",
        message: "Would you like to set up authentication now?",
        default: false,
      },
    ]);

    this.config.authentication = { enabled: useAuthentication };

    if (useAuthentication) {
      const { authenticationType } = await inquirer.prompt([
        {
          type: "list",
          name: "authenticationType",
          message: "Choose authentication type:",
          choices: ["static-rbac", "dynamic-rbac"],
        },
      ]);

      const { usernameField } = await inquirer.prompt([
        {
          type: "list",
          name: "usernameField",
          message: "Choose default username field for login:",
          choices: ["username", "email", "define later"],
        },
      ]);

      this.config.authentication = {
        enabled: true,
        type: authenticationType,
        usernameField:
          usernameField === "define later" ? "custom" : usernameField,
      };
    }
  }

  private generateProject() {
    const projectPath = path.resolve(process.cwd(), this.config.projectName);
    fs.mkdirSync(projectPath, { recursive: true });
    process.chdir(projectPath);

    // Generate package.json
    this.generatePackageJson();

    // Generate source files
    this.generateSourceFiles();

    // Generate Prisma files
    this.generatePrismaFiles();

    // Install dependencies
    this.installDependencies();

    console.info(`
 🚀 Arkos.js project created successfully!

Next steps:
1. cd ${this.config.projectName}
2. npx prisma generate
3. npm run dev
    `);
  }

  private generatePackageJson() {
    const dependencies = [
      "arkos",
      "@prisma/client",
      ...(this.config.typescript ? ["typescript", "@types/node"] : []),
      ...(this.config.validation.enabled &&
      this.config.validation.type === "zod"
        ? ["zod"]
        : []),
      ...(this.config.validation.enabled &&
      this.config.validation.type === "class-validator"
        ? ["class-validator", "class-transformer"]
        : []),
    ];

    const devDependencies = [
      ...(this.config.typescript ? ["ts-node", "nodemon", "typescript"] : []),
      "prisma",
    ];

    const packageJson = {
      name: this.config.projectName,
      version: "1.0.0",
      scripts: {
        dev: this.config.typescript
          ? "ts-node-dev src/app.ts"
          : "node src/app.js",
        build: this.config.typescript ? "tsc" : "",
        start: this.config.typescript ? "node dist/app.js" : "node src/app.js",
        "prisma:generate": "prisma generate",
      },
      dependencies: Object.fromEntries(
        dependencies.map((dep) => [dep, "latest"])
      ),
      devDependencies: Object.fromEntries(
        devDependencies.map((dep) => [dep, "latest"])
      ),
    };

    fs.writeFileSync("package.json", JSON.stringify(packageJson, null, 2));
  }

  private generateSourceFiles() {
    const srcDir = path.join(process.cwd(), "src");
    const utilsDir = path.join(srcDir, "utils");
    fs.mkdirSync(srcDir, { recursive: true });
    fs.mkdirSync(utilsDir, { recursive: true });

    // Generate app.ts/app.js
    const appContent = `import arkos from 'arkos';

arkos.init({
  ${
    this.config.authentication.enabled
      ? `authentication: {
    mode: '${this.config.authentication.type}',
    usernameField: '${this.config.authentication.usernameField}'
  },`
      : ""
  }
  ${
    this.config.validation.enabled
      ? `validation: {
    resolver: '${this.config.validation.type}'
  },`
      : ""
  }
});
`;
    const appExt = this.config.typescript ? "ts" : "js";
    fs.writeFileSync(path.join(srcDir, `app.${appExt}`), appContent);

    // Generate prisma.ts/prisma.js
    const prismaContent = `import { PrismaClient } from '@prisma/client'

export const prisma = new PrismaClient()
`;
    fs.writeFileSync(path.join(utilsDir, `prisma.${appExt}`), prismaContent);

    // Generate tsconfig.json if TypeScript
    if (this.config.typescript) {
      const tsconfigContent = {
        compilerOptions: {
          target: "es2020",
          module: "commonjs",
          strict: true,
          esModuleInterop: true,
          outDir: "./dist",
        },
        include: ["src/**/*"],
        exclude: ["node_modules"],
      };
      fs.writeFileSync(
        "tsconfig.json",
        JSON.stringify(tsconfigContent, null, 2)
      );
    }
  }

  private generatePrismaFiles() {
    const prismaDir = path.join(process.cwd(), "prisma/schema");
    fs.mkdirSync(prismaDir, { recursive: true });

    const schemaContent = `datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
  previewFeatures = ["prismaSchemaFolder"]
}

model User {
  id        String   @id @default(uuid())
  username  String   @unique
  email     String   @unique
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}`;

    fs.writeFileSync(path.join(prismaDir, "schema.prisma"), schemaContent);
  }

  private installDependencies() {
    console.info("Installing dependencies...");
    execSync("npm install", { stdio: "inherit" });
  }
}

async function main() {
  const generator = new ArkosApiGenerator();
  await generator.run();
}

main().catch(console.error);
