import { generateControllerTemplate } from "./template-generator/templates/generate-controller-template";
import { generateAuthConfigsTemplate } from "./template-generator/templates/generate-auth-configs-template";
import { generateMiddlewaresTemplate } from "./template-generator/templates/generate-middlewares";
import { generateQueryOptionsTemplate } from "./template-generator/templates/generate-prisma-query-options";
import { generateRouterTemplate } from "./template-generator/templates/generate-router-template";
import { generateServiceTemplate } from "./template-generator/templates/generate-service-template";

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
  modelName?: ModelName;
  middlewareName?: MiddlewareName;
  imports?: Record<string, string>;
}

export function generateTemplate(
  type: string,
  options: TemplateOptions = {}
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
    case "middlewares":
      return generateMiddlewaresTemplate(options);
    default:
      throw new Error(`\n Unknown template type: ${type}`);
  }
}
