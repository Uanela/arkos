import { Router } from "express";
import { authControllerFactory } from "./auth.controller";
import authService from "./auth.service";
import rateLimit from "express-rate-limit";
import { getModuleComponents } from "../../utils/dynamic-loader";
import {
  addPrismaQueryOptionsToRequest,
  handleRequestBodyValidationAndTransformation,
  sendResponse,
} from "../base/base.middlewares";
import { ArkosConfig } from "../../types/arkos-config";
import deepmerge from "../../utils/helpers/deepmerge.helper";
import { AuthPrismaQueryOptions } from "../../types";
import { processMiddleware } from "../../utils/helpers/routers.helpers";
import { isEndpointDisabled } from "../base/utils/helpers/base.router.helpers";
import debuggerService from "../debugger/debugger.service";
import routerValidator from "../base/utils/router-validator";
import { getUserFileExtension } from "../../utils/helpers/fs.helpers";

const router: Router = Router();

export async function getAuthRouter(arkosConfigs: ArkosConfig) {
  const {
    interceptors,
    dtos,
    schemas,
    prismaQueryOptions,
    router: customRouterModule,
  } = getModuleComponents("auth") || {};

  const routerConfig = customRouterModule?.config || {};
  const customRouter = customRouterModule?.default as Router;

  if (customRouter && customRouterModule) {
    if (routerValidator.isExpressRouter(customRouter))
      router.use(`/auth`, customRouter);
    else
      throw Error(
        `ValidationError: The exported router from auth.router.${getUserFileExtension()} is not a valid express or arkos Router.`
      );
  }

  const authController = await authControllerFactory(interceptors);

  if (routerConfig?.disable === true) return router;

  const getValidationSchemaOrDto = (
    key: "updateMe" | "updatePassword" | "login" | "signup"
  ) => {
    const validationConfigs = arkosConfigs?.validation;
    if (validationConfigs?.resolver === "class-validator") {
      return dtos?.[key];
    } else if (validationConfigs?.resolver === "zod") {
      return schemas?.[key];
    }
    return undefined;
  };

  if (!isEndpointDisabled(routerConfig, "getMe")) {
    router.get(
      "/users/me",
      authService.authenticate,
      addPrismaQueryOptionsToRequest<any>(
        prismaQueryOptions as AuthPrismaQueryOptions<any>,
        "getMe"
      ),
      ...processMiddleware(interceptors?.beforeGetMe),
      authController.getMe,
      ...processMiddleware(interceptors?.afterGetMe),
      sendResponse,
      ...processMiddleware(interceptors?.onGetMeError, { type: "error" })
    );
  }

  if (!isEndpointDisabled(routerConfig, "updateMe")) {
    router.patch(
      "/users/me",
      authService.authenticate,
      handleRequestBodyValidationAndTransformation(
        getValidationSchemaOrDto("updateMe")
      ),
      addPrismaQueryOptionsToRequest<any>(
        prismaQueryOptions as AuthPrismaQueryOptions<any>,
        "updateMe"
      ),
      ...processMiddleware(interceptors?.beforeUpdateMe),
      authController.updateMe,
      ...processMiddleware(interceptors?.afterUpdateMe),
      sendResponse,
      ...processMiddleware(interceptors?.onUpdateMeError, { type: "error" })
    );
  }

  if (!isEndpointDisabled(routerConfig, "deleteMe")) {
    router.delete(
      "/users/me",
      authService.authenticate,
      addPrismaQueryOptionsToRequest<any>(
        prismaQueryOptions as AuthPrismaQueryOptions<any>,
        "deleteMe"
      ),
      ...processMiddleware(interceptors?.beforeDeleteMe),
      authController.deleteMe,
      ...processMiddleware(interceptors?.afterDeleteMe),
      sendResponse,
      ...processMiddleware(interceptors?.onDeleteMeError, { type: "error" })
    );
  }

  if (
    !isEndpointDisabled(routerConfig, "login") ||
    !isEndpointDisabled(routerConfig, "logout") ||
    !isEndpointDisabled(routerConfig, "signup") ||
    !isEndpointDisabled(routerConfig, "updatePassword")
  ) {
    router.use(
      "/auth",
      rateLimit(
        deepmerge(
          {
            windowMs: 5000,
            limit: 10,
            standardHeaders: "draft-7",
            legacyHeaders: false,
            handler: (_, res) => {
              res.status(429).json({
                message: "Too many requests, please try again later",
              });
            },
          },
          arkosConfigs?.authentication?.requestRateLimitOptions || {}
        )
      )
    );
  }

  if (!isEndpointDisabled(routerConfig, "login")) {
    router.post(
      "/auth/login",
      handleRequestBodyValidationAndTransformation(
        getValidationSchemaOrDto("login")
      ),
      addPrismaQueryOptionsToRequest<any>(
        prismaQueryOptions as AuthPrismaQueryOptions<any>,
        "login"
      ),
      ...processMiddleware(interceptors?.beforeLogin),
      authController.login,
      ...processMiddleware(interceptors?.afterLogin),
      sendResponse,
      ...processMiddleware(interceptors?.onLoginError, { type: "error" })
    );
  }

  if (!isEndpointDisabled(routerConfig, "logout")) {
    router.delete(
      "/auth/logout",
      authService.authenticate,
      ...processMiddleware(interceptors?.beforeLogout),
      authController.logout,
      ...processMiddleware(interceptors?.afterLogout),
      sendResponse,
      ...processMiddleware(interceptors?.onLogoutError, { type: "error" })
    );
  }

  if (!isEndpointDisabled(routerConfig, "signup")) {
    router.post(
      "/auth/signup",
      handleRequestBodyValidationAndTransformation(
        getValidationSchemaOrDto("signup")
      ),
      addPrismaQueryOptionsToRequest<any>(
        prismaQueryOptions as AuthPrismaQueryOptions<any>,
        "signup"
      ),
      ...processMiddleware(interceptors?.beforeSignup),
      authController.signup,
      ...processMiddleware(interceptors?.afterSignup),
      sendResponse,
      ...processMiddleware(interceptors?.onSignupError, { type: "error" })
    );
  }

  if (!isEndpointDisabled(routerConfig, "updatePassword")) {
    router.post(
      "/auth/update-password",
      authService.authenticate,
      handleRequestBodyValidationAndTransformation(
        getValidationSchemaOrDto("updatePassword")
      ),
      addPrismaQueryOptionsToRequest<any>(
        prismaQueryOptions as AuthPrismaQueryOptions<any>,
        "updatePassword"
      ),
      ...processMiddleware(interceptors?.beforeUpdatePassword),
      authController.updatePassword,
      ...processMiddleware(interceptors?.afterUpdatePassword),
      sendResponse,
      ...processMiddleware(interceptors?.onUpdatePasswordError, {
        type: "error",
      })
    );
  }

  if (!isEndpointDisabled(routerConfig, "findManyAuthAction"))
    router.get(
      "/auth-actions",
      authService.authenticate,
      authService.handleAccessControl("View", "auth-action"),
      ...processMiddleware(interceptors?.beforeFindManyAuthAction),
      authController.findManyAuthAction,
      ...processMiddleware(interceptors?.afterFindManyAuthAction),
      sendResponse,
      ...processMiddleware(interceptors?.onFindManyAuthActionError, {
        type: "error",
      })
    );

  if (!isEndpointDisabled(routerConfig, "findOneAuthAction"))
    router.get(
      "/auth-actions/:resourceName",
      authService.authenticate,
      authService.handleAccessControl("View", "auth-action"),
      ...processMiddleware(interceptors?.beforeFindOneAuthAction),
      authController.findOneAuthAction,
      ...processMiddleware(interceptors?.afterFindOneAuthAction),
      sendResponse,
      ...processMiddleware(interceptors?.onFindOneAuthActionError, {
        type: "error",
      })
    );

  debuggerService.logModuleFinalRouter("auth", router);
  return router;
}
