import arkos from "arkos";
import http from "http";
import appLoadables from "./loadables";

export const app = arkos();

export const mw = (msg?: any) => (req: any, res: any, next: any) => {
  console.log(msg);
  next();
};

app.use(mw("test"));

// const userService = new BaseService("user");

// const users = userService.findMany();

// app.load(userServiceHook);
app.load(...appLoadables);

app.build();

const server = http.createServer(app);

app.listen(server);
