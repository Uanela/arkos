import { ArkosRouter } from "arkos";
import { RouterConfig } from "arkos";

export const config: RouterConfig = {
  findMany: {
    validation: {
      query: false,
    },
  },
};

const userRouter = ArkosRouter();

export default userRouter;
