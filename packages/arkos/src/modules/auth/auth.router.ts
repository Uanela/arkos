import { Router } from "express";
import { authControllerFactory } from "./auth.controller";
import rateLimit from "express-rate-limit";
import { getModuleComponents } from "../../utils/dynamic-loader";
import {
  addPrismaQueryOptionsToRequest,
  sendResponse,
} from "../base/base.middlewares";
import { ArkosConfig } from "../../types/new-arkos-config";
import deepmerge from "../../utils/helpers/deepmerge.helper";
import { AuthPrismaQueryOptions } from "../../types";
import {
  processMiddleware,
  createRouteConfig,
} from "../../utils/helpers/routers.helpers";
import { isEndpointDisabled } from "../base/utils/helpers/base.router.helpers";
import debuggerService from "../debugger/debugger.service";
import routerValidator from "../base/utils/router-validator";
import { getUserFileExtension } from "../../utils/helpers/fs.helpers";
import ArkosRouter from "../../utils/arkos-router";

const router = ArkosRouter();

export function getAuthRouter(arkosConfig: ArkosConfig) {
  const {
    interceptors,
    dtos,
    schemas,
    prismaQueryOptions,
    router: customRouterModule,
    authConfigs,
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

  const authController = authControllerFactory(interceptors);

  if (routerConfig?.disable === true) return router;

  const getValidationSchemaOrDto = (
    key: "updateMe" | "updatePassword" | "login" | "signup"
  ) => {
    const validationConfigs = arkosConfig?.validation;
    if (validationConfigs?.resolver === "class-validator") return dtos?.[key];
    else if (validationConfigs?.resolver === "zod") return schemas?.[key];

    return undefined;
  };

  // GET /users/me - Get current user
  if (!isEndpointDisabled(routerConfig, "getMe")) {
    router.get(
      createRouteConfig(
        arkosConfig,
        "getMe",
        "users",
        "/me",
        routerConfig,
        "auth",
        true
      ),
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

  // PATCH /users/me - Update current user
  if (!isEndpointDisabled(routerConfig, "updateMe")) {
    router.patch(
      createRouteConfig(
        arkosConfig,
        "updateMe",
        "users",
        "/me",
        routerConfig,
        "auth",
        true,
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

  // DELETE /users/me - Delete current user
  if (!isEndpointDisabled(routerConfig, "deleteMe")) {
    router.delete(
      createRouteConfig(
        arkosConfig,
        "deleteMe",
        "users",
        "/me",
        routerConfig,
        "auth",
        true
      ),
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

  // Apply rate limiting to auth routes
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
          arkosConfig?.authentication?.rateLimit || {}
        )
      )
    );
  }

  // POST /auth/login - Login
  if (!isEndpointDisabled(routerConfig, "login")) {
    router.post(
      createRouteConfig(
        arkosConfig,
        "login",
        "auth",
        "/login",
        routerConfig,
        "auth",
        false,
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

  // DELETE /auth/logout - Logout
  if (!isEndpointDisabled(routerConfig, "logout")) {
    router.delete(
      createRouteConfig(
        arkosConfig,
        "logout",
        "auth",
        "/logout",
        routerConfig,
        "auth",
        true
      ),
      ...processMiddleware(interceptors?.beforeLogout),
      authController.logout,
      ...processMiddleware(interceptors?.afterLogout),
      sendResponse,
      ...processMiddleware(interceptors?.onLogoutError, { type: "error" })
    );
  }

  // POST /auth/signup - Signup
  if (!isEndpointDisabled(routerConfig, "signup")) {
    router.post(
      createRouteConfig(
        arkosConfig,
        "signup",
        "auth",
        "/signup",
        routerConfig,
        "auth",
        false,
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

  // POST /auth/update-password - Update password
  if (!isEndpointDisabled(routerConfig, "updatePassword")) {
    router.post(
      createRouteConfig(
        arkosConfig,
        "updatePassword",
        "auth",
        "/update-password",
        routerConfig,
        "auth",
        true,
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

  // GET /auth-actions - Find many auth actions
  if (!isEndpointDisabled(routerConfig, "findManyAuthAction")) {
    router.get(
      createRouteConfig(
        arkosConfig,
        "findManyAuthAction",
        "auth-actions",
        "",
        routerConfig,
        "auth",
        authConfigs
      ),
      ...processMiddleware(interceptors?.beforeFindManyAuthAction),
      authController.findManyAuthAction,
      ...processMiddleware(interceptors?.afterFindManyAuthAction),
      sendResponse,
      ...processMiddleware(interceptors?.onFindManyAuthActionError, {
        type: "error",
      })
    );
  }

  // GET /auth-actions/:resourceName - Find one auth action
  if (!isEndpointDisabled(routerConfig, "findOneAuthAction")) {
    router.get(
      createRouteConfig(
        arkosConfig,
        "findOneAuthAction",
        "auth-actions",
        "/:resourceName",
        routerConfig,
        "auth",
        authConfigs
      ),
      ...processMiddleware(interceptors?.beforeFindOneAuthAction),
      authController.findOneAuthAction,
      ...processMiddleware(interceptors?.afterFindOneAuthAction),
      sendResponse,
      ...processMiddleware(interceptors?.onFindOneAuthActionError, {
        type: "error",
      })
    );
  }

  debuggerService.logModuleFinalRouter("auth", router as any);
  return router;
}
