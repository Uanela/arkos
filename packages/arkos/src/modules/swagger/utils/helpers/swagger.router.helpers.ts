import { ArkosConfig } from "../../../../exports";
import { camelCase, pascalCase } from "../../../../exports/utils";
import { OpenAPIV3 } from "openapi-types";
import { getSystemJsonSchemaPaths } from "./get-system-json-schema-paths";
import getAuthenticationJsonSchemaPaths from "./get-authentication-json-schema-paths";
import generateZodJsonSchemas from "./json-schema-generators/generate-zod-json-schemas";
import { generateClassValidatorJsonSchemas } from "./json-schema-generators/generate-class-validator-json-schemas";
import { generatePrismaJsonSchemas } from "./json-schema-generators/generate-prisma-json-schemas";
import { generatePrismaModelMainRoutesPaths } from "./json-schema-generators/prisma-models/generate-prisma-model-main-routes-paths";
import generatePrismaModelParentRoutePaths from "./json-schema-generators/prisma-models/generate-prisma-model-parent-routes-paths";
import sheu from "../../../../utils/sheu";
import prismaSchemaParser from "../../../../utils/prisma/prisma-schema-parser";
import {
  getModuleComponents,
  ValidationFileMappingKey,
} from "../../../../utils/dynamic-loader";

/**
 * Helps choosing the right json schemas according to swagger configurations
 */
export function getOpenAPIJsonSchemasByConfigMode(arkosConfig: ArkosConfig) {
  switch (arkosConfig?.swagger!.mode) {
    case "prisma":
      return generatePrismaJsonSchemas(arkosConfig);
    case "class-validator":
      return generateClassValidatorJsonSchemas();
    case "zod":
      return generateZodJsonSchemas();
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

export function getSchemaRef(
  schemaName: string,
  mode: "prisma" | "zod" | "class-validator"
): string {
  schemaName = pascalCase(schemaName);
  const specialCases = [
    "getme",
    "updateme",
    "login",
    "signup",
    "updatepassword",
    "password",
    "me",
  ];
  const isSpecialCase = specialCases.some(
    (keyword) => keyword === schemaName.toLowerCase()
  );

  if (isSpecialCase && mode === "prisma")
    return `#/components/schemas/${schemaName}Schema`;

  switch (mode) {
    case "prisma":
      return `#/components/schemas/${schemaName}ModelSchema`;
    case "zod":
      return `#/components/schemas/${schemaName}Schema`;
    case "class-validator":
      return `#/components/schemas/${schemaName}Dto`;
    default:
      sheu.error(
        `Unknown Arkos.js swagger documentation provided, available options are prisma, zod or class-validator but received ${mode}`
      );
      return "";
  }
}

export function generatePathsForModels(
  arkosConfig: ArkosConfig
): OpenAPIV3.PathsObject {
  const swaggerConfig = arkosConfig?.swagger;

  if (!swaggerConfig) return {};

  let paths: OpenAPIV3.PathsObject = {};
  const models = prismaSchemaParser.getModelsAsArrayOfStrings();

  for (const model of models) {
    generatePrismaModelMainRoutesPaths(model, paths, arkosConfig);
    generatePrismaModelParentRoutePaths(model, paths, arkosConfig);
  }

  paths = {
    ...paths,
    ...getSystemJsonSchemaPaths(),
  };

  paths = {
    ...paths,
    ...(getAuthenticationJsonSchemaPaths(arkosConfig) || {}),
  };

  return paths;
}

/**
 * Helps in finding out whether a given dto/schema file exits under the user project according to the validation arkos configuration.
 *
 * @param action {ValidationFileMappingKey} - the action of the dto, e.g: create, findMany.
 * @param modelName {string} - the model to be checked
 * @param arkosConfig {ArkosConfig} - the arkos.js configuration
 * @returns boolean
 */
export function localValidatorFileExists(
  action: ValidationFileMappingKey,
  modelName: string,
  arkosConfig: ArkosConfig
) {
  if (arkosConfig?.swagger?.mode === "prisma") return false;
  const moduleComponents = getModuleComponents(modelName) as any;

  return !!moduleComponents?.[
    arkosConfig.validation?.resolver === "zod" ? "schemas" : "dtos"
  ]?.[camelCase(action)];
}
