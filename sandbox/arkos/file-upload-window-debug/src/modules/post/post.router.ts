import { ArkosRouter } from "arkos";

export const config = {
  createOne: {
    validation: { body: false },
    experimental: {
      uploads: {
        type: "single",
        field: "0[cover]",
      },
    },
  },
};

const postRouter = ArkosRouter();

export default postRouter;
