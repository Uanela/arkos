import {
  ExtractPrismaData,
  ExtractPrismaFilters,
  ExtractPrismaQueryOptions,
  PrismaModels,
} from "../../../generated";

export type Models = PrismaModels<any>;

export type Delegate<TModelName extends keyof Models> =
  Models[TModelName]["Delegate"];

export type CreateData<TModelName extends keyof Models> = ExtractPrismaData<
  Models[TModelName]["CreateArgs"]
>;
export type CreateOptions<TModelName extends keyof Models> =
  ExtractPrismaQueryOptions<Models[TModelName]["CreateArgs"], "data">;
export type CreateResult<TModelName extends keyof Models> =
  Models[TModelName]["GetPayload"];

export type CreateManyData<TModelName extends keyof Models> = ExtractPrismaData<
  Models[TModelName]["CreateManyArgs"]
>;
export type CreateManyOptions<TModelName extends keyof Models> =
  ExtractPrismaQueryOptions<Models[TModelName]["CreateManyArgs"], "data">;
export type CreateManyResult<TModelName extends keyof Models> =
  Models[TModelName]["GetPayload"][];

export type CountFilters<TModelName extends keyof Models> =
  ExtractPrismaFilters<Models[TModelName]["CountArgs"]>;

export type FindManyFilters<TModelName extends keyof Models> =
  ExtractPrismaFilters<Models[TModelName]["FindManyArgs"]>;
export type FindManyOptions<TModelName extends keyof Models> =
  ExtractPrismaQueryOptions<Models[TModelName]["FindManyArgs"], "where">;
export type FindManyResult<TModelName extends keyof Models> =
  Models[TModelName]["GetPayload"][];

export type FindOneFilters<TModelName extends keyof Models> =
  ExtractPrismaFilters<Models[TModelName]["FindFirstArgs"]>;
export type FindOneOptions<TModelName extends keyof Models> =
  ExtractPrismaQueryOptions<Models[TModelName]["FindFirstArgs"], "where">;
export type FindOneResult<TModelName extends keyof Models> =
  | Models[TModelName]["GetPayload"]
  | null;

export type UpdateOneFilters<TModelName extends keyof Models> =
  ExtractPrismaFilters<Models[TModelName]["UpdateArgs"]>;
export type UpdateOneData<TModelName extends keyof Models> = ExtractPrismaData<
  Models[TModelName]["UpdateArgs"]
>;
export type UpdateOneOptions<TModelName extends keyof Models> =
  ExtractPrismaQueryOptions<Models[TModelName]["UpdateArgs"], "where" | "data">;
export type UpdateOneResult<TModelName extends keyof Models> =
  Models[TModelName]["GetPayload"];

export type UpdateManyFilters<TModelName extends keyof Models> =
  ExtractPrismaFilters<Models[TModelName]["UpdateManyArgs"]>;
export type UpdateManyData<TModelName extends keyof Models> = ExtractPrismaData<
  Models[TModelName]["UpdateManyArgs"]
>;
export type UpdateManyOptions<TModelName extends keyof Models> =
  ExtractPrismaQueryOptions<
    Models[TModelName]["UpdateManyArgs"],
    "where" | "data"
  >;

export type DeleteOneFilters<TModelName extends keyof Models> =
  ExtractPrismaFilters<Models[TModelName]["DeleteArgs"]>;

export type DeleteManyFilters<TModelName extends keyof Models> =
  ExtractPrismaFilters<Models[TModelName]["DeleteManyArgs"]>;

export type GetPayload<TModelName extends keyof Models> =
  Models[TModelName]["GetPayload"];
