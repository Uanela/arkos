import catchAsync from "../error-handler/utils/catch-async";
import AppError from "../error-handler/utils/app-error";
import { CookieOptions } from "express";
import { ArkosRequest, ArkosResponse, ArkosNextFunction } from "../../types";
import authService from "./auth.service";
import { getBaseServices } from "../base/base.service";
import { User } from "../../types";
import { importPrismaModelModules } from "../../utils/helpers/models.helpers";
import deepmerge from "../../utils/helpers/deepmerge.helper";
import arkosEnv from "../../utils/arkos-env";
import { getArkosConfig } from "../../server";
import {
  createPrismaWhereClause,
  determineUsernameField,
  getNestedValue,
  MsDuration,
  toMs,
} from "./utils/helpers/auth.controller.helpers";

/**
 * Default fields to exclude from user object when returning to client
 */
export const defaultExcludedUserFields = {
  password: false,
};

/**
 * Factory function to create authentication controller with configurable middlewares
 *
 * @param middlewares - Optional middleware functions to execute after controller actions
 * @returns An object containing all authentication controller methods
 */
export const authControllerFactory = async (middlewares: any = {}) => {
  const userService = getBaseServices()["user"];
  let prismaQueryOptions: Record<string, any> = {};

  const userModules = await importPrismaModelModules("user");
  if (userModules) prismaQueryOptions = userModules?.prismaQueryOptions || {};

  return {
    /**
     * Retrieves the current authenticated user's information
     */
    getMe: catchAsync(
      async (
        req: ArkosRequest,
        res: ArkosResponse,
        next: ArkosNextFunction
      ) => {
        const user = (await userService.findOne(
          { id: req.user!.id },
          req.prismaQueryOptions || {}
        )) as Record<string, any>;

        Object.keys(defaultExcludedUserFields).forEach((key) => {
          if (user) delete user[key as keyof User];
        });

        if (middlewares?.afterGetMe) {
          req.responseData = { data: user };
          req.responseStatus = 200;
          return next();
        }

        res.status(200).json({ data: user });
      }
    ),

    /**
     * Updates the current authenticated user's information
     */
    updateMe: catchAsync(
      async (
        req: ArkosRequest,
        res: ArkosResponse,
        next: ArkosNextFunction
      ) => {
        if ("password" in req.body)
          throw new AppError(
            "In order to update password use the update-password endpoint.",
            400,
            {},
            "invalid_field_password"
          );

        const user = (await userService.updateOne(
          { id: req.user!.id },
          req.body,
          req.prismaQueryOptions || {}
        )) as Record<string, any>;

        Object.keys(defaultExcludedUserFields).forEach((key) => {
          if (user) delete user[key as keyof User];
        });

        if (middlewares?.afterUpdateMe) {
          req.responseData = { data: user };
          req.responseStatus = 200;
          return next();
        }

        res.status(200).json({ data: user });
      }
    ),

    /**
     * Logs out the current user by invalidating their access token cookie
     */
    logout: catchAsync(
      async (
        req: ArkosRequest,
        res: ArkosResponse,
        next: ArkosNextFunction
      ) => {
        res.cookie("arkos_access_token", "no-token", {
          expires: new Date(Date.now() + 10 * 1000),
          httpOnly: true,
        });

        if (middlewares?.afterLogout) {
          req.responseData = null;
          req.responseStatus = 204;
          return next();
        }

        res.status(204).json();
      }
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
        next: ArkosNextFunction
      ) => {
        const authConfigs = getArkosConfig()?.authentication;

        const usernameField = determineUsernameField(req);

        // For the error message, we only care about the top-level field name
        const lastField =
          usernameField.split(".")[usernameField.split(".").length - 1];

        const usernameValue = req.body[lastField];

        const { password } = req.body;

        if (!usernameValue || !password)
          return next(
            new AppError(`Please provide both ${lastField} and password`, 400)
          );

        // Create appropriate where clause for the query
        let whereClause: Record<string, any>;

        if (usernameField?.includes?.(".")) {
          // For nested paths, we need to extract the actual value to search for
          const valueToFind = getNestedValue(req.body, usernameField);
          if (valueToFind === undefined) {
            return next(new AppError(`Invalid ${usernameField} provided`, 400));
          }
          whereClause = createPrismaWhereClause(usernameField, valueToFind);
        } else {
          // Simple field case
          whereClause = { [usernameField]: usernameValue };
        }

        // Use findFirst instead of findUnique for complex queries
        const user = (await userService.findOne(
          whereClause,
          req.prismaQueryOptions || {}
        )) as Record<string, any>;

        if (
          !user ||
          !(await authService.isCorrectPassword(password, user.password))
        ) {
          return next(new AppError(`Incorrect ${lastField} or password`, 401));
        }

        const token = authService.signJwtToken(user.id!);

        const cookieOptions: CookieOptions = {
          expires: new Date(
            Date.now() +
              Number(
                toMs(
                  authConfigs?.jwt?.expiresIn ||
                    (process.env.JWT_EXPIRES_IN as MsDuration) ||
                    (arkosEnv.JWT_EXPIRES_IN as MsDuration)
                )
              )
          ),
          httpOnly:
            authConfigs?.jwt?.cookie?.httpOnly ||
            process.env.JWT_COOKIE_HTTP_ONLY === "true" ||
            true,
          secure:
            authConfigs?.jwt?.cookie?.secure ||
            process.env.JWT_COOKIE_SECURE === "true" ||
            req.secure ||
            req.headers["x-forwarded-proto"] === "https",
          sameSite:
            authConfigs?.jwt?.cookie?.sameSite ||
            process.env.JWT_COOKIE_SAME_SITE ||
            process.env.NODE_ENV === "production"
              ? "none"
              : "lax",
        };

        if (
          authConfigs?.login?.sendAccessTokenThrough === "response-only" ||
          authConfigs?.login?.sendAccessTokenThrough === "both" ||
          !authConfigs?.login?.sendAccessTokenThrough
        ) {
          req.responseData = { accessToken: token };
        }

        if (
          authConfigs?.login?.sendAccessTokenThrough === "cookie-only" ||
          authConfigs?.login?.sendAccessTokenThrough === "both" ||
          !authConfigs?.login?.sendAccessTokenThrough
        )
          res.cookie("arkos_access_token", token, cookieOptions);

        if (middlewares?.afterLogin) {
          req.additionalData = { user };
          req.responseStatus = 200;
          return next();
        }

        if (
          authConfigs?.login?.sendAccessTokenThrough === "response-only" ||
          authConfigs?.login?.sendAccessTokenThrough === "both" ||
          !authConfigs?.login?.sendAccessTokenThrough
        ) {
          res.status(200).json(req.responseData);
        } else if (
          authConfigs?.login?.sendAccessTokenThrough === "cookie-only" ||
          authConfigs?.login?.sendAccessTokenThrough === "both" ||
          !authConfigs?.login?.sendAccessTokenThrough
        )
          res.status(200).send();
      }
    ),

    /**
     * Creates a new user account using the userService
     */
    signup: catchAsync(
      async (
        req: ArkosRequest,
        res: ArkosResponse,
        next: ArkosNextFunction
      ) => {
        const user = (await userService.createOne(
          req.body,
          req.prismaQueryOptions || {}
        )) as Record<string, any>;

        if (middlewares?.afterSignup) {
          req.responseData = { data: user };
          req.responseStatus = 201;
          return next();
        }

        Object.keys(defaultExcludedUserFields).forEach((key) => {
          delete user[key as keyof User];
        });

        res.status(201).json({ data: user });
      }
    ),
    /**
     * Marks user account as self-deleted by setting deletedSelfAccountAt timestamp
     */
    deleteMe: catchAsync(
      async (
        req: ArkosRequest,
        res: ArkosResponse,
        next: ArkosNextFunction
      ) => {
        const userId = req.user!.id; // Assuming the authenticated user's ID is available in req.user

        const updatedUser = (await userService.updateOne(
          { id: userId },
          {
            deletedSelfAccountAt: new Date().toISOString(),
          },
          req.prismaQueryOptions || {}
        )) as Record<string, any>;

        if (middlewares?.afterDeleteMe) {
          req.responseData = { data: updatedUser };
          req.responseStatus = 200;
          return next();
        }

        Object.keys(defaultExcludedUserFields).forEach((key) => {
          delete updatedUser[key as keyof User];
        });

        res.status(200).json({
          message: "Account deleted successfully",
        });
      }
    ),

    /**
     * Updates the password of the authenticated user
     */
    updatePassword: catchAsync(
      async (
        req: ArkosRequest,
        res: ArkosResponse,
        next: ArkosNextFunction
      ) => {
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword)
          return next(
            new AppError("currentPassword and newPassword are required", 400)
          );

        const user = req.user;

        if (!user || user?.isActive === false || user?.deletedSelfAccountAt)
          return next(new AppError("User not found!", 404));

        // Check if the current password is correct
        const isPasswordCorrect = await authService.isCorrectPassword(
          String(currentPassword),
          String(user.password)
        );

        const configs = getArkosConfig();
        const initAuthConfigs = configs?.authentication;
        // const modules = getModelModules("auth");

        if (!isPasswordCorrect)
          return next(new AppError("Current password is incorrect.", 400));

        // Check password strength (optional but recommended)
        if (
          !authService.isPasswordStrong(String(newPassword)) &&
          !configs?.validation
        ) {
          return next(
            new AppError(
              initAuthConfigs?.passwordValidation?.message ||
                "The new password must contain at least one uppercase letter, one lowercase letter, and one number",
              400
            )
          );
        }

        // Update the password
        await userService.updateOne(
          { id: user.id },
          {
            password: await authService.hashPassword(newPassword),
            passwordChangedAt: new Date(Date.now()),
          }
        );

        if (middlewares?.afterUpdatePassword) {
          req.additionalData = {
            user,
          };
          req.responseData = {
            status: "success",
            message: "Password updated successfully!",
          };
          req.responseStatus = 200;
          return next();
        }

        res.status(200).json({
          status: "success",
          message: "Password updated successfully!",
        });
      }
    ),
  };
};
