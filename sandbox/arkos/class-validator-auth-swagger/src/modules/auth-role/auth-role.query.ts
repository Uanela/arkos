import { Prisma } from "@prisma/client"
import { PrismaQueryOptions } from 'arkos/prisma';

const authRoleQueryOptions: PrismaQueryOptions<Prisma.AuthRoleDelegate> = {
    global: {},
    find: {},
    findOne: {
        include: {
          permissions: true
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

export default authRoleQueryOptions;
