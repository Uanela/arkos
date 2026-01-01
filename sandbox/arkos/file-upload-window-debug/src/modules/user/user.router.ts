import { ArkosRouter } from "arkos";
import { RouterConfig } from "arkos";
import { IRouter, Router } from "express";

export const config: RouterConfig = {
  findMany: {
    validation: {
      query: false,
    },
  },
};

const userRouter = ArkosRouter();

const router: Router = Router();
userRouter.get({ path: "" }, () => {});

router.get("", () => {});

const aux = "" as any as Omit<Router, "post">;

userRouter.use("", router);
userRouter.use("", userRouter.use(userRouter));

export default userRouter;
