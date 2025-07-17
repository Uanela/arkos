// import Handlebars from "handlebars";
// import fs from "fs";
// import { ProjectConfig } from "../project-config-inquirer";

// async function processTemplate(templatePath: string, config: ProjectConfig) {
//   const files = await this.getAllFiles(templatePath);

//   for (const file of files) {
//     const content = fs.readFileSync(file, "utf-8");

//     // Compile template
//     const template = Handlebars.compile(content);

//     // Replace with config values
//     const processed = template({
//       PROJECT_NAME: config.projectName,
//       AUTH_ENABLED: config.authentication.enabled,
//       AUTH_TYPE: config.authentication.type,
//       VALIDATION_ENABLED: config.validation.enabled,
//       VALIDATION_TYPE: config.validation.type,
//       PRISMA_DATABASE_PROVIDER: config.prismaProvideer,
//     });

//     fs.writeFileSync(file, processed);
//   }
// }
