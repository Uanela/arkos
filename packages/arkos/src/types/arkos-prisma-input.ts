/**
 * Helper type to exclude properties from T that exist in U
 * Used internally by XOR to create mutually exclusive types
 */
type Without<T, U> = {
  [P in Exclude<keyof T, keyof U>]?: never;
};

/**
 * XOR (Exclusive OR) type for mutually exclusive union types
 * Ensures that properties from T and U cannot be mixed together
 * @see https://stackoverflow.com/questions/42123407/does-typescript-support-mutually-exclusive-types
 */
type XOR<T, U> = T extends object
  ? U extends object
    ? (Without<T, U> & U) | (Without<U, T> & T)
    : U
  : T;

type Unpack<T> = T;

/**
 * Checks if a field is an array relation (one-to-many or many-to-many)
 * Identified by the presence of createMany property
 */
export type IsArrayRelation<T> =
  Exclude<T, undefined> extends {
    createMany?: any;
  }
    ? true
    : false;

/**
 * Checks if a field is an object relation (one-to-one or many-to-one)
 * Identified by the presence of relation operations without being an array
 */
export type IsObjectRelation<T> =
  Exclude<T, undefined> extends Array<any>
    ? false
    : Exclude<T, undefined> extends
          | { create?: any }
          | { connect?: any }
          | { connectOrCreate?: any }
          | { update?: any }
          | { delete?: any }
          | { disconnect?: any }
      ? true
      : false;

type ExtractCreateTypeArray<T> =
  Exclude<T, undefined> extends {
    create?: infer C;
  }
    ? Extract<C, Array<any>> extends Array<infer U>
      ? U extends Array<infer I>
        ? (Omit<I, "OR" | "AND" | "NOT"> & { apiAction?: "create" })[]
        : (Omit<U, "OR" | "AND" | "NOT"> & { apiAction?: "create" })[]
      : never
    : never;

type ExtractConnectTypeArray<
  T,
  A extends
    | "connect"
    | "delete"
    | "update"
    | "disconnect"
    | "deleteMany"
    | "set",
> =
  Exclude<T, undefined> extends { [k in A]?: infer C }
    ? Extract<C, Array<any>> extends Array<infer U>
      ? (Omit<U, "OR" | "AND" | "NOT"> & { apiAction?: A })[]
      : never
    : never;

type ExtractUpdateTypeArray<T> =
  Exclude<T, undefined> extends Array<infer Item>
    ? Item extends { update?: infer U }
      ? U extends Array<infer UpdateItem>
        ? UpdateItem extends { where: infer W; data: infer D }
          ? ((W & D) & { apiAction?: "update" })[]
          : never
        : U extends { where: infer W; data: infer D }
          ? ((W & D) & { apiAction?: "update" })[]
          : never
      : never
    : never;

type ExtractCreateTypeObject<T> =
  Exclude<T, undefined> extends {
    create?: infer C;
  }
    ? Exclude<
        Extract<Exclude<C, undefined>, object>,
        Array<any>
      > extends infer Obj
      ? Obj extends object
        ? Omit<Obj, "OR" | "AND" | "NOT"> & { apiAction?: "create" }
        : never
      : never
    : never;

type ExtractConnectTypeObject<
  T,
  A extends "connect" | "delete" | "update" | "disconnect",
> =
  Exclude<T, undefined> extends { [k in A]?: infer C }
    ? Exclude<
        Extract<Exclude<C, undefined>, object>,
        Array<any>
      > extends infer Obj
      ? Obj extends object
        ? Omit<Obj, "OR" | "AND" | "NOT"> & { apiAction?: A }
        : never
      : never
    : never;

type ExtractUpdateTypeObject<T> =
  Exclude<T, undefined> extends {
    update?: infer U;
  }
    ? U extends { where: infer W; data: infer D }
      ? (W & D) & { apiAction?: "update" }
      : Exclude<Extract<U, object>, Array<any>> & { apiAction?: "update" }
    : never;

