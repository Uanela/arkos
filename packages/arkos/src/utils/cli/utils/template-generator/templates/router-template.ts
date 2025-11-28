import {
  checkFileExists,
  getUserFileExtension,
} from "../../../../helpers/fs.helpers";
import { TemplateOptions } from "../../template-generators";

export function generateRouterTemplate(options: TemplateOptions): string {
  const { modelName, imports } = options;

  if (!modelName)
    throw new Error("Module name is required for router template");

  const ext = getUserFileExtension();
  const controllerPath =
    imports?.controller || `./${modelName.kebab}.controller.${ext}`;

  const routerConfigTsType = ext === "ts" ? ": RouterConfig" : "";
  const routerConfigTsTypeImport =
    ext === "ts" ? "import { RouterConfig } from 'arkos'" : "";

  const controllerExists = checkFileExists(controllerPath);

  const controllerImportLine = controllerExists
    ? `import ${modelName.camel}Controller from "${
        imports?.controller ||
        `./${modelName.kebab}.controller${ext === "js" ? "." + "js" : ""}`
      }"`
    : `import ${modelName.camel}Controller from "${
        imports?.controller ||
        `./${modelName.kebab}.controller${ext === "js" ? "." + "js" : ""}`
      }"`;

  const controllerHandlerLine = `${modelName.camel}Controller.someHandler`;

  return `import { ArkosRouter } from 'arkos'
${controllerImportLine}
${routerConfigTsTypeImport}

export const config${routerConfigTsType} = { }

const ${modelName.camel}Router = ArkosRouter()

${modelName.camel}Router.get(
  {
    path: "/custom-endpoint",
    authentication: { action: "CustomAction", resource: "${modelName.kebab}" },
    validation: {},
    experimental: {
      openapi: {},
      // uploads: {}
    }
  },
  ${controllerHandlerLine}
)

export default ${modelName.camel}Router
`;
}
