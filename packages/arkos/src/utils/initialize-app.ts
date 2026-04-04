import { Arkos } from "../types/arkos";
import { getFileUploadRouter } from "../modules/file-upload/file-upload.router";
import { getAuthRouter } from "../modules/auth/auth.router";
import {
  getAvailableResourcesAndRoutesRouter,
  getPrismaModelsRouter,
} from "../modules/base/base.router";
import { AppError } from "../exports/error-handler";
import errorHandler from "../modules/error-handler/error-handler.controller";
import { getArkosConfig } from "../server";
import { isAuthenticationEnabled } from "./helpers/arkos-config.helpers";
import { getSwaggerRouter } from "../modules/swagger/swagger.router";

export default function initializeApp(app: Arkos) {
  const config = getArkosConfig();
  const globalPrefix = config.globalPrefix || "/api";

  const routersConfig = config?.routers;

  if (routersConfig?.welcomeRoute !== false) {
    if (typeof routersConfig?.welcomeRoute === "function") {
      app.get({ path: globalPrefix }, routersConfig.welcomeRoute);
    } else {
      app.get({ path: globalPrefix }, (_, res) => {
        res.status(200).json({ message: config.welcomeMessage });
      });
    }
  }

  const fileUploadRouter = getFileUploadRouter(config);
  app.use(fileUploadRouter);

  if (isAuthenticationEnabled()) {
    const authRouter = getAuthRouter(config);
    app.use(globalPrefix, authRouter);
  }

  const modelsRouter = getPrismaModelsRouter(config);
  app.use(globalPrefix, modelsRouter);

  app.use(globalPrefix, getAvailableResourcesAndRoutesRouter());

  if (
    config.swagger &&
    (process.env.ARKOS_BUILD !== "true" ||
      config.swagger.enableAfterBuild === true)
  )
    app.use(globalPrefix, getSwaggerRouter(config, app));

  return app;
}

export function addGlobalErrorHandler(app: Arkos) {
  app.use("*", (req) => {
    throw new AppError(
      `Route ${req.method} ${req.originalUrl} was not found`,
      404,
      { route: `${req.method} ${req.originalUrl}` },
      "RouteNotFound"
    );
  });

  app.use(errorHandler);

  return app;
}
