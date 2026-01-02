import { ArkosRouter } from "arkos";
import { RouterConfig } from "arkos";
import { IRouter, Router } from "express";
import userController from "./user.controller";
import z from "zod";

export const config: RouterConfig = {
  findMany: {
    validation: {
      query: false,
    },
  },
  createOne: {
    validation: {
      body: z.object({ the: z.string() }),
    },
    experimental: {
      // openapi: {},
    },
  },
};

const userRouter = ArkosRouter();

const router: Router = Router();
userRouter.get({ path: "/{userAge}/{another}" }, (req: any, res: any) => {
  res.send("hello");
});

router.get("", () => {});

const aux = "" as any as Omit<Router, "post">;
userRouter.route("").get();

// userRouter.get({ path: "" }, userController.myMethod);
// userRouter.use("", userRouter.use(userRouter));

export default userRouter;
