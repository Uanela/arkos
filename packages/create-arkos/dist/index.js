#!/usr/bin/env node
"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const chalk_1 = __importDefault(require("chalk"));
const child_process_1 = require("child_process");
const project_config_inquirer_1 = __importDefault(require("./utils/project-config-inquirer"));
const template_compiler_1 = __importDefault(require("./utils/template-compiler"));
const handlebars_1 = __importDefault(require("handlebars"));
const helpers_1 = require("./utils/helpers");
const npm_helpers_1 = require("./utils/helpers/npm.helpers");
handlebars_1.default.registerHelper("eq", (a, b) => a === b);
handlebars_1.default.registerHelper("neq", (a, b) => a !== b);
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        const config = yield project_config_inquirer_1.default.run();
        const projectPath = config.projectPath;
        fs_1.default.mkdirSync(projectPath, { recursive: true });
        console.info(`\nCreating a new ${chalk_1.default.bold(chalk_1.default.cyan("Arkos.js"))} project under ${chalk_1.default.green(`./${config.projectName}`)}`);
        console.log(JSON.stringify(config));
        const templatesDir = path_1.default.join(__dirname, `../templates/basic`);
        yield template_compiler_1.default.compile(templatesDir, config);
        process.chdir(projectPath);
        const packageManager = (0, npm_helpers_1.detectPackageManagerFromUserAgent)();
        const { dependencies, devDependencies } = (0, helpers_1.getProcjetPackageJsonDependecies)(projectPath);
        console.info(chalk_1.default.bold("\ndependencies:"));
        dependencies.forEach((dependency) => console.info(`- ${dependency}`));
        console.info(chalk_1.default.bold("\ndevDependencies:"));
        devDependencies.forEach((devDependency) => console.info(`- ${devDependency}`));
        console.info("\nInstalling dependencies...");
        console.info(`Using ${packageManager}.\n`);
        (0, child_process_1.execSync)(`${packageManager} install`, { stdio: "inherit" });
        process.chdir(projectPath);
        console.info("\nRunning npx prisma generate...");
        (0, child_process_1.execSync)(`npx prisma generate`, { stdio: "inherit" });
        console.info(`
  ${chalk_1.default.bold(chalk_1.default.cyan("Arkos.js"))} project created successfully!

  Next steps:
  1. cd ${config.projectName}
  2. setup your ${chalk_1.default.cyan("DATABASE_URL")} under .env
  3. npx prisma db push
  4. ${packageManager} run dev
    `);
    });
}
main().catch(console.error);
//# sourceMappingURL=index.js.map