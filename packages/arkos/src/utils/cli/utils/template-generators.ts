import { generateControllerTemplate } from "./template-generator/templates/generate-controller-template";
import { generateAuthConfigsTemplate } from "./template-generator/templates/auth-configs-template";
import { generateMiddlewaresTemplate } from "./template-generator/templates/middlewares-template";
import { generateQueryOptionsTemplate } from "./template-generator/templates/query-options-template";
import { generateRouterTemplate } from "./template-generator/templates/router-template";
import { generateServiceTemplate } from "./template-generator/templates/service-template";
import generateHooksTemplate from "./template-generator/templates/hooks-template";
import classValidatorDtoGenerator from "./template-generator/templates/class-validator-dto-generator";
import zodSchemaGenerator from "./template-generator/templates/zod-schema-generator";

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
      return zodSchemaGenerator.generateCreateSchema(options);
    case "update-schema":
      return zodSchemaGenerator.generateUpdateSchema(options);
    case "schema":
      return zodSchemaGenerator.generateBaseSchema(options);
    case "query-schema":
      return zodSchemaGenerator.generateQuerySchema(options);

    case "create-dto":
      return classValidatorDtoGenerator.generateCreateDto(options);
    case "update-dto":
      return classValidatorDtoGenerator.generateUpdateDto(options);
    case "dto":
      return classValidatorDtoGenerator.generateBaseDto(options);
    case "query-dto":
      return classValidatorDtoGenerator.generateQueryDto(options);

    default:
      throw new Error(`Unknown template type: ${type}`);
  }
}
