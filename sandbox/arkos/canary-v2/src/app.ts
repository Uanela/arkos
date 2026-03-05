import arkos, { ArkosRouteHook, ArkosServiceHook } from "arkos";
import { BaseService } from "arkos/services";
import http from "http";
import z from "zod";

const app = arkos();

const mw = (msg?: any) => (req: any, res: any, next: any) => {
  console.log(msg);
  next();
};

app.use(mw("test"));

const userRouteHook = ArkosRouteHook("user");

userRouteHook.findMany({
  before: [mw("hello bro")],
  after: [mw("hello from after")],
  validation: { body: z.object({ the: z.string() }) },
  prismaArgs: {
    omit: {
      id: true,
    },
  },
});

// const userService = new BaseService("user");

// const users = userService.findMany();

const userServiceHook = ArkosServiceHook("user");

userServiceHook.findMany({
  before: [
    ({ filters }) => {
      console.log("thebig2", filters);

      // next?.();
    },
  ],
});

app.load(userServiceHook);
app.load(userRouteHook);

app.build();

const server = http.createServer(app as any);

server.listen(...app.getServerConfig());
