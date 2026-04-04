import { defineConfig } from "arkos/config";

const arkosConfig = defineConfig({
  authentication: {
    mode: "static",
    login: {
      allowedUsernames: ["username"],
    },
    hooks: {
      authenticate: {
        before: async ({ req, next, skip }) => {
          console.log("hello");
          // throw new Error("Error bro");
        },
        onError: () => {
          console.log("error on authenticate");
        },
      },
      authorize: {
        before: ({ req, skip, next }) => {
          console.log("bwua");
          next();
        },
        after: ({ req, next }) => {
          console.log("after dude...");
          // skip();
        },
      },
    },
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

export default arkosConfig;
