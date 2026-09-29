import { BaseService } from "arkos/services";
class AuthPermissionService extends BaseService<"auth-permission"> {}

const authPermissionService = new AuthPermissionService("auth-permission");

export default authPermissionService;
