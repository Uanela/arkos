import { getMetadataStorage } from "class-validator";
import { defaultMetadataStorage } from "class-transformer/cjs/storage.js";
import { validationMetadatasToSchemas } from "class-validator-jsonschema";

export default function classValidatorToJsonSchema(
  decoratedClass: new (...args: any[]) => object
): any {
  const jsonSchemas = validationMetadatasToSchemas({
    classValidatorMetadataStorage: getMetadataStorage(),
    classTransformerMetadataStorage: defaultMetadataStorage,
    refPointerPrefix: "#/components/schemas/",
    additionalConverters: {
      IsNotEmpty: {
        // Returns an empty object so as not to overwrite the 'type' of IsNumber
        // but still retains the 'required' property if needed
      },
    },
  });

  const targetSchema = jsonSchemas[decoratedClass.name];

  if (!targetSchema) return null;

  return resolveReferences(targetSchema, jsonSchemas);
}

export function resolveReferences(
  schema: any,
  allSchemas: Record<string, any>,
  visited = new Set<string>()
): any {
  if (!schema || typeof schema !== "object") return schema;

  if (schema.$ref) {
    const refName = extractSchemaName(schema.$ref);

    if (visited.has(refName))
      return {
        $resolvedRef: refName,
        description: `Circular reference to ${refName}`,
      };

    const referencedSchema = allSchemas[refName];
    if (referencedSchema) {
      visited.add(refName);
      const resolved = resolveReferences(referencedSchema, allSchemas, visited);
      visited.delete(refName);

      const { $ref, ...rest } = schema;
      return { ...resolved, ...rest };
    }

    return schema;
  }

  if (Array.isArray(schema)) {
    return schema.map((item) => resolveReferences(item, allSchemas, visited));
  }

  const result: any = {};
  for (const [key, value] of Object.entries(schema)) {
    result[key] = resolveReferences(value, allSchemas, visited);
  }

  return result;
}

export function extractSchemaName(ref: string): string {
  const parts = ref.split("/");
  return parts[parts.length - 1];
}
