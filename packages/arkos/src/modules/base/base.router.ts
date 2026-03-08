import { Router } from "express";
import { getAvailableResources } from "./base.controller";
import authService from "../auth/auth.service";
import { setupRouters } from "./utils/helpers/base.router.helpers";
import { ArkosRouter } from "../../exports";
import { UserArkosConfig } from "../../utils/define-config";

export function getPrismaModelsRouter(arkosConfigs: UserArkosConfig) {
  const router = ArkosRouter();

  setupRouters(router, arkosConfigs);

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
