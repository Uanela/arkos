import { ArkosRouter } from "arkos";
import { RouterConfig } from "arkos";

export const config: RouterConfig<"prisma"> = {};

const userRouter = ArkosRouter();

userRouter.post(
  {
    path: "/custom-endpoint",
    authentication: false,
    validation: {},
    experimental: {
      openapi: {},
      uploads: {
        type: "single",
        field: "some",
        attachToBody: "file",
      },
    },
  },
  (req, res) => {
    console.log(req.body);
    throw Error();

    res.send();
  }
);

export default userRouter;
