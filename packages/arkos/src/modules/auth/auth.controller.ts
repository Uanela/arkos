import catchAsync from "../error-handler/utils/catch-async";
import AppError from "../error-handler/utils/app-error";
import { ArkosRequest, ArkosResponse, ArkosNextFunction } from "../../types";
import authService, { AuthService } from "./auth.service";
import { getArkosConfig } from "../../server";
import { determineUsernameField } from "./utils/helpers/auth.controller.helpers";
import authActionService from "./utils/services/auth-action.service";
import {
  LoginInput,
  LoginUsernameField,
  OverridableAuthMethod,
} from "./auth.types";

/**
 * Default fields to exclude from user object when returning to client
 */
export const defaultExcludedUserFields = {
  password: false,
};

const hasRequiredData: Record<OverridableAuthMethod, (result: any) => boolean> =
  {
    getMe: (result) => !!result,
    updateMe: (result) => !!result,
    signup: (result) => !!result,
    deleteMe: (result) => !!result,
    login: (result) => !!result?.user && !!result?.accessToken,
    updatePassword: (result) => !!result?.accessToken,
  };

const resolveTokenDelivery = () => {
  const sendAccessTokenThrough =
    getArkosConfig()?.authentication?.login?.sendAccessTokenThrough;

  return {
    inResponse:
      !sendAccessTokenThrough ||
      sendAccessTokenThrough === "both" ||
      sendAccessTokenThrough === "response-only",
    inCookie:
      !sendAccessTokenThrough ||
      sendAccessTokenThrough === "both" ||
      sendAccessTokenThrough === "cookie-only",
  };
};

const setInterceptorState = (
  req: ArkosRequest,
  res: ArkosResponse,
  data: any,
  status: number,
) => {
  (res as any).originalData = data;
  req.responseData = data;
  res.locals.data = data;
  (res as any).originalStatus = status;
  req.responseStatus = status;
  res.locals.status = status;
};

/**
 * Factory function to create authentication controller with configurable interceptors
 *
 * @param interceptors - Optional middleware functions to execute after controller actions
 * @param service - Optional `AuthService` subclass instance from `RouteHook<"auth">.service`,
 * overriding `getMe`, `updateMe`, `signup`, `deleteMe`, `login` and `updatePassword`
 * @returns An object containing all authentication controller methods
 */
