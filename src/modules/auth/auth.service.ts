import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import {
  AuthConfigs,
  AuthJwtPayload,
  ControllerActions,
  User,
  UserRole,
} from "../../types";
import catchAsync from "../error-handler/utils/catch-async";
import { NextFunction, Request, RequestHandler, Response } from "express";
import AppError from "../error-handler/utils/app-error";
import { callNext } from "../base/base.middlewares";
import { getInitConfigs } from "../../server";
import arkosEnv from "../../utils/arkos-env";
import { getPrismaInstance } from "../../utils/helpers/prisma.helpers";

/**
 * Handles various authentication-related tasks such as JWT signing, password hashing, and verifying user credentials.
 */
class AuthService {
  /**
   * Signs a JWT token for the user.
   *
   * @param {number | string} id - The unique identifier of the user to generate the token for.
   * @param {string | number} [expiresIn] - The expiration time for the token. Defaults to environment variable `JWT_EXPIRES_IN`.
   * @param {string} [secret] - The secret key used to sign the token. Defaults to environment variable `JWT_SECRET`.
   * @returns {string} The signed JWT token.
   */
  signJwtToken(
    id: number | string,
    expiresIn: string | number = process.env.JWT_EXPIRES_IN ||
      arkosEnv.JWT_EXPIRES_IN,
    secret: string = process.env.JWT_SECRET || arkosEnv.JWT_SECRET
  ): string {
    return jwt.sign({ id }, secret, {
      expiresIn: expiresIn as any,
    });
  }

  /**
   * Compares a candidate password with the stored user password to check if they match.
   *
   * @param {string} candidatePassword - The password provided by the user during login.
   * @param {string} userPassword - The password stored in the database.
   * @returns {Promise<boolean>} Returns true if the passwords match, otherwise false.
   */
  async isCorrectPassword(
    candidatePassword: string,
    userPassword: string
  ): Promise<boolean> {
    return await bcrypt.compare(candidatePassword, userPassword);
  }

  /**
   * Hashes a plain text password using bcrypt.
   *
   * @param {string} password - The password to be hashed.
   * @returns {Promise<string>} Returns the hashed password.
   */
  async hashPassword(password: string): Promise<string> {
    return await bcrypt.hash(password, 12);
  }

  /**
   * Checks if a password is strong, requiring uppercase, lowercase, and numeric characters.
   *
   * @param {string} password - The password to check.
   * @returns {boolean} Returns true if the password meets the strength criteria, otherwise false.
   */
  isPasswordStrong(password: string): boolean {
    const hasUppercase = /[A-Z]/.test(password);
    const hasLowercase = /[a-z]/.test(password);
    const hasNumber = /\d/.test(password);

    return hasUppercase && hasLowercase && hasNumber;
  }

  /**
   * Checks if a user has changed their password after the JWT was issued.
   *
   * @param {User} user - The user object containing the passwordChangedAt field.
   * @param {number} JWTTimestamp - The timestamp when the JWT was issued.
   * @returns {boolean} Returns true if the user changed their password after the JWT was issued, otherwise false.
   */
  userChangedPasswordAfter(user: User, JWTTimestamp: number): boolean {
    if (user.passwordChangedAt) {
      const convertedTimestamp = parseInt(
        String(user.passwordChangedAt.getTime() / 1000),
        10
      );

      return JWTTimestamp < convertedTimestamp;
    }
    return false;
  }

  /**
   * Verifies the authenticity of a JWT token.
   *
   * @param {string} token - The JWT token to verify.
   * @param {string} [secret] - The secret key used to verify the token. Defaults to environment variable `JWT_SECRET`.
   * @returns {Promise<AuthJwtPayload>} Returns the decoded JWT payload if the token is valid.
   * @throws {Error} Throws an error if the token is invalid or expired.
   */
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

