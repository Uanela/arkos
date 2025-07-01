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
import catchAsync from "../error-handler/utils/catch-async";

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

  // Helper to conditionally wrap middleware with catchAsync
  const safeCatchAsync = (middleware: any) => {
    return middleware ? catchAsync(middleware) : undefined;
  };

  router
    .get(
      "/users/me",
      authService.authenticate,
      addPrismaQueryOptionsToRequest<any>(
        prismaQueryOptions as AuthPrismaQueryOptions<any>,
        "getMe"
      ),
      ...[
        safeCatchAsync(middlewares?.beforeGetMe) || authController.getMe,
        safeCatchAsync(middlewares?.beforeGetMe)
          ? authController.getMe
          : safeCatchAsync(middlewares?.afterGetMe) || sendResponse,
        safeCatchAsync(middlewares?.beforeGetMe) &&
        safeCatchAsync(middlewares?.afterGetMe)
          ? safeCatchAsync(middlewares?.afterGetMe)
          : sendResponse,
        sendResponse,
      ].filter((middleware) => !!middleware)
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
      ...[
        safeCatchAsync(middlewares?.beforeUpdateMe) || authController.updateMe,
        safeCatchAsync(middlewares?.beforeUpdateMe)
          ? authController.updateMe
          : safeCatchAsync(middlewares?.afterUpdateMe) || sendResponse,
        safeCatchAsync(middlewares?.beforeUpdateMe) &&
        safeCatchAsync(middlewares?.afterUpdateMe)
          ? safeCatchAsync(middlewares?.afterUpdateMe)
          : sendResponse,
        sendResponse,
      ].filter((middleware) => !!middleware)
    )
    .delete(
      "/users/me",
      authService.authenticate,
      addPrismaQueryOptionsToRequest<any>(
        prismaQueryOptions as AuthPrismaQueryOptions<any>,
        "deleteMe"
      ),
      ...[
        safeCatchAsync(middlewares?.beforeDeleteMe) || authController.deleteMe,
        safeCatchAsync(middlewares?.beforeDeleteMe)
          ? authController.deleteMe
          : safeCatchAsync(middlewares?.afterDeleteMe) || sendResponse,
        safeCatchAsync(middlewares?.beforeDeleteMe) &&
        safeCatchAsync(middlewares?.afterDeleteMe)
          ? safeCatchAsync(middlewares?.afterDeleteMe)
          : sendResponse,
        sendResponse,
      ].filter((middleware) => !!middleware)
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
    ...[
      safeCatchAsync(middlewares?.beforeLogin) || authController.login,
      safeCatchAsync(middlewares?.beforeLogin)
        ? authController.login
        : safeCatchAsync(middlewares?.afterLogin) || sendResponse,
      safeCatchAsync(middlewares?.beforeLogin) &&
      safeCatchAsync(middlewares?.afterLogin)
        ? safeCatchAsync(middlewares?.afterLogin)
        : sendResponse,
      sendResponse,
    ].filter((middleware) => !!middleware)
  );

  router.delete(
    "/auth/logout",
    authService.authenticate,
    ...[
      safeCatchAsync(middlewares?.beforeLogout) || authController.logout,
      safeCatchAsync(middlewares?.beforeLogout)
        ? authController.logout
        : safeCatchAsync(middlewares?.afterLogout) || sendResponse,
      safeCatchAsync(middlewares?.beforeLogout) &&
      safeCatchAsync(middlewares?.afterLogout)
        ? safeCatchAsync(middlewares?.afterLogout)
        : sendResponse,
      sendResponse,
    ].filter((middleware) => !!middleware)
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
    ...[
      safeCatchAsync(middlewares?.beforeSignup) || authController.signup,
      safeCatchAsync(middlewares?.beforeSignup)
        ? authController.signup
        : safeCatchAsync(middlewares?.afterSignup) || sendResponse,
      safeCatchAsync(middlewares?.beforeSignup) &&
      safeCatchAsync(middlewares?.afterSignup)
        ? safeCatchAsync(middlewares?.afterSignup)
        : sendResponse,
      sendResponse,
    ].filter((middleware) => !!middleware)
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
    ...[
      safeCatchAsync(middlewares?.beforeUpdatePassword) ||
        authController.updatePassword,
      safeCatchAsync(middlewares?.beforeUpdatePassword)
        ? authController.updatePassword
        : safeCatchAsync(middlewares?.afterUpdatePassword) || sendResponse,
      safeCatchAsync(middlewares?.beforeUpdatePassword) &&
      safeCatchAsync(middlewares?.afterUpdatePassword)
        ? safeCatchAsync(middlewares?.afterUpdatePassword)
        : sendResponse,
      sendResponse,
    ].filter((middleware) => !!middleware)
  );

  return router;
}