type FlattenArrayRelation<T> =
  | (ExtractCreateTypeArray<T> extends never
      ? never
      : FlattenRelations<ExtractCreateTypeArray<T>>)
  | (ExtractConnectTypeArray<T, "connect"> extends never
      ? never
      : FlattenRelations<ExtractConnectTypeArray<T, "connect">>)
  | (ExtractUpdateTypeArray<T> extends never
      ? never
      : FlattenRelations<ExtractUpdateTypeArray<T>>)
  | (Exclude<T, undefined> extends Array<infer Item>
      ? Item extends { delete?: any }
        ? FlattenRelations<ExtractConnectTypeArray<T, "delete">> & {
            apiAction: "delete";
          }
        : never
      : never)
  | (Exclude<T, undefined> extends Array<infer Item>
      ? Item extends { disconnect?: any }
        ? FlattenRelations<ExtractConnectTypeArray<T, "disconnect">> & {
            apiAction: "disconnect";
          }
        : never
      : never)
  | (Exclude<T, undefined> extends Array<infer Item>
      ? Item extends { set?: infer S }
        ? Unpack<S> & { apiAction?: "set" }
        : never
      : never)
  | (Exclude<T, undefined> extends Array<infer Item>
      ? Item extends { deleteMany?: any }
        ? FlattenRelations<ExtractConnectTypeArray<T, "deleteMany">> & {
            apiAction: "deleteMany";
          }
        : never
      : never);

type FlattenObjectRelation<T> =
  | (ExtractCreateTypeObject<T> extends never
      ? never
      : FlattenRelations<ExtractCreateTypeObject<T>>)
  | (ExtractConnectTypeObject<T, "connect"> extends never
      ? never
      : FlattenRelations<ExtractConnectTypeObject<T, "connect">>)
  | (ExtractUpdateTypeObject<T> extends never
      ? never
      : FlattenRelations<ExtractUpdateTypeObject<T>>)
  | (Exclude<T, undefined> extends { delete?: any }
      ? FlattenRelations<ExtractConnectTypeObject<T, "delete">> & {
          apiAction: "delete";
        }
      : never)
  | (Exclude<T, undefined> extends { disconnect?: any }
      ? FlattenRelations<ExtractConnectTypeObject<T, "disconnect">> & {
          apiAction: "disconnect";
        }
      : never)
  | (Exclude<T, undefined> extends { set?: infer S }
      ? Unpack<S> & { apiAction?: "set" }
      : never);

type StripPrismaFilters<T> = T extends
  | { equals?: any }
  | { in?: any }
  | { notIn?: any }
  | { lt?: any }
  | { lte?: any }
  | { gt?: any }
  | { gte?: any }
  | { AND?: any }
  | { OR?: any }
  | { NOT?: any }
  ? never
  : T;

type IsPrismaFilter<T> =
  Extract<
    T,
    | { equals?: any }
    | { in?: any }
    | { notIn?: any }
    | { lt?: any }
    | { lte?: any }
    | { gt?: any }
    | { gte?: any }
    | { AND?: any }
    | { OR?: any }
    | { NOT?: any }
  > extends never
    ? false
    : true;

type FlattenRelations<T> = {
  [K in keyof T]: IsArrayRelation<T[K]> extends true
    ? FlattenArrayRelation<T[K]>
    : IsObjectRelation<T[K]> extends true
      ? XOR<FlattenObjectRelation<T[K]>, T[K]>
      : StripPrismaFilters<T[K]> extends never
        ? never
        : T[K] extends object
          ? T[K] extends Date | null | undefined
            ? T[K]
            : FlattenRelations<StripPrismaFilters<T[K]>>
          : StripPrismaFilters<T[K]>;
};

/**
 * Flattens Prisma relation inputs into a simpler, developer-friendly format
 *
 * Transforms Prisma's nested relation format:
 * ```typescript
 * { posts: { create: [...], connect: [...], update: [...] } }
 * ```
 *
 * Into a flattened format with optional apiAction discriminators:
 * ```typescript
 * { posts: [
 *   { title: "New Post" },                    // auto-detected as create
 *   { id: 1 },                                 // auto-detected as connect
 *   { id: 2, title: "Updated", apiAction: "update" }
 * ]}
 * ```
 *
 * @see {@link https://wwww.arkosjs.com/docs/api-reference/arkos-prisma-input}
 * @template T - The Prisma input type (e.g., Prisma.UserCreateInput)
 * @returns A flattened version of the input type with simplified relation handling
 */
export type ArkosPrismaInput<T> = FlattenRelations<T>;
