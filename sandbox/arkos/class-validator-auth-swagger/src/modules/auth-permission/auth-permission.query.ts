import { Prisma } from "@prisma/client"
import { PrismaQueryOptions } from 'arkos/prisma';

const authPermissionQueryOptions: PrismaQueryOptions<Prisma.AuthPermissionDelegate> = {
    global: {},
    find: {
        include: {
            role: true
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
    saveOne: {},
    delete: {},
    deleteMany: {},
    deleteOne: {},
}

export default authPermissionQueryOptions;
