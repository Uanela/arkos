import { ArkosRequest } from "arkos";
import { BaseController } from "arkos/controllers";

class PostController extends BaseController {
  async my(req: ArkosRequest) {
    req.user;
  }
}

const postController = new PostController("post");

export default postController;
