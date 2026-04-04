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
  AccessControlRules,
  DetailedAccessControlRule,
} from "../../types/auth";
import { MsDuration, toMs } from "./utils/helpers/auth.controller.helpers";
import {
  invaliAuthTokenError,
  loginRequiredError,
} from "./utils/auth-error-objects";
import authActionService from "./utils/services/auth-action.service";
import {
  isAuthenticationEnabled,
  isUsingAuthentication,
} from "../../utils/helpers/arkos-config.helpers";
import {
  AuthenticateHookHandler,
  AuthenticateAfterHookHandler,
  AuthenticateErrorHookHandler,
  AuthorizeHookHandler,
  AuthorizeAfterHookHandler,
  AuthorizeErrorHookHandler,
} from "../../types/arkos-config/utils";

/**
 * Handles various authentication-related tasks such as JWT signing, password hashing, and verifying user credentials.
 */
export class AuthService {
  /**
   * Object containing a combination of actions per resource, tracked by each set of calls of `authService.handleAccessControl`, this can be accessed through the `authService` object or through the endpoint
   */
  actionsPerResource: Record<string, Set<string>> = {};

  /**
   * Runs a chain of `before` hooks in sequence.
   *
   * - If a hook throws — chain aborts, error is forwarded to `onError` hooks.
   * - If a hook calls `skip()` — chain stops, core logic is bypassed, jumps to `after` hooks.
   * - If a hook returns — next hook in chain runs.
   *
   * @returns Promise resolving to `{ skipped, error? }`
   */
  private async runHooks(
    hooks:
      | AuthenticateHookHandler
      | AuthenticateHookHandler[]
      | AuthorizeHookHandler
      | AuthorizeHookHandler[]
      | undefined,
    req: ArkosRequest,
    ctx?: {
      action?: AccessAction;
      resource?: string;
      rule?: string[] | DetailedAccessControlRule | "*";
    }
  ): Promise<{ skipped: boolean; error?: unknown }> {
    if (!hooks) return { skipped: false };

    const hookArray = Array.isArray(hooks) ? hooks : [hooks];

    for (const hook of hookArray) {
      let skipCalled = false;

      try {
        await (hook as any)({
          req,
          skip: () => {
            skipCalled = true;
          },
          ...ctx,
        });
      } catch (err) {
        return { skipped: false, error: err };
      }

      if (skipCalled) return { skipped: true };
    }

    return { skipped: false };
  }

  /**
   * Runs a chain of `after` hooks in sequence.
   *
   * - If a hook throws — chain aborts, error is forwarded to the global error handler.
   * - If a hook returns — next hook in chain runs.
   *
   * @returns Promise resolving to `{ error? }`
   */
  private async runAfterHooks(
    hooks:
      | AuthenticateAfterHookHandler
      | AuthenticateAfterHookHandler[]
      | AuthorizeAfterHookHandler
      | AuthorizeAfterHookHandler[]
      | undefined,
    req: ArkosRequest,
    ctx?: {
      action?: AccessAction;
      resource?: string;
      rule?: string[] | DetailedAccessControlRule | "*";
    }
  ): Promise<{ error?: unknown }> {
    if (!hooks) return {};

    const hookArray = Array.isArray(hooks) ? hooks : [hooks];

    for (const hook of hookArray) {
      try {
        await (hook as any)({ req, ...ctx });
      } catch (err) {
        return { error: err };
      }
    }

    return {};
  }

