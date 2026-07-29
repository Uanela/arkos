import { ArkosRouter, ArkosRouteHook } from 'arkos';
import userPolicy from '@/src/modules/user/user.policy';
import CreateUserDto from '@/src/modules/user/dtos/create-user.dto';
import UpdateUserDto from '@/src/modules/user/dtos/update-user.dto';

const userRouteHook = ArkosRouteHook("user");

userRouteHook.createOne({
  validation: { body: CreateUserDto },
  authentication: userPolicy.Create,
  prismaArgs: {
    omit: { password: true },
  },
});

userRouteHook.findOne({
  authentication: userPolicy.View,
  prismaArgs: {
    omit: { password: true },
  },
});

userRouteHook.findMany({
  authentication: userPolicy.View,
  prismaArgs: {
    omit: { password: true },
  },
});

userRouteHook.updateOne({
  validation: { body: UpdateUserDto },
  authentication: userPolicy.Update,
  prismaArgs: {
    omit: { password: true },
  },
});

userRouteHook.deleteOne({
  authentication: userPolicy.Delete,
});

const userRouter = ArkosRouter({
  prefix: "/users",
  openapi: { tags: ["Users"] },
});

userRouter.load(userRouteHook);

export default userRouter;
