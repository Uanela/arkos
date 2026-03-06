import arkos, { ArkosRequest } from "arkos";
import userRouter, { r } from "./modules/user/user.router";
import { Request } from "express";

// console.log(process.env.MY_VAR);
arkos.init({
  // a,
  configureApp: async (app) => {
    app.use((req: Request, res, next) => {
      // req.headers["x-forwarded-proto"] = "https";
      next();
    });
    return app;
  },
  use: [userRouter, r],
});
// console.log(a + 2);

const a: any = 1;
