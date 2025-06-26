import pluralize from "pluralize";
import {
  checkFileExists,
  getUserFileExtension,
} from "../../../../helpers/fs.helpers";
import { TemplateOptions } from "../../template-generators";

export function generateRouterTemplate(options: TemplateOptions): string {
  const { modelName, imports } = options;

  if (!modelName) throw new Error("Model name is required for router template");

  // Check if controller file exists
  const ext = getUserFileExtension();
  const controllerPath =
    imports?.controller || `./${modelName.kebab}.controller.${ext}`;

  const controllerExists = checkFileExists(controllerPath);

  const controllerImportLine = controllerExists
    ? `import ${modelName.camel}Controller from "${
        imports?.controller || `./${modelName.kebab}.controller`
      }"`
    : `// import ${modelName.camel}Controller from "${
        imports?.controller || `./${modelName.kebab}.controller`
      }"`;

  const controllerHandlerLine = controllerExists
    ? `  ${modelName.camel}Controller.someHandler`
    : `  // ${modelName.camel}Controller.someHandler`;

  return `import { Router } from 'express'
import { authService } from 'arkos/services'
${controllerImportLine}

const ${modelName.camel}Router = Router()

${modelName.camel}Router.post(
  '/custom-endpoint', // resolves to /api/${pluralize(
    modelName.kebab
  )}/custom-endpoint
  authService.authenticate,
  authService.handleAccessControl('CustomAction', '${modelName.kebab}'),
${controllerHandlerLine}
)

export default ${modelName.camel}Router
`;
}
