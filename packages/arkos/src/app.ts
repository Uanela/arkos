import express, { IRouter, Router } from "express";
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
import { queryParser } from "./utils/helpers/query-parser.helpers";
import deepmerge from "./utils/helpers/deepmerge.helper";
import { getSwaggerRouter } from "./modules/swagger/swagger.router";
import { loadAllModuleComponents } from "./utils/dynamic-loader";
import { AppError } from "./exports/error-handler";
import debuggerService from "./modules/debugger/debugger.service";
import { getArkosConfig } from "./exports";
import { ArkosInitConfig } from "./types/arkos-config";
import { isAuthenticationEnabled } from "./utils/helpers/arkos-config.helpers";
export const app: express.Express = express();
const knowModulesRouter = Router();

export async function bootstrap(
  initConfig: ArkosInitConfig
): Promise<express.Express> {
  const arkosConfig = getArkosConfig();

  await Promise.all([
    loadPrismaModule(),
    loadAllModuleComponents(arkosConfig),
    initConfig?.configureApp && (await initConfig?.configureApp(app)),
  ]);

  const middlewaresConfig = arkosConfig?.middlewares;

  if (middlewaresConfig?.compression !== false) {
    if (typeof middlewaresConfig?.compression === "function") {
      app.use(middlewaresConfig.compression);
    } else {
      app.use(compression(middlewaresConfig?.compression || {}));
    }
  }

  if (middlewaresConfig?.rateLimit !== false) {
    if (typeof middlewaresConfig?.rateLimit === "function") {
      app.use(middlewaresConfig.rateLimit);
    } else {
      app.use(
        rateLimit(
          deepmerge(
            {
              windowMs: 60 * 1000,
              limit: 300,
              standardHeaders: "draft-7",
              legacyHeaders: false,
              handler: (_, res) => {
                res.status(429).json({
                  message: "Too many requests, please try again later",
                });
              },
            },
            middlewaresConfig?.rateLimit || {}
          )
        )
      );
    }
  }

  if (middlewaresConfig?.cors !== false) {
    if (typeof middlewaresConfig?.cors === "function") {
      app.use(middlewaresConfig.cors);
    } else {
      app.use(
        cors(
          middlewaresConfig?.cors?.customHandler
            ? middlewaresConfig.cors.customHandler
            : deepmerge(
                {
                  origin: (
                    origin: string,
                    cb: (err: Error | null, allow?: boolean) => void
                  ) => {
                    const allowed = (middlewaresConfig?.cors as any)
                      ?.allowedOrigins;

                    if (allowed === "*") cb(null, true);
                    else if (Array.isArray(allowed))
                      cb(null, !origin || allowed?.includes?.(origin));
                    else if (typeof allowed === "string")
                      cb(null, !origin || allowed === origin);
                    else cb(null, false);
                  },

                  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
                  allowedHeaders: [
                    "Content-Type",
                    "Authorization",
                    "Connection",
                  ],
                  credentials: true,
                },
                middlewaresConfig?.cors?.options || {}
              )
        )
      );
    }
  }

  if (middlewaresConfig?.expressJson !== false) {
    if (typeof middlewaresConfig?.expressJson === "function") {
      app.use(middlewaresConfig.expressJson);
    } else {
      app.use(express.json(middlewaresConfig?.expressJson || {}));
    }
  }

  if (middlewaresConfig?.cookieParser !== false) {
    if (typeof middlewaresConfig?.cookieParser === "function") {
      app.use(middlewaresConfig.cookieParser);
    } else {
      const params = Array.isArray(middlewaresConfig?.cookieParser)
        ? middlewaresConfig.cookieParser
        : [];
      app.use(cookieParser(...(params as any))); // FIXME: check types correctly
    }
  }

  if (middlewaresConfig?.queryParser !== false) {
    if (typeof middlewaresConfig?.queryParser === "function") {
      app.use(middlewaresConfig.queryParser);
    } else {
      app.use(
        queryParser(
          deepmerge(
            {
              parseNull: true,
              parseUndefined: true,
              parseBoolean: true,
              parseNumber: true,
            },
            middlewaresConfig?.queryParser || {}
          )
        )
      );
    }
  }

  if (middlewaresConfig?.requestLogger !== false) {
    if (typeof middlewaresConfig?.requestLogger === "function") {
      app.use(middlewaresConfig.requestLogger);
    } else {
      app.use(handleRequestLogs);
    }
  }

  app.use(debuggerService.logRequestInfo);

  const routersConfig = arkosConfig?.routers;

  if (routersConfig?.welcomeRoute !== false) {
    if (typeof routersConfig?.welcomeRoute === "function") {
      app.get("/api", routersConfig.welcomeRoute);
    } else {
      app.get("/api", (_, res) => {
        res.status(200).json({ message: arkosConfig.welcomeMessage });
      });
    }
  }

  if (initConfig?.use)
    for (const mwOrRouter of initConfig.use) {
      app.use(mwOrRouter as IRouter);
    }

  const fileUploadRouter = getFileUploadRouter(arkosConfig);
  knowModulesRouter.use(fileUploadRouter);

  if (isAuthenticationEnabled()) {
    const authRouter = getAuthRouter(arkosConfig);
    knowModulesRouter.use("/api", authRouter);
  }

  const modelsRouter = getPrismaModelsRouter(arkosConfig);
  knowModulesRouter.use("/api", modelsRouter as any);

  app.use(knowModulesRouter);
  app.use("/api", getAvailableResourcesAndRoutesRouter());

  if (
    arkosConfig.swagger &&
    (process.env.ARKOS_BUILD !== "true" ||
      arkosConfig.swagger.enableAfterBuild === true)
  )
    app.use("/api", await getSwaggerRouter(arkosConfig, app));

  app.use("*", (req) => {
    throw new AppError(
      "Route not found",
      404,
      { route: req.path },
      "RouteNotFound"
    );
  });

  if (middlewaresConfig?.errorHandler !== false) {
    if (typeof middlewaresConfig?.errorHandler === "function") {
      app.use(middlewaresConfig.errorHandler);
    } else {
      app.use(errorHandler);
    }
  }

  return app;
}
