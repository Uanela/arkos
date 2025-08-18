export type ModelDelegate = Record<string, any>;

// Create Operations
export type CreateOneData<T extends ModelDelegate> = Parameters<
  T["create"]
>[0] extends { data: infer D; [x: string]: any }
  ? D
  : any;

export type CreateOneOptions<T extends ModelDelegate> = Omit<
  Parameters<T["create"]>[0],
  "data"
>;

export type CreateOneResult<T extends ModelDelegate> =
  T["create"] extends (args: { data: any }) => infer R ? R : any;

export type CreateManyData<T extends ModelDelegate> = Parameters<
  T["createMany"]
>[0] extends { data: infer D; [x: string]: any }
  ? D
  : any;

export type CreateManyOptions<T extends ModelDelegate> = Omit<
  Parameters<T["createMany"]>[0],
  "data"
>;

export type CreateManyResult<T extends ModelDelegate> =
  T["createMany"] extends (args: { data: any }) => infer R ? R : any;

// Read Operations
export type CountFilters<T extends ModelDelegate> = Parameters<
  T["count"]
>[0] extends { where?: infer W; [x: string]: any }
  ? W
  : any;

export type FindManyFilters<T extends ModelDelegate> = Parameters<
  T["findMany"]
>[0] extends { where?: infer W; [x: string]: any }
  ? W
  : any;

export type FindManyOptions<T extends ModelDelegate> = Omit<
  Parameters<T["findMany"]>[0],
  "where"
>;

export type FindManyResult<
  T extends ModelDelegate,
  TOptions = any,
> = T["findMany"] extends (args: { where: any } & TOptions) => infer R
  ? R
  : any;

export type FindByIdOptions<T extends ModelDelegate> = Omit<
  Parameters<T["findUnique"]>[0],
  "where"
>;

export type FindByIdResult<T extends ModelDelegate> =
  T["findUnique"] extends (args: { where: any }) => infer R ? R : any;

export type FindOneFilters<T extends ModelDelegate> = Parameters<
  T["findFirst"]
>[0] extends { where?: infer W; [x: string]: any }
  ? W
  : any | Parameters<T["findUnique"]>[0] extends {
        where?: infer W;
        [x: string]: any;
      }
    ? W
    : any;

export type FindOneOptions<T extends ModelDelegate> =
  | Omit<Parameters<T["findFirst"]>[0], "where">
  | Omit<Parameters<T["findUnique"]>[0], "where">;

export type FindOneResult<T extends ModelDelegate> =
  T["findFirst"] extends (args: { where: any }) => infer R
    ? R
    : T["findUnique"] extends (args: { where: any }) => infer R2
      ? R2
      : any;

// Update Operations
export type UpdateOneFilters<T extends ModelDelegate> = Parameters<
  T["update"]
>[0] extends { where?: infer W; [x: string]: any }
  ? W
  : any;

export type UpdateOneData<T extends ModelDelegate> = Parameters<
  T["update"]
>[0] extends { data: infer D; [x: string]: any }
  ? D
  : any;

export type UpdateOneOptions<T extends ModelDelegate> = Omit<
  Parameters<T["update"]>[0],
  "where" | "data"
>;

export type UpdateOneResult<T extends ModelDelegate> =
  T["update"] extends (args: { where: any; data: any }) => infer R ? R : any;

export type UpdateManyFilters<T extends ModelDelegate> = Parameters<
  T["updateMany"]
>[0] extends { where?: infer W; [x: string]: any }
  ? W
  : any;

export type UpdateManyData<T extends ModelDelegate> = Parameters<
  T["updateMany"]
>[0] extends { data: infer D; [x: string]: any }
  ? D
  : any;

export type UpdateManyOptions<T extends ModelDelegate> = Omit<
  Parameters<T["updateMany"]>[0],
  "where" | "data"
>;

export type UpdateManyResult<T extends ModelDelegate> =
  T["updateMany"] extends (args: { where: any; data: any }) => infer R
    ? R
    : any;

// Delete Operations
export type DeleteOneFilters<T extends ModelDelegate> = Parameters<
  T["delete"]
>[0] extends { where?: infer W; [x: string]: any }
  ? W
  : any;

export type DeleteOneResult<T extends ModelDelegate> = ReturnType<T["delete"]>;

export type DeleteManyFilters<T extends ModelDelegate> = Parameters<
  T["deleteMany"]
>[0] extends { where?: infer W; [x: string]: any }
  ? W
  : Record<string, any>;

export type DeleteManyResult<T extends ModelDelegate> = ReturnType<
  T["deleteMany"]
>;
