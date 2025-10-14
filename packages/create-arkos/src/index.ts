#!/usr/bin/env node
import fs from "fs";
import path, { dirname } from "path";
import chalk from "chalk";
import { execSync } from "child_process";
import projectConfigInquirer from "./utils/project-config-inquirer";
import templateCompiler from "./utils/template-compiler";
import handlebars from "handlebars";
import { getProcjetPackageJsonDependecies } from "./utils/helpers/package-json.helpers";
import { detectPackageManagerFromUserAgent } from "./utils/helpers/npm.helpers";
import { fileURLToPath } from "url";

handlebars.registerHelper("eq", (a: any, b: any) => a === b);
handlebars.registerHelper("neq", (a: any, b: any) => a !== b);

const __dirname = dirname(fileURLToPath(import.meta.url));

export async function main() {
  const config = await projectConfigInquirer.run();
  const argProjectName = config.argProjectName;

  const projectPath = config.projectPath;

  fs.mkdirSync(projectPath, { recursive: true });

  console.info(
    `\nCreating a new ${chalk.bold(chalk.cyan("Arkos.js"))} project under ${chalk.green(`./${config.projectName}`)}`
  );

  const templatesDir = path.join(__dirname, `../templates/basic`);
  await templateCompiler.compile(templatesDir, config);

  process.chdir(projectPath);

  const packageManager = detectPackageManagerFromUserAgent();
  const { dependencies, devDependencies } =
    getProcjetPackageJsonDependecies(projectPath);

  console.info(chalk.cyan(chalk.bold("\ndependencies:")));
  dependencies.forEach((dependency) => console.info(`- ${dependency}`));

  console.info(chalk.cyan(chalk.bold("\ndevDependencies:")));
  devDependencies.forEach((devDependency) =>
    console.info(`- ${devDependency}`)
  );

  console.info(chalk.bold("\nInstalling dependencies..."));
  console.info(`Using ${packageManager}.\n`);

  execSync(`${packageManager} install`, { stdio: "inherit" });

  process.chdir(projectPath);
  console.info("\nRunning npx arkos prisma generate...");
  execSync(`npx arkos prisma generate`, { stdio: "inherit" });

  console.info(`
  \n${chalk.bold(chalk.cyan("Arkos.js"))} project created successfully!

  ${chalk.bold("Next Steps:")}
  ${
    argProjectName !== "."
      ? `1. cd ${config.projectName}
  2. setup your ${chalk.cyan("DATABASE_URL")} under .env
  3. npx prisma db push
  4. ${packageManager} run dev
`
      : `1. setup your ${chalk.cyan("DATABASE_URL")} under .env
  2. npx prisma db push
  3. ${packageManager} run dev
`
  }
    `);
}

main().catch(console.error);

export { handlebars };
