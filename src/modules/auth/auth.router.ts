import { Router } from "express";
import { authControllerFactory } from "./auth.controller";
import authService from "./auth.service";
import rateLimit from "express-rate-limit";
import { importPrismaModelModules } from "../../utils/helpers/models.helpers";
import { sendResponse } from "../base/base.middlewares";
import { ArkosConfig } from "../../types/arkos-config";
import deepmerge from "../../utils/helpers/deepmerge.helper";

const router: Router = Router();

export async function getAuthRouter(arkosConfigs: ArkosConfig) {
  const { middlewares } = await importPrismaModelModules("auth");
  const authController = await authControllerFactory(middlewares);

  router
    .get(
      "/users/me",
      authService.authenticate,
      middlewares?.beforeGetMe ?? authController.getMe,
      middlewares?.beforeGetMe
        ? authController.getMe
        : middlewares?.afterGetMe ?? sendResponse,
      middlewares?.beforeGetMe && middlewares?.afterGetMe
        ? middlewares?.afterGetMe
        : sendResponse,
      sendResponse
    )
    .patch(
      "/users/me",
      authService.authenticate,
      middlewares?.beforeGetMe ?? authController.getMe,
      middlewares?.beforeGetMe
        ? authController.getMe
        : middlewares?.afterGetMe ?? sendResponse,
      middlewares?.beforeGetMe && middlewares?.afterGetMe
        ? middlewares?.afterGetMe
        : sendResponse,
      sendResponse
    )
    .delete(
      "/users/me",
      authService.authenticate,
      middlewares?.beforeGetMe ?? authController.getMe,
      middlewares?.beforeGetMe
        ? authController.getMe
        : middlewares?.afterGetMe ?? sendResponse,
      middlewares?.beforeGetMe && middlewares?.afterGetMe
        ? middlewares?.afterGetMe
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
    middlewares?.beforeLogin ?? authController.login,
    middlewares?.beforeLogin
      ? authController.login
      : middlewares?.afterLogin ?? sendResponse,
    middlewares?.beforeLogin && middlewares?.afterLogin
      ? middlewares?.afterLogin
      : sendResponse,
    sendResponse
  );

  router.delete(
    "/auth/logout",
    authService.authenticate,
    middlewares?.beforeLogout ?? authController.logout,
    middlewares?.beforeLogout
      ? authController.logout
      : middlewares?.afterLogout ?? sendResponse,
    middlewares?.beforeLogout && middlewares?.afterLogout
      ? middlewares?.afterLogout
      : sendResponse,
    sendResponse
  );

  router.post(
    "/auth/signup",
    middlewares?.beforeSignup ?? authController.signup,
    middlewares?.beforeSignup
      ? authController.signup
      : middlewares?.afterSignup ?? sendResponse,
    middlewares?.beforeSignup && middlewares?.afterSignup
      ? middlewares?.afterSignup
      : sendResponse,
    sendResponse
  );

  router.post(
    "/auth/update-password",
    authService.authenticate,
    middlewares?.beforeUpdatePassword ?? authController.updatePassword,
    middlewares?.beforeUpdatePassword
      ? authController.updatePassword
      : middlewares?.afterUpdatePassword ?? sendResponse,
    middlewares?.beforeUpdatePassword && middlewares?.afterUpdatePassword
      ? middlewares?.afterUpdatePassword
      : sendResponse,
    sendResponse
  );

  return router;
}
