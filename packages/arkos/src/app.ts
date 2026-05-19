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
import { ArkosRequestHandler, getArkosConfig } from "./exports";
import { ArkosInitConfig } from "./types/arkos-config";
import {
  isAuthenticationEnabled,
  isProduction,
  validateArkosConfig,
} from "./utils/helpers/arkos-config.helpers";
import { lenientDecode } from "./utils/helpers/url-helpers";
import sheu from "./utils/sheu";
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

  validateArkosConfig();
  const middlewaresConfig = arkosConfig?.middlewares;

  if (middlewaresConfig?.requestLogger !== false) {
    if (typeof middlewaresConfig?.requestLogger === "function") {
      app.use(middlewaresConfig.requestLogger);
    } else {
      app.use(handleRequestLogs);
    }
  }

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
    const corsConfig = middlewaresConfig?.cors || {};

    if ("customHandler" in corsConfig)
      sheu.warn(
        "cors.customHandler is deprecated. Pass the handler directly: `cors: myHandler`. See https://www.arkosjs.com/blog/rethinking-cors-defaults-in-arkosjs"
      );

    if ("allowedOrigins" in corsConfig)
      sheu.warn(
        "cors.allowedOrigins is deprecated. Use `cors: { origin: '...' }` directly instead. See https://www.arkosjs.com/blog/rethinking-cors-defaults-in-arkosjs"
      );

    if ("options" in corsConfig)
      sheu.warn(
        "cors.options is deprecated. Pass cors.CorsOptions directly instead. See https://www.arkosjs.com/blog/rethinking-cors-defaults-in-arkosjs"
      );

    const defaultOptions = {
      origin: isProduction() ? "*" : true,
      methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization", "Connection"],
      credentials: isProduction() ? false : true,
    };

    if (typeof corsConfig === "function") {
      if (corsConfig.length >= 3) {
        app.use(corsConfig as ArkosRequestHandler);
      } else {
        // cors.CorsOptionsDelegate — (req, cb)
        app.use(cors(corsConfig as cors.CorsOptionsDelegate));
      }
    } else if (
      middlewaresConfig?.cors &&
      typeof corsConfig === "object" &&
      "customHandler" in corsConfig
    ) {
      // { customHandler } shape — delegate entirely to user's handler
      app.use(cors(corsConfig.customHandler));
    } else if (
      middlewaresConfig?.cors &&
      typeof corsConfig === "object" &&
      !("allowedOrigins" in corsConfig)
    ) {
      // Plain cors.CorsOptions passed directly at top level
      app.use(cors(deepmerge(defaultOptions, corsConfig as cors.CorsOptions)));
    } else {
      const { allowedOrigins, options } = corsConfig as {
        allowedOrigins?: string | string[] | "*";
        options?: cors.CorsOptions;
      };

      app.use(
        cors(
          deepmerge(defaultOptions, {
            origin: allowedOrigins ?? defaultOptions.origin,
            ...(options || {}),
          })
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
      const params =
        typeof middlewaresConfig?.cookieParser == "object"
          ? middlewaresConfig.cookieParser
          : { secret: undefined, options: undefined };
      app.use(cookieParser(params.secret, params.options));
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
    const authRouter = getAuthRouter(arkosConfig) as any;
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
    const url = lenientDecode(req.originalUrl);
    throw new AppError(
      `Route ${req.method.toUpperCase()} ${url} was not found`,
      404,
      { route: `${req.method.toUpperCase()} ${url}` },
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
