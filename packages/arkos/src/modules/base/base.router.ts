import { setupRouters } from "./utils/helpers/base.router.helpers";
import { ArkosRouter } from "../../exports";
import { ArkosLoadableRegistry } from "../../components/arkos-loadable-registry";

export function getPrismaModelsRouter(registry: ArkosLoadableRegistry) {
  const router = ArkosRouter();

  setupRouters(router, registry);

  return router;
}
