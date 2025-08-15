import { ProjectConfig } from "./project-config-inquirer";
import path from "path";
import fs from "fs";
import handlebars from "handlebars";

class TemplateCompiler {
  async canCompileAuthenticationTemplates(config: ProjectConfig) {
    return !!config.authentication;
  }

  filesToBeSkipped(config: ProjectConfig) {
    const files: string[] = [];
    const authSharedPrismaFiles = ["user.prisma.hbs"];

    const dynamicAuthPrismaFiles = [
      "auth-permission.prisma.hbs",
      "auth-role.prisma.hbs",
      "user-role.prisma.hbs",
    ];

    const sharedAuthZodSchemaFiles = [
      "login.schema.ts.hbs",
      "signup.schema.ts.hbs",
      "update-password.schema.ts.hbs",
      "update-me.schema.ts.hbs",
    ];

    const dynamicAuthZodSchemaFiles = [
      "create-auth-permission.schema.ts.hbs",
      "update-auth-permission.schema.ts.hbs",
      "create-auth-role.schema.ts.hbs",
      "update-auth-role.schema.ts.hbs",
    ];

    const userZodSchemaFiles = [
      "create-user.schema.ts.hbs",
      "update-user.schema.ts.hbs",
    ];

    const userClassValidatorDtoFiles = [
      "create-user.dto.ts.hbs",
      "update-user.dto.ts.hbs",
    ];

    const sharedAuthClassValidatorDtoFiles = [
      "login.dto.ts.hbs",
      "signup.dto.ts.hbs",
      "update-password.dto.ts.hbs",
      "update-me.dto.ts.hbs",
    ];

    const dynamicAuthClassValidatorDtoFiles = [
      "create-auth-permission.dto.ts.hbs",
      "update-auth-permission.dto.ts.hbs",
      "create-auth-role.dto.ts.hbs",
      "update-auth-role.dto.ts.hbs",
    ];

    const authModuleComponents = [
      "auth.middlewares.ts.hbs",
      "auth.query.ts.hbs",
    ];

    const authPermissionModuleComponents = [
      "auth-permission.auth.ts.hbs",
      "auth-permission.query.ts.hbs",
      "auth-permission.service.ts.hbs",
    ];

    const authRoleModuleComponents = [
      "auth-role.auth.ts.hbs",
      "auth-role.query.ts.hbs",
      "auth-role.service.ts.hbs",
    ];

    const userModuleComponents = [
      "user.middlewares.ts.hbs",
      "user.query.ts.hbs",
      "user.service.ts.hbs",
      "user.auth.ts.hbs",
    ];

    // Ignoring auth relation files when auth is set to define later
    if (config.authentication?.type === "define later")
      files.push(
        ...authSharedPrismaFiles,
        ...dynamicAuthPrismaFiles,
        ...sharedAuthZodSchemaFiles,
        ...dynamicAuthZodSchemaFiles,
        ...sharedAuthClassValidatorDtoFiles,
        ...dynamicAuthClassValidatorDtoFiles,
        ...userModuleComponents,
        ...authModuleComponents,
        ...authPermissionModuleComponents,
        ...authRoleModuleComponents
      );

    // Ignoring files that are not required on static authentication
    if (config.authentication?.type === "static")
      files.push(
        ...dynamicAuthPrismaFiles,
        ...dynamicAuthZodSchemaFiles,
        ...dynamicAuthClassValidatorDtoFiles,
        ...authPermissionModuleComponents,
        ...authRoleModuleComponents
      );

    // Ignore zod related files when validation is class-validator
    if (config.validation?.type !== "zod")
      files.push(
        ...sharedAuthZodSchemaFiles,
        ...dynamicAuthZodSchemaFiles,
        ...userZodSchemaFiles
      );

    // Ignore class-validator related files when validation is zod
    if (config.validation?.type !== "class-validator")
      files.push(
        ...sharedAuthClassValidatorDtoFiles,
        ...dynamicAuthClassValidatorDtoFiles,
        ...userClassValidatorDtoFiles
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

          let arkosCurrentVersion = "{{arkosCurrentVersion}}";

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
