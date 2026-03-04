import { authControllerFactory } from "./auth.controller";
import rateLimit, { Options as RateLimitOptions } from "express-rate-limit";
import {
  addPrismaQueryOptionsToRequest,
  sendResponse,
} from "../base/base.middlewares";
import deepmerge from "../../utils/helpers/deepmerge.helper";
import { AuthPrismaQueryOptions } from "../../types";
import { processMiddleware } from "../../utils/helpers/routers.helpers";
import debuggerService from "../debugger/debugger.service";
import ArkosRouter from "../../utils/arkos-router";
import { ArkosLoadableRegistry } from "../../components/arkos-loadable-registry";
import { interceptorReader } from "../../components/arkos-interceptor/reader";
import { ArkosAuthInterceptorInstance } from "../../components/arkos-interceptor/types";

const router = ArkosRouter();

export function getAuthRouter(registry: ArkosLoadableRegistry) {
  const interceptor = registry.getInterceptor("auth");

  const op = (operation: string) =>
    interceptor
      ? interceptorReader.forOperation(interceptor, operation)
      : {
          before: [],
          after: [],
          onError: [],
          prismaQuery: {},
          routeConfig: {},
        };

  const authController = authControllerFactory(
    interceptor as ArkosAuthInterceptorInstance
  );

  // GET /users/me - Get current user
  {
    const { before, after, onError, prismaQuery, routeConfig } = op("getMe");

    router.get(
      {
        ...routeConfig,
        path: "/users/me",
      },
      addPrismaQueryOptionsToRequest<any>(
        { getMe: prismaQuery } as AuthPrismaQueryOptions<any>,
        "getMe"
      ),
      ...processMiddleware(before),
      authController.getMe,
      ...processMiddleware(after),
      sendResponse,
      ...processMiddleware(onError, { type: "error" })
    );
  }

  // PATCH /users/me - Update current user
  {
    const { before, after, onError, prismaQuery, routeConfig } = op("updateMe");

    router.patch(
      {
        ...routeConfig,
        path: "/users/me",
      },
      addPrismaQueryOptionsToRequest<any>(
        { updateMe: prismaQuery } as AuthPrismaQueryOptions<any>,
        "updateMe"
      ),
      ...processMiddleware(before),
      authController.updateMe,
      ...processMiddleware(after),
      sendResponse,
      ...processMiddleware(onError, { type: "error" })
    );
  }

  // DELETE /users/me - Delete current user
  {
    const { before, after, onError, prismaQuery, routeConfig } = op("deleteMe");

    router.delete(
      {
        ...routeConfig,
        path: "/users/me",
      },
      addPrismaQueryOptionsToRequest<any>(
        { deleteMe: prismaQuery } as AuthPrismaQueryOptions<any>,
        "deleteMe"
      ),
      ...processMiddleware(before),
      authController.deleteMe,
      ...processMiddleware(after),
      sendResponse,
      ...processMiddleware(onError, { type: "error" })
    );
  }

  const rateLimitConfig: Partial<RateLimitOptions> = {
    windowMs: 5000,
    limit: 10,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    handler: (_, res) => {
      res.status(429).json({
        message: "Too many requests, please try again later",
      });
    },
  };

  // POST /auth/login - Login
  {
    const { before, after, onError, prismaQuery, routeConfig } = op("login");

    router.post(
      {
        rateLimit: rateLimitConfig,
        ...routeConfig,
        path: "/auth/login",
      },
      addPrismaQueryOptionsToRequest<any>(
        { login: prismaQuery } as AuthPrismaQueryOptions<any>,
        "login"
      ),
      ...processMiddleware(before),
      authController.login,
      ...processMiddleware(after),
      sendResponse,
      ...processMiddleware(onError, { type: "error" })
    );
  }

  // DELETE /auth/logout - Logout
  {
    const { before, after, onError, routeConfig } = op("logout");

    router.delete(
      {
        rateLimit: rateLimitConfig,
        ...routeConfig,
        path: "/auth/logout",
      },
      ...processMiddleware(before),
      authController.logout,
      ...processMiddleware(after),
      sendResponse,
      ...processMiddleware(onError, { type: "error" })
    );
  }

  // POST /auth/signup - Signup
  {
    const { before, after, onError, prismaQuery, routeConfig } = op("signup");

    router.post(
      {
        rateLimit: rateLimitConfig,
        ...routeConfig,
        path: "/auth/signup",
      },
      addPrismaQueryOptionsToRequest<any>(
        { signup: prismaQuery } as AuthPrismaQueryOptions<any>,
        "signup"
      ),
      ...processMiddleware(before),
      authController.signup,
      ...processMiddleware(after),
      sendResponse,
      ...processMiddleware(onError, { type: "error" })
    );
  }

  // POST /auth/update-password - Update password
  {
    const { before, after, onError, prismaQuery, routeConfig } =
      op("updatePassword");

    router.post(
      {
        rateLimit: rateLimitConfig,
        ...routeConfig,
        path: "/auth/update-password",
      },
      addPrismaQueryOptionsToRequest<any>(
        { updatePassword: prismaQuery } as AuthPrismaQueryOptions<any>,
        "updatePassword"
      ),
      ...processMiddleware(before),
      authController.updatePassword,
      ...processMiddleware(after),
      sendResponse,
      ...processMiddleware(onError, {
        type: "error",
      })
    );
  }

  // GET /auth-actions - Find many auth actions
  {
    const { before, after, onError, prismaQuery, routeConfig } =
      op("findManyAuthAction");

    router.get(
      {
        ...routeConfig,
        path: "/auth-actions",
      },
      ...processMiddleware(before),
      authController.findManyAuthAction,
      ...processMiddleware(after),
      sendResponse,
      ...processMiddleware(onError, {
        type: "error",
      })
    );
  }

  // GET /auth-actions/:resourceName - Find one auth action
  {
    const { before, after, onError, prismaQuery, routeConfig } =
      op("findOneAuthAction");

    router.get(
      {
        ...routeConfig,
        path: "/auth-actions/:resourceName",
      },
      ...processMiddleware(before),
      authController.findOneAuthAction,
      ...processMiddleware(after),
      sendResponse,
      ...processMiddleware(onError, {
        type: "error",
      })
    );
  }

  debuggerService.logModuleFinalRouter("auth", router as any);
  return router;
}
