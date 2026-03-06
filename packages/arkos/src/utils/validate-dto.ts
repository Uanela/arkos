import { ClassConstructor, plainToInstance } from "class-transformer";
import { validate, ValidatorOptions } from "class-validator";
import { getArkosConfig } from "./helpers/arkos-config.helpers";
import deepmerge from "./helpers/deepmerge.helper";

/**
 * Used to easy validate your data with class validator by passing the validator class and the data to validate, and if whished some validation options
 *
 * @param {ClassConstructor<T>} DtoClass - The DTO class you want to use to validate the data
 * @param {Record<string, any>} data - The data to validated
 * @param {ValidatorOptions} validationOptions - class-validator validation options, default {whitelist: true}
 * @returns {Promise<T> | AppError} - returns the validated data or the encountered errors.
 *
 *
 * @example
 * ```ts
 * class CreateUserDto {
 *   @IsString()
 *   name: string;
 *
 *   @IsEmail()
 *   email: string;
 * }
 *
 * async function main() {
 *   const data = { name: "Uanela Como", email: "invalid-email" };
 *   try {
 *     const validatedUser = await validateDto(CreateUserDto, data);
 *     // do something
 *   } catch (error) {
 *     console.error(error.message);
 *   }
 * }
 * ```
 */

export default async function validateDto<T extends object>(
  DtoClass: ClassConstructor<T>,
  data: Record<string, any>,
  validationOptions?: ValidatorOptions
): Promise<T> {
  const arkosConfig = getArkosConfig();
  const dataDto = plainToInstance(DtoClass, data);
  const errors = await validate(
    dataDto,
    deepmerge(
      arkosConfig?.validation?.validationOptions || {},
      validationOptions || {}
    )
  );

  if (errors.length > 0) throw errors;

  return dataDto;
}
