import arkos from "arkos";
import router from "@/src/router";

const app = arkos();

app.set("trust proxy", 1);

app.use(router);

app.get({ path: "/health" }, (req, res, next) => {
  console.log(req.headers);

  next();
});

export default app;

