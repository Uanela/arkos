import { Prisma } from "@prisma/client"
import { AuthPrismaQueryOptions } from 'arkos/prisma';

const authQueryOptions: AuthPrismaQueryOptions<Prisma.UserDelegate> = {
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
