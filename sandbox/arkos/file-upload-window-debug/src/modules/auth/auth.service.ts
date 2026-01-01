import { AuthService as ArkosAuthService } from "arkos/services";
  
class AuthService extends ArkosAuthService {}

const authService = new AuthService();

export default authService;
