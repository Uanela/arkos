import pluralize from "pluralize";
import { TemplateOptions } from "../../template-generators";
import { capitalize } from "../../../../helpers/text.helpers";

export function generateRouterTemplate(options: TemplateOptions): string {
  const { modelName } = options;

  if (!modelName)
    throw new Error("Module name is required for router template");

  return `import { ArkosRouter } from 'arkos';${modelName.kebab === "file-upload" ? "\nimport config from '@/arkos.config'" : ""}

const ${modelName.camel}Router = ArkosRouter({ 
prefix: "${modelName.kebab === "auth" ? "auth" : modelName.kebab === "file-upload" ? `config?.fileUpload?.baseUploadRoute!` : pluralize(modelName.kebab)}",
  openapi: { tags: ["${pluralize(capitalize(modelName.kebab.replaceAll("-", " ")))}"] }
})

export default ${modelName.camel}Router
`;
}
