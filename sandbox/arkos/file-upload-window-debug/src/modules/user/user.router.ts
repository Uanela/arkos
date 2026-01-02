import { ArkosRouter } from "arkos";
import { RouterConfig } from "arkos";
import { IRouter, Router } from "express";
import userController from "./user.controller";
import z from "zod";

export const config: RouterConfig = {
  findMany: {
    validation: {
      // params: z.object({ sheu: z.string() }),
    },
    experimental: {
      openapi: {
        // parameters: [{ name: "the-boss", in: "path", required: false }],
      },
    },
  },
  createOne: {
    validation: {
      body: z.object({ the: z.string() }),
      // params: z.object({ sheu: z.string() }),
    },
    experimental: {
      openapi: {
        parameters: [
          // { name: "uanela", in: "path", schema: { type: "string" } },
        ],
        responses: {
          201: z.object({ data: z.object({ uanela: z.number() }) }),
        },
      },
    },
  },
};

const userRouter = ArkosRouter();

const router: Router = Router();
userRouter.get(
  {
    path: "/anoter/:theboss?/:uanela?",
    experimental: {
      openapi: {
        parameters: [
          {
            name: "uanela",
            in: "path",
            schema: { type: "string" },
            required: false,
          },
        ],
      },
    },
  },
  (req: any, res: any) => {
    res.send("hello");
  }
);

router.get("", () => {});

const aux = "" as any as Omit<Router, "post">;
userRouter.route("").get();

// userRouter.get({ path: "" }, userController.myMethod);
// userRouter.use("", userRouter.use(userRouter));

export default userRouter;
