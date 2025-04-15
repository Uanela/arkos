import { Router } from "express";
import pluralize from "pluralize";
import { RouterConfig } from "../../../../exports";
import { kebabCase } from "../../../../exports/utils";
import { PrismaQueryOptions } from "../../../../types";
import { RouterEndpoint } from "../../../../types/router-config";
import { handleRequestBodyValidationAndTransformation } from "../../../../utils/helpers/base.controller.helpers";
import { importPrismaModelModules } from "../../../../utils/helpers/models.helpers";
import authService from "../../../auth/auth.service";
import { BaseController } from "../../base.controller";
import {
  addPrismaQueryOptionsToRequestQuery,
  sendResponse,
} from "../../base.middlewares";

export function setupRouters(models: string[], router: Router) {
  return models.map(async (model) => {
    const modelNameInKebab = kebabCase(model);
    const modelModules = await importPrismaModelModules(modelNameInKebab);
    const {
      middlewares,
      authConfigs,
      prismaQueryOptions,
      router: customRouterModule,
    } = modelModules;

    const routeName = pluralize.plural(modelNameInKebab);
    const apiRoutePath = `/api/${routeName}`;
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

    // Check for router customization/disabling
    const routerConfig: RouterConfig = customRouterModule?.config;
    const disableConfig = routerConfig?.disable || {};
    const isCompletelyDisabled = disableConfig === true;

    // Check if custom implementation exists
    const customRouter = (customRouterModule?.default as Router) || {};
    const hasCustomImplementation = (path: string, method: string) => {
      return customRouter.stack?.some(
        (layer) =>
          layer.path === path &&
          layer.method.toLowerCase() === method.toLowerCase()
      );
    };

    // Helper to determine if an endpoint should be disabled
    const isEndpointDisabled = (endpoint: RouterEndpoint): boolean => {
      if (isCompletelyDisabled) return true;
      return typeof disableConfig === "object" && !!disableConfig[endpoint];
    };

    // Create individual routes instead of chaining

    // POST /{routeName} - Create One
    if (
      !isEndpointDisabled("createOne") &&
      !hasCustomImplementation(`/${routeName}`, "post")
    ) {
      router.post(
        `/${routeName}`,
        authService.handleAuthenticationControl(authConfigs, "create"),
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
      );
    }

    // GET /{routeName} - Find Many
    if (
      !isEndpointDisabled("findMany") &&
      !hasCustomImplementation(`/${routeName}`, "get")
    ) {
      router.get(
        `/${routeName}`,
        authService.handleAuthenticationControl(authConfigs, "view"),
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
    }

    // POST /{routeName}/many - Create Many
    if (
      !isEndpointDisabled("createMany") &&
      !hasCustomImplementation(`/${routeName}/many`, "post")
    ) {
      router.post(
        `/${routeName}/many`,
        authService.handleAuthenticationControl(authConfigs, "create"),
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
      );
    }

    // PATCH /{routeName}/many - Update Many
    if (
      !isEndpointDisabled("updateMany") &&
      !hasCustomImplementation(`/${routeName}/many`, "patch")
    ) {
      router.patch(
        `/${routeName}/many`,
        authService.handleAuthenticationControl(authConfigs, "update"),
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
      );
    }

    // DELETE /{routeName}/many - Delete Many
    if (
      !isEndpointDisabled("deleteMany") &&
      !hasCustomImplementation(`/${routeName}/many`, "delete")
    ) {
      router.delete(
        `/${routeName}/many`,
        authService.handleAuthenticationControl(authConfigs, "delete"),
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
    }

    // GET /{routeName}/:id - Find One
    if (
      !isEndpointDisabled("findOne") &&
      !hasCustomImplementation(`/${routeName}/:id`, "get")
    ) {
      router.get(
        `/${routeName}/:id`,
        authService.handleAuthenticationControl(authConfigs, "view"),
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
      );
    }

    // PATCH /{routeName}/:id - Update One
    if (
      !isEndpointDisabled("updateOne") &&
      !hasCustomImplementation(`/${routeName}/:id`, "patch")
    ) {
      router.patch(
        `/${routeName}/:id`,
        authService.handleAuthenticationControl(authConfigs, "update"),
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
      );
    }

    // DELETE /{routeName}/:id - Delete One
    if (
      !isEndpointDisabled("deleteOne") &&
      !hasCustomImplementation(`/${routeName}/:id`, "delete")
    ) {
      router.delete(
        `/${routeName}/:id`,
        authService.handleAuthenticationControl(authConfigs, "delete"),
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
    }

    // // If the custom router has its own routes, add them
    // if (customRouterModule?.default) {
    //   customRouter.stack.forEach((stack) => {
    //     const { method, path, handle } = stack;
    //     (router as any)[method.toLowerCase()](path, handle);
    //   });
    // }
  });
}
