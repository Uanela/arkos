import { ArkosRouter } from "arkos";
// import userController from "./user.controller"

export const config = {};

const userRouter = ArkosRouter();

userRouter.post(
  {
    path: "/api/test",
    bodyParser: [{ parser: "multipart" }],
  },
  (req, res, next) => {
    console.log(req.body);
    res.json({ message: req.body });
  }
);

// userRouter.get(
//   {
//     path: "/custom-endpoint",
//     authentication: { action: "CustomAction", resource: "user" },
//     validation: {},
//     experimental: {
//       openapi: {},
//       // uploads: {}
//     }
//   },
//   userController.someHandler
// )

export default userRouter;
