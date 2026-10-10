import { AuthService as ArkosAuthService } from "arkos/services";

export class AuthService extends ArkosAuthService {
  async login() {
    console.log("Running from here...");
    return super.login({ email: "", password: "" });
  }
}

const authService = new AuthService();

export default authService;

