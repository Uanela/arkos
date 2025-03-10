import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import cookieParser from "cookie-parser";
import { queryParser } from "express-query-parser";
import authRouter from "./modules/auth/auth.router";
import baseRouter from "./modules/base/base.router";
import errorHandler from "./modules/error-handler/error-handler.controller";
import { rateLimit } from "express-rate-limit";
import path from "path";
import * as dotenv from "dotenv";
import compression from "compression";
import { handleRequestLogs } from "./modules/base/base.middlewares";
import { checkDatabaseConnection } from "./utils/features/prisma.helpers";

const ENV = process.env.NODE_ENV || "development";
let envPath = ".env";

if (ENV === "production") {
  envPath = path.resolve(process.cwd(), ".env.production");
} else if (ENV === "staging") {
  envPath = path.resolve(process.cwd(), ".env.staging");
} else {
  envPath = path.resolve(process.cwd(), ".env.development");
}

dotenv.config({ path: envPath });

export type InitConfigs = {
  prisma: any;
  port?: number;
  authentication?: boolean;
};

let initConfigs: InitConfigs;

export function bootstrap(app: express.Express, configs: InitConfigs) {
  initConfigs = configs;

  app.use(compression());

  const limiter = rateLimit({
    windowMs: 60 * 1000,
    limit: 1000,
    standardHeaders: "draft-7",
    legacyHeaders: false,
  });

  app.use(limiter);

  app.set("trust proxy", 1);

  app.use(
    "/api/uploads",
    express.static(path.join("uploads"), {
      maxAge: "1y",
      etag: true,
      lastModified: true,
      dotfiles: "ignore",
      fallthrough: true,
      index: false,
      cacheControl: true,
    })
  );

  app.use(
    cors({
      origin: (origin, callback) => {
        callback(null, true);
      },
      methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTION"],
      allowedHeaders: ["Content-Type", "Authorization", "Connection"],
      credentials: true,
    })
  );

  app.use(express.json());
  app.use(bodyParser.json());
  app.use(cookieParser());
  app.use(
    queryParser({
      parseNull: true,
      parseUndefined: true,
      parseBoolean: true,
      parseNumber: true,
    })
  );

  app.use(checkDatabaseConnection(initConfigs.prisma));

  // const specs = swaggerJsdoc(options)

  app.use(handleRequestLogs);

  if (configs.authentication) app.use("/api", authRouter);
  app.use("/api", baseRouter);
  app.use(errorHandler);

  return app;
}

export { initConfigs };
