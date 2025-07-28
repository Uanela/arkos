import { Router } from "express";
import pluralize from "pluralize";
import { ArkosConfig, RouterConfig } from "../../../../exports";
import { kebabCase } from "../../../../exports/utils";
import { PrismaQueryOptions } from "../../../../types";
import { RouterEndpoint } from "../../../../types/router-config";
import { importPrismaModelModules } from "../../../../utils/helpers/models.helpers";
import authService from "../../../auth/auth.service";
import { BaseController } from "../../base.controller";
import {
  addPrismaQueryOptionsToRequest,
  handleRequestBodyValidationAndTransformation,
  sendResponse,
} from "../../base.middlewares";
import catchAsync from "../../../error-handler/utils/catch-async";

export function setupRouters(
  models: string[],
  router: Router,
  arkosConfigs: ArkosConfig
) {
  return models.map(async (model) => {
    const modelNameInKebab = kebabCase(model);
    const modelModules = await importPrismaModelModules(
      modelNameInKebab,
      arkosConfigs
    );
    const {
      middlewares,
      authConfigs,
      prismaQueryOptions,
      router: customRouterModule,
      dtos,
      schemas,
    } = modelModules;

    const routeName = pluralize.plural(modelNameInKebab);
    const controller = new BaseController(model);

    const routerConfig: RouterConfig = customRouterModule?.config || {};

    // Check if custom implementation exists
    const customRouter = (customRouterModule as Router) || {};
    const hasCustomImplementation = (path: string, method: string) => {
      return customRouter.stack?.some(
        (layer) =>
          (layer.path === `/api/${path}` ||
            layer.path === `api/${path}` ||
            layer.path === `api/${path}/` ||
            layer.path === `/api/${path}/`) &&
          layer.method.toLowerCase() === method.toLowerCase()
      );
    };

    // Helper to get the correct schema or DTO based on Arkos Config
    const getValidationSchemaOrDto = (key: string) => {
      const validationConfigs = arkosConfigs?.validation;
      if (validationConfigs?.resolver === "class-validator") {
        return dtos?.[key];
      } else if (validationConfigs?.resolver === "zod") {
        return schemas?.[key];
      }
      return undefined;
    };

    // If the custom router has its own routes, add them
    if (customRouterModule?.default && !routerConfig?.disable)
      router.use(`/${routeName}`, customRouterModule.default);

    function safeCatchAsync(middleware: any) {
      return middleware ? catchAsync(middleware) : undefined;
    }

    // POST /{routeName} - Create One
    if (
      !isEndpointDisabled(routerConfig, "createOne") &&
      !hasCustomImplementation(`/${routeName}`, "post")
    ) {
      router.post(
        `/${routeName}`,
        authService.handleAuthenticationControl(
          "Create",
          authConfigs?.authenticationControl
        ),
        authService.handleAccessControl(
          "Create",
          kebabCase(pluralize.singular(modelNameInKebab)),
          authConfigs?.accessControl || {}
        ),
        handleRequestBodyValidationAndTransformation(
          getValidationSchemaOrDto("create")
        ),
        addPrismaQueryOptionsToRequest<any>(
          prismaQueryOptions as PrismaQueryOptions<any>,
          "createOne"
        ),
        ...[
          safeCatchAsync(middlewares?.beforeCreateOne) || controller.createOne,
          safeCatchAsync(middlewares?.beforeCreateOne)
            ? controller.createOne
            : safeCatchAsync(middlewares?.afterCreateOne) || sendResponse,
          safeCatchAsync(middlewares?.beforeCreateOne) &&
          safeCatchAsync(middlewares?.afterCreateOne)
            ? safeCatchAsync(middlewares?.afterCreateOne)
            : sendResponse,
        ].filter((m) => !!m),
        sendResponse
      );
    }

    // GET /{routeName} - Find Many
    if (
      !isEndpointDisabled(routerConfig, "findMany") &&
      !hasCustomImplementation(`/${routeName}`, "get")
    ) {
      router.get(
        `/${routeName}`,
        authService.handleAuthenticationControl(
          "View",
          authConfigs?.authenticationControl
        ),
        authService.handleAccessControl(
          "View",
          kebabCase(pluralize.singular(modelNameInKebab)),
          authConfigs?.accessControl || {}
        ),
        addPrismaQueryOptionsToRequest<any>(
          prismaQueryOptions as PrismaQueryOptions<any>,
          "findMany"
        ),
        ...[
          safeCatchAsync(middlewares?.beforeFindMany) || controller.findMany,
          safeCatchAsync(middlewares?.beforeFindMany)
            ? controller.findMany
            : safeCatchAsync(middlewares?.afterFindMany) || sendResponse,
          safeCatchAsync(middlewares?.beforeFindMany) &&
          safeCatchAsync(middlewares?.afterFindMany)
            ? safeCatchAsync(middlewares?.afterFindMany)
            : sendResponse,
          sendResponse,
        ].filter((m) => !!m)
      );
    }

    // POST /{routeName}/many - Create Many
    if (
      !isEndpointDisabled(routerConfig, "createMany") &&
      !hasCustomImplementation(`/${routeName}/many`, "post")
    ) {
      router.post(
        `/${routeName}/many`,
        authService.handleAuthenticationControl(
          "Create",
          authConfigs?.authenticationControl
        ),
        authService.handleAccessControl(
          "Create",
          kebabCase(pluralize.singular(modelNameInKebab)),
          authConfigs?.accessControl || {}
        ),
        handleRequestBodyValidationAndTransformation(
          getValidationSchemaOrDto("createMany")
        ),
        addPrismaQueryOptionsToRequest<any>(
          prismaQueryOptions as PrismaQueryOptions<any>,
          "createMany"
        ),
        ...[
          safeCatchAsync(middlewares?.beforeCreateMany) ||
            controller.createMany,
          safeCatchAsync(middlewares?.beforeCreateMany)
            ? controller.createMany
            : safeCatchAsync(middlewares?.afterCreateMany) || sendResponse,
          safeCatchAsync(middlewares?.beforeCreateMany) &&
          safeCatchAsync(middlewares?.afterCreateMany)
            ? safeCatchAsync(middlewares?.afterCreateMany)
            : sendResponse,
          sendResponse,
        ].filter((m) => !!m)
      );
    }

    // PATCH /{routeName}/many - Update Many
    if (
      !isEndpointDisabled(routerConfig, "updateMany") &&
      !hasCustomImplementation(`/${routeName}/many`, "patch")
    ) {
      router.patch(
        `/${routeName}/many`,
        authService.handleAuthenticationControl(
          "Update",
          authConfigs?.authenticationControl
        ),
        authService.handleAccessControl(
          "Update",
          kebabCase(pluralize.singular(modelNameInKebab)),
          authConfigs?.accessControl || {}
        ),
        handleRequestBodyValidationAndTransformation(
          getValidationSchemaOrDto("updateMany")
        ),
        addPrismaQueryOptionsToRequest<any>(
          prismaQueryOptions as PrismaQueryOptions<any>,
          "updateMany"
        ),
        ...[
          safeCatchAsync(middlewares?.beforeUpdateMany) ||
            controller.updateMany,
          safeCatchAsync(middlewares?.beforeUpdateMany)
            ? controller.updateMany
            : safeCatchAsync(middlewares?.afterUpdateMany) || sendResponse,
          safeCatchAsync(middlewares?.beforeUpdateMany) &&
          safeCatchAsync(middlewares?.afterUpdateMany)
            ? safeCatchAsync(middlewares?.afterUpdateMany)
            : sendResponse,
          sendResponse,
        ].filter((m) => !!m)
      );
    }

    // DELETE /{routeName}/many - Delete Many
    if (
      !isEndpointDisabled(routerConfig, "deleteMany") &&
      !hasCustomImplementation(`/${routeName}/many`, "delete")
    ) {
      router.delete(
        `/${routeName}/many`,
        authService.handleAuthenticationControl(
          "Delete",
          authConfigs?.authenticationControl
        ),
        authService.handleAccessControl(
          "Delete",
          kebabCase(pluralize.singular(modelNameInKebab)),
          authConfigs?.accessControl || {}
        ),
        handleRequestBodyValidationAndTransformation(
          getValidationSchemaOrDto("deleteMany")
        ),
        addPrismaQueryOptionsToRequest<any>(
          prismaQueryOptions as PrismaQueryOptions<any>,
          "deleteMany"
        ),
        ...[
          safeCatchAsync(middlewares?.beforeDeleteMany) ||
            controller.deleteMany,
          safeCatchAsync(middlewares?.beforeDeleteMany)
            ? controller.deleteMany
            : safeCatchAsync(middlewares?.afterDeleteMany) || sendResponse,
          safeCatchAsync(middlewares?.beforeDeleteMany) &&
          safeCatchAsync(middlewares?.afterDeleteMany)
            ? safeCatchAsync(middlewares?.afterDeleteMany)
            : sendResponse,
          sendResponse,
        ].filter((middleware) => !!middleware)
      );
    }

    // GET /{routeName}/:id - Find One
    if (
      !isEndpointDisabled(routerConfig, "findOne") &&
      !hasCustomImplementation(`/${routeName}/:id`, "get")
    ) {
      router.get(
        `/${routeName}/:id`,
        authService.handleAuthenticationControl(
          "View",
          authConfigs?.authenticationControl
        ),
        authService.handleAccessControl(
          "View",
          kebabCase(pluralize.singular(modelNameInKebab)),
          authConfigs?.accessControl || {}
        ),
        handleRequestBodyValidationAndTransformation(
          getValidationSchemaOrDto("findOne")
        ),
        addPrismaQueryOptionsToRequest<any>(
          prismaQueryOptions as PrismaQueryOptions<any>,
          "findOne"
        ),
        ...[
          safeCatchAsync(middlewares?.beforeFindOne) || controller.findOne,
          safeCatchAsync(middlewares?.beforeFindOne)
            ? controller.findOne
            : safeCatchAsync(middlewares?.afterFindOne) || sendResponse,
          safeCatchAsync(middlewares?.beforeFindOne) &&
          safeCatchAsync(middlewares?.afterFindOne)
            ? safeCatchAsync(middlewares?.afterFindOne)
            : sendResponse,
          sendResponse,
        ].filter((m) => !!m)
      );
    }

    // PATCH /{routeName}/:id - Update One
    if (
      !isEndpointDisabled(routerConfig, "updateOne") &&
      !hasCustomImplementation(`/${routeName}/:id`, "patch")
    ) {
      router.patch(
        `/${routeName}/:id`,
        authService.handleAuthenticationControl(
          "Update",
          authConfigs?.authenticationControl
        ),
        authService.handleAccessControl(
          "Update",
          kebabCase(pluralize.singular(modelNameInKebab)),
          authConfigs?.accessControl || {}
        ),
        handleRequestBodyValidationAndTransformation(
          getValidationSchemaOrDto("update")
        ),
        addPrismaQueryOptionsToRequest<any>(
          prismaQueryOptions as PrismaQueryOptions<any>,
          "updateOne"
        ),
        ...[
          safeCatchAsync(middlewares?.beforeUpdateOne) || controller.updateOne,
          safeCatchAsync(middlewares?.beforeUpdateOne)
            ? controller.updateOne
            : safeCatchAsync(middlewares?.afterUpdateOne) || sendResponse,
          safeCatchAsync(middlewares?.beforeUpdateOne) &&
          safeCatchAsync(middlewares?.afterUpdateOne)
            ? safeCatchAsync(middlewares?.afterUpdateOne)
            : sendResponse,
        ].filter((m) => !!m),
        sendResponse
      );
    }

    // DELETE /{routeName}/:id - Delete One
    if (
      !isEndpointDisabled(routerConfig, "deleteOne") &&
      !hasCustomImplementation(`/${routeName}/:id`, "delete")
    ) {
      router.delete(
        `/${routeName}/:id`,
        authService.handleAuthenticationControl(
          "Delete",
          authConfigs?.authenticationControl
        ),
        authService.handleAccessControl(
          "Delete",
          kebabCase(pluralize.singular(modelNameInKebab)),
          authConfigs?.accessControl || {}
        ),
        handleRequestBodyValidationAndTransformation(
          getValidationSchemaOrDto("delete")
        ),
        addPrismaQueryOptionsToRequest<any>(
          prismaQueryOptions as PrismaQueryOptions<any>,
          "deleteOne"
        ),
        ...[
          safeCatchAsync(middlewares?.beforeDeleteOne) || controller.deleteOne,
          safeCatchAsync(middlewares?.beforeDeleteOne)
            ? controller.deleteOne
            : safeCatchAsync(middlewares?.afterDeleteOne) || sendResponse,
          safeCatchAsync(middlewares?.beforeDeleteOne) &&
          safeCatchAsync(middlewares?.afterDeleteOne)
            ? safeCatchAsync(middlewares?.afterDeleteOne)
            : sendResponse,
          sendResponse,
        ].filter((m) => !!m)
      );
    }
  });
}

export function isEndpointDisabled(
  routerConfig: RouterConfig,
  endpoint: RouterEndpoint
): boolean {
  if (!routerConfig?.disable) return false;

  if (routerConfig.disable === true) return true;

  if (typeof routerConfig.disable === "object")
    return routerConfig.disable[endpoint] === true;

  return false;
}

export function isParentEndpointAllowed(
  routerConfig: any,
  endpoint: string
): boolean {
  if (!routerConfig?.parent) return false;

  const parentEndpoints = routerConfig.parent.endpoints;
  if (parentEndpoints === "*") return true;
  if (Array.isArray(parentEndpoints)) return parentEndpoints.includes(endpoint);

  return true; // Default to allow if not specified
}
