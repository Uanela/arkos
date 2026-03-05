import { ArkosRouteConfig } from "../../exports";
import { ArkosRequestHandler } from "../../types";
import { ModelsGetPayload } from "../../types/global";

export type PrismaModels = keyof ModelsGetPayload<any>;

export interface ArkosRouteHookHooks {
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
export type ArkosRouteHookMethodConfig<
  TModel extends string = string,
  TOp extends string = string,
> = Omit<ArkosRouteConfig, "path"> &
  ArkosRouteHookHooks & {
    /**
     * Prisma options merged into this operation's query.
     * Typed against the model's actual Prisma args for this operation.
     */
    prismaArgs?: PrismaQueryFor<TModel, TOp>;
  };

/**
 * Union of all valid module name types for ArkosRouteHook.
 * `string & {}` preserves autocomplete for "auth" and "file-upload"
 * while still accepting arbitrary model names.
 */
export type ArkosModuleType = "auth" | "file-upload" | PrismaModels;

/**
 * Route hook instance for standard CRUD model routes.
 * Each method's `prismaQuery` is typed against the model's actual Prisma args.
 */
export interface ArkosRouteHookInstance<TModel extends string = string> {
  readonly __type: "ArkosRouteHook";
  readonly moduleName: TModel;

  createOne(config: ArkosRouteHookMethodConfig<TModel, "CreateArgs">): this;
  findOne(config: ArkosRouteHookMethodConfig<TModel, "FindFirstArgs">): this;
  findMany(config: ArkosRouteHookMethodConfig<TModel, "FindManyArgs">): this;
  updateOne(config: ArkosRouteHookMethodConfig<TModel, "UpdateArgs">): this;
  deleteOne(config: ArkosRouteHookMethodConfig<TModel, "DeleteArgs">): this;
  createMany(
    config: ArkosRouteHookMethodConfig<TModel, "CreateManyArgs">
  ): this;
  updateMany(
    config: ArkosRouteHookMethodConfig<TModel, "UpdateManyArgs">
  ): this;
  deleteMany(
    config: ArkosRouteHookMethodConfig<TModel, "DeleteManyArgs">
  ): this;
}

/**
 * Route hook instance for the built-in auth module.
 * Only exposes methods relevant to auth routes.
 */
export interface ArkosAuthRouteHookInstance {
  readonly __type: "ArkosRouteHook";
  readonly moduleName: "auth";

  getMe(config: ArkosRouteHookMethodConfig): this;
  login(config: ArkosRouteHookMethodConfig): this;
  logout(config: ArkosRouteHookMethodConfig): this;
  signup(config: ArkosRouteHookMethodConfig): this;
  updateMe(config: ArkosRouteHookMethodConfig): this;
  updatePassword(config: ArkosRouteHookMethodConfig): this;
}

/**
 * Route hook instance for the built-in file-upload module.
 * Only exposes methods relevant to file routes.
 */
export interface ArkosFileUploadRouteHookInstance {
  readonly __type: "ArkosRouteHook";
  readonly moduleName: "file-upload";

  findFile(config: ArkosRouteHookMethodConfig): this;
  uploadFile(config: ArkosRouteHookMethodConfig): this;
  updateFile(config: ArkosRouteHookMethodConfig): this;
  deleteFile(config: ArkosRouteHookMethodConfig): this;
}

/**
 * Maps the module type string to its corresponding interceptor instance type.
 * Enables ArkosRouteHook() to return a narrowed type based on the argument.
 */
export type ArkosRouteHookReturn<T extends ArkosModuleType> = T extends "auth"
  ? ArkosAuthRouteHookInstance
  : T extends "file-upload"
    ? ArkosFileUploadRouteHookInstance
    : ArkosRouteHookInstance<T>;
