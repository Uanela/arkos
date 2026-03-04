import { Router } from "express";
import { getAvailableResources } from "./base.controller";
import authService from "../auth/auth.service";
import { ArkosConfig } from "../../types/new-arkos-config";
import { setupRouters } from "./utils/helpers/base.router.helpers";
import { ArkosRouter } from "../../exports";
import { ArkosLoadableRegistry } from "../../components/arkos-loadable-registry";

export function getPrismaModelsRouter(registry: ArkosLoadableRegistry) {
  const router = ArkosRouter();

  setupRouters(router, registry);

  return router;
}

export function getAvailableResourcesAndRoutesRouter(): Router {
  const router = Router();

  router.get(
    "/available-resources",
    authService?.authenticate,
    getAvailableResources
  );

  return router;
}
