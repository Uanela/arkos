import { BaseService } from "arkos/services";
import { Prisma } from "@prisma/client";

class UserService extends BaseService<"user"> {}

const userService = new UserService("user");

export default userService;
