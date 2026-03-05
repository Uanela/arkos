import {
  CountFilters,
  CreateData,
  CreateManyData,
  CreateManyOptions,
  CreateManyResult,
  CreateOptions,
  CreateResult,
  DeleteManyFilters,
  DeleteOneFilters,
  FindManyFilters,
  FindManyOptions,
  FindManyResult,
  FindOneFilters,
  FindOneOptions,
  FindOneResult,
  Models,
  UpdateManyData,
  UpdateManyFilters,
  UpdateManyOptions,
  UpdateOneData,
  UpdateOneFilters,
  UpdateOneOptions,
  UpdateOneResult,
} from "../../modules/base/types/base.service.types";
import { User } from "../../types";

export interface ServiceHookContext {
  /**
   * The authenticated user making the request.
   */
  user?: User;

  /**
   * The access token from the request for authorization.
   */
  accessToken?: string;

  /**
   * Hook types to skip for this operation.
   * - `"before"`: Skip before hooks
   * - `"after"`: Skip after hooks
   * - `"error"`: Skip error hooks
   * - `"all"`: Skip all hooks
   *
   * @example
   * ```ts
   * { skip: ["before", "error"] }
   * { skip: "all" }
   * ```
   */
  skip?:
    | ("before" | "after" | "error")[]
    | "before"
    | "after"
    | "error"
    | "all";

  /**
   * Whether to re-throw errors after error hooks have run.
   * - `true` (default): re-throws the error
   * - `false`: returns the fallback value instead
   * @default true
   */
  throwOnError?: boolean;
}

export type ServiceHookHandler<TArgs> = (args: TArgs) => void | Promise<void>;

export interface ServiceHookOperationConfig<TBefore, TAfter, TError> {
  before?: ServiceHookHandler<TBefore>[];
  after?: ServiceHookHandler<TAfter>[];
  onError?: ServiceHookHandler<TError>[];
}

export interface BeforeCreateOneHookArgs<
  TModelName extends keyof Models,
  Context = ServiceHookContext,
> {
  data: CreateData<TModelName>;
  queryOptions?: CreateOptions<TModelName>;
  context?: Context;
}

export interface AfterCreateOneHookArgs<
  TModelName extends keyof Models,
  Context = ServiceHookContext,
> {
  result: CreateResult<TModelName>;
  data: CreateData<TModelName>;
  queryOptions?: CreateOptions<TModelName>;
  context?: Context;
}

export interface OnCreateOneErrorHookArgs<
  TModelName extends keyof Models,
  Context = ServiceHookContext,
> extends BeforeCreateOneHookArgs<TModelName, Context> {
  error: any;
}

export interface BeforeCreateManyHookArgs<
  TModelName extends keyof Models,
  Context = ServiceHookContext,
> {
  data: CreateManyData<TModelName>;
  queryOptions?: CreateManyOptions<TModelName>;
  context?: Context;
}

export interface AfterCreateManyHookArgs<
  TModelName extends keyof Models,
  Context = ServiceHookContext,
> {
  result: CreateManyResult<TModelName>;
  data: CreateManyData<TModelName>;
  queryOptions?: CreateManyOptions<TModelName>;
  context?: Context;
}

export interface OnCreateManyErrorHookArgs<
  TModelName extends keyof Models,
  Context = ServiceHookContext,
> extends BeforeCreateManyHookArgs<TModelName, Context> {
  error: any;
}

export interface BeforeCountHookArgs<
  TModelName extends keyof Models,
  Context = ServiceHookContext,
> {
  filters?: CountFilters<TModelName>;
  context?: Context;
}

export interface AfterCountHookArgs<
  TModelName extends keyof Models,
  Context = ServiceHookContext,
> {
  result: number;
  filters?: CountFilters<TModelName>;
  context?: Context;
}

export interface OnCountErrorHookArgs<
  TModelName extends keyof Models,
  Context = ServiceHookContext,
> extends BeforeCountHookArgs<TModelName, Context> {
  error: any;
}

export interface BeforeFindManyHookArgs<
  TModelName extends keyof Models,
  Context = ServiceHookContext,
> {
  filters?: FindManyFilters<TModelName>;
  queryOptions?: FindManyOptions<TModelName>;
  context?: Context;
}

export interface AfterFindManyHookArgs<
  TModelName extends keyof Models,
  Context = ServiceHookContext,
> {
  result: FindManyResult<TModelName>;
  filters?: FindManyFilters<TModelName>;
  queryOptions?: FindManyOptions<TModelName>;
  context?: Context;
}

