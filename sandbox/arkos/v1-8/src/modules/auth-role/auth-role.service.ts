import { BaseService } from "arkos/services";
class AuthRoleService extends BaseService<"auth-role"> {}

const authRoleService = new AuthRoleService("auth-role");

export default authRoleService;
