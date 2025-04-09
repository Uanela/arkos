import { kebabCase } from "../../utils/helpers/change-case.helpers";
import { Router } from "express";
import pluralize from "pluralize";
import {
  getAvalibleRoutes,
  BaseController,
  getAvailableResources,
} from "./base.controller";
import {
  getModels,
  importPrismaModelModules,
} from "../../utils/helpers/models.helpers";
import {
  addPrismaQueryOptionsToRequestQuery,
  sendResponse,
} from "./base.middlewares";
import { PrismaQueryOptions } from "../../types";
import authService from "../auth/auth.service";
import { handleRequestBodyValidationAndTransformation } from "../../utils/helpers/base.controller.helpers";

const models = getModels();

export async function getPrismaModelsRouter() {
  const router: Router = Router();

  await new Promise((resolve) => {
    models.forEach(async (model, i) => {
      const modelNameInKebab = kebabCase(model);
      const modelModules = await importPrismaModelModules(modelNameInKebab);
      const { middlewares, authConfigs, prismaQueryOptions } = modelModules;

      const routeName = pluralize.plural(modelNameInKebab);
      const {
        createOne,
        findMany,
        findOne,
        updateOne,
        deleteOne,
        createMany,
        updateMany,
        deleteMany,
      } = new BaseController(model);

      router
        .route(`/${routeName}`)
        .post(
          authService.handleAuthenticationControl(
            authConfigs,
            "create",
            modelNameInKebab
          ),
          authService.handleActionAccessControl(
            authConfigs,
            "create",
            modelNameInKebab
          ),
          handleRequestBodyValidationAndTransformation(
            modelNameInKebab,
            "create"
          ),
          addPrismaQueryOptionsToRequestQuery<any>(
            prismaQueryOptions as PrismaQueryOptions<any>,
            "createOne"
          ),
          middlewares?.beforeCreateOne ?? createOne,
          middlewares?.beforeCreateOne
            ? createOne
            : middlewares?.afterCreateOne ?? sendResponse,
          middlewares?.beforeCreateOne && middlewares?.afterCreateOne
            ? middlewares?.afterCreateOne
            : sendResponse,
          sendResponse
        )
        .get(
          authService.handleAuthenticationControl(
            authConfigs,
            "view",
            modelNameInKebab
          ),
          authService.handleActionAccessControl(
            authConfigs,
            "view",
            modelNameInKebab
          ),
          addPrismaQueryOptionsToRequestQuery<any>(
            prismaQueryOptions as PrismaQueryOptions<any>,
            "findMany"
          ),
          middlewares?.beforeFindMany ?? findMany,
          middlewares?.beforeFindMany
            ? findMany
            : middlewares?.afterFindMany ?? sendResponse,
          middlewares?.beforeFindMany && middlewares?.afterFindMany
            ? middlewares?.afterFindMany
            : sendResponse,
          sendResponse
        );

      router
        .route(`/${routeName}/many`)
        .post(
          authService.handleAuthenticationControl(
            authConfigs,
            "create",
            modelNameInKebab
          ),
          authService.handleActionAccessControl(
            authConfigs,
            "create",
            modelNameInKebab
          ),
          addPrismaQueryOptionsToRequestQuery<any>(
            prismaQueryOptions as PrismaQueryOptions<any>,
            "createMany"
          ),
          middlewares?.beforeCreateMany ?? createMany,
          middlewares?.beforeCreateMany
            ? createMany
            : middlewares?.afterCreateMany ?? sendResponse,
          middlewares?.beforeCreateMany && middlewares?.afterCreateMany
            ? middlewares?.afterCreateMany
            : sendResponse,
          sendResponse
        )
        .patch(
          authService.handleAuthenticationControl(
            authConfigs,
            "update",
            modelNameInKebab
          ),
          authService.handleActionAccessControl(
            authConfigs,
            "update",
            modelNameInKebab
          ),
          addPrismaQueryOptionsToRequestQuery<any>(
            prismaQueryOptions as PrismaQueryOptions<any>,
            "updateMany"
          ),
          middlewares?.beforeUpdateMany ?? updateMany,
          middlewares?.beforeUpdateMany
            ? updateMany
            : middlewares?.afterUpdateMany ?? sendResponse,
          middlewares?.beforeUpdateMany && middlewares?.afterUpdateMany
            ? middlewares?.afterUpdateMany
            : sendResponse,
          sendResponse
        )
        .delete(
          authService.handleAuthenticationControl(
            authConfigs,
            "delete",
            modelNameInKebab
          ),
          authService.handleActionAccessControl(
            authConfigs,
            "delete",
            modelNameInKebab
          ),
          addPrismaQueryOptionsToRequestQuery<any>(
            prismaQueryOptions as PrismaQueryOptions<any>,
            "deleteMany"
          ),
          middlewares?.beforeDeleteMany ?? deleteMany,
          middlewares?.beforeDeleteMany
            ? deleteMany
            : middlewares?.afterDeleteMany ?? sendResponse,
          middlewares?.beforeDeleteMany && middlewares?.afterDeleteMany
            ? middlewares?.afterDeleteMany
            : sendResponse,
          sendResponse
        );

      router
        .route(`/${routeName}/:id`)
        .get(
          authService.handleAuthenticationControl(
            authConfigs,
            "view",
            modelNameInKebab
          ),
          authService.handleActionAccessControl(
            authConfigs,
            "view",
            modelNameInKebab
          ),
          addPrismaQueryOptionsToRequestQuery<any>(
            prismaQueryOptions as PrismaQueryOptions<any>,
            "findOne"
          ),
          middlewares?.beforeFindOne ?? findOne,
          middlewares?.beforeFindOne
            ? findOne
            : middlewares?.afterFindOne ?? sendResponse,
          middlewares?.beforeFindOne && middlewares?.afterFindOne
            ? middlewares?.afterFindOne
            : sendResponse,
          sendResponse
        )
        .patch(
          authService.handleAuthenticationControl(
            authConfigs,
            "update",
            modelNameInKebab
          ),
          authService.handleActionAccessControl(
            authConfigs,
            "update",
            modelNameInKebab
          ),
          handleRequestBodyValidationAndTransformation(
            modelNameInKebab,
            "update"
          ),
          addPrismaQueryOptionsToRequestQuery<any>(
            prismaQueryOptions as PrismaQueryOptions<any>,
            "updateOne"
          ),
          middlewares?.beforeUpdateOne ?? updateOne,
          middlewares?.beforeUpdateOne
            ? updateOne
            : middlewares?.afterUpdateOne ?? sendResponse,
          middlewares?.beforeUpdateOne && middlewares?.afterUpdateOne
            ? middlewares?.afterUpdateOne
            : sendResponse,
          sendResponse
        )
        .delete(
          authService.handleAuthenticationControl(
            authConfigs,
            "delete",
            modelNameInKebab
          ),
          authService.handleActionAccessControl(
            authConfigs,
            "delete",
            modelNameInKebab
          ),
          addPrismaQueryOptionsToRequestQuery<any>(
            prismaQueryOptions as PrismaQueryOptions<any>,
            "deleteOne"
          ),
          middlewares?.beforeDeleteOne ?? deleteOne,
          middlewares?.beforeDeleteOne
            ? deleteOne
            : middlewares?.afterDeleteOne ?? sendResponse,
          middlewares?.beforeDeleteOne && middlewares?.afterDeleteOne
            ? middlewares?.afterDeleteOne
            : sendResponse,
          sendResponse
        );

      if (i === models.length - 1) resolve(undefined);
    });
  });

  return router;
}

export function getAvailableResourcesAndRoutesRouter(): Router {
  const router = Router();

  router.get("/available-routes", authService?.authenticate, getAvalibleRoutes);

  router.get(
    "/available-resources",
    authService?.authenticate,
    getAvailableResources
  );

  return router;
}
