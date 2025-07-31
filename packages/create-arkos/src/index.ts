#!/usr/bin/env node
import fs from "fs";
import path from "path";
import chalk from "chalk";
import { execSync } from "child_process";
import projectConfigInquirer from "./utils/project-config-inquirer";
import templateCompiler from "./utils/template-compiler";
import Handlebars from "handlebars";
import { getProcjetPackageJsonDependecies } from "./utils/helpers";
import { detectPackageManagerFromUserAgent } from "./utils/helpers/npm.helpers";

Handlebars.registerHelper("eq", (a, b) => a === b);
Handlebars.registerHelper("neq", (a, b) => a !== b);

async function main() {
  const config = await projectConfigInquirer.run();

  const projectPath = config.projectPath;

  fs.mkdirSync(projectPath, { recursive: true });

  console.info(
    `\nCreating a new ${chalk.bold(chalk.cyan("Arkos.js"))} project under ${chalk.green(`./${config.projectName}`)}`
  );

  console.log(JSON.stringify(config));
  const templatesDir = path.join(__dirname, `../templates/basic`);
  await templateCompiler.compile(templatesDir, config);

  process.chdir(projectPath);

  const packageManager = detectPackageManagerFromUserAgent();
  const { dependencies, devDependencies } =
    getProcjetPackageJsonDependecies(projectPath);

  console.info(chalk.bold("\ndependencies:"));
  dependencies.forEach((dependency) => console.info(`- ${dependency}`));

  console.info(chalk.bold("\ndevDependencies:"));
  devDependencies.forEach((devDependency) =>
    console.info(`- ${devDependency}`)
  );

  console.info(chalk.bold("\nInstalling dependencies..."));
  console.info(`Using ${packageManager}.\n`);

  execSync(`${packageManager} install`, { stdio: "inherit" });

  process.chdir(projectPath);
  console.info("\nRunning npx prisma generate...");
  execSync(`npx prisma generate`, { stdio: "inherit" });

  console.info(`
  ${chalk.bold(chalk.cyan("Arkos.js"))} project created successfully!

  Next steps:
  1. cd ${config.projectName}
  2. setup your ${chalk.cyan("DATABASE_URL")} under .env
  3. npx prisma db push
  4. ${packageManager} run dev
    `);
}

main().catch(console.error);
