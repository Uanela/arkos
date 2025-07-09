#!/usr/bin/env node
import fs from "fs-extra";
import path from "path";
import chalk from "chalk";
import { execSync } from "child_process";
import projectConfigInquirer from "./utils/project-config-inquirer";
import templateCompiler from "./utils/template-compiler";
import Handlebars from "handlebars";

Handlebars.registerHelper("eq", (a, b) => a === b);
Handlebars.registerHelper("neq", (a, b) => a !== b);

async function main() {
  const config = await projectConfigInquirer.run();

  const projectPath = config.projectPath;

  fs.mkdirSync(projectPath, { recursive: true });

  console.info(
    `\nCreating a new ${chalk.bold(chalk.cyan("Arkos.js"))} project in ${chalk.green(`./${config.projectName}`)}`
  );

  const templatesDir = path.resolve(`./src/utils/templates/basic`);
  await templateCompiler.compile(templatesDir, config);

  process.chdir(projectPath);

  console.info("\nInstalling dependencies...");
  console.info("\nUsing npm.\n");

  execSync("npm install", { stdio: "inherit" });

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
