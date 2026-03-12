import { validationMetadatasToSchemas } from "class-validator-jsonschema";
import { getMetadataStorage } from "class-validator";
import { getCorrectJsonSchemaName } from "../swagger.router.helpers";
import prismaSchemaParser from "../../../../../utils/prisma/prisma-schema-parser";
import { getUserFileExtension } from "../../../../../utils/helpers/fs.helpers";
import { defaultMetadataStorage } from "class-transformer/cjs/storage.js";
import loadableRegistry from "../../../../../components/arkos-loadable-registry";
import { routeHookReader } from "../../../../../components/arkos-route-hook/reader";
import { ArkosModuleType } from "../../../../../components/arkos-route-hook/types";
import { kebabCase } from "../../../../../exports/utils";

const VALIDATION_OPERATIONS = [
  "createOne",
  "updateOne",
  "login",
  "signup",
  "updateMe",
  "updatePassword",
] as const;

export function generateClassValidatorJsonSchemas() {
  const requiredAppModules = [
    ...prismaSchemaParser.getModelsAsArrayOfStrings(),
    "auth",
  ] as ArkosModuleType[];

  const schemas: Record<string, any> = {};

  const jsonSchema = validationMetadatasToSchemas({
    classValidatorMetadataStorage: getMetadataStorage(),
    classTransformerMetadataStorage: defaultMetadataStorage,
    refPointerPrefix: "#/components/schemas/",
  });

  requiredAppModules.forEach((modelName) => {
    const routeHook = loadableRegistry.getItem(
      "ArkosRouteHook",
      kebabCase(modelName)
    );
    if (!routeHook) return;

    for (const operation of VALIDATION_OPERATIONS) {
      const config = routeHookReader.getFullConfig(modelName, operation as any);
      const dtoClass = (config as any)?.validation?.body;
      if (!dtoClass) continue;

      try {
        const schemaName = getCorrectJsonSchemaName(
          operation,
          modelName,
          "Dto"
        );

        if (schemas[schemaName])
          throw Error(
            `Found more then 1 ${dtoClass.name} classes among your .dto.${getUserFileExtension()} files, there is no way to correctly generate json-schemas for swagger documentation.`
          );

        schemas[schemaName] = jsonSchema[dtoClass.name] || {};
      } catch (err: any) {
        throw new Error(
          `Failed to generate schema for ${operation} ${modelName}: ${err.message}`
        );
      }
    }
  });

  Object.entries(jsonSchema).forEach(([className, schema]) => {
    if (!schemas[className]) schemas[className] = schema;
  });

  return schemas;
}
