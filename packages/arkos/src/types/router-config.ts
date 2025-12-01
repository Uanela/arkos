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

interface PrismaBaseRouterConfig {
  parent?: {
    model?: string;
    foreignKeyField?: string;
    endpoints?: "*" | RouterEndpoint[];
  };
}

type BaseRouterConfig = PrismaBaseRouterConfig & {
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

export type RouterConfig<T extends string = string> = T extends "auth"
  ? AuthRouterConfig
  : T extends "file-upload"
    ? FileUploadRouterConfig
    : BaseRouterConfig;
