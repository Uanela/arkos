import { ArkosRouter, ArkosRouteHook } from 'arkos';
import authPolicy from '@/src/modules/auth/auth.policy';
import LoginDto from '@/src/modules/auth/dtos/login.dto';
import SignupDto from '@/src/modules/auth/dtos/signup.dto';
import UpdateMeDto from '@/src/modules/auth/dtos/update-me.dto';
import UpdatePasswordDto from '@/src/modules/auth/dtos/update-password.dto';

const authRouteHook = ArkosRouteHook("auth");

authRouteHook.login({
  validation: { body: LoginDto },
});

authRouteHook.signup({
  validation: { body: SignupDto },
  prismaArgs: {
    omit: { password: true },
  },
});

authRouteHook.getMe({
  prismaArgs: {
    omit: { password: true },
  },
});

authRouteHook.updateMe({
  validation: { body: UpdateMeDto },
  prismaArgs: {
    omit: { password: true },
  },
});

authRouteHook.updatePassword({
  validation: { body: UpdatePasswordDto },
});

authRouteHook.logout({});

const authRouter = ArkosRouter({
  prefix: "/auth",
  openapi: { tags: ["Authentication"] },
});

authRouter.load(authRouteHook);

export default authRouter;
