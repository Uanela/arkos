import { ProjectConfig } from "./project-config-inquirer";
import path from "path";
import fs from "fs";
import handlebars from "handlebars";
import { getNpmPackageVersion } from "./helpers/npm.helpers";

class TemplateCompiler {
  async canCompileAuthenticationTemplates(config: ProjectConfig) {
    return !!config.authentication;
  }

  filesToBeSkipped(config: ProjectConfig) {
    const files: string[] = [];
    const zodAuthSchemaFiles = [
      "login.schema.ts.hbs",
      "signup.schema.ts.hbs",
      "update-password.schema.ts.hbs",
    ];

    const classValidatorAuthDtoFiles = [
      "login.dto.ts.hbs",
      "signup.dto.ts.hbs",
      "update-password.dto.ts.hbs",
    ];

    const zodUserSchemaFiles = [
      "create-user.schema.ts.hbs",
      "update-user.schema.ts.hbs",
    ];

    const classValidatorUserSchemaFiles = [
      "create-user.dto.ts.hbs",
      "update-user.dto.ts.hbs",
    ];

    const userComponents = [
      "user.middlewares.ts.hbs",
      "user.query.ts.hbs",
      "user.service.ts.hbs",
      "user.prisma.hbs",
    ];

    const authComponents = [
      "auth.middlewares.ts.hbs",
      "auth.query.ts.hbs",
      "auth-role.prisma.hbs",
      "auth-permission.prisma.hbs",
      "user-role.prisma.hbs",
    ];

    // Ignoring auth relation files when auth is set to define later
    if (config.authentication?.type === "define later")
      files.push(
        ...userComponents,
        ...authComponents,
        ...zodAuthSchemaFiles,
        ...classValidatorAuthDtoFiles,
        ...zodUserSchemaFiles,
        ...classValidatorUserSchemaFiles
      );

    // Ignoring prisma models required only on dynamic authentication
    if (
      config.authentication?.type === "static" ||
      config.authentication?.type === "define later"
    )
      files.push(
        ...[
          "auth-role.prisma.hbs",
          "auth-permission.prisma.hbs",
          "user-role.prisma.hbs",
        ]
      );

    // Ignore zod related files when validation is class-validator
    if (config.validation.type !== "zod")
      files.push(...zodUserSchemaFiles, ...zodAuthSchemaFiles);

    // Ignore class-validator related files when validation is zod
    if (config.validation.type !== "class-validator")
      files.push(
        ...classValidatorUserSchemaFiles,
        ...classValidatorAuthDtoFiles
      );

    // Ignoring typescript related files when typescript false
    if (!config.typescript) files.push(...["tsconfig.json.hbs"]);

    // Ignoring javascript related files when typescript true
    if (config?.typescript) files.push(...["jsconfig.json.hbs"]);

    return files;
  }
  /**
   * Compiles the Arkos.js project with handlebars templates
   *
   * @param templatesDir {string} templates location
   * @param config {ProjectConfig} the project configuration
   * @returns void
   * */
  async compile(templatesDir: string, config: ProjectConfig) {
    const outputDir = config.projectPath;
    const isTypescript = config.typescript;
    const filesToBeSkipped = this.filesToBeSkipped(config);

    function processTemplates(dir: string, relativeDir = "") {
      fs.readdirSync(dir, { withFileTypes: true }).forEach(async (dirent) => {
        if (filesToBeSkipped.includes(dirent.name)) return;

        const fullPath = path.join(dir, dirent.name);
        const relativePath = path.join(relativeDir, dirent.name);

        if (dirent.isDirectory()) {
          processTemplates(fullPath, relativePath);
        } else if (dirent.name.endsWith(".hbs")) {
          const templatePath = fullPath;
          const template = handlebars.compile(
            fs.readFileSync(templatePath, "utf8")
          );

          let arkosCurrentVersion = getNpmPackageVersion("arkos");

          const content = template({ ...config, arkosCurrentVersion });
          const ext = isTypescript ? ".ts" : ".js";

          let outputPath = path.join(
            outputDir,
            relativePath.replace(".hbs", "")
          );
          if (dirent.name.endsWith(".ts.hbs"))
            outputPath = path.join(
              outputDir,
              relativePath.replace(".ts.hbs", ext)
            );

          fs.mkdirSync(path.dirname(outputPath), { recursive: true });
          fs.writeFileSync(outputPath, content);
        }
      });
    }

    processTemplates(templatesDir);
  }
}

const templateCompiler = new TemplateCompiler();

export default templateCompiler;
