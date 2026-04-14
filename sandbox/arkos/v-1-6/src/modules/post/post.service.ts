import { BaseService } from "arkos/services";
  
export class PostService extends BaseService<"post"> {}

const postService = new PostService("post");

export default postService;
