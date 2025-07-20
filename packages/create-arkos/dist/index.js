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
handlebars_1.default.registerHelper("eq", (a, b) => a === b);
handlebars_1.default.registerHelper("neq", (a, b) => a !== b);
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        const config = yield project_config_inquirer_1.default.run();
        const projectPath = config.projectPath;
        fs_1.default.mkdirSync(projectPath, { recursive: true });
        console.info(`\nCreating a new ${chalk_1.default.bold(chalk_1.default.cyan("Arkos.js"))} project in ${chalk_1.default.green(`./${config.projectName}`)}`);
        const templatesDir = path_1.default.join(__dirname, `../templates/basic`);
        yield template_compiler_1.default.compile(templatesDir, config);
        process.chdir(projectPath);
        console.info("\nInstalling dependencies...");
        console.info("\nUsing npm.\n");
        (0, child_process_1.execSync)("npm install", { stdio: "inherit" });
        console.info(`
  ${chalk_1.default.bold(chalk_1.default.cyan("Arkos.js"))} project created successfully!

  Next steps:
  1. cd ${config.projectName}
  2. setup your ${chalk_1.default.cyan("DATABASE_URL")} under .env
  3. npx prisma db push
  4. npx prisma generate
  5. npm run dev
    `);
    });
}
main().catch(console.error);
//# sourceMappingURL=index.js.map