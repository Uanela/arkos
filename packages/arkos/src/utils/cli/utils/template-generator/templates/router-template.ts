import pluralize, { singular } from "pluralize";
import { TemplateOptions } from "../../template-generators";
import { pascalCase } from "../../../../helpers/change-case.helpers";

export function generateRouterTemplate(options: TemplateOptions): string {
  const { modelName } = options;

  if (!modelName)
    throw new Error("Module name is required for router template");

  return `import { ArkosRouter } from 'arkos';${modelName.kebab === "file-upload" ? "\nimport config from '@/arkos.config'" : ""}

const ${modelName.camel}Router = ArkosRouter({ 
prefix: "${modelName.kebab === "auth" ? "auth" : modelName.kebab === "file-upload" ? `config?.fileUpload?.baseUploadRoute!` : pluralize(modelName.kebab)}",
  openapi: { tags: ["${singular(pascalCase(modelName.kebab.replaceAll("-", " ")))}"] }
})

export default ${modelName.camel}Router
`;
}
