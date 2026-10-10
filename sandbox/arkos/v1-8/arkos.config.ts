import { defineConfig } from "arkos/config";

const arkosConfig = defineConfig({
  source: {
    entryPoint: "src/server.ts",
  },
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
    resolver: "hybrid",
  },
  swagger: {
    mode: "hybrid",
    strict: false,
    scalarApiReferenceConfiguration: {
      customCss: `.scalar-app-layout {
width: 100vw !important;
height: 100vh !important;
max-width: 100vw !important;
max-height: 100vh !important;
top: 0 !important;
left: 0 !important;
transform: none !important;
border-radius: 0 !important;
}`,
    },
  },
  middlewares: {
    cors: {},
  },
});

export default arkosConfig;