export const authControllerFactory = (
  interceptors: any = {},
  service?: AuthService,
) => {
  if (service && !(service instanceof AuthService))
    throw new Error(
      "ValidationError: The `service` exported on the auth route hook must be an instance of a class that extends AuthService.",
    );

  const auth = service ?? authService;

  const callService = async <M extends OverridableAuthMethod>(
    method: M,
    ...args: Parameters<AuthService[M]>
  ): Promise<Awaited<ReturnType<AuthService[M]>>> => {
    const result = await (auth[method] as (...params: any[]) => any).apply(
      auth,
      args,
    );

    if (service && !hasRequiredData[method](result))
      throw new Error(
        `Custom auth service method ${method} didn't return the required data`,
      );

    return result;
  };

  return {
    /**
     * Retrieves the current authenticated user's information
     */
    getMe: catchAsync(
      async (
        req: ArkosRequest,
        res: ArkosResponse,
        next: ArkosNextFunction,
      ) => {
        const user = await callService(
          "getMe",
          req.user!.id,
          req.prismaQueryOptions,
        );

        if (interceptors?.afterGetMe) {
          setInterceptorState(req, res, { data: user }, 200);
          return next();
        }

        res.status(200).json({ data: user });
      },
    ),

    /**
     * Updates the current authenticated user's information
     */
    updateMe: catchAsync(
      async (
        req: ArkosRequest,
        res: ArkosResponse,
        next: ArkosNextFunction,
      ) => {
        const user = await callService(
          "updateMe",
          req.user!.id,
          req.body,
          req.prismaQueryOptions,
        );

        if (interceptors?.afterUpdateMe) {
          setInterceptorState(req, res, { data: user }, 200);
          return next();
        }

        res.status(200).json({ data: user });
      },
    ),

    /**
     * Logs out the current user by invalidating their access token cookie
     */
    logout: catchAsync(
      async (
        req: ArkosRequest,
        res: ArkosResponse,
        next: ArkosNextFunction,
      ) => {
        res.cookie("arkos_access_token", "no-token", {
          expires: new Date(Date.now() + 10 * 1000),
          httpOnly: true,
        });

        if (interceptors?.afterLogout) {
          setInterceptorState(req, res, null, 204);
          return next();
        }

        res.status(204).json();
      },
    ),

    /**
     * Authenticates a user using configurable username field and password
     * Username field can be specified in query parameter or config
     *
     * Supports nested fields and array queries (e.g., "profile.nickname", "phones.some.number")
     */
    login: catchAsync(
      async (
        req: ArkosRequest,
        res: ArkosResponse,
        next: ArkosNextFunction,
      ) => {
        const usernameField = determineUsernameField(req) as LoginUsernameField;

        const { user, accessToken } = await callService(
          "login",
          { ...req.body, usernameField } as LoginInput,
          req.prismaQueryOptions,
        );

        const delivery = resolveTokenDelivery();

        if (delivery.inResponse) {
          req.responseData = { accessToken };
          res.locals.data = { accessToken };
        }

        if (delivery.inCookie)
          res.cookie(
            "arkos_access_token",
            accessToken,
            authService.getJwtCookieOptions(req),
          );

        req.accessToken = accessToken;

        if (interceptors?.afterLogin) {
          (res as any).originalData = req.responseData;
          req.additionalData = { user };
          res.locals.additional = { user };
          (res as any).originalStatus = 200;
          req.responseStatus = 200;
          res.locals.status = 200;
          return next();
        }

        if (delivery.inResponse) res.status(200).json(req.responseData);
        else res.status(200).send();
      },
    ),

    /**
     * Creates a new user account
     */
    signup: catchAsync(
      async (
        req: ArkosRequest,
        res: ArkosResponse,
        next: ArkosNextFunction,
      ) => {
        const user = await callService(
          "signup",
          req.body,
          req.prismaQueryOptions,
        );

        if (interceptors?.afterSignup) {
          setInterceptorState(req, res, { data: user }, 201);
          return next();
        }

        res.status(201).json({ data: user });
      },
    ),

    /**
     * Marks user account as self-deleted by setting deletedSelfAccountAt timestamp
     */
    deleteMe: catchAsync(
      async (
        req: ArkosRequest,
        res: ArkosResponse,
        next: ArkosNextFunction,
      ) => {
        const user = await callService(
          "deleteMe",
          req.user!.id,
          req.prismaQueryOptions,
        );

        if (interceptors?.afterDeleteMe) {
          setInterceptorState(req, res, { data: user }, 200);
          return next();
        }

        res.status(200).json({
          message: "Account deleted successfully",
        });
      },
    ),

    /**
     * Updates the password of the authenticated user
     */
    updatePassword: catchAsync(
      async (
        req: ArkosRequest,
        res: ArkosResponse,
        next: ArkosNextFunction,
      ) => {
        const { accessToken } = await callService(
          "updatePassword",
          req.user!.id,
          req.body,
        );

        const delivery = resolveTokenDelivery();

        const responseData: Record<string, string> = {
          status: "success",
          message: "Password updated successfully!",
        };

        if (delivery.inResponse) responseData.accessToken = accessToken;

        if (delivery.inCookie)
          res.cookie(
            "arkos_access_token",
            accessToken,
            authService.getJwtCookieOptions(req),
          );

        req.accessToken = accessToken;

        if (interceptors?.afterUpdatePassword) {
          req.additionalData = { user: req.user };
          setInterceptorState(req, res, responseData, 200);
          return next();
        }

        res.status(200).json(responseData);
      },
    ),

    findManyAuthAction: catchAsync(
      async (_: ArkosRequest, res: ArkosResponse) => {
        const arkosConfig = getArkosConfig();
        const authActions = authActionService.getAll()?.map((authAction) => {
          if (arkosConfig?.authentication?.mode === "dynamic")
            delete (authAction as any)?.roles;
          return authAction;
        });

        res.json({
          total: authActions.length,
          results: authActions.length,
          data: authActions,
        });
      },
    ),

    findOneAuthAction: catchAsync(
      async (req: ArkosRequest, res: ArkosResponse) => {
        const arkosConfig = getArkosConfig();
        const resourceName = req.params?.resourceName;

        if (!resourceName)
          throw new AppError(
            `Please provide a resoureName`,
            400,
            "MissiongResourseName",
          );

        const authActions = authActionService
          .getByResource(req.params?.resourceName)
          ?.map((authAction) => {
            if (arkosConfig?.authentication?.mode === "dynamic")
              delete (authAction as any)?.roles;
            return authAction;
          });

        if (!authActions)
          throw new AppError(
            `No auth action with resource name ${resourceName}`,
            404,
            "AuthActionNotFound",
          );

        res.json({
          total: authActions.length,
          results: authActions.length,
          data: authActions,
        });
      },
    ),
  };
};

