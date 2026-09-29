import { ArkosRouter, RouteHook } from "arkos";
import authRolePolicy from "@/src/modules/auth-role/auth-role.policy";

export const hook: RouteHook = {
  createOne: { authentication: authRolePolicy.Create },
  findMany: { authentication: authRolePolicy.View },
  findOne: { authentication: authRolePolicy.View },
  updateOne: { authentication: authRolePolicy.Update },
  deleteOne: { authentication: authRolePolicy.Delete },
};

const authRoleRouter = ArkosRouter({ openapi: { tags: ["Auth Roles"] } });

export default authRoleRouter;
