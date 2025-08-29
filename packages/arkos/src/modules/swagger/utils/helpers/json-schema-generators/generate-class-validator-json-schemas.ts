import { validationMetadatasToSchemas } from "class-validator-jsonschema";
import { importModule } from "../../../../../utils/helpers/global.helpers";
import { getMetadataStorage } from "class-validator";
import { getModuleComponents } from "../../../../../utils/dynamic-loader";
import { getCorrectJsonSchemaName } from "../swagger.router.helpers";
import prismaSchemaParser from "../../../../../utils/prisma/prisma-schema-parser";

export async function generateClassValidatorJsonSchemas() {
  const requiredAppModules = [
    ...prismaSchemaParser.getModelsAsArrayOfStrings(),
    "auth",
  ];
  const schemas: Record<string, any> = {};

  const { defaultMetadataStorage } = await importModule(
    "class-transformer/cjs/storage.js"
  );

  const jsonSchema = validationMetadatasToSchemas({
    classValidatorMetadataStorage: getMetadataStorage(),
    classTransformerMetadataStorage: defaultMetadataStorage,
    refPointerPrefix: "#/components/schemas/",
  });

  Object.entries(jsonSchema).forEach(([className, schema]) => {
    schemas[className] = schema;
  });

  requiredAppModules.forEach((modelName) => {
    const ModuleComponents = getModuleComponents(modelName);

    if (ModuleComponents?.dtos) {
      Object.entries(ModuleComponents.dtos).forEach(([dtoType, dtoClass]) => {
        if (dtoClass) {
          try {
            const schemaName = getCorrectJsonSchemaName(
              dtoType,
              modelName,
              "Dto"
            );
            schemas[schemaName] = jsonSchema[dtoClass.name] || {};
            if (schemas[dtoClass.name]) delete schemas[dtoClass.name];
          } catch (error) {
            console.warn(
              `Failed to generate schema for ${dtoType} ${modelName}:`,
              error
            );
          }
        }
      });
    }
  });

  return schemas;
}
