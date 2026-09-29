import { Prisma } from "@/src/generated/prisma/client"
import { PrismaQueryOptions } from 'arkos/prisma';

const authPermissionQueryOptions: PrismaQueryOptions<Prisma.AuthPermissionDelegate> = {
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

export default authPermissionQueryOptions;
