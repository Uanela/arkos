import pluralize from "pluralize";
import { RouterConfig } from "../../../../exports";
import { kebabCase } from "../../../../exports/utils";
import {
  AuthRouterEndpoint,
  FileUploadRouterEndpoint,
  RouterEndpoint,
} from "../../../../types/router-config";
import { BaseController } from "../../base.controller";
import {
  addPrismaQueryOptionsToRequest,
  sendResponse,
} from "../../base.middlewares";
import { processMiddleware } from "../../../../utils/helpers/routers.helpers";
import prismaSchemaParser from "../../../../utils/prisma/prisma-schema-parser";
import debuggerService from "../../../debugger/debugger.service";
import { IArkosRouter } from "../../../../utils/arkos-router/types";
import { ArkosLoadableRegistry } from "../../../../components/arkos-loadable-registry";
import { interceptorReader } from "../../../../components/arkos-interceptor/reader";

export function setupRouters(
  router: IArkosRouter,
  registry: ArkosLoadableRegistry
) {
  return prismaSchemaParser.getModelsAsArrayOfStrings().map(async (model) => {
    const modelNameInKebab = kebabCase(model);

    const routeName = pluralize.plural(modelNameInKebab);
    const controller = new BaseController(model);

    const interceptor = registry.getInterceptor(modelNameInKebab);

    const op = (operation: string) =>
      interceptor
        ? interceptorReader.forOperation(interceptor, operation)
        : {
            before: [],
            after: [],
            onError: [],
            prismaQuery: {},
            routeConfig: {},
          };

    // CREATE ONE
    {
      const { before, after, onError, prismaQuery, routeConfig } =
        op("createOne");

      router.post(
        {
          ...routeConfig,
          path: `${routeName}`,
        },
        addPrismaQueryOptionsToRequest<any>(
          {
            createOne: prismaQuery,
          },
          "createOne"
        ),
        ...processMiddleware(before),
        controller.createOne,
        ...processMiddleware(after),
        sendResponse,
        ...processMiddleware(onError, { type: "error" })
      );
    }

    // FIND MANY
    {
      const { before, after, onError, prismaQuery, routeConfig } =
        op("findMany");
      router.get(
        {
          ...routeConfig,
          path: `${routeName}`,
        },
        addPrismaQueryOptionsToRequest<any>(
          {
            findMany: prismaQuery,
          },
          "findMany"
        ),
        ...processMiddleware(before),
        controller.findMany,
        ...processMiddleware(after),
        sendResponse,
        ...processMiddleware(onError, { type: "error" })
      );
    }

    // CREATE MANY
    {
      const { before, after, onError, prismaQuery, routeConfig } =
        op("createMany");
      router.post(
        {
          ...routeConfig,
          path: `${routeName}/many`,
        },
        addPrismaQueryOptionsToRequest<any>(
          {
            createMany: prismaQuery,
          },
          "createMany"
        ),
        ...processMiddleware(before),
        controller.createMany,
        ...processMiddleware(after),
        sendResponse,
        ...processMiddleware(onError, { type: "error" })
      );
    }

    // UPDATE MANY
    {
      const { before, after, onError, prismaQuery, routeConfig } =
        op("updateMany");
      router.patch(
        {
          ...routeConfig,
          path: `${routeName}/many`,
        },
        addPrismaQueryOptionsToRequest<any>(
          {
            updateMany: prismaQuery,
          },
          "updateMany"
        ),
        ...processMiddleware(before),
        controller.updateMany,
        ...processMiddleware(after),
        sendResponse,
        ...processMiddleware(onError, { type: "error" })
      );
    }

    // DELETE MANY
    {
      const { before, after, onError, prismaQuery, routeConfig } =
        op("deleteMany");
      router.delete(
        {
          ...routeConfig,
          path: `${routeName}/many`,
        },
        addPrismaQueryOptionsToRequest<any>(
          {
            deleteMany: prismaQuery,
          },
          "deleteMany"
        ),
        ...processMiddleware(before),
        controller.deleteMany,
        ...processMiddleware(after),
        sendResponse,
        ...processMiddleware(onError, { type: "error" })
      );
    }

    // FIND ONE
    {
      const { before, after, onError, prismaQuery, routeConfig } =
        op("findOne");
      router.get(
        {
          ...routeConfig,
          path: `${routeName}/:id`,
        },
        addPrismaQueryOptionsToRequest<any>(
          {
            findOne: prismaQuery,
          },
          "findOne"
        ),
        ...processMiddleware(before),
        controller.findOne,
        ...processMiddleware(after),
        sendResponse,
        ...processMiddleware(onError, { type: "error" })
      );
    }

    // UPDATE ONE
    const { before, after, onError, prismaQuery, routeConfig } =
      op("updateOne");
    router.patch(
      {
        ...routeConfig,
        path: `${routeName}/:id`,
      },
      addPrismaQueryOptionsToRequest<any>(
        {
          updateOne: prismaQuery,
        },
        "updateOne"
      ),
      ...processMiddleware(before),
      controller.updateOne,
      ...processMiddleware(after),
      sendResponse,
      ...processMiddleware(onError, { type: "error" })
    );

    // DELETE ONE
    {
      const { before, after, onError, prismaQuery, routeConfig } =
        op("deleteOne");
      router.delete(
        {
          ...routeConfig,
          path: `${routeName}/:id`,
        },
        addPrismaQueryOptionsToRequest<any>(
          {
            deleteOne: prismaQuery,
          },
          "deleteOne"
        ),
        ...processMiddleware(before),
        controller.deleteOne,
        ...processMiddleware(after),
        sendResponse,
        ...processMiddleware(onError, { type: "error" })
      );
    }

    debuggerService.logModuleFinalRouter(modelNameInKebab, router as any);
  });
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
