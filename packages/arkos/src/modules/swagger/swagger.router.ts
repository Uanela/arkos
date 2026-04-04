import { Router } from "express";
import swaggerJsdoc from "swagger-jsdoc";
import getSwaggerDefaultConfig from "./utils/helpers/get-swagger-default-configs";
import { importEsmPreventingTsTransformation } from "../../utils/helpers/global.helpers";
import { generateOpenAPIFromApp } from "../../utils/arkos-router";
import {
  ArkosConfig,
  ArkosNextFunction,
  ArkosRequest,
  ArkosResponse,
} from "../../exports";
import deepmerge from "../../utils/helpers/deepmerge.helper";
import { Arkos } from "../../types/arkos";
import { UserArkosConfig } from "../../utils/define-config";
import authService from "../auth/auth.service";
import AppError from "../error-handler/utils/app-error";
import getOpenApiLoginHtml from "./utils/get-open-api-login-html";

const swaggerRouter = Router();

export function getSwaggerRouter(
  arkosConfig: UserArkosConfig,
  app: Arkos
): Router {
  const pathsFromCustomArkosRouters = generateOpenAPIFromApp(app);

  const swaggerConfigs = deepmerge(
    getSwaggerDefaultConfig({
      ...pathsFromCustomArkosRouters,
    }) || {},
    arkosConfig.swagger || {}
  ) as ArkosConfig["swagger"];

  const { definition, ...options } = swaggerConfigs?.options!;
  const swaggerSpecification = swaggerJsdoc({
    definition: definition as swaggerJsdoc.SwaggerDefinition,
    ...options,
  });

  const endpoint = swaggerConfigs!.endpoint!;

  const swaggerAuth = arkosConfig?.swagger;
  const authenticate = swaggerAuth?.authenticate !== false;

  if (authenticate) {
    swaggerRouter.use(
      endpoint,
      (req: ArkosRequest, _: ArkosResponse, next: ArkosNextFunction) => {
        if (req.path.includes("/auth")) return next();
        next("route"); // skip to auth chain below
      }
    );

    swaggerRouter.use(
      endpoint,
      authService.authenticate,
      (req: ArkosRequest, _: ArkosResponse, next: ArkosNextFunction) => {
        if (!req.user?.isSuperUser)
          return next(
            new AppError(
              "Only super users can access API documentation in production.",
              403,
              "SuperUserRequired"
            )
          );
        next();
      },
      (
        err: AppError,
        req: ArkosRequest,
        res: ArkosResponse,
        next: ArkosNextFunction
      ) => {
        if (req.path.includes("/auth")) return next();
        const message = encodeURIComponent(
          err?.message || "Authentication required."
        );
        return res.redirect(
          `${arkosConfig.globalPrefix}${endpoint}/auth/login?error-message=${message}`
        );
      }
    );
  }

  swaggerRouter.get(
    `${endpoint}/auth/login`,
    (_: ArkosRequest, res: ArkosResponse) => {
      res.send(getOpenApiLoginHtml());
    }
  );

  swaggerRouter.get(
    `${endpoint}/openapi.json`,
    (_: ArkosRequest, res: ArkosResponse) => {
      res.json(swaggerSpecification);
    }
  );

  let scalarHandler: any = null;

  swaggerRouter.use(
    endpoint,
    scalarMiddleware(scalarHandler, swaggerSpecification, swaggerConfigs)
  );

  return swaggerRouter;
}

export function scalarMiddleware(
  scalarHandler: any,
  swaggerSpecification: object,
  swaggerConfigs: any
) {
  let scalarLoading: Promise<void> | null = null;

  return async (
    req: ArkosRequest,
    res: ArkosResponse,
    next: ArkosNextFunction
  ) => {
    if (!scalarHandler) {
      if (!scalarLoading) {
        scalarLoading = importEsmPreventingTsTransformation(
          "@scalar/express-api-reference"
        ).then((scalar) => {
          scalarHandler = scalar.apiReference({
            content: swaggerSpecification,
            ...swaggerConfigs?.scalarApiReferenceConfiguration,
          });
        });
      }
      await scalarLoading;
    }
    return scalarHandler(req, res, next);
  };
}
