import { ZodTypeAny } from "zod";
import prismaSchemaParser from "./prisma/prisma-schema-parser";

export function isClass(value: any): boolean {
  return (
    typeof value === "function" &&
    /^class\s/.test(Function.prototype.toString.call(value))
  );
}

export function isZodSchema(value: any): value is ZodTypeAny {
  return value?._def?.typeName?.startsWith("Zod");
}

export const appModules = Array.from(
  new Set([
    "auth",
    "file-upload",
    ...(prismaSchemaParser.getModelsAsArrayOfStrings() || []),
  ])
);
