import { PrismaQueryOptions } from "arkos/prisma";
import { Prisma } from "@prisma/client";

const userQueryOptions: PrismaQueryOptions<Prisma.UserDelegate> = {
  global: {},
  find: {
    omit: {
      password: false,
    },
  },
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
  saveOne: {
    omit: {
      password: false,
    },
  },
  delete: {},
  deleteMany: {},
  deleteOne: {},
};

export default userQueryOptions;
