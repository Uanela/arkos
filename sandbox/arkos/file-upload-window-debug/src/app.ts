import arkos from "arkos";
import ArkosRouter from "./utils/arkos-router";

const router = ArkosRouter();

router.get({ route: "/api/alo2" }, (req: any, res: any, next: any) => {
  res.json({ message: "alloy" });
});

arkos.init({
  cors: {
    allowedOrigins:
      process.env.NODE_ENV !== "production" ? "*" : "your-production-url",
  },
  authentication: {
    mode: "static",
    login: {
      allowedUsernames: ["username"],
    },
  },
  routers: {
    strict: true,
    additional: [router as any],
  },
  validation: {
    resolver: "zod",
  },
  swagger: {
    mode: "zod",
    strict: false,
  },
});
