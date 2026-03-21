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
  const middlewaresConfig = config?.middlewares;

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

  // app.use(knowModulesRouter);
  app.use(globalPrefix, getAvailableResourcesAndRoutesRouter());

  if (
    config.swagger &&
    (process.env.ARKOS_BUILD !== "true" ||
      config.swagger.enableAfterBuild === true)
  )
    app.use({ path: globalPrefix }, getSwaggerRouter(config, app));

  app.use("*", (req) => {
    throw new AppError(
      `Route ${req.method.toUpperCase()} ${req.originalUrl} was not found`,
      404,
      { route: `${req.method.toUpperCase()} ${req.originalUrl}` },
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