  /**
   * Middleware function to handle access control based on user roles and permissions.
   *
   * @param {AuthConfigs} authConfigs - The configuration object for authentication and access control.
   * @param {ControllerActions} action - The action being performed (e.g., create, update, delete, view).
   * @param {string} modelName - The model name that the action is being performed on (e.g., "User", "Post").
   * @returns {RequestHandler} The middleware function that checks if the user has permission to perform the action.
   */
  handleActionAccessControl(
    authConfigs: AuthConfigs,
    action: ControllerActions,
    modelName: string
  ): RequestHandler {
    return catchAsync(
      async (req: Request, res: Response, next: NextFunction) => {
        if (req.user) {
          const user = req.user as any;
          const prisma = getPrismaInstance();

          const permissions = await (prisma as any).authPermission.count({
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

  /**
   * Processes the cookies or authoriation token and returns the user.
   * @param req
   * @returns {Promise<User | null>} - if authentication is turned off in initConfigs it returns null
   * @throws {AppError} Throws an error if the token is invalid or the user is not logged in.
   */
  async getAuthenticatedUser(req: Request): Promise<User | null> {
    const initConfigs = getInitConfigs();
    if (initConfigs?.authentication === false) return null;

    const prisma = getPrismaInstance();

    let token: string | undefined;

    if (
      req?.headers?.authorization &&
      req?.headers?.authorization.startsWith("Bearer")
    ) {
      token = req?.headers?.authorization.split(" ")[1];
    } else if (req?.cookies?.arkos_access_token !== "no-token" && req.cookies) {
      token = req?.cookies?.arkos_access_token;
    }

    if (!token)
      throw new AppError(
        "You are not logged in! please log in to get access",
        401
      );

    let decoded: AuthJwtPayload | undefined;
    try {
      decoded = await this.verifyJwtToken(token);
    } catch (err) {
      throw new AppError(
        "Your auth token is invalid, please login again.",
        401
      );
    }

    if (!decoded?.id)
      throw new AppError(
        "Your auth token is invalid, please login again.",
        401
      );

    const user: any | null = await (prisma as any).user.findUnique({
      where: { id: String(decoded.id) },
      include: {
        roles: {
          include: {
            role: {
              include: {
                permissions: true,
              },
            },
          },
        },
      },
    });

    if (!user)
      throw new AppError(
        "The user belonging to this token does no longer exists",
        401
      );

    if (
      this.userChangedPasswordAfter(user, decoded.iat!) &&
      !req.path.includes("logout")
    )
      throw new AppError(
        "User recently changed password! Please log in again.",
        401
      );

    if (!user.isVerified && !req.path.includes("logout"))
      throw new AppError(
        "You must verifiy your email in order to proceed!",
        423,
        {
          error: "email_verification_required",
        }
      );

    return user;
  }

  /**
   * Middleware function to authenticate the user based on the JWT token.
   *
   * @param {Request} req - The request object.
   * @param {Response} res - The response object.
   * @param {NextFunction} next - The next middleware function to be called.
   * @returns {void}
   */
  authenticate = catchAsync(
    async (req: Request, res: Response, next: NextFunction) => {
      const initConfigs = getInitConfigs();
      if (initConfigs?.authentication === false) return next();

      req.user = (await this.getAuthenticatedUser(req)) as User;
      next();
    }
  );

  /**
   * Handles authentication control by checking the `authenticationControl` configuration in the `authConfigs`.
   *
   * @param {AuthConfigs | undefined} authConfigs - The authentication configuration object.
   * @param {ControllerActions} action - The action being performed (e.g., create, update, delete, view).
   * @param {string} modelName - The model name being affected by the action.
   * @returns {RequestHandler} The middleware function that checks if authentication is required.
   */
  handleAuthenticationControl(
    authConfigs: AuthConfigs | undefined,
    action: ControllerActions,
    modelName: string
  ): RequestHandler {
    const authenticationControl = authConfigs?.authenticationControl;

    if (authenticationControl && typeof authenticationControl === "object") {
      if (authenticationControl[action] === false) return callNext;
      else if (authenticationControl[action] === true) return this.authenticate;
    } else return this.authenticate;

    return this.authenticate;
  }
}

/**
 * Handles various authentication-related tasks such as JWT signing, password hashing, and verifying user credentials.
 */
const authService = new AuthService();

export default authService;
