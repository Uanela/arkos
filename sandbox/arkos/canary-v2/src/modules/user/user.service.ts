import { ArkosPrismaService } from "arkos/services";
import { Prisma } from "@prisma/client";

class UserService extends ArkosPrismaService<"user"> {
  async createOne() {}
}

const userService = new UserService("user");

export default userService;
