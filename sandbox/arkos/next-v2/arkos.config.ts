import { defineConfig } from "arkos/config"
import prisma from "@/src/utils/prisma"

const arkosConfig = defineConfig({
  globalPrefix: "/api",
  prisma: {
    instance: prisma
  },
  source: {
    entryPoint: "src/server.ts"
  },
  authentication: {
    mode: 'static',
    login: {
      allowedUsernames: ['email'],
    }
  },
  routers: {
    strict: "no-bulk"
  },
  validation: {
    resolver: 'zod'
  },
  swagger: {
    strict: false,
  },
  middlewares: {
    cors: {},
  },
})

export default arkosConfig
