import { Router } from "express";
import { authControllerFactory } from "./auth.controller";
import authService from "./auth.service";
import rateLimit from "express-rate-limit";
import { importModuleComponents } from "../../utils/helpers/models.helpers";
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
  const { middlewares, dtos, schemas, prismaQueryOptions } =
    await importModuleComponents("auth", arkosConfigs);
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
      ...processMiddleware(middlewares?.beforeGetMe),
      authController.getMe,
      ...processMiddleware(middlewares?.afterGetMe),
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
      ...processMiddleware(middlewares?.beforeUpdateMe),
      authController.updateMe,
      ...processMiddleware(middlewares?.afterUpdateMe),
      sendResponse
    )
    .delete(
      "/users/me",
      authService.authenticate,
      addPrismaQueryOptionsToRequest<any>(
        prismaQueryOptions as AuthPrismaQueryOptions<any>,
        "deleteMe"
      ),
      ...processMiddleware(middlewares?.beforeDeleteMe),
      authController.deleteMe,
      ...processMiddleware(middlewares?.afterDeleteMe),
      sendResponse
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
          handler: (req, res) => {
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
    ...processMiddleware(middlewares?.beforeLogin),
    authController.login,
    ...processMiddleware(middlewares?.afterLogin),
    sendResponse
  );

  router.delete(
    "/auth/logout",
    authService.authenticate,
    ...processMiddleware(middlewares?.beforeLogout),
    authController.logout,
    ...processMiddleware(middlewares?.afterLogout),
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
    ...processMiddleware(middlewares?.beforeSignup),
    authController.signup,
    ...processMiddleware(middlewares?.afterSignup),
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
    ...processMiddleware(middlewares?.beforeUpdatePassword),
    authController.updatePassword,
    ...processMiddleware(middlewares?.afterUpdatePassword),
    sendResponse
  );

  return router;
}
