import compression from "compression";
import { Arkos } from "../types/arkos";
import { getArkosConfig, isProduction } from "./helpers/arkos-config.helpers";
import rateLimit from "express-rate-limit";
import deepmerge from "./helpers/deepmerge.helper";
import cors from "cors";
import express from "express";
import cookieParser from "cookie-parser";
import { queryParser } from "./helpers/query-parser.helpers";
import { handleRequestLogs } from "../modules/base/base.middlewares";
import debuggerService from "../modules/debugger/debugger.service";
import { catchAsync } from "../exports/error-handler";
import { TooManyRequestsError } from "../modules/error-handler/utils/errors";
import ExitError from "./helpers/exit-error";
import sheu from "./sheu";
import { ArkosRequestHandler } from "../types";

export default function setupApp(app: Arkos) {
  const config = getArkosConfig();

  const middlewaresConfig = config?.middlewares;

  app.use((_, _1, next) => {
    if (process.env.__ARKOS_SERVER_LISTENER !== "arkos")
      throw ExitError(
        "If you are using a custom server, you must call the listen method like 'app.listen(server)'. See https://www.arkosjs.com/docs/core-concepts/routing/setup#custom-server-access-and-websockets"
      );

    next();
  });

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
              handler: catchAsync(() => {
                throw new TooManyRequestsError();
              }),
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
        typeof middlewaresConfig?.cookieParser === "object"
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

  return app;
}
