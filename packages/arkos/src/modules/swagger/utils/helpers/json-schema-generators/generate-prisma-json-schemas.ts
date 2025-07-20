import { pascalCase } from "../../../../../exports/utils";
import {
  getModels,
  getPrismaSchemasContent,
} from "../../../../../utils/helpers/models.helpers";

export async function generatePrismaJsonSchemas() {
  const schemas: Record<string, any> = {};
  const prismaContent = getPrismaSchemasContent();
  const models = getModels();

  models.forEach((modelName) => {
    const pascalModelName = pascalCase(modelName);

    schemas[`Create${pascalModelName}Schema`] = {
      type: "object",
      properties: {
        // Omit auto-generated fields like id, createdAt, updatedAt
      },
    };

    schemas[`Update${pascalModelName}Schema`] = {
      type: "object",
      properties: {
        // Make all fields optional for updates
      },
    };
  });
}
