import { Router } from "express";
import pluralize from "pluralize";
import { ArkosConfig, RouterConfig } from "../../../../exports";
import { APIFeatures, kebabCase } from "../../../../exports/utils";
import {
  ArkosNextFunction,
  ArkosRequest,
  ArkosResponse,
  PrismaQueryOptions,
} from "../../../../types";
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

export function handleModelsApiFeatures(modelName: string) {
  return (req: ArkosRequest, _: ArkosResponse, next: ArkosNextFunction) => {
    req.modelName = modelName;
    req.query.filterMode = req.query?.filterMode || "AND";
    req.filters = new APIFeatures(req, modelName)
      .filter()
      .sort()
      .limitFields()
      .paginate().filters;

    next();
  };
}

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

    const routerConfig: RouterConfig = customRouterModule?.config || {};

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

    const getValidationSchemaOrDto = (key: string) => {
      const validationConfigs = arkosConfigs?.validation;
      if (validationConfigs?.resolver === "class-validator") {
        return dtos?.[key];
      } else if (validationConfigs?.resolver === "zod") {
        return schemas?.[key];
      }
      return undefined;
    };

    if (
      typeof customRouterModule?.default === "function" &&
      !routerConfig?.disable
    )
      if (routerValidator.isExpressRouter(customRouterModule?.default))
        router.use(`/${routeName}`, customRouterModule.default);
      else
        throw Error(
          `Validation Error: The exported router from ${modelNameInKebab}.router.${getUserFileExtension()} is not a valid express Router.`
        );

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
        handleModelsApiFeatures(model),
        debuggerService.logLevel2RequestInfo,
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
        handleModelsApiFeatures(model),
        debuggerService.logLevel2RequestInfo,
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
        handleModelsApiFeatures(model),
        debuggerService.logLevel2RequestInfo,
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
        handleModelsApiFeatures(model),
        debuggerService.logLevel2RequestInfo,
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
        handleModelsApiFeatures(model),
        debuggerService.logLevel2RequestInfo,
        ...processMiddleware(interceptors?.beforeDeleteMany),
        controller.deleteMany,
        ...processMiddleware(interceptors?.afterDeleteMany),
        sendResponse,
        ...processMiddleware(interceptors?.onDeleteManyError, { type: "error" })
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
        handleModelsApiFeatures(model),
        debuggerService.logLevel2RequestInfo,
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
        handleModelsApiFeatures(model),
        debuggerService.logLevel2RequestInfo,
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
        handleModelsApiFeatures(model),
        debuggerService.logLevel2RequestInfo,
        ...processMiddleware(interceptors?.beforeDeleteOne),
        controller.deleteOne,
        ...processMiddleware(interceptors?.afterDeleteOne),
        sendResponse,
        ...processMiddleware(interceptors?.onDeleteOneError, { type: "error" })
      );
    }
  });
}

export function isEndpointDisabled<RouterType extends string = "prisma">(
  routerConfig: RouterConfig<RouterType>,
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
