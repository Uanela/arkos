import { z } from "zod";
import { getArkosConfig } from "./helpers/arkos-config.helpers";
import deepmerge from "./helpers/deepmerge.helper";

export type ZodValidationOptions = { forbidNonWhitelisted?: boolean };
/**
 * Validates data using a Zod schema and throws an AppError if validation fails.
 *
 * @param {ZodSchema} schema - The Zod schema to validate against.
 * @param {unknown} data - The data to validate.
 * @returns {Promise<any>} - The validated data or throws an AppError on failure.
 *
 * @example
 * ```typescript
 * const userSchema = z.object({
 *   name: z.string(),
 *   email: z.string().email()
 * });
 *
 * async function main() {
 *   const data = { name: "Uanela Como", email: "invalid-email" };
 *   try {
 *     const validatedUser = await validateSchema(userSchema, data);
 *     // do something
 *   } catch (error) {
 *     console.error(error.message);
 *   }
 * }
 * ```
 */
export default async function validateSchema<T extends z.ZodTypeAny>(
  schema: T,
  data: unknown,
  options?: ZodValidationOptions
): Promise<z.infer<T>> {
  const arkosConfig = getArkosConfig();
  const result = parseWithWhitelistCheck(
    schema,
    data,
    deepmerge(arkosConfig?.validation?.validationOptions || {}, options || {})
  );
  if (!result.success) throw result.error;
  return result.data;
}

export function parseWithWhitelistCheck<T extends z.ZodTypeAny>(
  schema: T,
  data: unknown,
  options?: ZodValidationOptions
): { success: true; data: z.infer<T> } | { success: false; error: z.ZodError } {
  const errors: z.ZodIssue[] = [];

  function checkNestedKeys(
    schemaType: any,
    dataValue: any,
    path: (string | number)[] = []
  ): void {
    if (typeof dataValue !== "object" || dataValue === null) return;

    // Handle arrays
    if (Array.isArray(dataValue) && schemaType._def?.typeName === "ZodArray") {
      const arrayElement = schemaType._def.type;
      dataValue.forEach((item, index) => {
        checkNestedKeys(arrayElement, item, [...path, index]);
      });
      return;
    }

    // Handle objects
    if (schemaType._def?.typeName === "ZodObject") {
      const schemaShape = schemaType._def.shape();
      const allowedKeys = Object.keys(schemaShape);
      const actualKeys = Object.keys(dataValue);
      const extraKeys = actualKeys.filter((key) => !allowedKeys.includes(key));

      extraKeys.forEach((key) => {
        errors.push({
          code: z.ZodIssueCode.unrecognized_keys,
          keys: [key],
          path: [...path, key],
          message: `Unrecognized key(s) in object: ${key}`,
        });
      });

      // Check nested fields
      allowedKeys.forEach((key) => {
        const schemaField = schemaShape[key];
        const nestedValue = dataValue[key];
        if (nestedValue === undefined || nestedValue === null) return;

        // Handle optional/nullable wrappers
        let unwrappedSchema = schemaField;
        if (
          schemaField._def?.typeName === "ZodOptional" ||
          schemaField._def?.typeName === "ZodNullable"
        ) {
          unwrappedSchema = schemaField._def.innerType;
        }

        checkNestedKeys(unwrappedSchema, nestedValue, [...path, key]);
      });
    }
  }

  if (options?.forbidNonWhitelisted !== false && data !== null) {
    checkNestedKeys(schema, data);
  }

  const parseResult = schema.safeParse(data);
  if (!parseResult.success) {
    errors.push(...parseResult.error.issues);
  }

  if (errors.length > 0) {
    return {
      success: false,
      error: new z.ZodError(errors),
    };
  }

  return {
    success: true,
    data: parseResult.data as z.infer<T>,
  };
}