export interface OnFindManyErrorHookArgs<
  TModelName extends keyof Models,
  Context = ServiceHookContext,
> extends BeforeFindManyHookArgs<TModelName, Context> {
  error: any;
}

export interface BeforeFindOneHookArgs<
  TModelName extends keyof Models,
  Context = ServiceHookContext,
> {
  filters: FindOneFilters<TModelName>;
  queryOptions?: FindOneOptions<TModelName>;
  context?: Context;
}

export interface AfterFindOneHookArgs<
  TModelName extends keyof Models,
  Context = ServiceHookContext,
> {
  result: FindOneResult<TModelName>;
  filters: FindOneFilters<TModelName>;
  queryOptions?: FindOneOptions<TModelName>;
  context?: Context;
}

export interface OnFindOneErrorHookArgs<
  TModelName extends keyof Models,
  Context = ServiceHookContext,
> extends BeforeFindOneHookArgs<TModelName, Context> {
  error: any;
}

export interface BeforeUpdateOneHookArgs<
  TModelName extends keyof Models,
  Context = ServiceHookContext,
> {
  filters: UpdateOneFilters<TModelName>;
  data: UpdateOneData<TModelName>;
  queryOptions?: UpdateOneOptions<TModelName>;
  context?: Context;
}

export interface AfterUpdateOneHookArgs<
  TModelName extends keyof Models,
  Context = ServiceHookContext,
> {
  result: UpdateOneResult<TModelName>;
  filters: UpdateOneFilters<TModelName>;
  data: UpdateOneData<TModelName>;
  queryOptions?: UpdateOneOptions<TModelName>;
  context?: Context;
}

export interface OnUpdateOneErrorHookArgs<
  TModelName extends keyof Models,
  Context = ServiceHookContext,
> extends BeforeUpdateOneHookArgs<TModelName, Context> {
  error: any;
}

export interface BeforeUpdateManyHookArgs<
  TModelName extends keyof Models,
  Context = ServiceHookContext,
> {
  filters: UpdateManyFilters<TModelName>;
  data: UpdateManyData<TModelName>;
  queryOptions?: UpdateManyOptions<TModelName>;
  context?: Context;
}

export interface AfterUpdateManyHookArgs<
  TModelName extends keyof Models,
  Context = ServiceHookContext,
> {
  result: { count: number };
  filters: UpdateManyFilters<TModelName>;
  data: UpdateManyData<TModelName>;
  queryOptions?: UpdateManyOptions<TModelName>;
  context?: Context;
}

export interface OnUpdateManyErrorHookArgs<
  TModelName extends keyof Models,
  Context = ServiceHookContext,
> extends BeforeUpdateManyHookArgs<TModelName, Context> {
  error: any;
}

export interface BeforeDeleteOneHookArgs<
  TModelName extends keyof Models,
  Context = ServiceHookContext,
> {
  filters: DeleteOneFilters<TModelName>;
  context?: Context;
}

export interface AfterDeleteOneHookArgs<
  TModelName extends keyof Models,
  Context = ServiceHookContext,
> {
  result: Models[TModelName]["GetPayload"];
  filters: DeleteOneFilters<TModelName>;
  context?: Context;
}

export interface OnDeleteOneErrorHookArgs<
  TModelName extends keyof Models,
  Context = ServiceHookContext,
> extends BeforeDeleteOneHookArgs<TModelName, Context> {
  error: any;
}

export interface BeforeDeleteManyHookArgs<
  TModelName extends keyof Models,
  Context = ServiceHookContext,
> {
  filters: DeleteManyFilters<TModelName>;
  context?: Context;
}

export interface AfterDeleteManyHookArgs<
  TModelName extends keyof Models,
  Context = ServiceHookContext,
> {
  result: { count: number };
  filters: DeleteManyFilters<TModelName>;
  context?: Context;
}

export interface OnDeleteManyErrorHookArgs<
  TModelName extends keyof Models,
  Context = ServiceHookContext,
> extends BeforeDeleteManyHookArgs<TModelName, Context> {
  error: any;
}

export interface BeforeFindByIdHookArgs<
  TModelName extends keyof Models,
  Context = ServiceHookContext,
> {
  id: string | number;
  queryOptions?: FindOneOptions<TModelName>;
  context?: Context;
}

export interface AfterFindByIdHookArgs<
  TModelName extends keyof Models,
  Context = ServiceHookContext,
> {
  result: FindOneResult<TModelName>;
  id: string | number;
  queryOptions?: FindOneOptions<TModelName>;
  context?: Context;
}

