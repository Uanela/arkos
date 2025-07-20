import { TemplateOptions } from "../../template-generators";

export function generateControllerTemplate(options: TemplateOptions): string {
  const { modelName, imports } = options;

  if (!modelName)
    throw new Error("Model name is required for controller template");

  return `import { BaseController } from "${
    imports?.baseController || "arkos/controllers"
  }";
  
  class ${modelName.pascal}Controller extends BaseController {
    constructor() {
      super("${modelName.kebab}");
    }
  }
  
  const ${modelName.camel}Controller = new ${modelName.pascal}Controller();
  
  export default ${modelName.camel}Controller;
  `;
}
