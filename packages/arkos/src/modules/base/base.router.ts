import { ArkosRouter, BaseController } from "../../exports";
import { ArkosLoadableRegistry } from "../../components/arkos-loadable-registry";
import { prismaSchemaParser } from "../../exports/prisma";
import { kebabCase } from "../../exports/utils";
import pluralize from "pluralize";
import { routeHookReader } from "../../components/arkos-route-hook/reader";
import {
  addPrismaQueryOptionsToRequest,
  sendResponse,
} from "./base.middlewares";
import { processMiddleware } from "../../utils/helpers/routers.helpers";

export function getPrismaModelsRouter(registry: ArkosLoadableRegistry) {
  const router = ArkosRouter();

  prismaSchemaParser.getModelsAsArrayOfStrings().map(async (model) => {
    const modelNameInKebab = kebabCase(model);

    const routeName = pluralize.plural(modelNameInKebab);
    const controller = new BaseController(model);

    const interceptor = registry.getItem("ArkosRouteHook", modelNameInKebab);

    const op = (operation: string) =>
      interceptor
        ? routeHookReader.forOperation(interceptor, operation)
        : {
            before: [],
            after: [],
            onError: [],
            prismaArgs: {},
            routeConfig: {},
          };

    // CREATE ONE
    {
      const { before, after, onError, prismaArgs, routeConfig } =
        op("createOne");

      router.post(
        {
          ...routeConfig,
          path: `/${routeName}`,
        },
        addPrismaQueryOptionsToRequest<any>(
          {
            createOne: prismaArgs,
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
      const { before, after, onError, prismaArgs, routeConfig } =
        op("findMany");
      router.get(
        {
          ...routeConfig,
          path: `/${routeName}`,
        },
        addPrismaQueryOptionsToRequest<any>(
          {
            findMany: prismaArgs,
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
      const { before, after, onError, prismaArgs, routeConfig } =
        op("createMany");
      router.post(
        {
          ...routeConfig,
          path: `/${routeName}/many`,
        },
        addPrismaQueryOptionsToRequest<any>(
          {
            createMany: prismaArgs,
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
      const { before, after, onError, prismaArgs, routeConfig } =
        op("updateMany");
      router.patch(
        {
          ...routeConfig,
          path: `/${routeName}/many`,
        },
        addPrismaQueryOptionsToRequest<any>(
          {
            updateMany: prismaArgs,
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
      const { before, after, onError, prismaArgs, routeConfig } =
        op("deleteMany");
      router.delete(
        {
          ...routeConfig,
          path: `/${routeName}/many`,
        },
        addPrismaQueryOptionsToRequest<any>(
          {
            deleteMany: prismaArgs,
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
      const { before, after, onError, prismaArgs, routeConfig } = op("findOne");
      router.get(
        {
          ...routeConfig,
          path: `/${routeName}/:id`,
        },
        addPrismaQueryOptionsToRequest<any>(
          {
            findOne: prismaArgs,
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
    const { before, after, onError, prismaArgs, routeConfig } = op("updateOne");
    router.patch(
      {
        ...routeConfig,
        path: `/${routeName}/:id`,
      },
      addPrismaQueryOptionsToRequest<any>(
        {
          updateOne: prismaArgs,
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
      const { before, after, onError, prismaArgs, routeConfig } =
        op("deleteOne");
      router.delete(
        {
          ...routeConfig,
          path: `/${routeName}/:id`,
        },
        addPrismaQueryOptionsToRequest<any>(
          {
            deleteOne: prismaArgs,
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
  });

  return router;
}
