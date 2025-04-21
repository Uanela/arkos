import { JwtPayload } from "jsonwebtoken";

/**
 * Base set of controller actions available to all controllers.
 */
export type BaseControllerActions = "create" | "update" | "delete" | "view";

/**
 * Extends the base controller actions with custom actions.
 *
 * @typeParam T - Additional action types that extend the base actions.
 */
export type ExtendedControllerActions<T extends string = never> =
  | BaseControllerActions
  | T;

/**
 * Rules defining access control for different controller actions.
 *
 * @typeParam T - Additional action types that extend the base actions.
 * @typeParam Role - A type representing a role or set of roles allowed to perform the action.
 */
export type AccessControlRules<T extends string = never> = {
  /**
   * Maps each controller action to the roles allowed to perform it.
   */
  [key in ExtendedControllerActions<T>]: any[];
};

/**
 * Rules defining authentication requirements for different controller actions.
 *
 * @typeParam T - Additional action types that extend the base actions.
 */
export type AuthenticationControlRules<T extends string = never> = {
  /**
   * Maps each controller action to whether authentication is required to perform it.
   */
  [key in ExtendedControllerActions<T>]: boolean;
};

/**
 * Configuration for authentication and access control.
 *
 * @typeParam T - Additional action types that extend the base actions.
 */
export type AuthConfigs<T extends string = never> = {
  /**
   * Defines authentication requirements for actions.
   * - When boolean: applies to all actions
   * - When partial rules: applies to specified actions
   *
   * @type {boolean | Partial<AuthenticationControlRules<T>>}
   */
  authenticationControl?: boolean | Partial<AuthenticationControlRules<T>>;

  /**
   * Defines role-based access control.
   * - When array: list of roles allowed for all actions
   * - When partial rules: specific roles for each action
   *
   * @type {any[] | Partial<AccessControlRules<T>>}
   */
  accessControl?: any[] | Partial<AccessControlRules<T>>;
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
   * Additional properties can be added to the payload.
   */
  [x: string]: any;
}
