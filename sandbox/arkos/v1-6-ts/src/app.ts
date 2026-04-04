import arkos from "arkos";

const app = arkos();

app.set("trust proxy", 1);

app.get({ path: "/" }, (req, res) => {
  res.send("Hello World");
});

app.listen();
