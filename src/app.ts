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

  app.use(compression());

  app.use(
    rateLimit({
      windowMs: 60 * 1000,
      limit: 1000,
      standardHeaders: "draft-7",
      legacyHeaders: false,
    })
  );

  app.set("trust proxy", 1);

  app.use(
    cors({
      origin: (origin, cb) => {
        cb(null, true);
      },
      methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTION"],
      allowedHeaders: ["Content-Type", "Authorization", "Connection"],
      credentials: true,
    })
  );

  app.use(express.json());
  app.use(cookieParser());
  app.use(
    queryParser({
      parseNull: true,
      parseUndefined: true,
      parseBoolean: true,
    })
  );

  app.use(checkDatabaseConnection);
  app.use(handleRequestLogs);

  app.get("/api", (req, res, next) => {
    res.status(200).json({ message: arkosConfig.welcomeMessage });
  });

  if (arkosConfig.authentication)
    app.use("/api", await getAuthRouter(arkosConfig));

  app.use("/api", baseRouter);
  app.use("/api", await getFileUploaderRouter(arkosConfig));

  app.use(errorHandler);

  return app;
}

export function arkosAppFactory() {
  return app;
}
