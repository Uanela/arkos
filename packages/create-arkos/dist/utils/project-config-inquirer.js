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
const path_1 = __importDefault(require("path"));
const inquirer_1 = __importDefault(require("inquirer"));
const chalk_1 = __importDefault(require("chalk"));
class ProjectConfigInquirer {
    constructor() {
        this.config = {};
    }
    run() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.promptProjectName();
            yield this.promptTypescript();
            yield this.promptPrismaProvider();
            yield this.promptValidation();
            yield this.promptAuthentication();
            const projectPath = path_1.default.resolve(process.cwd(), this.config.projectName);
            this.config.projectPath = projectPath;
            return this.config;
        });
    }
    promptProjectName() {
        return __awaiter(this, void 0, void 0, function* () {
            let projectName = process.argv[2];
            if (!projectName) {
                const result = yield inquirer_1.default.prompt([
                    {
                        type: "input",
                        name: "projectName",
                        message: "What is the name of your project?",
                        default: "my-arkos-project",
                        validate: (input) => input.length > 0 ? true : "Project name cannot be empty",
                    },
                ]);
                projectName = result.projectName;
            }
            this.config.projectName = projectName;
        });
    }
    promptTypescript() {
        return __awaiter(this, void 0, void 0, function* () {
            const { typescript } = yield inquirer_1.default.prompt([
                {
                    type: "confirm",
                    name: "typescript",
                    message: `Would you like to use ${chalk_1.default.cyan("TypeScript")}?`,
                    default: false,
                },
            ]);
            this.config.typescript = typescript;
        });
    }
    promptPrismaProvider() {
        return __awaiter(this, void 0, void 0, function* () {
            const { prismaProvider } = yield inquirer_1.default.prompt([
                {
                    type: "list",
                    name: "prismaProvider",
                    message: `What db provider will be used for ${chalk_1.default.cyan("Prisma")}?`,
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
            let idDatabaseType;
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
        });
    }
    promptValidation() {
        return __awaiter(this, void 0, void 0, function* () {
            const { useValidation } = yield inquirer_1.default.prompt([
                {
                    type: "confirm",
                    name: "useValidation",
                    message: `Would you like to set up ${chalk_1.default.cyan("Validation")}?`,
                    default: true,
                },
            ]);
            if (useValidation) {
                const { validationType } = yield inquirer_1.default.prompt([
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
        });
    }
    promptAuthentication() {
        return __awaiter(this, void 0, void 0, function* () {
            const { useAuthentication } = yield inquirer_1.default.prompt([
                {
                    type: "confirm",
                    name: "useAuthentication",
                    message: `Would you like to set up ${chalk_1.default.cyan("Authentication")}?`,
                    default: true,
                },
            ]);
            if (useAuthentication) {
                const { authenticationType } = yield inquirer_1.default.prompt([
                    {
                        type: "list",
                        name: "authenticationType",
                        message: "Choose authentication type:",
                        choices: ["static", "dynamic", "define later"],
                    },
                ]);
                if (authenticationType !== "define later") {
                    const { multipleRoles } = yield inquirer_1.default.prompt([
                        {
                            type: "confirm",
                            name: "multipleRoles",
                            default: true,
                            message: `Would you like to use authentication with ${chalk_1.default.cyan("Multiple Roles")}?`,
                        },
                    ]);
                    const { usernameField } = yield inquirer_1.default.prompt([
                        {
                            type: "list",
                            name: "usernameField",
                            message: "Choose default username field for login:",
                            choices: ["email", "username", "define later"],
                        },
                    ]);
                    this.config.authentication = {
                        type: authenticationType,
                        usernameField: usernameField === "define later" ? "custom" : usernameField,
                        multipleRoles,
                    };
                }
            }
        });
    }
}
const projectConfigInquirer = new ProjectConfigInquirer();
exports.default = projectConfigInquirer;
//# sourceMappingURL=project-config-inquirer.js.map