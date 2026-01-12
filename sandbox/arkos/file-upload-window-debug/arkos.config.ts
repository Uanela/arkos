import { ArkosConfig } from "arkos";

const config: ArkosConfig = {
  middlewares: {
    cors: {
      allowedOrigins:
        process.env.NODE_ENV !== "production" ? "*" : "your-production-url",
    },
  },
  authentication: {
    mode: "static",
    login: {
      allowedUsernames: ["username"],
    },
    enabled: true,
  },
  validation: {
    resolver: "zod",
    validationOptions: { forbidNonWhitelisted: true },
  },
  swagger: {
    mode: "zod",
    strict: false,
  },
};

export default config;