export interface OnFindByIdErrorHookArgs<
  TModelName extends keyof Models,
  Context = ServiceHookContext,
> extends BeforeFindByIdHookArgs<TModelName, Context> {
  error: any;
}

export interface BeforeUpdateByIdHookArgs<
  TModelName extends keyof Models,
  Context = ServiceHookContext,
> {
  id: string | number;
  data: UpdateOneData<TModelName>;
  queryOptions?: UpdateOneOptions<TModelName>;
  context?: Context;
}

export interface AfterUpdateByIdHookArgs<
  TModelName extends keyof Models,
  Context = ServiceHookContext,
> {
  result: UpdateOneResult<TModelName>;
  id: string | number;
  data: UpdateOneData<TModelName>;
  queryOptions?: UpdateOneOptions<TModelName>;
  context?: Context;
}

export interface OnUpdateByIdErrorHookArgs<
  TModelName extends keyof Models,
  Context = ServiceHookContext,
> extends BeforeUpdateByIdHookArgs<TModelName, Context> {
  error: any;
}

export interface BeforeDeleteByIdHookArgs<
  TModelName extends keyof Models,
  Context = ServiceHookContext,
> {
  id: string | number;
  context?: Context;
}

export interface AfterDeleteByIdHookArgs<
  TModelName extends keyof Models,
  Context = ServiceHookContext,
> {
  result: Models[TModelName]["GetPayload"];
  id: string | number;
  context?: Context;
}

export interface OnDeleteByIdErrorHookArgs<
  TModelName extends keyof Models,
  Context = ServiceHookContext,
> extends BeforeDeleteByIdHookArgs<TModelName, Context> {
  error: any;
}

export type ArkosServiceHookMethodConfigs<
  TModelName extends keyof Models,
  Context = ServiceHookContext,
> = {
  createOne?: ServiceHookOperationConfig<
    BeforeCreateOneHookArgs<TModelName, Context>,
    AfterCreateOneHookArgs<TModelName, Context>,
    OnCreateOneErrorHookArgs<TModelName, Context>
  >;
  createMany?: ServiceHookOperationConfig<
    BeforeCreateManyHookArgs<TModelName, Context>,
    AfterCreateManyHookArgs<TModelName, Context>,
    OnCreateManyErrorHookArgs<TModelName, Context>
  >;
  count?: ServiceHookOperationConfig<
    BeforeCountHookArgs<TModelName, Context>,
    AfterCountHookArgs<TModelName, Context>,
    OnCountErrorHookArgs<TModelName, Context>
  >;
  findMany?: ServiceHookOperationConfig<
    BeforeFindManyHookArgs<TModelName, Context>,
    AfterFindManyHookArgs<TModelName, Context>,
    OnFindManyErrorHookArgs<TModelName, Context>
  >;
  findOne?: ServiceHookOperationConfig<
    BeforeFindOneHookArgs<TModelName, Context>,
    AfterFindOneHookArgs<TModelName, Context>,
    OnFindOneErrorHookArgs<TModelName, Context>
  >;
  updateOne?: ServiceHookOperationConfig<
    BeforeUpdateOneHookArgs<TModelName, Context>,
    AfterUpdateOneHookArgs<TModelName, Context>,
    OnUpdateOneErrorHookArgs<TModelName, Context>
  >;
  updateMany?: ServiceHookOperationConfig<
    BeforeUpdateManyHookArgs<TModelName, Context>,
    AfterUpdateManyHookArgs<TModelName, Context>,
    OnUpdateManyErrorHookArgs<TModelName, Context>
  >;
  deleteOne?: ServiceHookOperationConfig<
    BeforeDeleteOneHookArgs<TModelName, Context>,
    AfterDeleteOneHookArgs<TModelName, Context>,
    OnDeleteOneErrorHookArgs<TModelName, Context>
  >;
  deleteMany?: ServiceHookOperationConfig<
    BeforeDeleteManyHookArgs<TModelName, Context>,
    AfterDeleteManyHookArgs<TModelName, Context>,
    OnDeleteManyErrorHookArgs<TModelName, Context>
  >;
  findById?: ServiceHookOperationConfig<
    BeforeFindByIdHookArgs<TModelName, Context>,
    AfterFindByIdHookArgs<TModelName, Context>,
    OnFindByIdErrorHookArgs<TModelName, Context>
  >;

  updateById?: ServiceHookOperationConfig<
    BeforeUpdateByIdHookArgs<TModelName, Context>,
    AfterUpdateByIdHookArgs<TModelName, Context>,
    OnUpdateByIdErrorHookArgs<TModelName, Context>
  >;

  deleteById?: ServiceHookOperationConfig<
    BeforeDeleteByIdHookArgs<TModelName, Context>,
    AfterDeleteByIdHookArgs<TModelName, Context>,
    OnDeleteByIdErrorHookArgs<TModelName, Context>
  >;
};

