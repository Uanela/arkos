import arkos from "arkos";
import { getHandlerErrors, initializeASTs } from "./utils/ast-handler";
import { AppError } from "arkos/error-handler";
import userRouter, { r } from "./modules/user/user.router";

(async () => {
  console.time("ast");
  await initializeASTs();
  console.timeEnd("ast");
  const login = new AppError("Special One", 408);

  function func(req: any) {
    if (!req?.user) throw new AppError("Unauthorized", 401);

    throw login;
  }
  async function myHandler(req: any, res: any) {
    func(req);
    const msg = req == 1 ? "hello" : "buwy";

    throw login;
    if (!req.body) throw new AppError("hello" + msg + "boss", 400);
  }

  const errors = getHandlerErrors(myHandler);
  // console.log(errors);
  console.log(new Date().toISOString());

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
})();
// console.log(process.env.MY_VAR);
// console.log(a + 2);

const a: any = 1;
