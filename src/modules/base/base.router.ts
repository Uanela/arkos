import { Router } from "express";
import { getAvalibleRoutes, getAvailableResources } from "./base.controller";
import { getModels } from "../../utils/helpers/models.helpers";

import authService from "../auth/auth.service";
import { ArkosConfig } from "../../types/arkos-config";
import { setupRouters } from "./utils/helpers/base.router.helpers";

export async function getPrismaModelsRouter(arkosConfigs?: ArkosConfig) {
  const router: Router = Router();

  await Promise.all(setupRouters(getModels(), router));

  return router;
}

export function getAvailableResourcesAndRoutesRouter(): Router {
  const router = Router();
  //
  router.get(
    "/available-routes",
    authService?.authenticate,
    // authService?.handleActionAccessControl({}, "view", ""),
    getAvalibleRoutes
  );

  router.get(
    "/available-resources",
    authService?.authenticate,
    // authService?.handleActionAccessControl({}, "view", ""),
    getAvailableResources
  );

  return router;
}
