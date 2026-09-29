import arkos from "arkos";
import router from "@/src/router";
import z from "zod";
import { IsString } from "class-validator";

const app = arkos();

app.set("trust proxy", 1);

const Query = z.object({ greetings: z.string() });
type Query = z.infer<typeof Query>;

class QueryDto {
  @IsString()
  small!: string;
}

app.get({ path: "/hello", validation: { query: QueryDto } }, (req, res) => {
  req.query;
  res.json({ message: true });
});

app.use(router);

export default app;

