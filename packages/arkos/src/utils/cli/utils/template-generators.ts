import { generateControllerTemplate } from "./template-generator/templates/controller-template";
import { generateAuthConfigsTemplate } from "./template-generator/templates/auth-configs-template";
import { generateMiddlewaresTemplate } from "./template-generator/templates/middlewares-template";
import { generateQueryOptionsTemplate } from "./template-generator/templates/query-options-template";
import { generateRouterTemplate } from "./template-generator/templates/router-template";
import { generateServiceTemplate } from "./template-generator/templates/service-template";
import generateHooksTemplate from "./template-generator/templates/hooks-template";
import { generateCreateSchemaTemplate } from "./template-generator/templates/zod/create-schema-template";
import { generateUpdateSchemaTemplate } from "./template-generator/templates/zod/update-schema-template";
import { generateUpdateDtoTemplate } from "./template-generator/templates/class-validator/update-dto-template";
import { generateCreateDtoTemplate } from "./template-generator/templates/class-validator/create-dto-template";

interface ModelName {
  pascal: string;
  camel: string;
  kebab: string;
}

interface MiddlewareName {
  pascal: string;
  camel: string;
  kebab: string;
}

export interface TemplateOptions {
  modelName: ModelName;
  middlewareName?: MiddlewareName;
  imports?: Record<string, string>;
}

export function generateTemplate(
  type: string,
  options: TemplateOptions
): string {
  switch (type) {
    case "controller":
      return generateControllerTemplate(options);
    case "service":
      return generateServiceTemplate(options);
    case "router":
      return generateRouterTemplate(options);
    case "auth-configs":
      return generateAuthConfigsTemplate(options);
    case "query-options":
      return generateQueryOptionsTemplate(options);
    case "interceptors":
      return generateMiddlewaresTemplate(options);
    case "hooks":
      return generateHooksTemplate(options);
    case "create-schema":
      return generateCreateSchemaTemplate(options);
    case "update-schema":
      return generateUpdateSchemaTemplate(options);
    case "create-dto":
      return generateCreateDtoTemplate(options);
    case "update-dto":
      return generateUpdateDtoTemplate(options);
    default:
      throw new Error(`Unknown template type: ${type}`);
  }
}
