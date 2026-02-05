import { ArkosRouter } from "arkos";
import postController from "./post.controller";
import { RouterConfig } from "arkos";
import QueryPostSchema from "./schemas/query-post.schema";

export const config: RouterConfig<"prisma"> = {
  findMany: {
    validation: {
      query: QueryPostSchema,
    },
  },
};

const postRouter = ArkosRouter();

export default postRouter;
