import { defineConfig } from "arkos/config"

const arkosConfig = defineConfig({
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
    resolver: 'hybrid'
  },
  swagger: {
    mode: 'hybrid',
    strict: false,
  },
  middlewares: {
    cors: {},
  },
})

export default arkosConfig
