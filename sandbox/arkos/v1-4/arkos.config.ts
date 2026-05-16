import { ArkosConfig } from "arkos";

const config: ArkosConfig = {
  authentication: {
    mode: "static",
    login: {
      allowedUsernames: ["username"],
    },
    // jwt: {
    //   secret: "Hello",
    // },
    enabled: false,
  },
  routers: {},
  validation: {
    resolver: "zod",
  },
  swagger: {
    mode: "zod",
    strict: false,
    scalarApiReferenceConfiguration: {
      cdn: "https://cdn.jsdelivr.net/npm/@scalar/api-reference@1.50.0",
    },
  },
  middlewares: {
    cors: {
      allowedOrigins:
        process.env.NODE_ENV !== "production" ? "*" : "your-production-url",
    },
  },
  warnings: {
    suppress: {
      prisma: {
        noInstanceFound: true,
        noSchemaFound: true,
      },
    },
  },
};

export default config;
