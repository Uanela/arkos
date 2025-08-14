import {
  getModelModules,
  getModels,
} from "../../../../../utils/helpers/models.helpers";
import zodToJsonSchema from "zod-to-json-schema";
import { getCorrectJsonSchemaName } from "../swagger.router.helpers";

export default async function generateZodJsonSchemas() {
  const models = [...getModels(), "auth"];
  const schemas: Record<string, any> = {};

  models.forEach((modelName) => {
    const modelModules = getModelModules(modelName);

    if (modelModules?.schemas)
      Object.entries(modelModules.schemas).forEach(
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
