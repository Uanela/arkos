import { JwtPayload } from "jsonwebtoken";

/**
 * Possible actions that can be performed by a controller.
 */
export type ControllerActions = "create" | "update" | "delete" | "view";

/**
 * Rules defining access control for different controller actions.
 *
 * @typeParam key - One of the `ControllerActions`.
 * @typeParam Role - A type representing a role or set of roles allowed to perform the action.
 */
export type AccessControlRules = {
  /**
   * Maps each `ControllerAction` to the roles allowed to perform it.
   */
  [key in ControllerActions]: any | any[];
};

/**
 * Rules defining access control for different controller actions.
 *
 * @typeParam key - One of the `ControllerActions`.
 * @typeParam Role - A type representing a role or set of roles allowed to perform the action.
 */
export type AuthenticationControlRules = {
  /**
   * Maps each `ControllerAction` to the actions that requires authentication to perform it.
   */
  [key in ControllerActions]: boolean;
};

/**
 * Configuration for authentication and access control.
 */
export type AuthConfigs = {
  /**
   * Defines access control rules for roles or actions.
   *
   * @type {Role | Role[] | AccessControlRules}
   */
  authenticationControl?: boolean | Partial<AuthenticationControlRules>;
  accessControl?: any | any[] | Partial<AccessControlRules>;
};

/**
 * Payload structure for JWT-based authentication, extending the standard `JwtPayload`.
 */
export interface AuthJwtPayload extends JwtPayload {
  /**
   * The unique identifier of the authenticated user.
   *
   * @type {number | string}
   */
  id?: number | string;

  /**
   * The username of the authenticated user.
   *
   * @type {string}
   */
  username?: string;
}
