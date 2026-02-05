import { BaseService } from "arkos/services";
  
class PostService extends BaseService<"post"> {}

const postService = new PostService("post");

export default postService;
