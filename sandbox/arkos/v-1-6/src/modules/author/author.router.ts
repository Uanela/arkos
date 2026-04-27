import { ArkosRouter } from 'arkos';
import { RouteHook } from 'arkos'

export const hook: RouteHook<"prisma"> = { }


const authorRouter = ArkosRouter({ 
  openapi: { tags: ["Authors"] }
})

export default authorRouter
