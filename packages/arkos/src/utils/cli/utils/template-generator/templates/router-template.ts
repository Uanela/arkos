import pluralize from "pluralize";
import { TemplateOptions } from "../../template-generators";
import { capitalize } from "../../../../helpers/text.helpers";
import { knownModules } from "../../../generate";

export function generateRouterTemplate(options: TemplateOptions): string {
  const { modelName } = options;

  if (!modelName)
    throw new Error("Module name is required for router template");

  const isKnown = knownModules.includes(modelName.kebab)
  const routerName = `${modelName.camel}Router`
  const routeHookName = `${modelName.camel}RouteHook`

  return `import { ArkosRouter${isKnown ? `, ArkosRouteHook` : ""} } from 'arkos';${modelName.kebab === "file-upload" ? "\nimport config from '@/arkos.config'" : ""}

${isKnown ? `const ${routeHookName} = ArkosRouteHook("${modelName.kebab}")` : ""}

const ${routerName} = ArkosRouter({ 
  prefix: ${modelName.kebab === "auth" ? '"/auth"' : modelName.kebab === "file-upload" ? `config?.fileUpload?.baseUploadRoute || "/uploads"` : `"/${pluralize(modelName.kebab)}"`},
  openapi: { tags: ["${modelName.kebab === "auth" ? "Authentication" : modelName.kebab === "file-upload" ? "File Upload" : pluralize(capitalize(modelName.kebab.replaceAll("-", " ")))}"] }
})

${isKnown ? `${routerName}.load(${routeHookName})\n` : ""}
export default ${modelName.camel}Router
`;
}
