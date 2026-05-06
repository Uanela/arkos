import arkos, { ArkosRequest, ArkosRouter } from "arkos";
import userRouter from "./modules/user/user.router";

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
  use: [userRouter, router], // pass your additional middlewares/routers here
});
