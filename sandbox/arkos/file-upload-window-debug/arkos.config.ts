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
    enabled: false,
  },
  validation: {
    resolver: "zod",
    validationOptions: { forbidNonWhitelisted: true },
  },
  swagger: {
    mode: "zod",
    strict: false,
    scalarApiReferenceConfiguration: {
      async onBeforeRequest({ request }) {
        (request as any).method = "GET";
        // console.log(request);
      },
      // async onLoaded(a) {
      //   console.log(a);
      // },
    },
  },
};

export default config;
