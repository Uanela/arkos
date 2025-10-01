import { getUserFileExtension } from "../../../../helpers/fs.helpers";
import { TemplateOptions } from "../../template-generators";

export function generateServiceTemplate(options: TemplateOptions): string {
  const { modelName, imports } = options;
  const ext = getUserFileExtension();
  const isTypeScript = ext === "ts";

  if (!modelName)
    throw new Error("Module name is required for service template");

  const camelName = modelName.camel.toLowerCase();
  let serviceType: "fileUpload" | "auth" | "email" | "base";
  let serviceName: string;
  let serviceImport: string;

  if (camelName === "fileupload") {
    serviceType = "fileUpload";
    serviceName = "FileUploadService";
    serviceImport = imports?.fileUploadService || "arkos/services";
  } else if (camelName === "auth") {
    serviceType = "auth";
    serviceName = "AuthService";
    serviceImport = imports?.authService || "arkos/services";
  } else if (camelName === "email") {
    serviceType = "email";
    serviceName = "EmailService";
    serviceImport = imports?.emailService || "arkos/services";
  } else {
    serviceType = "base";
    serviceName = "BaseService";
    serviceImport = imports?.baseService || "arkos/services";
  }

  const prismaImport =
    isTypeScript && serviceType === "base"
      ? `import { Prisma } from "@prisma/client";\n`
      : "";

  const serviceClassImport = `import { ${serviceName} } from "${serviceImport}";`;

  const typeParameter =
    isTypeScript && serviceType === "base"
      ? `<Prisma.${modelName.pascal}Delegate>`
      : "";

  return `${prismaImport}${serviceClassImport}
  
class ${modelName.pascal}Service extends ${serviceName}${typeParameter} {}

const ${modelName.camel}Service = new ${modelName.pascal}Service(${serviceType === "base" ? `"${modelName.kebab}"` : ""});

export default ${modelName.camel}Service;
`;
}
