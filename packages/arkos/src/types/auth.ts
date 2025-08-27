import { JwtPayload } from "jsonwebtoken";

/**
 * Base set of controller actions available to all controllers.
 *
 * @example
 * const action: AccessAction = "Create";
 * const customAction: AccessAction = "export"; // Custom action
 */
export type AccessAction = "Create" | "Update" | "Delete" | "View" | string;

/**
 * Rules defining access control for different controller actions.
 * The array contains role names that are allowed to perform the action.
 *
 * @see {@link https://www.arkosjs.com/docs/advanced-guide/static-rbac-authentication#using-auth-config-to-customize-endpoint-behavior}
 * @example
 *
 * const rules: AccessControlRules = {
 *   Create: {
 *     roles: ["Admin", "Manager"],
 *     name: "Create a new user",
 *     description: "Allows to create a new user"
 *   },
 *   Update: ["Admin"],
 *   Delete: ["Admin"],
 *   View: ["Admin", "User", "Guest"]
 * };
 *
 */
export type AccessControlRules = {
  [key in AccessAction]:
    | string[]
    | {
        /** Array of role names that have permission for this action */
        roles: string[];
        /** Human-readable name for this permission (optional) */
        name?: string;
        /** Detailed description of what this permission allows (optional) */
        description?: string;
        /** Detailed error message of what must be returned on forbidden response (optional)
         *
         * Note: not yet implemented
         * */
        errorMessage?: string;
      };
};

/**
 * Rules defining authentication requirements for different controller actions.
 *
 * @see {@link https://www.arkosjs.com/docs/advanced-guide/static-rbac-authentication#using-auth-config-to-customize-endpoint-behavior}
 * @example
 * const authRules: AuthenticationControlRules = {
 *   Create: true,
 *   Update: true,
 *   Delete: true,
 *   View: false  // Public access
 * };
 */
export type AuthenticationControlRules = {
  [key in AccessAction]: boolean;
};

/**
 * Configuration for authentication control.
 *
 * @example
 * // All actions require authentication
 * const config1: AuthenticationControlConfig = true;
 *
 * // Specific rules per action
 * const config2: AuthenticationControlConfig = {
 *   Create: true,
 *   View: false
 * };
 */
export type AuthenticationControlConfig =
  | boolean
  | Partial<AuthenticationControlRules>;

/**
 * Configuration for access control.
 *
 * @see {@link https://www.arkosjs.com/docs/core-concepts/built-in-authentication-system#1-static-rbac-config-based}
 * @example
 * // All actions allowed for these roles
 * const config1: AccessControlConfig = ["Admin", "Manager"];
 *
 * // Specific rules per action
 * const config2: AccessControlConfig = {
 *   Create: ["Admin"],
 *   View: ["User", "Admin"]
 * };
 */
export type AccessControlConfig = string[] | Partial<AccessControlRules>;

/**
 * Configuration for authentication and access control.
 *
 * @see {@link https://www.arkosjs.com/docs/advanced-guide/static-rbac-authentication#using-auth-config-to-customize-endpoint-behavior}
 * @example
 * export const authConfig: AuthConfigs = {
 *   authenticationControl: {
 *     Create: true,
 *     View: false
 *   },
 *   accessControl: {
 *     Create: ["Admin"],
 *     View: ["User", "Admin"]
 *   }
 * };
 */
export type AuthConfigs = {
  authenticationControl?: AuthenticationControlConfig;
  accessControl?: AccessControlConfig;
};

/**
 * Payload structure for JWT-based authentication, extending the standard `JwtPayload`.
 *
 * @example
 * const payload: AuthJwtPayload = {
 *   id: 123,
 *   roles: ["Admin"],
 *   email: "user@example.com"
 * };
 */
export interface AuthJwtPayload extends JwtPayload {
  id?: number | string;
  [x: string]: any;
}
