#!/usr/bin/env node
import fs from "fs";
import path from "path";
import chalk from "chalk";
import { execSync } from "child_process";
import projectConfigInquirer from "./utils/project-config-inquirer";
import templateCompiler from "./utils/template-compiler";
import Handlebars from "handlebars";
import { detectPackageManagerFromUserAgent } from "@arkos/shared";

Handlebars.registerHelper("eq", (a, b) => a === b);
Handlebars.registerHelper("neq", (a, b) => a !== b);

async function main() {
  const config = await projectConfigInquirer.run();

  const projectPath = config.projectPath;

  fs.mkdirSync(projectPath, { recursive: true });

  console.info(
    `\nCreating a new ${chalk.bold(chalk.cyan("Arkos.js"))} project in ${chalk.green(`./${config.projectName}`)}`
  );

  const templatesDir = path.join(__dirname, `../templates/basic`);
  await templateCompiler.compile(templatesDir, config);

  process.chdir(projectPath);

  const packageManager = detectPackageManagerFromUserAgent();

  console.info("\nInstalling dependencies...");
  console.info(`\nUsing ${packageManager}.\n`);

  execSync(`${packageManager} install`, { stdio: "inherit" });

  console.info("\nRunning: npx prisma generate");
  execSync(`npx prisma generate`, { stdio: "inherit" });

  console.info(`
  ${chalk.bold(chalk.cyan("Arkos.js"))} project created successfully!

  Next steps:
  1. cd ${config.projectName}
  2. setup your ${chalk.cyan("DATABASE_URL")} under .env
  3. npx prisma db push
  4. npx prisma generate
  5. npm run dev
    `);
}

main().catch(console.error);
