import { BaseController } from "arkos/controllers";

class UserController extends BaseController {
  constructor() {
    super("user");
  }
}

const userController = new UserController();

export default userController;
