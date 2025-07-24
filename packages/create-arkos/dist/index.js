#!/usr/bin/env node
"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __defProps = Object.defineProperties;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropDescs = Object.getOwnPropertyDescriptors;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getOwnPropSymbols = Object.getOwnPropertySymbols;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __propIsEnum = Object.prototype.propertyIsEnumerable;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __spreadValues = (a, b) => {
  for (var prop in b || (b = {}))
    if (__hasOwnProp.call(b, prop))
      __defNormalProp(a, prop, b[prop]);
  if (__getOwnPropSymbols)
    for (var prop of __getOwnPropSymbols(b)) {
      if (__propIsEnum.call(b, prop))
        __defNormalProp(a, prop, b[prop]);
    }
  return a;
};
var __spreadProps = (a, b) => __defProps(a, __getOwnPropDescs(b));
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __async = (__this, __arguments, generator) => {
  return new Promise((resolve, reject) => {
    var fulfilled = (value) => {
      try {
        step(generator.next(value));
      } catch (e) {
        reject(e);
      }
    };
    var rejected = (value) => {
      try {
        step(generator.throw(value));
      } catch (e) {
        reject(e);
      }
    };
    var step = (x) => x.done ? resolve(x.value) : Promise.resolve(x.value).then(fulfilled, rejected);
    step((generator = generator.apply(__this, __arguments)).next());
  });
};

// src/index.ts
var import_fs2 = __toESM(require("fs"));
var import_path3 = __toESM(require("path"));
var import_chalk2 = __toESM(require("chalk"));
var import_child_process = require("child_process");

