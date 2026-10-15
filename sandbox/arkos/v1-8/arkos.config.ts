import { defineConfig } from "arkos/config";

const arkosConfig = defineConfig({
  globalPrefix: "/api",
  source: {
    entryPoint: "src/server.ts",
  },
  authentication: {
    mode: "static",
    login: {
      allowedUsernames: ["email", "phones.some.number", "hell.hellow.christ"],
    },
    enabled: false,
  },
  routers: {
    strict: "no-bulk",
  },
  validation: {
    resolver: "hybrid",
  },
  swagger: {
    mode: "hybrid",
    strict: false,
  },
  middlewares: {
    cors: {},
  },
});

export default arkosConfig;

