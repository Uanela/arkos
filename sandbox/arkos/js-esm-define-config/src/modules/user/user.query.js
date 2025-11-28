/**
 * @type {import("arkos/prisma").PrismaQueryOptions<typeof import("@prisma/client").Prisma.UserDelegate>}
 */
const userQueryOptions = {
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
