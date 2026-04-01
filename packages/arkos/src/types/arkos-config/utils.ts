import { ArkosRequest } from "..";

/**
 * Context object passed to `before` auth hooks.
 */
export interface AuthBeforeHookContext {
  req: ArkosRequest;
  /**
   * Bypasses core logic and jumps directly to `after` hooks.
   */
  skip: () => void;
}

/**
 * Context object passed to `after` auth hooks.
 */
export interface AuthAfterHookContext {
  req: ArkosRequest;
}

/**
 * Context object passed to `onError` auth hooks.
 */
export interface AuthErrorHookContext {
  req: ArkosRequest;
  error: unknown;
  /**
   * Suppress the error and jump to `after` hooks.
   */
  skip: () => void;
}

export type AuthHookHandler = (
  ctx: AuthBeforeHookContext
) => void | Promise<void>;
export type AuthAfterHookHandler = (
  ctx: AuthAfterHookContext
) => void | Promise<void>;
export type AuthErrorHookHandler = (
  ctx: AuthErrorHookContext
) => void | Promise<void>;
