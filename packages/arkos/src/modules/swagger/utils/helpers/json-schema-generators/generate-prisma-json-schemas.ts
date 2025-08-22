import { ArkosConfig } from "../../../../../exports";
import { getModels } from "../../../../../utils/helpers/dynamic-loader";
import enhancedPrismaJsonSchemaGenerator from "../../../../../utils/prisma/prisma-json-schema-generator";

export async function generatePrismaJsonSchemas(arkosConfig: ArkosConfig) {
  const models = [...getModels(), "auth"];

  try {
    // Use Promise.all to handle all async operations properly
    const modelSchemasArray = await Promise.all(
      models.map(async (modelName) => {
        const modelSchemas =
          await enhancedPrismaJsonSchemaGenerator.generateModelSchemas({
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
