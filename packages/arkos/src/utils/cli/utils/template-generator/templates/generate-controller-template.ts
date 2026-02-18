import { TemplateOptions } from "../../template-generators";

export function generateControllerTemplate(options: TemplateOptions): string {
  const { modelName, imports } = options;

  if (!modelName)
    throw new Error("Module name is required for controller template");

  const camelName = modelName.camel.toLowerCase();
  let controllerType: "fileUpload" | "auth" | "email" | "base";
  let controllerName: string;
  let controllerImport: string;

  if (camelName === "fileupload") {
    controllerType = "fileUpload";
    controllerName = "FileUploadController";
    controllerImport = imports?.fileUploadController || "arkos/controllers";
  } else if (camelName === "auth") {
    controllerType = "auth";
    controllerName = "AuthController";
    controllerImport = imports?.authController || "arkos/controllers";
  } else if (camelName === "email") {
    controllerType = "email";
    controllerName = "EmailController";
    controllerImport = imports?.emailController || "arkos/controllers";
  } else {
    controllerType = "base";
    controllerName = "BaseController";
    controllerImport = imports?.baseController || "arkos/controllers";
  }

  const controllerClassImport = `import { ${controllerName} } from "${controllerImport}";`;

  if (["email", "auth"].includes(camelName))
    return `class ${modelName.pascal}Controller {}

const ${modelName.camel}Controller = new ${modelName.pascal}Controller(${controllerType === "base" ? `"${modelName.kebab}"` : ""});

export default ${modelName.camel}Controller;
`;
  else
    return `${controllerClassImport}
  
export class ${modelName.pascal}Controller extends ${controllerName} {}

const ${modelName.camel}Controller = new ${modelName.pascal}Controller(${controllerType === "base" ? `"${modelName.kebab}"` : ""});

export default ${modelName.camel}Controller;
`;
}
