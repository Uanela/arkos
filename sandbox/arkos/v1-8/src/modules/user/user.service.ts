import { BaseService } from "arkos/services";
class UserService extends BaseService<"user"> {}

const userService = new UserService("user");

export default userService;
