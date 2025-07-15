import { ArkosConfig } from "../../../../exports";
import {
  getModels,
  importPrismaModelModules,
} from "../../../../utils/helpers/models.helpers";
import { kebabCase, pascalCase } from "../../../../exports/utils";
import { OpenAPIV3 } from "openapi-types";
import { plural } from "pluralize";
import { getSystemJsonSchemaPaths } from "./get-system-json-schema-paths";
import { getAuthenticationJsonSchemaPaths } from "./get-authentication-json-schema-paths";
import { generateZodJsonSchemas } from "./json-schema-generators/generate-zod-json-schema";
import { generateClassValidatorJsonSchemas } from "./json-schema-generators/generate-class-validator-json-schemas";
import { generatePrismaJsonSchemas } from "./json-schema-generators/generate-prisma-json-schemas";
import { generatePrismaModelMainRoutesPaths } from "./json-schema-generators/prisma-models/generate-prisma-model-main-routes";
import { generatePrismaModelParentRoutePaths } from "./json-schema-generators/prisma-models/generate-prisma-model-parent-routes";

export async function getOpenAPIJsonSchemasByConfigMode(
  swaggerConfig: ArkosConfig["swagger"]
) {
  switch (swaggerConfig!.mode) {
    case "prisma":
      return await generatePrismaJsonSchemas();
    case "class-validator":
      return await generateClassValidatorJsonSchemas();
    case "zod":
      return await generateZodJsonSchemas();
    default:
      throw Error(
        "Unknown mode for auto documentation, supported values are prisma, class-validator, zod or json-schemas"
      );
  }
}

export function getCorrectJsonSchemaName(
  type: string,
  modelName: string,
  suffix: "Dto" | "Schema"
): string {
  const pascalModelName = pascalCase(modelName);

  const map: Record<string, string> = {
    model: pascalModelName,
    create: `Create${pascalModelName}`,
    createMany: `CreateMany${pascalModelName}`,
    findOne: `FindOne${pascalModelName}`,
    findMany: `FindMany${pascalModelName}`,
    update: `Update${pascalModelName}`,
    updateMany: `UpdateMany${pascalModelName}`,
    query: `Query${pascalModelName}`,
    login: "Login",
    signup: "Signup",
    updateMe: "UpdateMe",
    updatePassword: "UpdatePassword",
  };

  const baseName = map[type] ?? pascalCase(type);
  return `${baseName}${suffix}`;
}

export function kebabToHuman(kebabStr: string): string {
  return kebabStr
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function getSchemaRef(schemaName: string, mode: string): string {
  switch (mode) {
    case "prisma":
    case "zod":
      return `#/components/schemas/${schemaName}Schema`;
    case "class-validator":
      return `#/components/schemas/${schemaName}Dto`;
    default:
      return `#/components/schemas/${schemaName}`;
  }
}

export async function generatePathsForModels(
  swaggerConfig: ArkosConfig["swagger"]
): Promise<OpenAPIV3.PathsObject> {
  if (!swaggerConfig) return {};

  let paths: OpenAPIV3.PathsObject = {};
  const models = getModels();
  const mode = swaggerConfig!.mode;

  for (const model of models) {
    const modelName = kebabCase(model);
    const routeName = plural(modelName);
    const pascalModelName = pascalCase(model);
    const humanReadableName = kebabToHuman(modelName);
    const humanReadableNamePlural = plural(humanReadableName);

    // Import model modules to get router config
    const modelModules = await importPrismaModelModules(model);
    const routerConfig = modelModules.router?.config;

    // Skip if router is completely disabled
    if (routerConfig?.disable === true) continue;

    // Generate main routes
    await generatePrismaModelMainRoutesPaths(
      paths,
      routeName,
      pascalModelName,
      humanReadableName,
      humanReadableNamePlural,
      routerConfig,
      mode
    );

    // Generate parent routes if configured
    if (routerConfig?.parent)
      await generatePrismaModelParentRoutePaths(
        paths,
        routeName,
        pascalModelName,
        humanReadableName,
        humanReadableNamePlural,
        routerConfig,
        mode
      );
  }

  // Add system routes
  paths = { ...paths, ...getSystemJsonSchemaPaths() };

  // Add authentication routes
  paths = { ...paths, ...getAuthenticationJsonSchemaPaths() };

  return paths;
}
