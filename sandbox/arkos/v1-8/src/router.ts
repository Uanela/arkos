import { ArkosRouter } from "arkos";
import arkosConfig from "@/arkos.config";

const router = ArkosRouter({ 
  prefix: arkosConfig.globalPrefix || "/api",
})

export default router;
