import { ArkosConfig } from "arkos";

const config: ArkosConfig = {
  middlewares: {
    cors: {
      allowedOrigins:
        process.env.NODE_ENV !== "production" ? "*" : "your-production-url",
    },
  },
  authentication: {
    mode: "dynamic",
    login: {
      allowedUsernames: ["email"],
    },
  },
  routers: {
    strict: "no-bulk",
  },
  validation: {
    resolver: "class-validator",
  },
  swagger: {
    mode: "class-validator",
    strict: false,
  },
};

export default config;
