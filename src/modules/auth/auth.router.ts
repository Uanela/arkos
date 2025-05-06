import { Router } from "express";
import { authControllerFactory } from "./auth.controller";
import authService from "./auth.service";
import rateLimit from "express-rate-limit";
import { importPrismaModelModules } from "../../utils/helpers/models.helpers";
import {
  addPrismaQueryOptionsToRequest,
  handleRequestBodyValidationAndTransformation,
  sendResponse,
} from "../base/base.middlewares";
import { ArkosConfig } from "../../types/arkos-config";
import deepmerge from "../../utils/helpers/deepmerge.helper";
import { AuthPrismaQueryOptions } from "../../types";

const router: Router = Router();

export async function getAuthRouter(arkosConfigs: ArkosConfig) {
  const { middlewares, dtos, schemas, prismaQueryOptions } =
    await importPrismaModelModules("auth");
  const authController = await authControllerFactory(middlewares);

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
      middlewares?.beforeGetMe || authController.getMe,
      middlewares?.beforeGetMe
        ? authController.getMe
        : middlewares?.afterGetMe || sendResponse,
      middlewares?.beforeGetMe && middlewares?.afterGetMe
        ? middlewares?.afterGetMe
        : sendResponse,
      sendResponse
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
      middlewares?.beforeUpdateMe || authController.updateMe,
      middlewares?.beforeUpdateMe
        ? authController.updateMe
        : middlewares?.afterUpdateMe || sendResponse,
      middlewares?.beforeUpdateMe && middlewares?.afterUpdateMe
        ? middlewares?.afterUpdateMe
        : sendResponse,
      sendResponse
    )
    .delete(
      "/users/me",
      authService.authenticate,
      addPrismaQueryOptionsToRequest<any>(
        prismaQueryOptions as AuthPrismaQueryOptions<any>,
        "deleteMe"
      ),
      middlewares?.beforeDeleteMe || authController.deleteMe,
      middlewares?.beforeDeleteMe
        ? authController.deleteMe
        : middlewares?.afterDeleteMe || sendResponse,
      middlewares?.beforeDeleteMe && middlewares?.afterDeleteMe
        ? middlewares?.afterDeleteMe
        : sendResponse,
      sendResponse
    );

  router.use(
    rateLimit(
      deepmerge(
        {
          windowMs: 5000,
          limit: 10,
          standardHeaders: "draft-7",
          legacyHeaders: false,
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
    middlewares?.beforeLogin || authController.login,
    middlewares?.beforeLogin
      ? authController.login
      : middlewares?.afterLogin || sendResponse,
    middlewares?.beforeLogin && middlewares?.afterLogin
      ? middlewares?.afterLogin
      : sendResponse,
    sendResponse
  );

  router.delete(
    "/auth/logout",
    authService.authenticate,
    middlewares?.beforeLogout || authController.logout,
    middlewares?.beforeLogout
      ? authController.logout
      : middlewares?.afterLogout || sendResponse,
    middlewares?.beforeLogout && middlewares?.afterLogout
      ? middlewares?.afterLogout
      : sendResponse,
    sendResponse
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
    middlewares?.beforeSignup || authController.signup,
    middlewares?.beforeSignup
      ? authController.signup
      : middlewares?.afterSignup || sendResponse,
    middlewares?.beforeSignup && middlewares?.afterSignup
      ? middlewares?.afterSignup
      : sendResponse,
    sendResponse
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
    middlewares?.beforeUpdatePassword || authController.updatePassword,
    middlewares?.beforeUpdatePassword
      ? authController.updatePassword
      : middlewares?.afterUpdatePassword || sendResponse,
    middlewares?.beforeUpdatePassword && middlewares?.afterUpdatePassword
      ? middlewares?.afterUpdatePassword
      : sendResponse,
    sendResponse
  );

  return router;
}
