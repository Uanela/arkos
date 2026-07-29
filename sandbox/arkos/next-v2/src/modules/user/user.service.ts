import { ArkosPrismaService } from "arkos/services";

class UserService extends ArkosPrismaService<"user"> {}

const userService = new UserService("user");

export default userService;
