import { ArkosConfig } from "../../../../../exports";
import PrismaJsonSchemaGenerator from "../../../../../utils/prisma/prisma-json-schema-generator";
import prismaSchemaParser from "../../../../../utils/prisma/prisma-schema-parser";

export async function generatePrismaJsonSchemas(arkosConfig: ArkosConfig) {
  const requiredAppModules = [
    ...prismaSchemaParser.getModelsAsArrayOfStrings(),
    "auth",
  ];

  try {
    // Use Promise.all to handle all async operations properly
    const modelSchemasArray = await Promise.all(
      requiredAppModules.map(async (modelName) => {
        const modelSchemas =
          await PrismaJsonSchemaGenerator.generateModelSchemas({
            modelName,
            arkosConfig,
          });
        return modelSchemas;
      })
    );

    // Merge all schemas into a single object
    const schemas = modelSchemasArray.reduce((acc, modelSchemas) => {
      return { ...acc, ...modelSchemas };
    }, {});

    return schemas;
  } catch (err) {
    console.error(err);
    throw err;
  }
}
