import { ArkosRouter } from "arkos";
import { RouterConfig } from "arkos";
import {
  ErrorRequestHandler,
  NextFunction,
  Request,
  RequestHandler,
  Response,
  Router,
} from "express";
import { z } from "zod";

export const config: RouterConfig<"prisma"> = {};

const userRouter = ArkosRouter({});

userRouter.post(
  {
    path: "/custom-endpoint",
    authentication: false,
    validation: {
      body: z.object({
        b: z.array(z.string()),
      }),
    },
    experimental: {
      openapi: {},
      uploads: {
        type: "fields",
        fields: [{ name: "good" }, { name: "hello" }],
        attachToBody: "file",
      },
    },
  },
  (req: any, res: any) => {
    console.log(req.body);
    throw Error();

    res.send();
  }
);

export default userRouter;

const router = Router();

router.get("", (req, res, next) => {});
router.get(
  "",
  (req: Request, res: Response, next: NextFunction) => {},
  (err: any, req: Request, res: Response, next: NextFunction) => {}
);

const a: (RequestHandler | ErrorRequestHandler)[] = [
  (err, req, res, next) => {},
];
