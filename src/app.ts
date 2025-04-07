import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { getAuthRouter } from "./modules/auth/auth.router";
import baseRouter from "./modules/base/base.router";
import errorHandler from "./modules/error-handler/error-handler.controller";
import { rateLimit } from "express-rate-limit";
import path from "path";
import * as dotenv from "dotenv";
import compression from "compression";
import { handleRequestLogs } from "./modules/base/base.middlewares";
import {
  checkDatabaseConnection,
  loadPrismaModule,
} from "./utils/helpers/prisma.helpers";
import { getFileUploaderRouter } from "./modules/file-upload/file-upload.router";
import { ArkosConfig } from "./types/arkos-config";
import { queryParser } from "./utils/helpers/query-parser.helpers";
import deepmerge from "./utils/helpers/deepmerge.helper";

const ENV = process.env.NODE_ENV;
let envPath = ".env";

// Default to `.env.local` if available in any environment
if (ENV === "production") {
  envPath = path.resolve(process.cwd(), ".env.production");
} else if (ENV === "staging") {
  envPath = path.resolve(process.cwd(), ".env.staging");
} else if (ENV === "development") {
  envPath = path.resolve(process.cwd(), ".env.development");
} else if (ENV === "local") {
  // For local development, .env.local can be used
  envPath = path.resolve(process.cwd(), ".env.local");
}

// Optionally, add support for `.env.test`, `.env.qa`, or other environments if required
else if (ENV === "test") {
  envPath = path.resolve(process.cwd(), ".env.test");
} else if (ENV === "qa") {
  envPath = path.resolve(process.cwd(), ".env.qa");
}

dotenv.config({ path: envPath });

const app = express();

(async () => {
  await loadPrismaModule();
})();

export async function bootstrap(
  arkosConfig: ArkosConfig
): Promise<express.Express> {
  await loadPrismaModule();

  if (arkosConfig.configureApp) await arkosConfig.configureApp(app);

  const middlewaresConfig = arkosConfig?.middlewares;
  const disabledMiddlewares = middlewaresConfig?.disable || [];
  const replacedMiddlewares = middlewaresConfig?.replace || {};

  // Compression middleware
  if (!disabledMiddlewares.includes("compression"))
    app.use(
      replacedMiddlewares.compression ||
        compression(arkosConfig?.compressionOptions)
    );

  // Global rate limit middleware
  if (!disabledMiddlewares.includes("global-rate-limit"))
    app.use(
      replacedMiddlewares.globalRateLimit ||
        rateLimit(
          deepmerge(
            {
              windowMs: 60 * 1000,
              limit: 1000,
              standardHeaders: "draft-7",
              legacyHeaders: false,
            },
            arkosConfig?.globalRequestRateLimitOptions || {}
          )
        )
    );

  // CORS middleware
  if (!disabledMiddlewares.includes("cors"))
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

                    if (allowed === "all") {
                      cb(null, true);
                    } else if (Array.isArray(allowed)) {
                      cb(null, !origin || allowed.includes(origin));
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

  // JSON body parser middleware
  if (!disabledMiddlewares.includes("express-json"))
    app.use(
      replacedMiddlewares.expressJson ||
        express.json(arkosConfig?.jsonBodyParserOptions)
    );

  // Cookie parser middleware
  if (!disabledMiddlewares.includes("cookie-parser"))
    app.use(
      replacedMiddlewares.cookieParser ||
        cookieParser(...[...(arkosConfig?.cookieParserParameters || [])])
    );

  // Query parser middleware
  if (!disabledMiddlewares.includes("query-parser"))
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

  // Database connection check middleware
  if (!disabledMiddlewares.includes("database-connection"))
    app.use(replacedMiddlewares.databaseConnection || checkDatabaseConnection);

  // Request logger middleware
  if (!disabledMiddlewares.includes("request-logger"))
    app.use(replacedMiddlewares.requestLogger || handleRequestLogs);

  // Additional custom middlewares
  if (arkosConfig?.middlewares?.additionals)
    arkosConfig.middlewares.additionals.forEach((middleware) => {
      app.use(middleware);
    });

  // Configure routers
  const routersConfig = arkosConfig?.routers;
  const disabledRouters = routersConfig?.disable || [];
  const replacedRouters = routersConfig?.replace || {};

  // Welcome endpoint
  if (!disabledRouters.includes("welcome-endpoint"))
    app.get(
      "/api",
      replacedRouters.welcomeEndpoint ||
        ((req, res) => {
          res.status(200).json({ message: arkosConfig.welcomeMessage });
        })
    );

  // File uploader router
  if (!disabledRouters.includes("file-uploader")) {
    const fileUploaderRouter = replacedRouters.fileUploader
      ? await replacedRouters.fileUploader(arkosConfig)
      : await getFileUploaderRouter(arkosConfig);
    app.use("/api", fileUploaderRouter);
  }

  // Auth router
  if (!disabledRouters.includes("auth-router") && arkosConfig.authentication) {
    const authRouter = replacedRouters.authRouter
      ? await replacedRouters.authRouter(arkosConfig)
      : await getAuthRouter(arkosConfig);
    app.use("/api", authRouter);
  }

  // Prisma models router
  if (!disabledRouters.includes("prisma-models-router")) {
    const modelsRouter = replacedRouters.prismaModelsRouter
      ? await replacedRouters.prismaModelsRouter(arkosConfig)
      : baseRouter;
    app.use("/api", modelsRouter);
  }

  // Additional custom routers
  if (routersConfig?.additionals) {
    routersConfig.additionals.forEach((router) => {
      app.use("/api", router);
    });
  }

  // Global error handler middleware (must be last)
  if (!disabledMiddlewares.includes("global-error-handler"))
    app.use(replacedMiddlewares.globalErrorHandler || errorHandler);

  return app;
}
