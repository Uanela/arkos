import { PrismaQueryOptions, AuthPrismaQueryOptions } from "../../types";
import prismaSchemaParser from "../../utils/prisma/prisma-schema-parser";
import { ArkosPrismaInput } from "../../types/arkos-prisma-input";

export function getPrismaModels() {
  return prismaSchemaParser.models.map(({ name }) => name);
}
export {
  PrismaQueryOptions,
  prismaSchemaParser,
  AuthPrismaQueryOptions,
  ArkosPrismaInput,
};
