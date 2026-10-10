import { ArkosRouter } from "arkos";
import { RouteHook } from "arkos";
import authService from "./auth.service";
import { z } from "zod";

export const hook: RouteHook<"auth"> = {
  service: authService,
  login: {
    validation: {
      body: z.object({
        email: z.email(),
      }),
    },
  },
};

const authRouter = ArkosRouter({
  openapi: { tags: ["Authentication"] },
});

export default authRouter;

