import catchAsync from "../error-handler/utils/catch-async";
import AppError from "../error-handler/utils/app-error";
import { CookieOptions, NextFunction, Request, Response } from "express";
import authService from "./auth.service";
import { getBaseServices } from "../base/base.service";
import { User } from "../../types";
import { getPrismaInstance } from "../../utils/helpers/prisma.helpers";
import { importPrismaModelModules } from "../../utils/helpers/models.helpers";
import deepmerge from "deepmerge";
import arkosEnv from "../../utils/arkos-env";
import { getInitConfigs } from "../../server";
import { InitConfigsAuthenticationOptions } from "../../app";

export const defaultExcludedUserFields = {
  password: false,
  passwordChangedAt: false,
  passwordResetOtp: false,
  passwordResetOtpExpiresAt: false,
  verificationOtp: false,
  verificationOptExpiresAt: false,
  isVerified: false,
  deletedSelfAccount: false,
  active: false,
};

export const authControllerFactory = async (middlewares: any = {}) => {
  const baseServices = getBaseServices();
  let prismaQueryOptions: Record<string, any> = {};

  const userModules = await importPrismaModelModules("user");
  if (userModules) prismaQueryOptions = userModules?.prismaQueryOptions || {};

  const stringifiedQueryOptions = JSON.stringify(
    deepmerge(
      prismaQueryOptions?.queryOptions || {},
      prismaQueryOptions?.findOne || {}
    ) || {}
  );

  return {
    getMe: catchAsync(
      async (req: Request, res: Response, next: NextFunction) => {
        const user = await baseServices["user"].findOne(
          { id: req.user!.id },
          stringifiedQueryOptions
        );

        Object.keys(defaultExcludedUserFields).forEach((key) => {
          if (req.user) delete req.user[key as keyof User];
        });

        if (middlewares?.afterGetMe) {
          (req as any).responseData = user;
          (req as any).responseStatus = 200;
          return next();
        }

        res.status(200).json(req.user);
      }
    ),

    logout: catchAsync(
      async (req: Request, res: Response, next: NextFunction) => {
        res.cookie("arkos_access_token", "no-token", {
          expires: new Date(Date.now() + 10 * 1000),
          httpOnly: true,
        });

        if (middlewares?.afterLogout) {
          (req as any).responseData = null;
          (req as any).responseStatus = 204;
          return next();
        }

        res.status(204).json();
      }
    ),

    login: catchAsync(
      async (req: Request, res: Response, next: NextFunction) => {
        const { email, password } = req.body;

        if (!email || !password) {
          return next(
            new AppError("Please provide an email and a password", 400)
          );
        }

        const prisma = getPrismaInstance();
        const initConfigs = getInitConfigs()
          ?.authentication as InitConfigsAuthenticationOptions;

        const user = await (prisma as any).user.findUnique({
          where: { email },
        });

        if (
          !user ||
          !(await authService.isCorrectPassword(password, user.password))
        ) {
          return next(new AppError("Incorrect email or password", 401));
        }

        if (
          !user.isVerified &&
          initConfigs?.signup?.requireEmailVerification === true
        )
          return next(
            new AppError(
              "You must verifiy your email in order to proceed!",
              423
            )
          );

        const token = authService.signJwtToken(user.id!);

        const cookieOptions: CookieOptions = {
          expires: new Date(
            Date.now() +
              Number(
                process.env.JWT_COOKIE_EXPIRES_IN ||
                  arkosEnv.JWT_COOKIE_EXPIRES_IN
              ) *
                24 *
                60 *
                60 *
                1000
          ),
          httpOnly: true,
          secure: req.secure || req.headers["x-forwarded-proto"] === "https",
          sameSite: process.env.JWT_SECURE !== "false" ? "lax" : "none",
        };

        if (
          process.env.NODE_ENV === "production" &&
          process.env.JWT_SECURE !== "false"
        )
          cookieOptions.secure = true;

        if (middlewares?.afterLogin) {
          (req as any).responseData = { acessToken: token };
          (req as any).responseStatus = 200;
          return next();
        }

        if (initConfigs?.login?.sendAcessTokenThrough === "response-only") {
          res.status(200).json({ acessToken: token });
        } else if (
          initConfigs?.login?.sendAcessTokenThrough === "cookie-only"
        ) {
          res.cookie("arkos_access_token", token, cookieOptions);
          res.status(200).send();
        } else {
          res.cookie("arkos_access_token", token, cookieOptions);
          res.status(200).json({ acessToken: token });
        }
      }
    ),

    signup: catchAsync(
      async (req: Request, res: Response, next: NextFunction) => {
        const userService = baseServices["user"];

        const user = await userService.createOne(req.body);

        if (middlewares?.afterSignup) {
          (req as any).responseData = { data: user };
          (req as any).responseStatus = 201;
          return next();
        }

        Object.keys(defaultExcludedUserFields).forEach((key) => {
          delete user[key as keyof User];
        });

        res.status(201).json({ data: user });
      }
    ),

    verifyEmail: catchAsync(
      async (req: Request, res: Response, next: NextFunction) => {
        const { otp, email } = req.body;

        // Check if email and OTP are provided
        if (!email || !otp) {
          return next(
            new AppError("Email and otp are required", 400, {
              error: "Missing parameters",
            })
          );
        }

        const prisma = getPrismaInstance();

        const user = await (prisma as any).user.findUnique({
          where: { email },
        });

        if (!user) {
          return next(
            new AppError("No account found with this email.", 400, {
              error: "user_not_found",
            })
          );
        }

        if (user.isVerified)
          return next(
            new AppError("Your email is already verified.", 400, {
              error: "already_verified",
            })
          );

        if (user.verificationOtp !== otp)
          return next(
            new AppError("The OTP is incorrect.", 400, {
              error: "invalid_otp",
            })
          );

        if (
          user.verificationOptExpiresAt &&
          new Date() > user.verificationOptExpiresAt
        )
          return next(
            new AppError(
              "The OTP has expired. Please request a new one.",
              400,
              {
                error: "expired_otp",
              }
            )
          );

        await (prisma as any).user.update({
          where: { email },
          data: {
            isVerified: true,
            verificationOtp: null,
            verificationOptExpiresAt: null,
          },
        });

        if (middlewares?.afterVerifyEmail) {
          (req as any).additionalData = {
            user,
          };
          (req as any).responseData = {
            message: "Email verified successfully.",
          };
          (req as any).responseStatus = 200;
          return next();
        }

        res.status(200).json({
          message: "Email verified successfully.",
        });
      }
    ),

    forgotPassword: catchAsync(
      async (req: Request, res: Response, next: NextFunction) => {
        if (!req.body.email)
          return next(
            new AppError(
              "Email is required in order to trigger forgot password",
              400
            )
          );

        const prisma = getPrismaInstance();

        const user = await (prisma as any).user.findUnique({
          where: {
            email: req.body.email,
          },
        });

        if (
          !user ||
          user?.active === false ||
          user?.deletedSelfAccount === true
        )
          return next(new AppError("User not found!", 404));

        if (!user.isVerified)
          return next(
            new AppError("You need to verify your account to proceed", 423, {
              error: "email_verification_required",
            })
          );

        // Verifica se um OTP foi solicitado recentemente
        if (user.passwordResetOtpExpiresAt) {
          const now = new Date();
          const lastOtpRequestedAt = new Date(
            new Date(user.passwordResetOtpExpiresAt).getTime() - 15 * 60 * 1000
          );
          const timeElapsed =
            (now.getTime() - lastOtpRequestedAt.getTime()) / 1000;
          const minInterval = 2 * 60; // 2 minutos em segundos

          if (timeElapsed < minInterval)
            return next(
              new AppError(
                `Please wait ${Math.ceil(
                  minInterval - timeElapsed
                )} seconds before requesting a new OTP.`,
                429,
                {
                  remainingTime: Math.ceil(minInterval - timeElapsed),
                }
              )
            );
        }

        const resetOtp = Math.floor(100000 + Math.random() * 900000).toString();
        const resetOtpExpiresAt = new Date(Date.now() + 15 * 60 * 1000);

        await (prisma as any).user.update({
          where: {
            id: user.id,
          },
          data: {
            passwordResetOtp: resetOtp,
            passwordResetOtpExpiresAt: resetOtpExpiresAt,
          },
        });

        if (middlewares?.afterForgotPassword) {
          (req as any).additionalData = {
            user,
            resetOtp,
          };
          (req as any).responseData = {
            status: "success",
            message: "OTP code sent successfully!",
          };
          (req as any).responseStatus = 200;
          return next();
        }

        res.status(200).json({
          status: "success",
          message: "OTP code sent successfully!",
        });
      }
    ),

    resetPassword: catchAsync(
      async (req: Request, res: Response, next: NextFunction) => {
        const { email, otp, newPassword } = req.body;

        if (!otp || !email || !newPassword)
          return next(
            new AppError(
              "email, otp and newPassword are required to reset password",
              400
            )
          );

        if (!authService.isPasswordStrong(newPassword))
          return next(
            new AppError(
              "Password must contain at least one uppercase letter, one lowercase letter, and one number",
              400
            )
          );

        const prisma = getPrismaInstance();

        const user = await (prisma as any).user.findUnique({
          where: { email },
        });

        if (!user?.passwordResetOtp)
          return next(
            new AppError(
              "You must request an otp in order to reset password!",
              400,
              {
                error: "no_requested_otp",
              }
            )
          );

        if (await authService.isCorrectPassword(newPassword, user?.password!))
          return next(
            new AppError(
              "New password must not be the same as last one!",
              400,
              {
                error: "new_password_equals_last_password",
              }
            )
          );

        if (
          !user ||
          user?.active === false ||
          user?.deletedSelfAccount === true
        )
          return next(new AppError("User not found!", 404));

        if (!user.isVerified)
          return next(
            new AppError("You need to verify your account to proceed", 423, {
              error: "email_verification_required",
            })
          );

        if (!user.passwordResetOtp || !user.passwordResetOtpExpiresAt)
          return next(new AppError("Invalid or expired OTP.", 400));

        const now = new Date();
        if (now > new Date(user.passwordResetOtpExpiresAt))
          return next(
            new AppError("OTP expired. Please request a new one.", 400)
          );

        if (user.passwordResetOtp != otp)
          return next(new AppError("Invalid OTP. Please try again.", 400));

        await (prisma as any).user.update({
          where: { id: user.id },
          data: {
            password: await authService.hashPassword(newPassword),
            passwordResetOtp: null,
            passwordResetOtpExpiresAt: null,
            passwordChangedAt: new Date(),
          },
        });

        if (middlewares?.afterResetPassword) {
          (req as any).additionalData = {
            user,
          };
          (req as any).responseData = {
            status: "success",
            message: "Password reset successfully!",
          };
          (req as any).responseStatus = 200;
          return next();
        }

        res.status(200).json({
          status: "success",
          message: "Password reset successfully!",
        });
      }
    ),

    updatePassword: catchAsync(
      async (req: Request, res: Response, next: NextFunction) => {
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword)
          return next(
            new AppError("currentPassword and newPassword are required", 400)
          );

        const user = req.user;

        if (
          !user ||
          user?.active === false ||
          user?.deletedSelfAccount === true
        )
          return next(new AppError("User not found!", 404));

        if (!user.isVerified)
          return next(
            new AppError("You need to verify your account to proceed", 423, {
              error: "email_verification_required",
            })
          );

        // Check if the current password is correct
        const isPasswordCorrect = await authService.isCorrectPassword(
          String(currentPassword),
          String(user.password)
        );

        if (!isPasswordCorrect)
          return next(new AppError("Current password is incorrect.", 400));

        // Check password strength (optional but recommended)
        if (!authService.isPasswordStrong(String(newPassword)))
          return next(
            new AppError(
              "Password must contain at least one uppercase letter, one lowercase letter, and one number",
              400
            )
          );

        const prisma = getPrismaInstance();

        // Update the password
        await (prisma as any).user.update({
          where: { id: user.id },
          data: {
            password: await authService.hashPassword(newPassword),
            passwordChangedAt: new Date(),
          },
        });

        if (middlewares?.afterUpdatePassword) {
          (req as any).additionalData = {
            user,
          };
          (req as any).responseData = {
            status: "success",
            message: "Password updated successfully!",
          };
          (req as any).responseStatus = 200;
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
