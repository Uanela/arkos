import { ArkosRouter } from "arkos";

const postRouter = ArkosRouter();

postRouter.get("/:id/reviews/:reviewId");

export default postRouter;
