import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import {
  AuthConfigs,
  AuthJwtPayload,
  ControllerActions,
  User,
  UserRole,
} from "../../types";
import catchAsync from "../error-handler/utils/catch-async";
import { NextFunction, Request, Response } from "express";
import AppError from "../error-handler/utils/app-error";
import { callNext } from "../base/base.middlewares";
import { initConfigs } from "../../app";

class AuthService {
  signJwtToken(
    id: number | string,
    expiresIn: string | number = process.env.JWT_EXPIRES_IN || "1h",
    secret: string = process.env.JWT_SECRET || "your_default_secret"
  ): string {
    return jwt.sign({ id }, secret, {
      expiresIn: expiresIn as any,
    });
  }

  async isCorrectPassword(candidatePassword: string, userPassword: string) {
    return await bcrypt.compare(candidatePassword, userPassword);
  }

  async hashPassword(password: string) {
    return await bcrypt.hash(password, 12);
  }

  isPasswordStrong(password: string) {
    const hasUppercase = /[A-Z]/.test(password);
    const hasLowercase = /[a-z]/.test(password);
    const hasNumber = /\d/.test(password);

    return hasUppercase && hasLowercase && hasNumber;
  }

  userChangedPasswordAfter(user: User, JWTTimestamp: number) {
    if (user.passwordChangedAt) {
      const convertedTimestamp = parseInt(
        String(user.passwordChangedAt.getTime() / 1000),
        10
      );

      return JWTTimestamp < convertedTimestamp;
    }
    return false;
  }

  async verifyJwtToken(
    token: string,
    secret: string = process.env.JWT_SECRET!
  ): Promise<AuthJwtPayload> {
    return new Promise((resolve, reject) => {
      jwt.verify(token, secret, (err, decoded) => {
        if (err) reject(err);
        else resolve(decoded as AuthJwtPayload);
      });
    });
  }

  handleActionAccessControl(
    authConfigs: AuthConfigs,
    action: ControllerActions,
    modelName: string
  ) {
    const prisma = initConfigs.prisma;

    return catchAsync(
      async (req: Request, res: Response, next: NextFunction) => {
        if (req.user) {
          const user = req.user as any;

          const permissions = await prisma.authPermission.count({
            where: {
              resource: modelName,
              action,
              roleId: { in: user.roles.map((role: UserRole) => role.roleId) },
            },
          });

          if (!permissions) {
            return next(
              new AppError(
                "You do not have permission to perfom this action",
                403
              )
            );
          }
        }

        next();
      }
    );
  }

  authenticate = catchAsync(
    async (req: Request, res: Response, next: NextFunction) => {
      let token: string | undefined;
      const prisma = initConfigs.prisma;

      if (
        req?.headers?.authorization &&
        req?.headers?.authorization.startsWith("Bearer")
      ) {
        token = req?.headers?.authorization.split(" ")[1];
      } else if (req?.cookies?.jwt !== "no-token" && req.cookies) {
        token = req?.cookies?.jwt;
      }

      if (!token)
        return next(
          new AppError(
            "You are not logged in! please log in to get access",
            401
          )
        );

      let decoded: AuthJwtPayload | undefined;
      try {
        decoded = await this.verifyJwtToken(token);
      } catch (err) {
        return next(
          new AppError("Your auth token is invalid, please login again.", 401)
        );
      }

      if (!decoded?.id)
        return next(
          new AppError("Your auth token is invalid, please login again.", 401)
        );

      const user: any | null = await prisma.user.findUnique({
        where: { id: String(decoded.id) },
        include: {
          roles: true,
        },
      });

      if (!user)
        return next(
          new AppError(
            "The user belonging to this token does no longer exists",
            401
          )
        );

      if (
        this.userChangedPasswordAfter(user, decoded.iat!) &&
        !req.path.includes("logout")
      )
        return next(
          new AppError(
            "User recently changed password! Please log in again.",
            401
          )
        );

      if (!user.isVerified && !req.path.includes("logout"))
        return next(
          new AppError(
            "You must verifiy your email in order to proceed!",
            423,
            {
              error: "email_verification_required",
            }
          )
        );

      req.user = user;
      next();
    }
  );

  handleAuthenticationControl(
    authConfigs: AuthConfigs | undefined,
    action: ControllerActions,
    modelName: string
  ) {
    const authenticationControl = authConfigs?.authenticationControl;

    if (initConfigs?.authentication === false) return callNext;

    if (authenticationControl && typeof authenticationControl === "object") {
      if (authenticationControl[action] === false) return callNext;
      else if (authenticationControl[action] === true) return this.authenticate;
    } else return this.authenticate;

    return this.authenticate;
  }
}

const authService = new AuthService();

export default authService;
