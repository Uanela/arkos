import { ArkosRouteConfig } from "../exports";

export type RouterEndpoint =
  | "createOne"
  | "findOne"
  | "updateOne"
  | "deleteOne"
  | "findMany"
  | "createMany"
  | "updateMany"
  | "deleteMany";

export type AuthRouterEndpoint =
  | "getMe"
  | "updateMe"
  | "deleteMe"
  | "login"
  | "logout"
  | "signup"
  | "updatePassword"
  | "findManyAuthAction"
  | "findOneAuthAction";

export type FileUploadRouterEndpoint =
  | "findFile"
  | "uploadFile"
  | "updateFile"
  | "deleteFile";

type BaseRouterConfig = {
  /**
   * Backward compatibility (prior 1.4.0-beta) - disables/enables endpoints
   *
   * prefer to rather to use the following:
   *
   * ```ts
   * export const config = {
   *  findMany: {
   *    disabled: true
   *  }
   * }
   * ```
   */
  disable?:
    | boolean
    | {
        [K in RouterEndpoint]?: boolean;
      };
} & {
  [K in RouterEndpoint]?: Omit<ArkosRouteConfig, "path">;
};

type AuthRouterConfig = {
  /**
   * Backward compatibility (prior 1.4.0-beta) - disables/enables endpoints
   *
   * prefer to rather to use the following:
   *
   * ```ts
   * export const config = {
   *  getMe: {
   *    disabled: true
   *  }
   * }
   * ```
   */
  disable?:
    | boolean
    | {
        [K in AuthRouterEndpoint]?: boolean;
      };
} & {
  [K in AuthRouterEndpoint]?: Omit<ArkosRouteConfig, "path">;
};

type FileUploadRouterConfig = {
  /**
   * Backward compatibility (prior 1.4.0-beta) - disables/enables endpoints
   *
   * prefer to rather to use the following:
   *
   * ```ts
   * export const config = {
   *  deleteFile: {
   *    disabled: true
   *  }
   * }
   * ```
   */
  disable?:
    | boolean
    | {
        [K in FileUploadRouterEndpoint]?: boolean;
      };
} & {
  [K in FileUploadRouterEndpoint]?: Omit<ArkosRouteConfig, "path" | "uploads">;
};

/**
 * @deprecated use 'import { RouteHook } from "arkos"' instead
 */
export type RouterConfig<T extends string = string> = T extends "auth"
  ? AuthRouterConfig
  : T extends "file-upload"
    ? FileUploadRouterConfig
    : BaseRouterConfig;

/**
 * Represents a Route Hook configuration for Arkos auto-generated routes.
 *
 * Route Hooks allow you to customize built-in routes (e.g. CRUD, auth, file upload)
 * without modifying the route definitions themselves. Each key in the hook maps
 * to a specific operation and accepts the same configuration object used by ArkosRouter.
 *
 * @template T - The hook type:
 * - `"auth"` → Uses {@link AuthRouterConfig} for authentication routes
 * - `"file-upload"` → Uses {@link FileUploadRouterConfig} for file upload routes
 * - `string` (default) → Uses {@link BaseRouterConfig} for standard model routes
 *
 * @example
 * ```ts
 * export const hook: RouteHook = {
 *   findMany: { authentication: false },
 *   createOne: { authentication: true },
 *   deleteOne: { disabled: true },
 * };
 * ```
 *
 * @example
 * ```ts
 * export const hook: RouteHook<"auth"> = {
 *   login: { rateLimit: { windowMs: 15 * 60_000, max: 10 } },
 *   signup: { disabled: true },
 * };
 * ```
 *
 * @example
 * ```ts
 * export const hook: RouteHook<"file-upload"> = {
 *   uploadFile: { authentication: true },
 *   deleteFile: { disabled: true },
 * };
 * ```
 *
 * @remarks
 * - This replaces the deprecated `RouterConfig` export (since v1.6.0-beta).
 * - The hook must be exported as `export const hook` inside a `*.router.ts` file.
 * - Each property corresponds to a predefined route operation depending on the hook type.
 *
 * @since v1.6.0-beta
 */
export type RouteHook<T extends string = string> = T extends "auth"
  ? AuthRouterConfig
  : T extends "file-upload"
    ? FileUploadRouterConfig
    : BaseRouterConfig;
