import { ClassConstructor, plainToInstance } from 'class-transformer'
import { validate } from 'class-validator'
import AppError from '../modules/error-handler/utils/app-error'

export default async function validateDto<T extends object = any>(
  DtoClass: ClassConstructor<T>,
  data: Record<string, any>
): Promise<T> {
  const dataDto = plainToInstance(DtoClass, data)
  const errors = await validate(dataDto)
  if (errors.length > 0) throw new AppError('Invalid Data', 400, errors)
  return dataDto
}
