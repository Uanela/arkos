import { ArkosRouter } from "arkos";
// import userController from "./user.controller"
import { RouterConfig } from "arkos";

export const config: RouterConfig<"prisma"> = {};

const userRouter = ArkosRouter({});

userRouter.get(
  {
    path: "/api/users/crazy",
    authentication: { action: "CustomAction", resource: "user" },
    validation: {},
    experimental: {
      openapi: {},
      // uploads: {}
    },
  },
  (req, res) => {
    res.json({ crazy: "yeah" });
  }
);

export default userRouter;
