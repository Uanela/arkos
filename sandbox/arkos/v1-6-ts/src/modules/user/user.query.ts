import { PrismaQueryOptions } from 'arkos/prisma';
import { Prisma } from "@prisma/client"

const userQueryOptions: PrismaQueryOptions<Prisma.UserDelegate> = {
  global: {
    omit: {
      password: true,
    }, 
  },
  find: {
  },
  findOne: {
  },
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

export default userQueryOptions;
