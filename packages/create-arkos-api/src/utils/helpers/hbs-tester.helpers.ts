import fs from "fs-extra";
import path from "path";
import handlebars from "handlebars";
import { ProjectConfig } from "../project-config-inquirer";
handlebars.registerHelper("eq", (a, b) => a === b);
handlebars.registerHelper("neq", (a, b) => a !== b);

(() => {
  const templatesDir = `${process.cwd()}/cache/handlebars/templates`;
  const outputDir = `${process.cwd()}/cache/handlebars/output`;
  const config: ProjectConfig = {
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

        const content = template(config);
        const ext = config.typescript ? ".ts" : ".js";

        let outputPath = path.join(outputDir, relativePath.replace(".hbs", ""));
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
})();
