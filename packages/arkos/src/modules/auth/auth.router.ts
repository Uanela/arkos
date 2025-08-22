import { Router } from "express";
import { authControllerFactory } from "./auth.controller";
import authService from "./auth.service";
import rateLimit from "express-rate-limit";
import { importModuleComponents } from "../../utils/helpers/dynamic-loader";
import {
  addPrismaQueryOptionsToRequest,
  handleRequestBodyValidationAndTransformation,
  sendResponse,
} from "../base/base.middlewares";
import { ArkosConfig } from "../../types/arkos-config";
import deepmerge from "../../utils/helpers/deepmerge.helper";
import { AuthPrismaQueryOptions } from "../../types";
import { processMiddleware } from "../../utils/helpers/routers.helpers";

const router: Router = Router();

export async function getAuthRouter(arkosConfigs: ArkosConfig) {
  const { interceptors, dtos, schemas, prismaQueryOptions } =
    await importModuleComponents("auth", arkosConfigs);
  const authController = await authControllerFactory(interceptors);

  // Helper to get the correct schema or DTO based on Arkos Config
  const getValidationSchemaOrDto = (key: string) => {
    const validationConfigs = arkosConfigs?.validation;
    if (validationConfigs?.resolver === "class-validator") {
      return dtos?.[key];
    } else if (validationConfigs?.resolver === "zod") {
      return schemas?.[key];
    }
    return undefined;
  };

  router
    .get(
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
      ...processMiddleware(interceptors?.onGetMeError)
    )
    .patch(
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
      ...processMiddleware(interceptors?.onUpdateMeError)
    )
    .delete(
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
      ...processMiddleware(interceptors?.onDeleteMeError)
    );

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
    ...processMiddleware(interceptors?.onLoginError)
  );

  router.delete(
    "/auth/logout",
    authService.authenticate,
    ...processMiddleware(interceptors?.beforeLogout),
    authController.logout,
    ...processMiddleware(interceptors?.afterLogout),
    sendResponse,
    ...processMiddleware(interceptors?.onLogoutError)
  );

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
    ...processMiddleware(interceptors?.onSignupError)
  );

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
    ...processMiddleware(interceptors?.onUpdatePasswordError)
  );

  return router;
}
