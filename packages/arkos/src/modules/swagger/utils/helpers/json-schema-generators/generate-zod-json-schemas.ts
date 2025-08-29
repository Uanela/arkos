import { getModuleComponents } from "../../../../../utils/dynamic-loader";
import zodToJsonSchema from "zod-to-json-schema";
import { getCorrectJsonSchemaName } from "../swagger.router.helpers";
import prismaSchemaParser from "../../../../../utils/prisma/prisma-schema-parser";

export default async function generateZodJsonSchemas() {
  const requiredAppModules = [
    ...prismaSchemaParser.getModelsAsArrayOfStrings(),
    "auth",
  ];
  const schemas: Record<string, any> = {};

  requiredAppModules.forEach((modelName) => {
    const ModuleComponents = getModuleComponents(modelName);

    if (ModuleComponents?.schemas)
      Object.entries(ModuleComponents.schemas).forEach(
        ([schemaType, zodSchema]) => {
          if (zodSchema)
            try {
              const jsonSchema = zodToJsonSchema(zodSchema);
              const schemaName = getCorrectJsonSchemaName(
                schemaType,
                modelName,
                "Schema"
              );
              schemas[schemaName] = jsonSchema;
            } catch (error) {
              console.warn(
                `Failed to generate schema for ${schemaType} ${modelName}:`,
                error
              );
            }
        }
      );
  });

  return schemas;
}
