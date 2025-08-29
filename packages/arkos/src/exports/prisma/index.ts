import { PrismaQueryOptions, AuthPrismaQueryOptions } from "../../types";
import prismaSchemaParser from "../../utils/prisma/prisma-schema-parser";

export function getPrismaModels() {
  return prismaSchemaParser.models.map(({ name }) => name);
}
export { PrismaQueryOptions, prismaSchemaParser, AuthPrismaQueryOptions };
