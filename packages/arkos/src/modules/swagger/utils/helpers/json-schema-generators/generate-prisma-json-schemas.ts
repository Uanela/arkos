import { ArkosConfig } from "../../../../../exports";
import prismaJsonSchemaGenerator from "../../../../../utils/prisma/prisma-json-schema-generator";
import prismaSchemaParser from "../../../../../utils/prisma/prisma-schema-parser";

export async function generatePrismaJsonSchemas(arkosConfig: ArkosConfig) {
  const requiredAppModules = [
    ...prismaSchemaParser.getModelsAsArrayOfStrings(),
    "auth",
  ];

  try {
    const modelSchemasArray = await Promise.all(
      requiredAppModules.map(async (modelName) => {
        const modelSchemas =
          await prismaJsonSchemaGenerator.generateModelSchemas({
            modelName,
            arkosConfig,
          });
        return modelSchemas;
      })
    );

    const schemas = modelSchemasArray.reduce((acc, modelSchemas) => {
      return { ...acc, ...modelSchemas };
    }, {});

    return schemas;
  } catch (err) {
    console.error(err);
    throw err;
  }
}
