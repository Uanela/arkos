import arkos from "arkos";
import userRouter, { r } from "./modules/user/user.router";

// console.log(process.env.MY_VAR);
arkos.init({
  // a,
  configureApp: async (app) => {
    app.use((req, res, next) => {
      // req.headers["x-forwarded-proto"] = "https";
      console.log(req.originalUrl);
      next();
    });
    return app;
  },
  use: [userRouter, r],
});
// console.log(a + 2);

const a: any = 1;
