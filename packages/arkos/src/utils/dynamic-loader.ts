import { ZodType } from 'zod';
import prismaSchemaParser from './prisma/prisma-schema-parser';

export function isClass(value: any): boolean {
  return (
    typeof value === 'function' &&
    /^class\s/.test(Function.prototype.toString.call(value))
  );
}

export function isZodSchema(value: any): value is ZodType {
  return value instanceof ZodType;
}

export const appModules = Array.from(
  new Set([
    'auth',
    'file-upload',
    ...(prismaSchemaParser.getModelsAsArrayOfStrings() || []),
  ]),
);

