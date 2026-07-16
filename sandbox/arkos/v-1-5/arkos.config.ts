import { ArkosConfig } from "arkos";

const config: ArkosConfig = {
  authentication: {
    mode: "static",
    login: {
      allowedUsernames: ["email"],
    },
    enabled: false,
  },
  routers: {
    strict: "no-bulk",
  },
  validation: {
    resolver: "zod",
  },
  swagger: {
    mode: "zod",
    strict: false,
  },
  middlewares: {
    cors: {},
  },
  fileUpload: {
    expressStatic: {
      fallthrough: false,
    },
  },
};

export default config;
