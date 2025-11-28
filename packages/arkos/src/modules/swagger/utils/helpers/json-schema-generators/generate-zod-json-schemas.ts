import { getModuleComponents } from "../../../../../utils/dynamic-loader";
import zodToJsonSchema from "zod-to-json-schema";
import { getCorrectJsonSchemaName } from "../swagger.router.helpers";
import prismaSchemaParser from "../../../../../utils/prisma/prisma-schema-parser";

export default function generateZodJsonSchemas() {
  const requiredAppModules = [
    ...prismaSchemaParser.getModelsAsArrayOfStrings(),
    "auth",
  ];
  const schemas: Record<string, any> = {};

  requiredAppModules.forEach((modelName) => {
    const moduleComponents = getModuleComponents(modelName);

    if (moduleComponents?.schemas)
      Object.entries(moduleComponents.schemas).forEach(
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
