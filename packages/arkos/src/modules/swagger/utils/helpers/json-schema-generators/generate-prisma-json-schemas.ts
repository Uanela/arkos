import { ArkosConfig } from "../../../../../exports";
import { UserArkosConfig } from "../../../../../utils/define-config";
import prismaJsonSchemaGenerator from "../../../../../utils/prisma/prisma-json-schema-generator";
import prismaSchemaParser from "../../../../../utils/prisma/prisma-schema-parser";

export function generatePrismaJsonSchemas(arkosConfig: UserArkosConfig) {
  const requiredAppModules = [
    ...prismaSchemaParser.getModelsAsArrayOfStrings(),
    "auth",
  ];

  try {
    const modelSchemasArray = requiredAppModules.map((modelName) => {
      const modelSchemas = prismaJsonSchemaGenerator.generateModelSchemas({
        modelName,
        arkosConfig,
      });
      return modelSchemas;
    });

    const schemas = modelSchemasArray.reduce((acc, modelSchemas) => {
      return { ...acc, ...modelSchemas };
    }, {});

    return schemas;
  } catch (err) {
    console.error(err);
    throw err;
  }
}
