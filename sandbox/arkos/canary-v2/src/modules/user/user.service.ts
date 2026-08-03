import { ArkosPrismaService } from "arkos/services";
import { Prisma } from "@prisma/client";
import { CreateUserSchema } from "./schemas/create-user.schema";
import prisma from '@/src/utils/prisma';

class UserService extends ArkosPrismaService<"user"> {
  async createOne<O extends Omit<Prisma.UserCreateArgs, "data">>(data: CreateUserSchema, options?: O) {

    console.log("running", data, options);

    const result = await super.createOne(data);
    // const result2 = await prisma.user.create({ data: { ...data } });
    // return true;

    return result;
  }
}

const userService = new UserService("user");

export default userService;
