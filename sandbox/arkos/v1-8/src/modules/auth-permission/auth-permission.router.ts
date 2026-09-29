import { ArkosRouter, RouteHook } from "arkos";
import authPermissionPolicy from "@/src/modules/auth-permission/auth-permission.policy";

export const hook: RouteHook = {
  createOne: { authentication: authPermissionPolicy.Create },
  findMany: { authentication: authPermissionPolicy.View },
  findOne: { authentication: authPermissionPolicy.View },
  updateOne: { authentication: authPermissionPolicy.Update },
  deleteOne: { authentication: authPermissionPolicy.Delete },
};

const authPermissionRouter = ArkosRouter({ openapi: { tags: ["Auth Permissions"] } });

export default authPermissionRouter;
