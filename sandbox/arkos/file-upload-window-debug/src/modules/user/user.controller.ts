import { ArkosRequest, ArkosResponse } from "arkos";
import { BaseController } from "arkos/controllers";

class UserController extends BaseController {
  async myMethod(req: ArkosRequest, res: ArkosResponse) {}
}

const userController = new UserController("user");

export default userController;
