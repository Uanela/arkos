import arkos from "arkos";
import router from "@/src/router";

const app = arkos();

app.set("trust proxy", 1);

app.use(router);

export default app;
