import { ArkosRouter } from 'arkos';
import { RouteHook } from 'arkos'

export const hook: RouteHook<"auth"> = { }


const authRouter = ArkosRouter({ 
  openapi: { tags: ["Auths"] }
})

export default authRouter
