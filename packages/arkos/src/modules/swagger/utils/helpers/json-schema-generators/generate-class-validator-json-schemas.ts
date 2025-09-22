import { validationMetadatasToSchemas } from "class-validator-jsonschema";
import { importModule } from "../../../../../utils/helpers/global.helpers";
import { getMetadataStorage } from "class-validator";
import { getModuleComponents } from "../../../../../utils/dynamic-loader";
import { getCorrectJsonSchemaName } from "../swagger.router.helpers";
import prismaSchemaParser from "../../../../../utils/prisma/prisma-schema-parser";
import { getUserFileExtension } from "../../../../../utils/helpers/fs.helpers";

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

  requiredAppModules.forEach((modelName) => {
    const moduleComponents = getModuleComponents(modelName);

    if (moduleComponents?.dtos) {
      Object.entries(moduleComponents.dtos).forEach(([dtoType, dtoClass]) => {
        const ignoredDtoTypes = ["createone", "updateone"];
        if (dtoClass && !ignoredDtoTypes.includes(dtoType.toLowerCase())) {
          try {
            const schemaName = getCorrectJsonSchemaName(
              dtoType,
              modelName,
              "Dto"
            );

            if (schemas[schemaName]) {
              throw Error(
                `Found more then 1 ${dtoClass.name} classes among your .dto.${getUserFileExtension()} files, there is no way to correctly generate json-schemas for swagger documentation.`
              );
            }

            schemas[schemaName] = jsonSchema[dtoClass.name] || {};
          } catch (err: any) {
            throw new Error(
              `Failed to generate schema for ${dtoType} ${modelName}: ${err.message}`
            );
          }
        }
      });
    }
  });

  Object.entries(jsonSchema).forEach(([className, schema]) => {
    if (!schemas[className]) schemas[className] = schema;
  });
  return schemas;
}
