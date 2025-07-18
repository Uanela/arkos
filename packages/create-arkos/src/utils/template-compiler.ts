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

    if (config.authentication.type !== "define later")
      files.concat(["user.prisma.hbs"]);

    if (config.authentication?.type === "static")
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

          let arkosLatestVersion = "1.0.0";

          const content = template({ ...config, arkosLatestVersion });
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
