import { PrismaQueryOptions } from "arkos/prisma";
import { Prisma } from "@prisma/client";

const userQueryOptions: PrismaQueryOptions<Prisma.UserDelegate> = {
  global: {
    omit: {
      password: true,
    },
    include: { posts: true },
  },
  find: {
    include: { posts: true },
  },
  findOne: {},
  findMany: {},
  update: {
    include: { posts: true },
  },
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
};

export default userQueryOptions;
