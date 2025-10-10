import express, { NextFunction, Router } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { getAuthRouter } from "./modules/auth/auth.router";
import {
  getPrismaModelsRouter,
  getAvailableResourcesAndRoutesRouter,
} from "./modules/base/base.router";
import errorHandler from "./modules/error-handler/error-handler.controller";
import { rateLimit } from "express-rate-limit";
import compression from "compression";
import { handleRequestLogs } from "./modules/base/base.middlewares";
import { loadPrismaModule } from "./utils/helpers/prisma.helpers";
import { getFileUploadRouter } from "./modules/file-upload/file-upload.router";
import { ArkosConfig } from "./types/arkos-config";
import { queryParser } from "./utils/helpers/query-parser.helpers";
import deepmerge from "./utils/helpers/deepmerge.helper";
import { getSwaggerRouter } from "./modules/swagger/swagger.router";
import { loadAllModuleComponents } from "./utils/dynamic-loader";
import { AppError } from "./exports/error-handler";
import debuggerService from "./modules/debugger/debugger.service";

export const app: express.Express = express();
const knowModulesRouter = Router();

export async function bootstrap(
  arkosConfig: ArkosConfig
): Promise<express.Express> {
  await Promise.all([
    loadPrismaModule(),
    loadAllModuleComponents(arkosConfig),
    arkosConfig?.configureApp && (await arkosConfig?.configureApp(app)),
  ]);

  const middlewaresConfig = arkosConfig?.middlewares;
  const disabledMiddlewares = middlewaresConfig?.disable || [];
  const replacedMiddlewares = middlewaresConfig?.replace || {};

  app.use(debuggerService.logLevel2RequestInfo);

  if (!disabledMiddlewares?.includes?.("compression"))
    app.use(
      replacedMiddlewares.compression ||
        compression(arkosConfig?.compressionOptions)
    );

  if (!disabledMiddlewares?.includes?.("global-rate-limit"))
    app.use(
      replacedMiddlewares.globalRateLimit ||
        rateLimit(
          deepmerge(
            {
              windowMs: 60 * 1000,
              limit: 500,
              standardHeaders: "draft-7",
              legacyHeaders: false,
              handler: (_, res) => {
                res.status(429).json({
                  message: "Too many requests, please try again later",
                });
              },
            },
            arkosConfig?.globalRequestRateLimitOptions || {}
          )
        )
    );

  if (!disabledMiddlewares?.includes?.("cors"))
    app.use(
      replacedMiddlewares.cors ||
        cors(
          arkosConfig?.cors?.customHandler
            ? arkosConfig.cors.customHandler
            : deepmerge(
                {
                  origin: (
                    origin: string,
                    cb: (err: Error | null, allow?: boolean) => void
                  ) => {
                    const allowed = arkosConfig?.cors?.allowedOrigins;

                    if (allowed === "*") {
                      cb(null, true);
                    } else if (Array.isArray(allowed)) {
                      cb(null, !origin || allowed?.includes?.(origin));
                    } else if (typeof allowed === "string") {
                      cb(null, !origin || allowed === origin);
                    } else {
                      cb(null, false);
                    }
                  },
                  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
                  allowedHeaders: [
                    "Content-Type",
                    "Authorization",
                    "Connection",
                  ],
                  credentials: true,
                },
                arkosConfig?.cors?.options || {}
              )
        )
    );

  if (!disabledMiddlewares?.includes?.("express-json"))
    app.use(
      replacedMiddlewares.expressJson ||
        express.json(arkosConfig?.jsonBodyParserOptions)
    );

  if (!disabledMiddlewares?.includes?.("cookie-parser"))
    app.use(
      replacedMiddlewares.cookieParser ||
        cookieParser(...[...(arkosConfig?.cookieParserParameters || [])])
    );

  if (!disabledMiddlewares?.includes?.("query-parser"))
    app.use(
      replacedMiddlewares.queryParser ||
        queryParser(
          deepmerge(
            {
              parseNull: true,
              parseUndefined: true,
              parseBoolean: true,
            },
            arkosConfig?.queryParserOptions || {}
          )
        )
    );

  if (!disabledMiddlewares?.includes?.("request-logger"))
    app.use(replacedMiddlewares.requestLogger || handleRequestLogs);

  if (arkosConfig?.middlewares?.additional)
    arkosConfig.middlewares.additional.forEach((middleware) => {
      app.use(middleware);
    });

  const routersConfig = arkosConfig?.routers;
  const disabledRouters = routersConfig?.disable || [];
  const replacedRouters = routersConfig?.replace || {};

  if (!disabledRouters?.includes?.("welcome-endpoint"))
    app.get(
      "/api",
      replacedRouters.welcomeEndpoint ||
        ((_, res) => {
          res.status(200).json({ message: arkosConfig.welcomeMessage });
        })
    );

  if (!disabledRouters?.includes?.("file-upload")) {
    const fileUploadRouter = replacedRouters.fileUpload
      ? await replacedRouters.fileUpload(arkosConfig)
      : await getFileUploadRouter(arkosConfig);
    knowModulesRouter.use(fileUploadRouter);
  }

  if (
    !disabledRouters?.includes?.("auth-router") &&
    arkosConfig.authentication
  ) {
    const authRouter = replacedRouters.authRouter
      ? await replacedRouters.authRouter(arkosConfig)
      : await getAuthRouter(arkosConfig);
    knowModulesRouter.use("/api", authRouter);
  }

  if (!disabledRouters?.includes?.("prisma-models-router")) {
    const modelsRouter = replacedRouters.prismaModelsRouter
      ? await replacedRouters.prismaModelsRouter(arkosConfig)
      : await getPrismaModelsRouter(arkosConfig);
    knowModulesRouter.use("/api", modelsRouter);
  }

  app.use(knowModulesRouter);
  app.use("/api", getAvailableResourcesAndRoutesRouter());

  if (
    arkosConfig.swagger &&
    (process.env.ARKOS_BUILD !== "true" ||
      arkosConfig.swagger.enableAfterBuild === true)
  )
    app.use("/api", await getSwaggerRouter(arkosConfig));

  if (routersConfig?.additional)
    routersConfig.additional.forEach((router) => {
      app.use(router);
    });

  app.use("*", (req) => {
    throw new AppError(
      "Route not found",
      404,
      { route: req.route },
      "RouteNotFound"
    );
  });

  if (!disabledMiddlewares?.includes?.("global-error-handler"))
    app.use(replacedMiddlewares.globalErrorHandler || errorHandler);

  return app;
}
