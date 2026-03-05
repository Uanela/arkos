import { ArkosRouteConfig } from "../../exports";
import { ArkosRequestHandler } from "../../types";
import { ModelsGetPayload } from "../../types/global";

export type PrismaModels = keyof ModelsGetPayload<any>;

export interface ArkosInterceptorHooks {
  before?: ArkosRequestHandler[];
  after?: ArkosRequestHandler[];
  onError?: ArkosRequestHandler[];
}

/**
 * Extracts the correct Prisma args type for a given model and operation.
 * Falls back to `Record<string, any>` if the model or operation is not found.
 */
type PrismaQueryFor<
  TModel extends string,
  TOp extends string,
> = TModel extends keyof ModelsGetPayload<any>
  ? TOp extends keyof ModelsGetPayload<any>[TModel]
    ? Partial<ModelsGetPayload<any>[TModel][TOp]>
    : Record<string, any>
  : Record<string, any>;

/**
 * Full config for an interceptor method — inherits all ArkosRouteConfig options
 * (validation, auth, rate limiting, etc.) minus `path`, plus lifecycle hooks,
 * plus `prismaQuery` typed to the specific model and operation's Prisma args.
 */
export type ArkosInterceptorMethodConfig<
  TModel extends string = string,
  TOp extends string = string,
> = Omit<ArkosRouteConfig, "path"> &
  ArkosInterceptorHooks & {
    /**
     * Prisma options merged into this operation's query.
     * Typed against the model's actual Prisma args for this operation.
     */
    prismaArgs?: PrismaQueryFor<TModel, TOp>;
  };

/**
 * Union of all valid module name types for ArkosInterceptor.
 * `string & {}` preserves autocomplete for "auth" and "file-upload"
 * while still accepting arbitrary model names.
 */
export type ArkosModuleType = "auth" | "file-upload" | PrismaModels;

/**
 * Interceptor instance for standard CRUD model routes.
 * Each method's `prismaQuery` is typed against the model's actual Prisma args.
 */
export interface ArkosInterceptorInstance<TModel extends string = string> {
  readonly __type: "ArkosInterceptor";
  readonly moduleName: TModel;

  createOne(config: ArkosInterceptorMethodConfig<TModel, "CreateArgs">): this;
  findOne(config: ArkosInterceptorMethodConfig<TModel, "FindFirstArgs">): this;
  findMany(config: ArkosInterceptorMethodConfig<TModel, "FindManyArgs">): this;
  updateOne(config: ArkosInterceptorMethodConfig<TModel, "UpdateArgs">): this;
  deleteOne(config: ArkosInterceptorMethodConfig<TModel, "DeleteArgs">): this;
  createMany(
    config: ArkosInterceptorMethodConfig<TModel, "CreateManyArgs">
  ): this;
  updateMany(
    config: ArkosInterceptorMethodConfig<TModel, "UpdateManyArgs">
  ): this;
  deleteMany(
    config: ArkosInterceptorMethodConfig<TModel, "DeleteManyArgs">
  ): this;
}

/**
 * Interceptor instance for the built-in auth module.
 * Only exposes methods relevant to auth routes.
 */
export interface ArkosAuthInterceptorInstance {
  readonly __type: "ArkosInterceptor";
  readonly moduleName: "auth";

  getMe(config: ArkosInterceptorMethodConfig): this;
  login(config: ArkosInterceptorMethodConfig): this;
  logout(config: ArkosInterceptorMethodConfig): this;
  signup(config: ArkosInterceptorMethodConfig): this;
  updateMe(config: ArkosInterceptorMethodConfig): this;
  updatePassword(config: ArkosInterceptorMethodConfig): this;
}

/**
 * Interceptor instance for the built-in file-upload module.
 * Only exposes methods relevant to file routes.
 */
export interface ArkosFileUploadInterceptorInstance {
  readonly __type: "ArkosInterceptor";
  readonly moduleName: "file-upload";

  findFile(config: ArkosInterceptorMethodConfig): this;
  uploadFile(config: ArkosInterceptorMethodConfig): this;
  updateFile(config: ArkosInterceptorMethodConfig): this;
  deleteFile(config: ArkosInterceptorMethodConfig): this;
}

/**
 * Maps the module type string to its corresponding interceptor instance type.
 * Enables ArkosInterceptor() to return a narrowed type based on the argument.
 */
export type ArkosInterceptorReturn<T extends ArkosModuleType> = T extends "auth"
  ? ArkosAuthInterceptorInstance
  : T extends "file-upload"
    ? ArkosFileUploadInterceptorInstance
    : ArkosInterceptorInstance<T>;