export type ArkosServiceHookReturn<
  TModelName extends keyof Models,
  Context = ServiceHookContext,
> = {
  readonly __type: "ArkosServiceHook";
  readonly moduleName: TModelName;
  readonly _store: Partial<ArkosServiceHookMethodConfigs<TModelName, Context>>;

  createOne(
    config: ServiceHookOperationConfig<
      BeforeCreateOneHookArgs<TModelName, Context>,
      AfterCreateOneHookArgs<TModelName, Context>,
      OnCreateOneErrorHookArgs<TModelName, Context>
    >
  ): ArkosServiceHookReturn<TModelName, Context>;

  createMany(
    config: ServiceHookOperationConfig<
      BeforeCreateManyHookArgs<TModelName, Context>,
      AfterCreateManyHookArgs<TModelName, Context>,
      OnCreateManyErrorHookArgs<TModelName, Context>
    >
  ): ArkosServiceHookReturn<TModelName, Context>;

  count(
    config: ServiceHookOperationConfig<
      BeforeCountHookArgs<TModelName, Context>,
      AfterCountHookArgs<TModelName, Context>,
      OnCountErrorHookArgs<TModelName, Context>
    >
  ): ArkosServiceHookReturn<TModelName, Context>;

  findMany(
    config: ServiceHookOperationConfig<
      BeforeFindManyHookArgs<TModelName, Context>,
      AfterFindManyHookArgs<TModelName, Context>,
      OnFindManyErrorHookArgs<TModelName, Context>
    >
  ): ArkosServiceHookReturn<TModelName, Context>;

  findOne(
    config: ServiceHookOperationConfig<
      BeforeFindOneHookArgs<TModelName, Context>,
      AfterFindOneHookArgs<TModelName, Context>,
      OnFindOneErrorHookArgs<TModelName, Context>
    >
  ): ArkosServiceHookReturn<TModelName, Context>;

  updateOne(
    config: ServiceHookOperationConfig<
      BeforeUpdateOneHookArgs<TModelName, Context>,
      AfterUpdateOneHookArgs<TModelName, Context>,
      OnUpdateOneErrorHookArgs<TModelName, Context>
    >
  ): ArkosServiceHookReturn<TModelName, Context>;

  updateMany(
    config: ServiceHookOperationConfig<
      BeforeUpdateManyHookArgs<TModelName, Context>,
      AfterUpdateManyHookArgs<TModelName, Context>,
      OnUpdateManyErrorHookArgs<TModelName, Context>
    >
  ): ArkosServiceHookReturn<TModelName, Context>;

  deleteOne(
    config: ServiceHookOperationConfig<
      BeforeDeleteOneHookArgs<TModelName, Context>,
      AfterDeleteOneHookArgs<TModelName, Context>,
      OnDeleteOneErrorHookArgs<TModelName, Context>
    >
  ): ArkosServiceHookReturn<TModelName, Context>;

  deleteMany(
    config: ServiceHookOperationConfig<
      BeforeDeleteManyHookArgs<TModelName, Context>,
      AfterDeleteManyHookArgs<TModelName, Context>,
      OnDeleteManyErrorHookArgs<TModelName, Context>
    >
  ): ArkosServiceHookReturn<TModelName, Context>;

  findById(
    config: ServiceHookOperationConfig<
      BeforeFindByIdHookArgs<TModelName, Context>,
      AfterFindByIdHookArgs<TModelName, Context>,
      OnFindByIdErrorHookArgs<TModelName, Context>
    >
  ): ArkosServiceHookReturn<TModelName, Context>;

  updateById(
    config: ServiceHookOperationConfig<
      BeforeUpdateByIdHookArgs<TModelName, Context>,
      AfterUpdateByIdHookArgs<TModelName, Context>,
      OnUpdateByIdErrorHookArgs<TModelName, Context>
    >
  ): ArkosServiceHookReturn<TModelName, Context>;

  deleteById(
    config: ServiceHookOperationConfig<
      BeforeDeleteByIdHookArgs<TModelName, Context>,
      AfterDeleteByIdHookArgs<TModelName, Context>,
      OnDeleteByIdErrorHookArgs<TModelName, Context>
    >
  ): ArkosServiceHookReturn<TModelName, Context>;
};
