import { BaseService } from "arkos/services";
import { Prisma } from "@prisma/client"

class AuthRoleService extends BaseService<Prisma.AuthRoleDelegate> {}

const authRoleService = new AuthRoleService("auth-role");

export default authRoleService;
