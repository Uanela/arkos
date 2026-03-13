import { ArkosServiceHook } from "arkos";

const userServiceHook = ArkosServiceHook("user");

userServiceHook.findMany({
  before: [
    ({ filters }) => {
      console.log("thebig2", filters);

      // next?.();
    },
  ],
});

export default userServiceHook;
