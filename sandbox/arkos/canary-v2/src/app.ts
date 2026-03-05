import arkos, { ArkosRouteHook } from "arkos";
import { createServer } from "http";

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
  prismaArgs: {},
});

app.load(userRouteHook);

app.build();

const server = createServer(app as any);

server.listen(...app.getServerConfig());
