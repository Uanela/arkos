import { BaseService } from "arkos/services";
  
export class TagService extends BaseService<"tag"> {}

const tagService = new TagService("tag");

export default tagService;
