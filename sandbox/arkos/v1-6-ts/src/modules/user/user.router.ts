import { ArkosRouter, RouterConfig } from "arkos";
import userPolicy from "@/src/modules/user/user.policy";

export const hook: RouterConfig = {
  createOne: { authentication: userPolicy.Create },
  findMany: { authentication: false },
  findOne: { authentication: userPolicy.View },
  updateOne: { authentication: userPolicy.Update },
  deleteOne: { authentication: userPolicy.Delete },
};

const userRouter = ArkosRouter({ openapi: { tags: ["Users"] } });

export default userRouter;
