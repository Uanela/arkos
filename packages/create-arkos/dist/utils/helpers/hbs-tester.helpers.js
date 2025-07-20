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
const handlebars_1 = __importDefault(require("handlebars"));
handlebars_1.default.registerHelper("eq", (a, b) => a === b);
handlebars_1.default.registerHelper("neq", (a, b) => a !== b);
(() => {
    const templatesDir = `${process.cwd()}/cache/handlebars/templates`;
    const outputDir = `${process.cwd()}/cache/handlebars/output`;
    const config = {
        projectName: "arkos-project",
        typescript: true,
        validation: {
            type: "zod",
        },
        authentication: {
            type: "dynamic",
            usernameField: "email",
            multipleRoles: true,
        },
        prisma: {
            provider: "mongodb",
            idDatabaseType: "@db @default(uuid())",
        },
        projectPath: outputDir,
    };
    function processTemplates(dir, relativeDir = "") {
        fs_1.default.readdirSync(dir, { withFileTypes: true }).forEach((dirent) => __awaiter(this, void 0, void 0, function* () {
            const fullPath = path_1.default.join(dir, dirent.name);
            const relativePath = path_1.default.join(relativeDir, dirent.name);
            if (dirent.isDirectory()) {
                processTemplates(fullPath, relativePath);
            }
            else if (dirent.name.endsWith(".hbs")) {
                const templatePath = fullPath;
                const template = handlebars_1.default.compile(fs_1.default.readFileSync(templatePath, "utf8"));
                const content = template(config);
                const ext = config.typescript ? ".ts" : ".js";
                let outputPath = path_1.default.join(outputDir, relativePath.replace(".hbs", ""));
                if (dirent.name.endsWith(".ts.hbs"))
                    outputPath = path_1.default.join(outputDir, relativePath.replace(".ts.hbs", ext));
                fs_1.default.mkdirSync(path_1.default.dirname(outputPath), { recursive: true });
                fs_1.default.writeFileSync(outputPath, content);
            }
        }));
    }
    processTemplates(templatesDir);
})();
//# sourceMappingURL=hbs-tester.helpers.js.map