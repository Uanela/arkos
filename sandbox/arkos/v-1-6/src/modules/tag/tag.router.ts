import { ArkosRouter } from 'arkos';
import { RouteHook } from 'arkos'

export const hook: RouteHook<"prisma"> = { }


const tagRouter = ArkosRouter({ 
  openapi: { tags: ["Tags"] }
})

export default tagRouter