// src/utils/project-config-inquirer.ts
var import_path = __toESM(require("path"));
var import_inquirer = __toESM(require("inquirer"));
var import_chalk = __toESM(require("chalk"));
var ProjectConfigInquirer = class {
  constructor() {
    this.config = {};
  }
  run() {
    return __async(this, null, function* () {
      yield this.promptProjectName();
      yield this.promptTypescript();
      yield this.promptPrismaProvider();
      yield this.promptValidation();
      yield this.promptAuthentication();
      const projectPath = import_path.default.resolve(process.cwd(), this.config.projectName);
      this.config.projectPath = projectPath;
      return this.config;
    });
  }
  promptProjectName() {
    return __async(this, null, function* () {
      let projectName = process.argv[2];
      if (!projectName) {
        const result = yield import_inquirer.default.prompt([
          {
            type: "input",
            name: "projectName",
            message: "What is the name of your project?",
            default: "my-arkos-project",
            validate: (input) => input.length > 0 ? true : "Project name cannot be empty"
          }
        ]);
        projectName = result.projectName;
      }
      this.config.projectName = projectName;
    });
  }
  promptTypescript() {
    return __async(this, null, function* () {
      const { typescript } = yield import_inquirer.default.prompt([
        {
          type: "confirm",
          name: "typescript",
          message: `Would you like to use ${import_chalk.default.cyan("TypeScript")}?`,
          default: false
        }
      ]);
      this.config.typescript = typescript;
    });
  }
  promptPrismaProvider() {
    return __async(this, null, function* () {
      const { prismaProvider } = yield import_inquirer.default.prompt([
        {
          type: "list",
          name: "prismaProvider",
          message: `What db provider will be used for ${import_chalk.default.cyan("Prisma")}?`,
          choices: [
            "postgresql",
            "mongodb",
            "mysql",
            "sqlite",
            "sqlserver",
            "cockroachdb"
          ]
        }
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
        idDatabaseType
      };
    });
  }
  promptValidation() {
    return __async(this, null, function* () {
      const { useValidation } = yield import_inquirer.default.prompt([
        {
          type: "confirm",
          name: "useValidation",
          message: `Would you like to set up ${import_chalk.default.cyan("Validation")}?`,
          default: true
        }
      ]);
      if (useValidation) {
        const { validationType } = yield import_inquirer.default.prompt([
          {
            type: "list",
            name: "validationType",
            message: "Choose validation library:",
            choices: ["zod", "class-validator"]
          }
        ]);
        this.config.validation = {
          type: validationType
        };
      }
    });
  }
  promptAuthentication() {
    return __async(this, null, function* () {
      const { useAuthentication } = yield import_inquirer.default.prompt([
        {
          type: "confirm",
          name: "useAuthentication",
          message: `Would you like to set up ${import_chalk.default.cyan("Authentication")}?`,
          default: true
        }
      ]);
      if (useAuthentication) {
        const { authenticationType } = yield import_inquirer.default.prompt([
          {
            type: "list",
            name: "authenticationType",
            message: "Choose authentication type:",
            choices: ["static", "dynamic", "define later"]
          }
        ]);
        if (authenticationType !== "define later") {
          const { multipleRoles } = yield import_inquirer.default.prompt([
            {
              type: "confirm",
              name: "multipleRoles",
              default: true,
              message: `Would you like to use authentication with ${import_chalk.default.cyan("Multiple Roles")}?`
            }
          ]);
          const { usernameField } = yield import_inquirer.default.prompt([
            {
              type: "list",
              name: "usernameField",
              message: "Choose default username field for login:",
              choices: ["email", "username", "define later"]
            }
          ]);
          this.config.authentication = {
            type: authenticationType,
            usernameField: usernameField === "define later" ? "custom" : usernameField,
            multipleRoles
          };
        }
      }
    });
  }
};
var projectConfigInquirer = new ProjectConfigInquirer();
var project_config_inquirer_default = projectConfigInquirer;

// src/utils/template-compiler.ts
var import_path2 = __toESM(require("path"));
var import_fs = __toESM(require("fs"));
var import_handlebars = __toESM(require("handlebars"));
var TemplateCompiler = class {
  canCompileAuthenticationTemplates(config) {
    return __async(this, null, function* () {
      return !!config.authentication;
    });
  }
  filesToBeSkipped(config) {
    var _a;
    const files = [];
    if (config.authentication.type !== "define later")
      files.concat(["user.prisma.hbs"]);
    if (((_a = config.authentication) == null ? void 0 : _a.type) === "static")
      files.concat(["auth-role.prisma.hbs", "auth-permission.prisma.hbs"]);
    if (!config.typescript) files.concat(["tsconfig.json.hbs"]);
    return files;
  }
  /**
   * Compiles the Arkos.js project with handlebars templates
   *
   * @param templatesDir {string} templates location
   * @param config {ProjectConfig} the project configuration
   * @returns void
   * */
  compile(templatesDir, config) {
    return __async(this, null, function* () {
      const outputDir = config.projectPath;
      const isTypescript = config.typescript;
      const filesToBeSkipped = this.filesToBeSkipped(config);
      function processTemplates(dir, relativeDir = "") {
        import_fs.default.readdirSync(dir, { withFileTypes: true }).forEach((dirent) => __async(null, null, function* () {
          if (filesToBeSkipped.includes(dirent.name)) return;
          const fullPath = import_path2.default.join(dir, dirent.name);
          const relativePath = import_path2.default.join(relativeDir, dirent.name);
          if (dirent.isDirectory()) {
            processTemplates(fullPath, relativePath);
          } else if (dirent.name.endsWith(".hbs")) {
            const templatePath = fullPath;
            const template = import_handlebars.default.compile(
              import_fs.default.readFileSync(templatePath, "utf8")
            );
            let arkosLatestVersion = "1.0.0";
            const content = template(__spreadProps(__spreadValues({}, config), { arkosLatestVersion }));
            const ext = isTypescript ? ".ts" : ".js";
            let outputPath = import_path2.default.join(
              outputDir,
              relativePath.replace(".hbs", "")
            );
            if (dirent.name.endsWith(".ts.hbs"))
              outputPath = import_path2.default.join(
                outputDir,
                relativePath.replace(".ts.hbs", ext)
              );
            import_fs.default.mkdirSync(import_path2.default.dirname(outputPath), { recursive: true });
            import_fs.default.writeFileSync(outputPath, content);
          }
        }));
      }
      processTemplates(templatesDir);
    });
  }
};
var templateCompiler = new TemplateCompiler();
var template_compiler_default = templateCompiler;

// src/index.ts
var import_handlebars2 = __toESM(require("handlebars"));

// ../shared/src/utils/helpers/user-agent.helpers.ts
function detectPackageManagerFromUserAgent() {
  const userAgent = process.env.npm_config_user_agent || "";
  if (!userAgent) return "npm";
  if (userAgent.includes("pnpm")) return "pnpm";
  if (userAgent.includes("yarn")) return "yarn";
  if (userAgent.includes("npm")) return "npm";
  if (userAgent.includes("bun")) return "bun";
  if (userAgent.includes("cnpm")) return "cnpm";
  if (userAgent.includes("corepack")) return "corepack";
  if (userAgent.includes("deno")) return "deno";
  return "npm";
}

// src/index.ts
import_handlebars2.default.registerHelper("eq", (a, b) => a === b);
import_handlebars2.default.registerHelper("neq", (a, b) => a !== b);
function main() {
  return __async(this, null, function* () {
    const config = yield project_config_inquirer_default.run();
    const projectPath = config.projectPath;
    import_fs2.default.mkdirSync(projectPath, { recursive: true });
    console.info(
      `
Creating a new ${import_chalk2.default.bold(import_chalk2.default.cyan("Arkos.js"))} project in ${import_chalk2.default.green(`./${config.projectName}`)}`
    );
    const templatesDir = import_path3.default.join(__dirname, `../templates/basic`);
    yield template_compiler_default.compile(templatesDir, config);
    process.chdir(projectPath);
    const packageManager = detectPackageManagerFromUserAgent();
    console.info("\nInstalling dependencies...");
    console.info(`
Using ${packageManager}.
`);
    (0, import_child_process.execSync)(`${packageManager} install`, { stdio: "inherit" });
    console.info(`
  ${import_chalk2.default.bold(import_chalk2.default.cyan("Arkos.js"))} project created successfully!

  Next steps:
  1. cd ${config.projectName}
  2. setup your ${import_chalk2.default.cyan("DATABASE_URL")} under .env
  3. npx prisma db push
  4. npx prisma generate
  5. npm run dev
    `);
  });
}
main().catch(console.error);
