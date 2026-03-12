import zodToJsonSchema from "zod-to-json-schema";
import { getCorrectJsonSchemaName } from "../swagger.router.helpers";
import prismaSchemaParser from "../../../../../utils/prisma/prisma-schema-parser";
import { routeHookReader } from "../../../../../components/arkos-route-hook/reader";
import { ArkosModuleType } from "../../../../../components/arkos-route-hook/types";
import loadableRegistry from "../../../../../components/arkos-loadable-registry";
import { ZodSchema } from "zod";
import { kebabCase } from "../../../../../exports/utils";

export default function generateZodJsonSchemas() {
  const requiredAppModules = [
    ...prismaSchemaParser.getModelsAsArrayOfStrings(),
    "auth",
  ] as ArkosModuleType[];
  const schemas: Record<string, any> = {};

  requiredAppModules.forEach((modelName) => {
    const routeHook = loadableRegistry.getItem(
      "ArkosRouteHook",
      kebabCase(modelName)
    );

    if (!routeHook) return;

    Object.keys(routeHook).forEach((key) => {
      if (["__type", "moduleName", "_store"].includes(key)) return;

      const validationConfig = routeHookReader.getRouteConfig(
        modelName,
        key as any
      )?.validation;
      if (!validationConfig) return;

      const schema = validationConfig?.body;
      if (!schema) return;

      const jsonSchema = zodToJsonSchema(schema as ZodSchema);
      const schemaName = getCorrectJsonSchemaName(key, modelName, "Schema");
      schemas[schemaName] = jsonSchema;
    });
  });

  return schemas;
}
