import jwt, { SignOptions } from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { User } from "../../types";
import catchAsync from "../error-handler/utils/catch-async";
import AppError from "../error-handler/utils/app-error";
import { callNext } from "../base/base.middlewares";
import { getArkosConfig } from "../../server";
import arkosEnv from "../../utils/arkos-env";
import { getPrismaInstance } from "../../utils/helpers/prisma.helpers";
import {
  ArkosRequest,
  ArkosResponse,
  ArkosNextFunction,
  ArkosRequestHandler,
} from "../../types";
import {
  AuthJwtPayload,
  AccessAction,
  AccessControlConfig,
  AuthenticationControlConfig,
} from "../../types/auth";
import { MsDuration } from "./utils/helpers/auth.controller.helpers";

/**
 * Handles various authentication-related tasks such as JWT signing, password hashing, and verifying user credentials.
 */
export class AuthService {
  /**
   * Object containing a combination of actions per resource, tracked by each set of calls of `authService.handleAccessControl`, this can be accessed through the `authService` object or through the endpoint
   */
  actionsPerResource: Record<string, Set<string>> = {};

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
    expiresIn?: MsDuration | number,
    secret?: string
  ): string {
    const { authentication: configs } = getArkosConfig();

    if (
      process.env.NODE_ENV === "production" &&
      !process.env.JWT_SECRET &&
      !configs?.jwt?.secret
    )
      throw new AppError(
        "Missing JWT secret on production!",
        500,
        {},
        "MissingJWTOnProduction"
      );

    secret =
      secret ||
      configs?.jwt?.secret ||
      process.env.JWT_SECRET ||
      arkosEnv.JWT_SECRET;

    expiresIn = (expiresIn ||
      configs?.jwt?.expiresIn ||
      process.env.JWT_EXPIRES_IN ||
      arkosEnv.JWT_EXPIRES_IN) as keyof SignOptions["expiresIn"];

    return jwt.sign({ id }, secret, {
      expiresIn: expiresIn as MsDuration,
    });
  }

  /**
   * Is used by default internally by Arkos under `BaseService` class to check if the password is already hashed.
   *
   * This was just added to prevent unwanted errors when someone just forgets that the `BaseService` class will automatically hash the password field using `authService.hashPassword` by default.
   *
   * So now before `BaseService` hashes it will test it.
   *
   *
   * @param password The password to be tested if is hashed
   * @returns
   */
  isPasswordHashed(password: string) {
    return !Number.isNaN(bcrypt.getRounds(password) * 1);
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
   * Checks if a password is strong, requiring uppercase, lowercase, and numeric characters as the default.
   *
   * **NB**: You must pay attention when using custom validation with zod or class-validator, try to use the same regex always.
   *
   * **Note**: You can define it when calling arkos.init()
   * ```ts
   * arkos.init({
   *  authentication: {
   *    passwordValidation:{ regex: /your-desired-regex/, message: 'password must contain...'}
   *  }
   * })
   * ```
   *
   * @param {string} password - The password to check.
   * @returns {boolean} Returns true if the password meets the strength criteria, otherwise false.
   */
  public isPasswordStrong(password: string): boolean {
    const initAuthConfigs = getArkosConfig()?.authentication;

    const strongPasswordRegex =
      initAuthConfigs?.passwordValidation?.regex ||
      /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d).+$/;
    return strongPasswordRegex.test(password);
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
    secret?: string
  ): Promise<AuthJwtPayload> {
    const { authentication: configs } = getArkosConfig();

    if (
      process.env.NODE_ENV === "production" &&
      !process.env.JWT_SECRET &&
      !configs?.jwt?.secret
    )
      throw new AppError("Missing JWT secret!", 500);

    secret =
      secret ||
      configs?.jwt?.secret ||
      process.env.JWT_SECRET ||
      arkosEnv.JWT_SECRET;

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
   * @param {AccessAction} action - The action being performed (e.g., create, update, delete, view).
   * @param {string} resourceName - The resource name that the action is being performed on (e.g., "User", "Post").
   * @param {AccessControlConfig} accessControl - The access control configuration.
   * @returns {ArkosRequestHandler} The middleware function that checks if the user has permission to perform the action.
   */
  handleAccessControl(
    action: AccessAction,
    resourceName: string,
    accessControl?: AccessControlConfig
  ): ArkosRequestHandler {
    return catchAsync(
      async (req: ArkosRequest, _: ArkosResponse, next: ArkosNextFunction) => {
        if (req.user) {
          const user = req.user as any;
          const prisma = getPrismaInstance();
          const configs = getArkosConfig();

          if (user.isSuperUser) {
            next();
            return;
          }

          if (configs?.authentication?.mode === "dynamic") {
            const matchingRole = await prisma.userRole.findFirst({
              where: {
                userId: req.user.id,
                role: {
                  permissions: {
                    some: {
                      resource: resourceName,
                      action: action,
                    },
                  },
                },
              },
              select: { id: true },
            });

            if (!matchingRole)
              return next(
                new AppError(
                  "You do not have permission to perfom this action",
                  403
                )
              );
          } else if (configs?.authentication?.mode === "static") {
            let authorizedRoles: string[] = [];

            if (!accessControl)
              return next(
                new AppError(
                  "You do not have permission to perform this action",
                  403
                )
              );

            if (Array.isArray(accessControl)) authorizedRoles = accessControl;
            else if (accessControl[action])
              authorizedRoles = accessControl[action] || [];

            const userRoles = Array.isArray(user?.roles)
              ? user.roles
              : [user.role];
            const hasPermission = userRoles.some((role: string) =>
              authorizedRoles.includes(role)
            );

            if (!hasPermission) {
              return next(
                new AppError(
                  "You do not have permission to perform this action",
                  403
                )
              );
            }
          }
        }

        next();
      }
    );
  }

  /**
   * Processes the cookies or authoriation token and returns the user.
   * @param req
   * @returns {Promise<User | null>} - if authentication is turned off in arkosConfig it returns null
   * @throws {AppError} Throws an error if the token is invalid or the user is not logged in.
   */
  async getAuthenticatedUser(req: ArkosRequest): Promise<User | null> {
    const arkosConfig = getArkosConfig();
    if (!arkosConfig?.authentication) return null;

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
        401,
        {},
        "LoginRequired"
      );

    let decoded: AuthJwtPayload | undefined;
    try {
      decoded = await this.verifyJwtToken(token);
    } catch (err) {
      throw new AppError(
        "Your auth token is invalid, please login again.",
        401,
        {},
        "InvalidAuthToken"
      );
    }

    if (!decoded?.id)
      throw new AppError(
        "Your auth token is invalid, please login again.",
        401,
        {},
        "InvalidAuthToken"
      );

    const user: any | null = await (prisma as any).user.findUnique({
      where: { id: String(decoded.id) },
    });

    if (!user)
      throw new AppError(
        "The user belonging to this token does no longer exists",
        401
      );

    if (
      this.userChangedPasswordAfter(user, decoded.iat!) &&
      !req.path?.includes?.("logout")
    )
      throw new AppError(
        "User recently changed password! Please log in again.",
        401,
        {},
        "PasswordChanged"
      );

    req.accessToken = token;
    return user;
  }

  /**
   * Middleware function to authenticate the user based on the JWT token.
   *
   * @param {ArkosRequest} req - The request object.
   * @param {ArkosResponse} res - The response object.
   * @param {ArkosNextFunction} next - The next middleware function to be called.
   * @returns {void}
   */
  authenticate = catchAsync(
    async (req: ArkosRequest, _: ArkosResponse, next: ArkosNextFunction) => {
      const arkosConfig = getArkosConfig();
      if (!arkosConfig?.authentication) {
        next();
        return;
      }

      req.user = (await this.getAuthenticatedUser(req)) as User;
      next();
    }
  );

  /**
   * Handles authentication control by checking the `authenticationControl` configuration in the `authConfigs`.
   *
   * @param {ControllerActions} action - The action being performed (e.g., create, update, delete, view).
   * @param {AuthenticationControlConfig} authenticationControl - The authentication configuration object.
   * @returns {ArkosRequestHandler} The middleware function that checks if authentication is required.
   */
  handleAuthenticationControl(
    action: AccessAction,
    authenticationControl?: AuthenticationControlConfig | undefined
  ): ArkosRequestHandler {
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
