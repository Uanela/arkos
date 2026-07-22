import arkos, { ArkosRequest, ArkosRouter } from "arkos";
import userRouter from "./modules/user/user.router";
import z from "zod";

const router1 = ArkosRouter();

router1.post(
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

const router = ArkosRouter();

router.post(
  {
    path: "/test-upload-single-one-level",
    // validation: { body: z.object({}) },
    experimental: {
      uploads: {
        type: "array",
        field: "banner",
      },
    },
  },
  (req: ArkosRequest, res) => {
    console.log("body", req.body);
    console.log("file", req.file);
    console.log("files", req.files);
    res.send("pong");
  }
);

arkos.init({
  use: [userRouter, router, router1], // pass your additional middlewares/routers here
});
