import { ProjectConfig } from "./project-config-inquirer";
import path from "path";
import fs from "fs-extra";
import handlebars from "handlebars";
import { getLatestVersion } from "./helpers";

class TemplateCompiler {
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

    function processTemplates(dir: string, relativeDir = "") {
      fs.readdirSync(dir, { withFileTypes: true }).forEach(async (dirent) => {
        const fullPath = path.join(dir, dirent.name);
        const relativePath = path.join(relativeDir, dirent.name);

        if (dirent.isDirectory()) {
          processTemplates(fullPath, relativePath);
        } else if (dirent.name.endsWith(".hbs")) {
          const templatePath = fullPath;
          const template = handlebars.compile(
            fs.readFileSync(templatePath, "utf8")
          );

          let arkosLatestVersion = "1.0.0.";
          if (dirent.name.endsWith("package.json.hbs"))
            arkosLatestVersion = await getLatestVersion("arkos");

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
