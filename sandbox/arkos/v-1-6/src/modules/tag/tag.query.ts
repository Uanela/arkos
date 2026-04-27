import { Prisma } from "@prisma/client";
import { PrismaQueryOptions } from 'arkos/prisma';

const tagQueryOptions: PrismaQueryOptions<Prisma.TagDelegate> = {
  global: {},
  find: {},
  findOne: {},
  findMany: {},
  update: {},
  updateMany: {},
  updateOne: {},
  create: {},
  createMany: {},
  createOne: {},
  save: {},
  saveMany: {},
  saveOne: {},
  delete: {},
  deleteMany: {},
  deleteOne: {},
}

export default tagQueryOptions;
