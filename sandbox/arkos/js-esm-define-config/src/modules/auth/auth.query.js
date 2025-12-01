/**
 * @type {import("arkos/prisma").PrismaQueryOptions<typeof import("@prisma/client").Prisma.UserDelegate>}
 */
const authQueryOptions = {
  getMe: {
    omit: {
      password: true,
    }, 
  },
  updateMe: {
    omit: {
      password: true,
    }, 
  },
  deleteMe: {},
  login: {},
  signup: {
    omit: {
      password: true,
    },
  },
  updatePassword: {},
}

export default authQueryOptions;
