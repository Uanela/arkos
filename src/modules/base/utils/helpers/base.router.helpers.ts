import { Router } from "express";
import { singular, plural } from "pluralize";
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
    const modelModules = await importPrismaModelModules(modelNameInKebab);
    const {
      middlewares,
      authConfigs,
      prismaQueryOptions,
      router: customRouterModule,
      dtos,
      schemas,
    } = modelModules;

    const routeName = plural(modelNameInKebab);
    const controller = new BaseController(model);

    // Check for router customization/disabling
    const routerConfig: RouterConfig = customRouterModule?.config;
    const disableConfig = routerConfig?.disable || {};
    const isCompletelyDisabled = disableConfig === true;

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

    // Helper to determine if an endpoint should be disabled
    const isEndpointDisabled = (endpoint: RouterEndpoint): boolean => {
      if (isCompletelyDisabled) return true;
      return typeof disableConfig === "object" && !!disableConfig[endpoint];
    };

    // Helper to get the correct schema or DTO based on Arkos Config
    const getValidationSchemaOrDto = (
      key: keyof typeof dtos | keyof typeof schemas
    ) => {
      const validationConfigs = arkosConfigs?.validation;
      if (validationConfigs?.resolver === "class-validator") {
        return dtos?.[key];
      } else if (validationConfigs?.resolver === "zod") {
        return schemas?.[key];
      }
      return undefined;
    };

    // If the custom router has its own routes, add them
    if (customRouterModule && !customRouterModule?.config?.disable)
      router.use(`/${routeName}`, customRouterModule.default);

    function safeCatchAsync(middleware: any) {
      return middleware ? catchAsync(middleware) : undefined;
    }

    // POST /{routeName} - Create One
    if (
      !isEndpointDisabled("createOne") &&
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
          kebabCase(singular(modelNameInKebab)),
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
      !isEndpointDisabled("findMany") &&
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
          kebabCase(singular(modelNameInKebab)),
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
      !isEndpointDisabled("createMany") &&
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
          kebabCase(singular(modelNameInKebab)),
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
      !isEndpointDisabled("updateMany") &&
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
          kebabCase(singular(modelNameInKebab)),
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
      !isEndpointDisabled("deleteMany") &&
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
          kebabCase(singular(modelNameInKebab)),
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
      !isEndpointDisabled("findOne") &&
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
          kebabCase(singular(modelNameInKebab)),
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
      !isEndpointDisabled("updateOne") &&
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
          kebabCase(singular(modelNameInKebab)),
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
      !isEndpointDisabled("deleteOne") &&
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
          kebabCase(singular(modelNameInKebab)),
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
