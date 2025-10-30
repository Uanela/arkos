import { PrismaQueryOptions } from 'arkos/prisma';
import { Prisma } from "@prisma/client"

const userQueryOptions: PrismaQueryOptions<Prisma.UserDelegate> = {
  global: {
    omit: {
      password: true,
    }, 
  },
  find: {
    include: {
      roles: {
        include: {
          role: true,
        }
      },
    },
  },
  findOne: {
    include: {
      roles: {
        include: {
          role: {
            include: {
              permissions: true
            }
          }
        }
      },
    },
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
