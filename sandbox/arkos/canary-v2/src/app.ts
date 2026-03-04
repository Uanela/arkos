import arkos, { ArkosInterceptor } from "arkos";
import { createServer } from "http";

const app = arkos();

const mw = (msg?: any) => (req: any, res: any, next: any) => {
  console.log(msg);
  next();
};

app.use(mw("test"));

const userInterceptor = ArkosInterceptor("user");

userInterceptor.findMany({
  before: [mw("hello bro")],
  prismaQuery: {},
});

app.load(userInterceptor);

app.setup();

const server = createServer(app as any);

server.listen(...app.getServerConfig());
