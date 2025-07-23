import { validationMetadatasToSchemas } from "class-validator-jsonschema";
import { importModule } from "../../../../../utils/helpers/global.helpers";
import { getMetadataStorage } from "class-validator";
import {
  getModelModules,
  getModels,
} from "../../../../../utils/helpers/models.helpers";
import { getCorrectJsonSchemaName } from "../swagger.router.helpers";

export async function generateClassValidatorJsonSchemas() {
  const models = getModels();
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

  models.forEach((modelName) => {
    const modelModules = getModelModules(modelName);

    if (modelModules?.dtos) {
      Object.entries(modelModules.dtos).forEach(([dtoType, dtoClass]) => {
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
