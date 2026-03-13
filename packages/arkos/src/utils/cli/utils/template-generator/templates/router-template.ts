import pluralize from "pluralize";
import { TemplateOptions } from "../../template-generators";

export function generateRouterTemplate(options: TemplateOptions): string {
  const { modelName } = options;

  if (!modelName)
    throw new Error("Module name is required for router template");

  return `import { ArkosRouter } from 'arkos'

const ${modelName.camel}Router = ArkosRouter({ prefix: "${pluralize(modelName.kebab)}" })

export default ${modelName.camel}Router
`;
}
