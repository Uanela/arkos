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
import {
  checkDatabaseConnection,
  loadPrismaModule,
} from "./utils/helpers/prisma.helpers";
import { ClassValidatorInitConfigsOptions } from "./utils/validate-dto";
import { fileUploaderRouter } from "./modules/file-uploader/file-uploader.router";

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

export type InitConfigsAuthenticationOptions = {
  signup: {
    /** Defines wether the api will look for isVerified = true in order to login or make an operation that authentication is required. */
    requireEmailVerification: boolean;
  };
  login: {
    /** Defines wether to send the access token in response after login or only send as cookie, defeault is both.*/
    sendAcessTokenIn: "cookie-only" | "response-only" | "both";
  };
};

export type InitConfigs = {
  port?: number;
  authentication?: InitConfigsAuthenticationOptions | boolean;
  validation?:
    | ClassValidatorInitConfigsOptions
    | {
        resolver?: "zod";
        validationOptions?: Record<string, any>;
      }
    | boolean;
};

let initConfigs: InitConfigs;
let prisma: any;

(async () => {
  prisma = await loadPrismaModule();
})();

export async function bootstrap(app: express.Express, configs: InitConfigs) {
  prisma = await loadPrismaModule();

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

  app.use(checkDatabaseConnection);

  app.use(handleRequestLogs);

  if (configs.authentication) app.use("/api", authRouter);
  app.use("/api", baseRouter);
  app.use("/api", fileUploaderRouter);
  app.use(errorHandler);

  return app;
}
