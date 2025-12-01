import arkos, { ArkosRouter } from "arkos";

const router = ArkosRouter();

router.post(
  {
    path: "/api/test",
    bodyParser: [{ parser: "json" }, { parser: "multipart" }],
  },
  (req: any, res: any) => {
    console.log(req.body);
    res.json({ message: req.body });
  }
);

arkos.init({ use: [router] });
