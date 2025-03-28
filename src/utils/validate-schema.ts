import { ZodSchema } from "zod";
import AppError from "../modules/error-handler/utils/app-error";

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
export default async function validateSchema<T>(
  schema: ZodSchema<T>,
  data: unknown
): Promise<T> {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw new AppError("Invalid Data", 400, result.error.format());
  }
  return result.data;
}
