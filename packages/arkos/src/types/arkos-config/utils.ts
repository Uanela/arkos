import { ArkosRequest } from "..";
import { AccessAction, DetailedAccessControlRule } from "../auth";

/** Context passed to `before` hooks of `authenticate`. */
export interface AuthenticateBeforeHookContext {
  /** The incoming request object. */
  req: ArkosRequest;
  /** Bypasses core logic and jumps directly to `after` hooks. */
  skip: () => void;
}

/** Context passed to `after` hooks of `authenticate`. */
export interface AuthenticateAfterHookContext {
  /** The incoming request object. */
  req: ArkosRequest;
}

/** Context passed to `onError` hooks of `authenticate`. */
export interface AuthenticateErrorHookContext {
  /** The incoming request object. */
  req: ArkosRequest;
  /** The error thrown during authentication. */
  error: unknown;
  /** Suppresses the error and jumps to `after` hooks. */
  skip: () => void;
}

export type AuthenticateHookHandler = (
  ctx: AuthenticateBeforeHookContext
) => void | Promise<void>;

export type AuthenticateAfterHookHandler = (
  ctx: AuthenticateAfterHookContext
) => void | Promise<void>;

export type AuthenticateErrorHookHandler = (
  ctx: AuthenticateErrorHookContext
) => void | Promise<void>;

/** Context passed to `before` hooks of `authorize`. */
export interface AuthorizeBeforeHookContext {
  /** The incoming request object. */
  req: ArkosRequest;
  /** The action being authorized (e.g. `"Create"`, `"Delete"`). */
  action: AccessAction;
  /** The resource being accessed in kebab-case (e.g. `"post"`, `"cart-item"`). */
  resource: string;
  /** The access control rule for this action. */
  rule?: string[] | DetailedAccessControlRule | "*";
  /** Bypasses core logic and jumps directly to `after` hooks. */
  skip: () => void;
}

/** Context passed to `after` hooks of `authorize`. */
export interface AuthorizeAfterHookContext {
  /** The incoming request object. */
  req: ArkosRequest;
  /** The action that was authorized (e.g. `"Create"`, `"Delete"`). */
  action: AccessAction;
  /** The resource that was accessed in kebab-case (e.g. `"post"`, `"cart-item"`). */
  resource: string;
  /** The access control rule that was applied. */
  rule?: string[] | DetailedAccessControlRule | "*";
}

/** Context passed to `onError` hooks of `authorize`. */
export interface AuthorizeErrorHookContext {
  /** The incoming request object. */
  req: ArkosRequest;
  /** The error thrown during authorization. */
  error: unknown;
  /** The action being authorized (e.g. `"Create"`, `"Delete"`). */
  action: AccessAction;
  /** The resource being accessed in kebab-case (e.g. `"post"`, `"cart-item"`). */
  resource: string;
  /** The access control rule for this action. */
  rule?: string[] | DetailedAccessControlRule | "*";
  /** Suppresses the error and jumps to `after` hooks. */
  skip: () => void;
}

export type AuthorizeHookHandler = (
  ctx: AuthorizeBeforeHookContext
) => void | Promise<void>;

export type AuthorizeAfterHookHandler = (
  ctx: AuthorizeAfterHookContext
) => void | Promise<void>;

export type AuthorizeErrorHookHandler = (
  ctx: AuthorizeErrorHookContext
) => void | Promise<void>;
