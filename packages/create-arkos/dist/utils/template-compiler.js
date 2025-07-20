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
const fs_1 = __importDefault(require("fs"));
const handlebars_1 = __importDefault(require("handlebars"));
class TemplateCompiler {
    canCompileAuthenticationTemplates(config) {
        return __awaiter(this, void 0, void 0, function* () {
            return !!config.authentication;
        });
    }
    filesToBeSkipped(config) {
        var _a;
        const files = [];
        if (config.authentication.type !== "define later")
            files.concat(["user.prisma.hbs"]);
        if (((_a = config.authentication) === null || _a === void 0 ? void 0 : _a.type) === "static")
            files.concat(["auth-role.prisma.hbs", "auth-permission.prisma.hbs"]);
        if (!config.typescript)
            files.concat(["tsconfig.json.hbs"]);
        return files;
    }
    compile(templatesDir, config) {
        return __awaiter(this, void 0, void 0, function* () {
            const outputDir = config.projectPath;
            const isTypescript = config.typescript;
            const filesToBeSkipped = this.filesToBeSkipped(config);
            function processTemplates(dir, relativeDir = "") {
                fs_1.default.readdirSync(dir, { withFileTypes: true }).forEach((dirent) => __awaiter(this, void 0, void 0, function* () {
                    if (filesToBeSkipped.includes(dirent.name))
                        return;
                    const fullPath = path_1.default.join(dir, dirent.name);
                    const relativePath = path_1.default.join(relativeDir, dirent.name);
                    if (dirent.isDirectory()) {
                        processTemplates(fullPath, relativePath);
                    }
                    else if (dirent.name.endsWith(".hbs")) {
                        const templatePath = fullPath;
                        const template = handlebars_1.default.compile(fs_1.default.readFileSync(templatePath, "utf8"));
                        let arkosLatestVersion = "1.0.0";
                        const content = template(Object.assign(Object.assign({}, config), { arkosLatestVersion }));
                        const ext = isTypescript ? ".ts" : ".js";
                        let outputPath = path_1.default.join(outputDir, relativePath.replace(".hbs", ""));
                        if (dirent.name.endsWith(".ts.hbs"))
                            outputPath = path_1.default.join(outputDir, relativePath.replace(".ts.hbs", ext));
                        fs_1.default.mkdirSync(path_1.default.dirname(outputPath), { recursive: true });
                        fs_1.default.writeFileSync(outputPath, content);
                    }
                }));
            }
            processTemplates(templatesDir);
        });
    }
}
const templateCompiler = new TemplateCompiler();
exports.default = templateCompiler;
//# sourceMappingURL=template-compiler.js.map