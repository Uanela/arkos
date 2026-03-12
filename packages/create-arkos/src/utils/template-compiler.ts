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

    const userDtoFiles = [
      "create-user.dto.ts.hbs",
      "update-user.dto.ts.hbs",
      "query-user.dto.ts.hbs",
    ];

    const sharedAuthDtoFiles = [
      "login.dto.ts.hbs",
      "signup.dto.ts.hbs",
      "update-password.dto.ts.hbs",
      "update-me.dto.ts.hbs",
    ];

    const dynamicAuthDtoFiles = [
      "create-auth-permission.dto.ts.hbs",
      "update-auth-permission.dto.ts.hbs",
      "query-auth-permission.dto.ts.hbs",
      "create-auth-role.dto.ts.hbs",
      "update-auth-role.dto.ts.hbs",
      "query-auth-role.dto.ts.hbs",
    ];

    const authModuleComponents = ["auth-route-hook.ts.hbs"];

    const authPermissionModuleComponents = [
      "auth-permission.router.ts.hbs",
      "auth-permission.policy.ts.hbs",
      "auth-permission-route-hook.ts.hbs",
      "auth-permission.service.ts.hbs",
    ];

    const authRoleModuleComponents = [
      "auth-role.router.ts.hbs",
      "auth-role.policy.ts.hbs",
      "auth-role-route-hook.ts.hbs",
      "auth-role.service.ts.hbs",
    ];

    const userModuleComponents = [
      "user-route-hook.ts.hbs",
      "user.service.ts.hbs",
      "user.router.ts.hbs",
      "user.policy.ts.hbs",
    ];

    if (
      !config.authentication?.type ||
      config.authentication?.type === "define later"
    )
      files.push(
        ...authSharedPrismaFiles,
        ...dynamicAuthPrismaFiles,
        ...sharedAuthDtoFiles,
        ...dynamicAuthDtoFiles,
        ...userModuleComponents,
        ...authModuleComponents,
        ...authPermissionModuleComponents,
        ...authRoleModuleComponents,
        ...userDtoFiles,
        "file-upload.policy.ts.hbs"
      );

    if (config.authentication?.type === "static")
      files.push(
        ...dynamicAuthPrismaFiles,
        ...dynamicAuthDtoFiles,
        ...authPermissionModuleComponents,
        ...authRoleModuleComponents
      );

    if (!config.validation?.type)
      files.push(
        ...sharedAuthDtoFiles,
        ...dynamicAuthDtoFiles,
        ...userDtoFiles
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
        if (
          filesToBeSkipped.includes(dirent.name) ||
          dirent.name === "__tests__" ||
          dirent.name?.includes(".test.ts")
        )
          return;

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
