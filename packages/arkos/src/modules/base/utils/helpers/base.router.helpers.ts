import { Router } from "express";
import pluralize from "pluralize";
import { ArkosConfig, RouterConfig } from "../../../../exports";
import { kebabCase } from "../../../../exports/utils";
import { PrismaQueryOptions } from "../../../../types";
import {
  AuthRouterEndpoint,
  FileUploadRouterEndpoint,
  RouterEndpoint,
} from "../../../../types/router-config";
import { getModuleComponents } from "../../../../utils/dynamic-loader";
import authService from "../../../auth/auth.service";
import { BaseController } from "../../base.controller";
import {
  addPrismaQueryOptionsToRequest,
  handleRequestBodyValidationAndTransformation,
  sendResponse,
} from "../../base.middlewares";
import { processMiddleware } from "../../../../utils/helpers/routers.helpers";
import routerValidator from "../router-validator";
import { getUserFileExtension } from "../../../../utils/helpers/fs.helpers";
import prismaSchemaParser from "../../../../utils/prisma/prisma-schema-parser";
import debuggerService from "../../../debugger/debugger.service";
import { AccessAction, AuthConfigs } from "../../../../types/auth";

export async function setupRouters(router: Router, arkosConfigs: ArkosConfig) {
  return prismaSchemaParser.getModelsAsArrayOfStrings().map(async (model) => {
    const modelNameInKebab = kebabCase(model);
    const modelModules = getModuleComponents(modelNameInKebab) || {};

    const {
      interceptors,
      authConfigs,
      prismaQueryOptions,
      router: customRouterModule,
      dtos,
      schemas,
    } = modelModules;

    const routeName = pluralize.plural(modelNameInKebab);
    const controller = new BaseController(model);

    const routerConfig: RouterConfig<any> = customRouterModule?.config || {};

    const customRouter = customRouterModule?.default as Router;
    const hasCustomImplementation = (path: string, method: string) => {
      return customRouter?.stack?.some(
        (layer) =>
          (layer.path === `/api/${path}` ||
            layer.path === `api/${path}` ||
            layer.path === `api/${path}/` ||
            layer.path === `/api/${path}/`) &&
          layer.method.toLowerCase() === method.toLowerCase()
      );
    };

    const getValidationSchemaOrDto = (key: "create" | "update") => {
      const validationConfigs = arkosConfigs?.validation;
      if (validationConfigs?.resolver === "class-validator") {
        return dtos?.[key];
      } else if (validationConfigs?.resolver === "zod") {
        return schemas?.[key];
      }
      return undefined;
    };

    if (customRouter && customRouterModule) {
      if (routerValidator.isExpressRouter(customRouter))
        router.use(`/${routeName}`, customRouter);
      else
        throw Error(
          `ValidationError: The exported router from ${modelNameInKebab}.router.${getUserFileExtension()} is not a valid express Router.`
        );
    }

    if (
      !isEndpointDisabled(routerConfig, "createOne") &&
      !hasCustomImplementation(`/${routeName}`, "post")
    ) {
      router.post(
        `/${routeName}`,
        ...processAuthenticationMiddlewares(
          "Create",
          kebabCase(pluralize.singular(modelNameInKebab)),
          authConfigs
        ),
        handleRequestBodyValidationAndTransformation(
          getValidationSchemaOrDto("create")
        ),
        addPrismaQueryOptionsToRequest<any>(
          prismaQueryOptions as PrismaQueryOptions<any>,
          "createOne"
        ),
        ...processMiddleware(interceptors?.beforeCreateOne),
        controller.createOne,
        ...processMiddleware(interceptors?.afterCreateOne),
        sendResponse,
        ...processMiddleware(interceptors?.onCreateOneError, { type: "error" })
      );
    }

    // GET /{routeName} - Find Many
    if (
      !isEndpointDisabled(routerConfig, "findMany") &&
      !hasCustomImplementation(`/${routeName}`, "get")
    ) {
      router.get(
        `/${routeName}`,
        ...processAuthenticationMiddlewares(
          "View",
          kebabCase(pluralize.singular(modelNameInKebab)),
          authConfigs
        ),
        addPrismaQueryOptionsToRequest<any>(
          prismaQueryOptions as PrismaQueryOptions<any>,
          "findMany"
        ),

        ...processMiddleware(interceptors?.beforeFindMany),
        controller.findMany,
        ...processMiddleware(interceptors?.afterFindMany),
        sendResponse,
        ...processMiddleware(interceptors?.onFindManyError, { type: "error" })
      );
    }

    // POST /{routeName}/many - Create Many
    if (
      !isEndpointDisabled(routerConfig, "createMany") &&
      !hasCustomImplementation(`/${routeName}/many`, "post")
    ) {
      router.post(
        `/${routeName}/many`,
        ...processAuthenticationMiddlewares(
          "Create",
          kebabCase(pluralize.singular(modelNameInKebab)),
          authConfigs
        ),
        handleRequestBodyValidationAndTransformation(
          getValidationSchemaOrDto("create")
        ),
        addPrismaQueryOptionsToRequest<any>(
          prismaQueryOptions as PrismaQueryOptions<any>,
          "createMany"
        ),

        ...processMiddleware(interceptors?.beforeCreateMany),
        controller.createMany,
        ...processMiddleware(interceptors?.afterCreateMany),
        sendResponse,
        ...processMiddleware(interceptors?.onCreateManyError, { type: "error" })
      );
    }

    // PATCH /{routeName}/many - Update Many
    if (
      !isEndpointDisabled(routerConfig, "updateMany") &&
      !hasCustomImplementation(`/${routeName}/many`, "patch")
    ) {
      router.patch(
        `/${routeName}/many`,
        ...processAuthenticationMiddlewares(
          "Update",
          kebabCase(pluralize.singular(modelNameInKebab)),
          authConfigs
        ),
        addPrismaQueryOptionsToRequest<any>(
          prismaQueryOptions as PrismaQueryOptions<any>,
          "updateMany"
        ),
        ...processMiddleware(interceptors?.beforeUpdateMany),
        controller.updateMany,
        ...processMiddleware(interceptors?.afterUpdateMany),
        sendResponse,
        ...processMiddleware(interceptors?.onUpdateManyError, { type: "error" })
      );
    }

    // DELETE /{routeName}/many - Delete Many
    if (
      !isEndpointDisabled(routerConfig, "deleteMany") &&
      !hasCustomImplementation(`/${routeName}/many`, "delete")
    ) {
      router.delete(
        `/${routeName}/many`,
        ...processAuthenticationMiddlewares(
          "Delete",
          kebabCase(pluralize.singular(modelNameInKebab)),
          authConfigs
        ),
        addPrismaQueryOptionsToRequest<any>(
          prismaQueryOptions as PrismaQueryOptions<any>,
          "deleteMany"
        ),
        ...processMiddleware(interceptors?.beforeDeleteMany),
        controller.deleteMany,
        ...processMiddleware(interceptors?.afterDeleteMany),
        sendResponse,
        ...processMiddleware(interceptors?.onDeleteManyError, { type: "error" })
      );
    }

    if (
      !isEndpointDisabled(routerConfig, "findOne") &&
      !hasCustomImplementation(`/${routeName}/:id`, "get")
    ) {
      router.get(
        `/${routeName}/:id`,
        ...processAuthenticationMiddlewares(
          "View",
          kebabCase(pluralize.singular(modelNameInKebab)),
          authConfigs
        ),
        addPrismaQueryOptionsToRequest<any>(
          prismaQueryOptions as PrismaQueryOptions<any>,
          "findOne"
        ),
        ...processMiddleware(interceptors?.beforeFindOne),
        controller.findOne,
        ...processMiddleware(interceptors?.afterFindOne),
        sendResponse,
        ...processMiddleware(interceptors?.onFindOneError, { type: "error" })
      );
    }

    // PATCH /{routeName}/:id - Update One
    if (
      !isEndpointDisabled(routerConfig, "updateOne") &&
      !hasCustomImplementation(`/${routeName}/:id`, "patch")
    ) {
      router.patch(
        `/${routeName}/:id`,
        ...processAuthenticationMiddlewares(
          "Update",
          kebabCase(pluralize.singular(modelNameInKebab)),
          authConfigs
        ),
        handleRequestBodyValidationAndTransformation(
          getValidationSchemaOrDto("update")
        ),
        addPrismaQueryOptionsToRequest<any>(
          prismaQueryOptions as PrismaQueryOptions<any>,
          "updateOne"
        ),
        ...processMiddleware(interceptors?.beforeUpdateOne),
        controller.updateOne,
        ...processMiddleware(interceptors?.afterUpdateOne),
        sendResponse,
        ...processMiddleware(interceptors?.onUpdateOneError, { type: "error" })
      );
    }

    // DELETE /{routeName}/:id - Delete One
    if (
      !isEndpointDisabled(routerConfig, "deleteOne") &&
      !hasCustomImplementation(`/${routeName}/:id`, "delete")
    ) {
      router.delete(
        `/${routeName}/:id`,
        ...processAuthenticationMiddlewares(
          "Delete",
          kebabCase(pluralize.singular(modelNameInKebab)),
          authConfigs
        ),
        addPrismaQueryOptionsToRequest<any>(
          prismaQueryOptions as PrismaQueryOptions<any>,
          "deleteOne"
        ),
        ...processMiddleware(interceptors?.beforeDeleteOne),
        controller.deleteOne,
        ...processMiddleware(interceptors?.afterDeleteOne),
        sendResponse,
        ...processMiddleware(interceptors?.onDeleteOneError, { type: "error" })
      );
    }

    debuggerService.logModuleFinalRouter(modelNameInKebab, router);
  });
}

export function processAuthenticationMiddlewares(
  action: AccessAction,
  modelName: string,
  authConfigs?: AuthConfigs
) {
  const authenticationControl = authConfigs?.authenticationControl;

  if (
    (authenticationControl &&
      typeof authenticationControl === "object" &&
      authenticationControl[action] === true) ||
    authenticationControl === true ||
    (!authenticationControl && authenticationControl !== false)
  )
    return [
      authService.authenticate,
      authService.handleAccessControl(
        action,
        kebabCase(pluralize.singular(modelName)),
        authConfigs?.accessControl
      ),
    ];

  return [];
}

export function isEndpointDisabled(
  routerConfig: RouterConfig<any>,
  endpoint: RouterEndpoint | AuthRouterEndpoint | FileUploadRouterEndpoint
): boolean {
  if (!routerConfig?.disable) return false;

  if (routerConfig.disable === true) return true;

  if (typeof routerConfig.disable === "object")
    return routerConfig.disable[endpoint as never] === true;

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

  return true;
}
