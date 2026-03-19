import { ArkosRequest } from "..";

/**
 * Context object passed to `before` and `after` auth hooks.
 */
export interface AuthHookContext {
  req: ArkosRequest;
  /**
   * Continue to the next hook or core logic.
   * Call with an error to abort and forward to the global error handler.
   */
  next: (err?: unknown) => void;
  /**
   * Only available in `before` hooks.
   * Bypasses core logic and jumps directly to `after` hooks.
   */
  skip: () => void;
}

/**
 * Context object passed to `onError` auth hooks.
 */
export interface AuthErrorHookContext {
  req: ArkosRequest;
  error: unknown;
  /**
   * Forward the original or a new error to the global error handler.
   */
  next: (err?: unknown) => void;
  /**
   * Suppress the error and jump to `after` hooks.
   */
  skip: () => void;
}

export type AuthHookHandler = (ctx: AuthHookContext) => void | Promise<void>;
export type AuthAfterHookHandler = (
  ctx: Omit<AuthHookContext, "skip">
) => void | Promise<void>;
export type AuthErrorHookHandler = (
  ctx: AuthErrorHookContext
) => void | Promise<void>;
