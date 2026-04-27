import { BaseService } from "arkos/services";
  
export class AuthorService extends BaseService<"author"> {}

const authorService = new AuthorService("author");

export default authorService;
