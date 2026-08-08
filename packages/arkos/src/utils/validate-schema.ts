import { z } from "zod";
import { getArkosConfig } from "./helpers/arkos-config.helpers";

export type ZodValidationOptions = { forbidNonWhitelisted?: boolean; };
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

  const validationOptions = {
    ...(arkosConfig?.validation?.validationOptions || {}),
    ...(options || {}),
  };

  const result = parseWithWhitelistCheck(
    schema,
    data,
    validationOptions
  );


  if (!result.success)
    throw result.error;


  return result.data;
}

export function parseWithWhitelistCheck<T extends z.ZodTypeAny>(
  schema: T,
  data: unknown,
  options?: ZodValidationOptions
):
  | { success: true; data: z.infer<T>; }
  | { success: false; error: z.ZodError; } {
  const errors: z.core.$ZodIssue[] = [];

  function checkNestedKeys(
    schemaType: z.ZodTypeAny,
    dataValue: unknown,
    path: (string | number)[] = []
  ): void {
    if (typeof dataValue !== "object" || dataValue === null) {
      return;
    }

    const def = (schemaType as any)._zod.def;

    if (def.type === "array" && Array.isArray(dataValue)) {
      dataValue.forEach((item: unknown, index: number) => {
        checkNestedKeys(
          def.element,
          item,
          [...path, index]
        );
      });

      return;
    }

    if (def.type === "object") {
      const shape = def.shape;

      const allowedKeys = Object.keys(shape);
      const actualKeys = Object.keys(dataValue);

      const extraKeys = actualKeys.filter(
        (key) => !allowedKeys.includes(key)
      );

      extraKeys.forEach((key) => {
        errors.push({
          code: "unrecognized_keys",
          keys: [key],
          path: [...path, key],
          message: `Unrecognized key(s) in object: ${key}`,
        });
      });

      allowedKeys.forEach((key) => {
        const schemaField = shape[key];

        const nestedValue = (
          dataValue as Record<string, unknown>
        )[key];

        if (nestedValue === undefined || nestedValue === null) {
          return;
        }

        let unwrappedSchema = schemaField;

        while (
          ["optional", "nullable"].includes(
            (unwrappedSchema as any)._zod.def.type
          )
        ) {
          unwrappedSchema = (unwrappedSchema as any)._zod.def.innerType;
        }

        checkNestedKeys(
          unwrappedSchema,
          nestedValue,
          [...path, key]
        );
      });
    }
  }

  if (options?.forbidNonWhitelisted !== false) {
    checkNestedKeys(schema, data);
  }

  const parseResult = schema.safeParse(data);

  if (!parseResult.success)
    errors.push(...parseResult.error.issues);


  if (errors.length > 0)
    return {
      success: false,
      error: new z.ZodRealError(errors),
    };


  return {
    success: true,
    data: parseResult.data!,
  };
}

