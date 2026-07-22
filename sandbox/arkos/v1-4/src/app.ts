import arkos, { ArkosRouter } from "arkos";
import userRouter from "./modules/user/user.router";
import z from "zod";

const router = ArkosRouter();

router.post(
  {
    path: "/testing",
    experimental: {
      uploads: { type: "single", field: "name" },
      openapi: {
        requestBody: z.object({ big: z.string() }),
        responses: { 200: z.object({ big: z.string() }) },
      },
    },
  },
  (req, res) => {
    res.json({ ping: "pong" });
  }
);

arkos.init({
  use: [userRouter, router], // pass your additional middlewares/routers here
});
