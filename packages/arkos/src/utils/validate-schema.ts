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
export default async function validateSchema<T extends z.ZodObject<any>>(
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

export function parseWithWhitelistCheck<T extends z.ZodObject<any>>(
  schema: T,
  data: unknown,
  options?: ZodValidationOptions
): { success: true; data: z.infer<T> } | { success: false; error: z.ZodError } {
  const errors: z.ZodIssue[] = [];

  function checkNestedKeys(
    schemaShape: any,
    dataObj: any,
    path: (string | number)[] = []
  ): void {
    if (typeof dataObj !== "object" || dataObj === null) return;
    if (Array.isArray(dataObj)) return;

    const allowedKeys = Object.keys(schemaShape);
    const actualKeys = Object.keys(dataObj);
    const extraKeys = actualKeys.filter((key) => !allowedKeys.includes(key));

    extraKeys.forEach((key) => {
      const pathArray = [...path, key];
      errors.push({
        code: z.ZodIssueCode.unrecognized_keys,
        keys: [key],
        path: pathArray,
        message: `Unrecognized key(s) in object: '${path.join(".")}'`,
      });
    });

    allowedKeys.forEach((key) => {
      const schemaField = schemaShape[key];
      const dataValue = dataObj[key];

      if (dataValue === undefined || dataValue === null) return;

      if (schemaField._def?.typeName === "ZodObject") {
        checkNestedKeys(schemaField.shape, dataValue, [...path, key]);
      } else if (schemaField._def?.typeName === "ZodArray") {
        const arrayElement = schemaField._def.type;
        if (
          arrayElement._def?.typeName === "ZodObject" &&
          Array.isArray(dataValue)
        ) {
          dataValue.forEach((item, index) => {
            checkNestedKeys(arrayElement.shape, item, [...path, key, index]);
          });
        }
      } else if (schemaField._def?.typeName === "ZodOptional") {
        const innerType = schemaField._def.innerType;
        if (innerType._def?.typeName === "ZodObject") {
          checkNestedKeys(innerType.shape, dataValue, [...path, key]);
        }
      } else if (schemaField._def?.typeName === "ZodNullable") {
        const innerType = schemaField._def.innerType;
        if (innerType._def?.typeName === "ZodObject") {
          checkNestedKeys(innerType.shape, dataValue, [...path, key]);
        }
      }
    });
  }

  if (
    options?.forbidNonWhitelisted !== false &&
    typeof data === "object" &&
    data !== null
  ) {
    checkNestedKeys(schema.shape, data);
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
