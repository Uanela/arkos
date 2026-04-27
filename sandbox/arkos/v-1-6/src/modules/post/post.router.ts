import { ArkosRouter } from 'arkos';
import { RouteHook } from 'arkos'

export const hook: RouteHook<"prisma"> = { }


const postRouter = ArkosRouter({ 
  openapi: { tags: ["Posts"] }
})

export default postRouter
