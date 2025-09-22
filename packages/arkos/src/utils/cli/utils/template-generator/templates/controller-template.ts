import { TemplateOptions } from "../../template-generators";

export function generateControllerTemplate(options: TemplateOptions): string {
  const { modelName, imports } = options;

  if (!modelName)
    throw new Error("Model name is required for controller template");

  return `import { BaseController } from "${
    imports?.baseController || "arkos/controllers"
  }";
  
class ${modelName.pascal}Controller extends BaseController {}

const ${modelName.camel}Controller = new ${modelName.pascal}Controller("${modelName.kebab}");

export default ${modelName.camel}Controller;
  `;
}
