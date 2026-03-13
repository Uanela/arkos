import { ArkosRouteHook } from "arkos";
// import { mw } from "../../app";
import z from "zod";

export const mw = (msg?: any) => (req: any, res: any, next: any) => {
  console.log(msg);
  next();
};
const userRouteHook = ArkosRouteHook("user");

userRouteHook.findMany({
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
