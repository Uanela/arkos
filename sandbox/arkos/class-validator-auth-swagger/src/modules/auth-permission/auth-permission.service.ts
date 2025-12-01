import { BaseService } from "arkos/services";
import { Prisma } from "@prisma/client";

class AuthPermissionService extends BaseService<"auth-permission"> {}

const authPermissionService = new AuthPermissionService("auth-permission");

export default authPermissionService;
