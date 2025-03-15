import { kebabCase } from "change-case-all";
import { Router } from "express";
import pluralize from "pluralize";
import {
  getAvalibleRoutes,
  handlerFactory,
  uploadFile,
  deleteFile,
  getDatabaseModels,
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
import { permissions } from "../../utils/permissions";
import authService from "../auth/auth.service";

const models = getModels();

const router: Router = Router();

models.forEach(async (model) => {
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
  } = await handlerFactory(model, modelModules);

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
});

(() => {
  router.get("/available-routes", getAvalibleRoutes);

  router.get("/database-models", authService.authenticate, getDatabaseModels);

  router.post(
    "/uploads/:fileType",
    authService.handleAuthenticationControl(
      permissions.uploads,
      "create",
      "file-upload"
    ),
    authService.handleActionAccessControl(
      permissions.uploads,
      "create",
      "file-upload"
    ),
    uploadFile
  );
  router.delete(
    "/uploads/:fileType/:fileName",
    authService.handleAuthenticationControl(
      permissions.uploads,
      "create",
      "file-upload"
    ),
    authService.handleActionAccessControl(
      permissions.uploads,
      "create",
      "file-upload"
    ),
    deleteFile
  );
})();

export default router;
