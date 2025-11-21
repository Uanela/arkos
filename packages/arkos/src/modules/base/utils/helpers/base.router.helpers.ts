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
import { BaseController } from "../../base.controller";
import {
  addPrismaQueryOptionsToRequest,
  sendResponse,
} from "../../base.middlewares";
import { processMiddleware } from "../../../../utils/helpers/routers.helpers";
import routerValidator from "../router-validator";
import { getUserFileExtension } from "../../../../utils/helpers/fs.helpers";
import prismaSchemaParser from "../../../../utils/prisma/prisma-schema-parser";
import debuggerService from "../../../debugger/debugger.service";
import { AccessAction, AuthConfigs } from "../../../../types/auth";
import { IArkosRouter } from "../../../../utils/arkos-router/types";
import deepmerge from "../../../../utils/helpers/deepmerge.helper";

export function setupRouters(router: IArkosRouter, arkosConfigs: ArkosConfig) {
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

    const createRouteConfig = (
      endpoint: RouterEndpoint,
      path: string,
      validationSchema?: any
    ) => {
      const config: any = {
        route: `/${routeName}${path}`,
        disabled: isEndpointDisabled(routerConfig, endpoint),
        authentication: getAuthenticationConfig(
          endpoint,
          modelNameInKebab,
          authConfigs
        ),
        validation: validationSchema ? { body: validationSchema } : undefined,
        experimental: { openapi: false },
      };

      const endpointConfig = (routerConfig as any)[endpoint];
      if (endpointConfig) deepmerge(config, endpointConfig);

      return config;
    };

    // CREATE ONE
    if (!hasCustomImplementation(`/${routeName}`, "post")) {
      router.post(
        createRouteConfig("createOne", "", getValidationSchemaOrDto("create")),
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

    // FIND MANY
    if (!hasCustomImplementation(`/${routeName}`, "get")) {
      router.get(
        createRouteConfig("findMany", ""),
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

    // CREATE MANY
    if (!hasCustomImplementation(`/${routeName}/many`, "post")) {
      router.post(
        createRouteConfig(
          "createMany",
          "/many",
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

    // UPDATE MANY
    if (!hasCustomImplementation(`/${routeName}/many`, "patch")) {
      router.patch(
        createRouteConfig("updateMany", "/many"),
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

    // DELETE MANY
    if (!hasCustomImplementation(`/${routeName}/many`, "delete")) {
      router.delete(
        createRouteConfig("deleteMany", "/many"),
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

    // FIND ONE
    if (!hasCustomImplementation(`/${routeName}/:id`, "get")) {
      router.get(
        createRouteConfig("findOne", "/:id"),
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

    // UPDATE ONE
    if (!hasCustomImplementation(`/${routeName}/:id`, "patch")) {
      router.patch(
        createRouteConfig(
          "updateOne",
          "/:id",
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

    // DELETE ONE
    if (!hasCustomImplementation(`/${routeName}/:id`, "delete")) {
      router.delete(
        createRouteConfig("deleteOne", "/:id"),
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

    debuggerService.logModuleFinalRouter(modelNameInKebab, router as any);
  });
}

function getAuthenticationConfig(
  endpoint: RouterEndpoint,
  modelName: string,
  authConfigs?: AuthConfigs
) {
  const actionMap: Record<RouterEndpoint, AccessAction> = {
    createOne: "Create",
    findMany: "View",
    createMany: "Create",
    updateMany: "Update",
    deleteMany: "Delete",
    findOne: "View",
    updateOne: "Update",
    deleteOne: "Delete",
  };

  const action = actionMap[endpoint];
  const authenticationControl = authConfigs?.authenticationControl;

  if (
    (authenticationControl &&
      typeof authenticationControl === "object" &&
      (authenticationControl[action] === true ||
        authenticationControl[action] !== false)) ||
    authenticationControl === true ||
    (!authenticationControl && authenticationControl !== false)
  ) {
    return {
      resource: kebabCase(pluralize.singular(modelName)),
      action: action,
      rule: Array.isArray(authConfigs?.accessControl)
        ? authConfigs?.accessControl
        : (authConfigs?.accessControl || {})?.[action],
    };
  }

  return false;
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
