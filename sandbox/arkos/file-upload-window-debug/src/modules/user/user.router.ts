import { ArkosRouter } from "arkos";
import { RouterConfig } from "arkos";
import { IRouter, Router } from "express";
import userController from "./user.controller";
import z from "zod";
import { AppError } from "arkos/error-handler";
import UserQuerySchema from "./schemas/query-user.schema";

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

function gen(text: string) {
  return (req: any, res: any, next: any) => {
    // throw new AppError("big one", 300);
    res.json({ message: text });
  };
}

function nextCall() {
  return (req: any, res: any, next: any) => {
    console.log("callingnext", next);
    next();
  };
}

userRouter
  .route("/the-user")
  .get(
    { authentication: false, validation: { query: UserQuerySchema } },
    nextCall(),
    [nextCall()],
    [gen("answer")]
  )
  .post({ authentication: false }, nextCall(), [nextCall()], [gen("answer")]);

export const r = Router();

/**
 * @swagger
 * /api/users/big:
 * tags:
 *  - ["Defaults"]
 */
r.route("/big").get([nextCall()], nextCall()).get(gen("wegot"));

// userRouter.get({ path: "" }, userController.myMethod);
// userRouter.use("", userRouter.use(userRouter));
userRouter.use(r);

export default userRouter;
