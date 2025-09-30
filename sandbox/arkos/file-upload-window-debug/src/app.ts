import arkos from "arkos";

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
  },
  validation: {
    resolver: "zod",
  },
  swagger: {
    mode: "zod",
    strict: false,
  },
});
