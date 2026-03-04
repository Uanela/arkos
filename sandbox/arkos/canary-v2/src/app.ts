import arkos, { ArkosInterceptor } from "arkos";

const app = arkos();

app.use((req: any, res: any, next: any) => {
  console.log("mw working");
  next();
});

const userInterceptor = ArkosInterceptor("user");

app.load(userInterceptor);

app.listen();
