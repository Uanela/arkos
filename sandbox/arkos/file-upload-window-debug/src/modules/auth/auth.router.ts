import { ArkosRouter } from "arkos";
import { RouterConfig } from "arkos";
import z from "zod";

export const config: RouterConfig<"auth"> = {
  getMe: {
    validation: {
      // body: z.object({ the: z.string() }),
      // params: z.object({ sheu: z.string() }),
    },
    experimental: {
      openapi: {
        parameters: [
          // { name: "uanela", in: "path", schema: { type: "string" } },
        ],
        responses: {
          201: z.object({ data: z.object({ uanela: z.number() }) }),
        },
      },
    },
  },
  login: {
    // validation: false,
    experimental: {
      uploads: {
        type: "single",
        field: "cover",
      },
    },
  },
};

const authRouter = ArkosRouter();

export default authRouter;
