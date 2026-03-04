import compression from "compression";
import { Arkos } from "../types/arkos";
import { getArkosConfig } from "./helpers/arkos-config.helpers";
import rateLimit from "express-rate-limit";
import deepmerge from "./helpers/deepmerge.helper";
import cors from "cors";
import express from "express";
import cookieParser from "cookie-parser";
import { queryParser } from "./helpers/query-parser.helpers";
import { handleRequestLogs } from "../modules/base/base.middlewares";
import debuggerService from "../modules/debugger/debugger.service";

export default function setupApp(app: Arkos) {
  const config = getArkosConfig();

  const middlewaresConfig = config?.middlewares;

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

  return app;
}
