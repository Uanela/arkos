import { ArkosRequest, ArkosRouteHook } from "arkos";
// import { mw } from "../../app";
import z from "zod";
import userService from "./user.service";

export const mw = (msg?: any) => (req: ArkosRequest, res: any, next: any) => {
  console.log(msg, req.user);
  next();
};
const userRouteHook = ArkosRouteHook("user", {
  service: userService
});

userRouteHook.createOne({
  before: [mw("hello bro")],
  after: [mw("hello from after")],
  validation: { body: z.object({ the: z.string() }) },
  prismaArgs: {
    omit: {
      id: true,
    },
  },
});

export default userRouteHook;
