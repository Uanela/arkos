// import { defineConfig } from "arkos";
import prisma from "./src/utils/prisma";

// console.log(defineConfig);

function defineConfig(a: any) {
  return a;
}

const config = defineConfig({
  prisma: { instance: prisma },
  authentication: {
    mode: "static",
    login: {
      allowedUsernames: ["username"],
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
    cors: {
      allowedOrigins:
        process.env.NODE_ENV !== "production" ? "*" : "your-production-url",
    },
  },
});

export default config;
