import arkos from "arkos";
import userRouter from "./modules/user/user.router";

arkos.init({
  use: [userRouter], // pass your additional middlewares/routers here
});