  /**
   * Runs a chain of `onError` hooks in sequence.
   *
   * - If a hook throws — chain aborts, error is forwarded to the global error handler.
   * - If a hook calls `skip()` — suppresses the error and jumps to `after` hooks.
   * - If a hook returns — next hook in chain runs.
   *
   * @returns Promise resolving to `{ skipped, error? }`
   */
  private async runErrorHooks(
    hooks:
      | AuthenticateErrorHookHandler
      | AuthenticateErrorHookHandler[]
      | AuthorizeErrorHookHandler
      | AuthorizeErrorHookHandler[]
      | undefined,
    error: unknown,
    req: ArkosRequest,
    ctx?: {
      action?: AccessAction;
      resource?: string;
      rule?: string[] | DetailedAccessControlRule | "*";
    }
  ): Promise<{ skipped: boolean; error?: unknown }> {
    if (!hooks) return { skipped: false, error };

    const hookArray = Array.isArray(hooks) ? hooks : [hooks];

    for (const hook of hookArray) {
      let skipCalled = false;

      try {
        await (hook as any)({
          req,
          error,
          skip: () => {
            skipCalled = true;
          },
          ...ctx,
        });
      } catch (err) {
        return { skipped: false, error: err };
      }

      if (skipCalled) return { skipped: true };
    }

    return { skipped: false, error };
  }
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
      process.env.ARKOS_BUILD === "true" &&
      !process.env.JWT_SECRET &&
      !configs?.jwt?.secret
    )
      throw new AppError(
        "Missing JWT secret on production!",
        500,
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
   * Retrieves cookie configuration options for JWT authentication.
   *
   * Merges configuration from multiple sources in order of precedence:
   * 1. Arkos configuration file
   * 2. Environment variables
   * 3. Request properties (for secure flag)
   * 4. Default fallback values
   *
   * @param req - ArkosRequest object used to determine if the connection is secure
   * @returns Cookie options object with expires, httpOnly, secure, and sameSite properties
   *
   * @example
   * ```typescript
   * const cookieOptions = authService.getJwtCookieOptions(req);
   * res.cookie('jwt', token, cookieOptions);
   * ```
   */
  getJwtCookieOptions(req: ArkosRequest) {
    const arkosConfig = getArkosConfig();
    const authConfigs = arkosConfig?.authentication;

    if (!req)
      throw new Error("Missing req object in order get jwt cookie options");

    const sameSite =
      authConfigs?.jwt?.cookie?.sameSite ||
      (process.env.JWT_COOKIE_SAME_SITE as
        | "none"
        | "lax"
        | "strict"
        | undefined) ||
      "lax";

    return {
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
        authConfigs?.jwt?.cookie?.httpOnly ??
        (process.env.JWT_COOKIE_HTTP_ONLY !== undefined
          ? process.env.JWT_COOKIE_HTTP_ONLY === "true"
          : undefined) ??
        true,
      secure: (() => {
        if (authConfigs?.jwt?.cookie?.secure !== undefined)
          return authConfigs?.jwt?.cookie?.secure;
        else if (process.env.JWT_COOKIE_SECURE !== undefined)
          return process.env.JWT_COOKIE_SECURE === "true";
        else return req.secure || req.headers["x-forwarded-proto"] === "https";
      })(),
      sameSite,
    };
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
        String(new Date(user.passwordChangedAt).getTime() / 1000),
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
      process.env.ARKOS_BUILD === "true" &&
      !process.env.JWT_SECRET &&
      !configs?.jwt?.secret
    )
      throw new AppError(
        "Missing JWT secret in production",
        500,
        "MissingJWTSecretInProduction"
      );

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

  private isWildcardAccess(config: AccessControlConfig): config is "*" {
    return config === "*";
  }

  private isRoleList(config: AccessControlConfig): config is string[] {
    return Array.isArray(config);
  }

  private isAccessRules(
    config: AccessControlConfig
  ): config is Partial<AccessControlRules> {
    return (
      typeof config === "object" && config !== null && !Array.isArray(config)
    );
  }

  private normalizeRuleToRoles(
    rule: string[] | DetailedAccessControlRule | "*" | undefined
  ): string[] {
    if (!rule) return [];
    if (rule === "*") return ["*"];
    if (Array.isArray(rule)) return rule;
    return rule.roles === "*" ? ["*"] : (rule.roles ?? []);
  }

  private resolveAuthorizedRoles(
    action: AccessAction,
    accessControl: AccessControlConfig
  ): string[] {
    if (this.isWildcardAccess(accessControl)) return ["*"];
    if (this.isRoleList(accessControl)) return accessControl;
    if (this.isAccessRules(accessControl))
      return this.normalizeRuleToRoles(accessControl[action]);
    return [];
  }

  /**
   * Checks if a user has permission for a specific action using static access control rules.
   * Validates user roles against predefined access control configuration.
   *
   * @param user - The user object containing role or roles field
   * @param action - The action being performed
   * @param accessControl - Access control configuration (array of roles or object with action-role mappings)
   * @returns True if user has permission, false otherwise
   * @throws Error if user doesn't have role/roles field
   */
  protected checkStaticAccessControl(
    user: User,
    action: string,
    accessControl: AccessControlConfig
  ) {
    if (!user?.role && !user.roles)
      throw Error(
        "Validation Error: In order to use static authentication user needs at least role field or roles for multiple roles."
      );

    let authorizedRoles = this.resolveAuthorizedRoles(action, accessControl);

    const userRoles = Array.isArray(user?.roles) ? user.roles : [user.role];

    return (
      authorizedRoles?.[0] === "*" ||
      !!userRoles.some((role: string) => authorizedRoles.includes(role))
    );
  }

  /**
   * Checks if a user has permission for a specific action and resource using dynamic access control.
   * Queries the database to verify user's role permissions.
   *
   * @param userId - The unique identifier of the user
   * @param action - The action being performed
   * @param resource - The resource being accessed
   * @returns Promise resolving to true if user has permission, false otherwise
   */
  protected async checkDynamicAccessControl(
    userId: string,
    action: string,
    resource: string
  ) {
    const prisma = getPrismaInstance();
    return !!(await prisma.userRole.findFirst({
      where: {
        userId,
        role: {
          permissions: {
            some: {
              resource,
              action,
            },
          },
        },
      },
      select: { id: true },
    }));
  }

  /**
   * Middleware function to handle access control based on user roles and permissions.
   *
   * @param {AccessAction} action - The action being performed (e.g., create, update, delete, view).
   * @param {string} resource - The resource name that the action is being performed on (e.g., "User", "Post").
   * @param {AccessControlConfig} accessControl - The access control configuration.
   * @returns {ArkosRequestHandler} The middleware function that checks if the user has permission to perform the action.
   *
   * @deprecated Will be removed on v2.0, use AuthService.authorize instead
   */
  handleAccessControl(
    action: AccessAction,
    resource: string,
    accessControl?: AccessControlConfig
  ): ArkosRequestHandler {
    authActionService.add(action, resource, accessControl);

    return catchAsync(
      async (req: ArkosRequest, _: ArkosResponse, next: ArkosNextFunction) => {
        if (req.user) {
          const user = req.user as User;
          const configs = getArkosConfig();

          if (user.isSuperUser) {
            next();
            return;
          }

          const notEnoughPermissionsError = new AppError(
            "You do not have permission to perfom this action",
            403,
            "NotEnoughPermissions"
          );

          if (configs?.authentication?.mode === "dynamic") {
            const hasPermission = await this.checkDynamicAccessControl(
              user.id,
              action,
              resource
            );

            if (!hasPermission) return next(notEnoughPermissionsError);
          } else if (configs?.authentication?.mode === "static") {
            if (!accessControl) return next(notEnoughPermissionsError);

            const hasPermission = this.checkStaticAccessControl(
              user,
              action,
              accessControl
            );

            if (!hasPermission) return next(notEnoughPermissionsError);
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
    if (!isAuthenticationEnabled())
      throw Error(
        "ValidationError: Trying to call AuthService.getAuthenticatedUser without setting up authentication"
      );

    const prisma = getPrismaInstance();

    let token: string | undefined;

    if (
      req?.headers?.authorization &&
      req?.headers?.authorization.startsWith("Bearer") &&
      req?.headers?.authorization.split?.(" ")?.[1]
    )
      token = req?.headers?.authorization.split(" ")[1];

    if (
      !token &&
      req?.cookies?.arkos_access_token !== "no-token" &&
      req.cookies
    ) {
      token = req?.cookies?.arkos_access_token;
    }

    if (!token) return null;

    let decoded: AuthJwtPayload | undefined;

    try {
      decoded = await this.verifyJwtToken(token);
    } catch (err) {
      throw invaliAuthTokenError;
    }

    if (!decoded?.id) throw invaliAuthTokenError;
    const user: any | null = await (prisma as any).user.findUnique({
      where: { id: String(decoded.id) },
    });

    if (!user)
      throw new AppError(
        "The user belonging to this token does no longer exists",
        401,
        "UserNoLongerExists"
      );

    if (
      this.userChangedPasswordAfter(user, decoded.iat!) &&
      !req.path?.includes?.("logout")
    )
      throw new AppError(
        "User recently changed password! Please log in again.",
        401,
        "PasswordChanged"
      );

    req.accessToken = token;
    return user;
  }

  /**
   * Middleware to authenticate the request by extracting and verifying the JWT token and setting `req.user`.
   *
   * Runs `authentication.hooks.authenticate` before/after the authentication logic.
   *
   * Hook execution flow:
   * - `before` hooks run first — call `ctx.skip()` to bypass core logic and jump to `after` hooks,
   *   call `ctx.next()` to stop the chain early, or return without calling anything to continue.
   * - Core logic runs — extracts and verifies the JWT token, sets `req.user`.
   * - `after` hooks run — call `ctx.next(err)` to abort or return without calling anything to continue.
   * - `onError` hooks run if core logic throws — call `ctx.skip()` to suppress the error and jump to
   *   `after` hooks, or call `ctx.next(err)` to forward it to the global error handler.
   *
   * On custom routes, hooks defined in `arkosConfig` still apply since they are baked into this method.
   *
   * @example
   * ```ts
   * // custom route - hooks still run
   * router.get("/custom", authService.authenticate, handler);
   * ```
   *
   * @example
   * ```ts
   * // skip built-in auth from a before hook
   * before: (ctx) => {
   *   ctx.req.user = myCustomAuth(ctx.req);
   *   ctx.skip();
   * }
   * ```
   *
   * @see {@link https://www.arkosjs.com/docs/core-concepts/authentication/hooks}
   */
  authenticate = catchAsync(
    async (req: ArkosRequest, _: ArkosResponse, next: ArkosNextFunction) => {
      const hooks = getArkosConfig()?.authentication?.hooks?.authenticate;

      const before = await this.runHooks(hooks?.before, req);
      if (before.error) {
        const onError = await this.runErrorHooks(
          hooks?.onError,
          before.error,
          req
        );
        if (onError.skipped) {
          const after = await this.runAfterHooks(hooks?.after, req);
          return after.error ? next(after.error) : next();
        }
        return next(onError.error);
      }

      if (!before.skipped) {
        try {
          if (isAuthenticationEnabled()) {
            const user = (await this.getAuthenticatedUser(req)) as User;
            if (!user) throw loginRequiredError;
            req.user = user;
          }
        } catch (err) {
          const onError = await this.runErrorHooks(hooks?.onError, err, req);
          if (onError.skipped) {
            const after = await this.runAfterHooks(hooks?.after, req);
            return after.error ? next(after.error) : next();
          }
          return next(onError.error);
        }
      }

      const after = await this.runAfterHooks(hooks?.after, req);
      if (after.error) return next(after.error);

      next();
    }
  );

  /**
   * Middleware to authorize the authenticated user for a given action on a resource.
   *
   * Runs `authentication.hooks.authorize` before/after the authorization logic.
   *
   * Hook execution flow:
   * - `before` hooks run first — call `ctx.skip()` to bypass core logic and jump to `after` hooks,
   *   call `ctx.next()` to stop the chain early, or return without calling anything to continue.
   * - Core logic runs — checks user role/permissions against the access control rules.
   * - `after` hooks run — call `ctx.next(err)` to abort or return without calling anything to continue.
   * - `onError` hooks run if authorization fails — call `ctx.skip()` to suppress the error and jump to
   *   `after` hooks, or call `ctx.next(err)` to forward it to the global error handler.
   *
   * @param resource - The resource being accessed, in kebabCase (e.g. `"product"`, `"cart-item"`)
   * @param action - The action being performed (e.g. `"View"`, `"Create"`, `"Delete"`)
   * @param rule - Access control rules for this action. Accepts a role list, a wildcard, or a `DetailedAccessControlRule`.
   *
   * @example
   * ```ts
   * router.delete("/products/:id",
   *   authService.authenticate,
   *   authService.authorize("product", "Delete", ["admin"]),
   *   handler
   * );
   * ```
   *
   * @example
   * ```ts
   * // skip built-in authorization from a before hook
   * before: (ctx) => {
   *   ctx.req.user.role = myCustomRoleResolver(ctx.req);
   *   ctx.skip();
   * }
   * ```
   *
   * @see {@link https://www.arkosjs.com/docs/core-concepts/authentication/hooks#authorize}
   * @since v1.6.0-beta
   */
  authorize(
    action: AccessAction,
    resource: string,
    rule?: string[] | DetailedAccessControlRule | "*"
  ): ArkosRequestHandler {
    authActionService.add(action, resource, { [action]: rule });

    return catchAsync(
      async (req: ArkosRequest, _: ArkosResponse, next: ArkosNextFunction) => {
        const hooks = getArkosConfig()?.authentication?.hooks?.authorize;

        const before = await this.runHooks(hooks?.before, req, {
          action,
          resource,
          rule,
        });
        if (before.error) {
          const onError = await this.runErrorHooks(
            hooks?.onError,
            before.error,
            req,
            { action, resource, rule }
          );
          if (onError.skipped) {
            const after = await this.runAfterHooks(hooks?.after, req, {
              action,
              resource,
              rule,
            });
            return after.error ? next(after.error) : next();
          }
          return next(onError.error);
        }

        if (!before.skipped) {
          try {
            if (req.user) {
              const user = req.user as User;
              const configs = getArkosConfig();

              if (!user.isSuperUser) {
                const notEnoughPermissionsError = new AppError(
                  "You do not have permission to perform this action",
                  403,
                  "NotEnoughPermissions"
                );

                if (configs?.authentication?.mode === "dynamic") {
                  const hasPermission = await this.checkDynamicAccessControl(
                    user.id,
                    action,
                    resource
                  );
                  if (!hasPermission) throw notEnoughPermissionsError;
                } else if (configs?.authentication?.mode === "static") {
                  const hasPermission = this.checkStaticAccessControl(
                    user,
                    action,
                    { [action]: rule }
                  );
                  if (!hasPermission) throw notEnoughPermissionsError;
                }
              }
            }
          } catch (err) {
            const onError = await this.runErrorHooks(hooks?.onError, err, req, {
              action,
              resource,
              rule,
            });
            if (onError.skipped) {
              const after = await this.runAfterHooks(hooks?.after, req, {
                action,
                resource,
                rule,
              });
              return after.error ? next(after.error) : next();
            }
            return next(onError.error);
          }
        }

        const after = await this.runAfterHooks(hooks?.after, req, {
          action,
          resource,
          rule,
        });
        if (after.error) return next(after.error);

        next();
      }
    );
  }

  /**
   * Handles authentication control by checking the `authenticationControl` configuration in the `authConfigs`.
   *
   * @param {ControllerActions} action - The action being performed (e.g., create, update, delete, view).
   * @param {AuthenticationControlConfig} authenticationControl - The authentication configuration object.
   * @returns {ArkosRequestHandler} The middleware function that checks if authentication is required.
   *
   * @deprecated Will be removed on v2.0, use AuthService.authenticate instead
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

  /**
   * Creates a permission checker function for a specific action and resource.
   *
   * PS: This method should be called during application initialization to build permission validators.
   *
   * @see {@link https://www.arkosjs.com/docs/advanced-guide/fine-grained-access-control}
   *
   * @param action - The action to check permission for (e.g., 'View', 'Create', 'Delete')
   * @param resource - The resource being accessed, must be in kebabCase (e.g., 'user', 'cart-item', 'order')
   * @param accessControl - Access control rules (required for static authentication mode), and it is automatically loaded for known modules such as all prisma models, auth and file-upload.
   * @returns A function that takes a user object and returns a boolean indicating permission status
   *
   * @example
   * ```typescript
   * const hasViewProductPermission = await authService.permission('View', 'product');
   *
   * // Later in handler:
   * const canAccess = await hasViewProductPermission(user);
   * if (canAccess) {
   *   // User has permission
   * }
   * ```
   */
  permission(
    action: string,
    resource: string,
    accessControl?: AccessControlConfig
  ) {
    // Check if called during request handling (deep call stack indicates handler execution)
    const stack = new Error().stack;

    if (stack?.includes("node_modules/express/lib/router/index.js"))
      throw new Error(
        "authService.permission() should be called during application initialization level."
      );

    authActionService.add(action, resource, accessControl);

    return async (user: User | undefined): Promise<boolean> => {
      // getArkosConfig must not be called the same time as arkos.init()
      const configs = getArkosConfig();

      if (!isUsingAuthentication())
        throw Error(
          "Validation Error: Trying to use authService.permission without setting up authentication."
        );

      if (!isAuthenticationEnabled()) return false;
      if (!user) throw loginRequiredError;
      if (user?.isSuperUser) return true;

      if (configs?.authentication?.mode === "dynamic") {
        return await this.checkDynamicAccessControl(user?.id, action, resource);
      } else if (configs?.authentication?.mode === "static") {
        return (
          !!accessControl &&
          this.checkStaticAccessControl(user as any, action, accessControl)
        );
      }
      return false;
    };
  }
}

/**
 * Handles various authentication-related tasks such as JWT signing, password hashing, and verifying user credentials.
 */
const authService = new AuthService();

export default authService;
