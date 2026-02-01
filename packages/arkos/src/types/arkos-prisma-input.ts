/**
 * Helper type to exclude properties from T that exist in U
 * Used internally by XOR to create mutually exclusive types
 */
type Without<T, U> = { [P in Exclude<keyof T, keyof U>]?: never };

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

/**
 * Extract type from Prisma's Enumerable wrapper
 * Currently acts as identity but can be extended to handle array unwrapping
 */
type Unpack<T> = T;

/**
 * Checks if a field is a Prisma relation field
 * A field is considered a relation if it has any of: create, connect, connectOrCreate, update, delete, disconnect
 * Handles optional fields by excluding undefined before checking
 * @template T - The type to check
 * @returns true if T is a relation field, false otherwise
 */
export type IsRelationField<T> =
  Exclude<T, undefined> extends
    | { create?: any }
    | { connect?: any }
    // | { connectOrCreate?: any }
    | { update?: any }
    | { delete?: any }
    | { disconnect?: any }
    ? true
    : false;

/**
 * Extracts the create data type from a Prisma relation field
 * @template T - The relation field type
 * @returns The type used in the create operation, or never if not present
 */
export type ExtractCreateType<T> =
  Exclude<T, undefined> extends { create?: infer C } ? Unpack<C> : never;

/**
 * Extracts the connect data type from a Prisma relation field
 * @template T - The relation field type
 * @returns The type used in the connect operation (typically unique identifiers), or never if not present
 */
type ExtractConnectType<T> =
  Exclude<T, undefined> extends { connect?: infer C } ? Unpack<C> : never;

/**
 * Extracts and merges the update data type from a Prisma relation field
 * Combines the 'where' clause and 'data' fields into a single type
 * @template T - The relation field type
 * @returns Merged type of where & data fields, or never if not present
 */
type ExtractUpdateType<T> = T extends { update?: infer U }
  ? U extends Array<infer Item>
    ? Item extends { where: infer W; data: infer D }
      ? W & D
      : never
    : U extends { where: infer W; data: infer D }
      ? W & D
      : never
  : never;

/**
 * Extracts and merges the upsert data type from a Prisma relation field
 * Combines where, create, and update fields into a single type
 * @template T - The relation field type
 * @returns Merged type of where & (create | update) fields, or never if not present
 */
type ExtractUpsertType<T> = T extends { upsert?: infer U }
  ? U extends Array<infer Item>
    ? Item extends { where: infer W; create: infer C; update: infer D }
      ? W & (C | D)
      : never
    : U extends { where: infer W; create: infer C; update: infer D }
      ? W & (C | D)
      : never
  : never;

/**
 * Extracts the connectOrCreate data type from a Prisma relation field
 * @template T - The relation field type
 * @returns Union of where and create types, or never if not present
 */
type ExtractConnectOrCreateType<T> = T extends { connectOrCreate?: infer C }
  ? Unpack<C> extends { where: infer W; create: infer Cr }
    ? W | Cr
    : never
  : never;

/**
 * Creates a flattened union type for a single relation field
 * Combines all possible Prisma operations (create, connect, update, delete, etc.) into a discriminated union
 * Each variant includes an optional apiAction field for explicit operation specification
 * @template T - The Prisma relation field type
 */
type FlattenRelationField<T> =
  | (ExtractCreateType<T> extends never
      ? never
      : FlattenRelations<ExtractCreateType<T>> & { apiAction?: "create" })
  | (ExtractConnectType<T> extends never
      ? never
      : FlattenRelations<ExtractConnectType<T>> & {
          apiAction?: "create" | "connect";
        })
  | (ExtractUpdateType<T> extends never
      ? never
      : FlattenRelations<ExtractUpdateType<T>> & { apiAction?: "update" })
  | (T extends { delete?: any }
      ? { apiAction: "delete" } & ExtractConnectType<T>
      : never)
  | (T extends { disconnect?: any }
      ? { apiAction: "disconnect" } & ExtractConnectType<T>
      : never)
  | (T extends { set?: infer S } ? Unpack<S> & { apiAction?: "set" } : never)
  | (T extends { deleteMany?: any }
      ? { apiAction: "deleteMany" } & ExtractConnectType<T>
      : never);

/**
 * Determines if a relation field is an array (one-to-many) relation
 * Checks if any of create, connect, or update operations accept arrays
 * @template T - The relation field type
 * @returns true if the relation is an array relation, false otherwise
 */
type IsArrayRelation<T> =
  Exclude<T, undefined> extends
    | { create?: Array<any> }
    | { create?: (infer U)[] }
    ? true
    : T extends { connect?: Array<any> } | { connect?: (infer U)[] }
      ? true
      : T extends { update?: Array<any> } | { update?: (infer U)[] }
        ? true
        : false;

/**
 * Recursively flattens all relation fields in a Prisma input type
 * Transforms nested Prisma operations into a simpler, flattened structure
 * Preserves non-relation fields and handles nested objects recursively
 * For singular relations, uses XOR to ensure mutual exclusivity between flattened and Prisma formats
 * @template T - The Prisma input type to flatten
 */
type FlattenRelations<T> = {
  [K in keyof T]: IsRelationField<T[K]> extends true
    ? IsArrayRelation<T[K]> extends true
      ? Array<FlattenRelationField<T[K]>>
      : XOR<FlattenRelationField<T[K]>, T[K]>
    : T[K] extends object
      ? T[K] extends Date | null | undefined
        ? T[K]
        : FlattenRelations<T[K]>
      : T[K];
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
 * Features:
 * - Preserves non-relation fields as-is
 * - Automatically detects operation type based on field presence
 * - Supports explicit apiAction for disambiguation
 * - Works recursively for deeply nested relations
 * - Enforces mutual exclusivity between flattened and Prisma formats for singular relations
 *
 * @see {@link https://wwww.arkosjs.com/docs/api-reference/arkos-prisma-input}
 * @template T - The Prisma input type (e.g., Prisma.UserCreateInput)
 * @returns A flattened version of the input type with simplified relation handling
 *
 * @example
 * ```typescript
 * import { Prisma } from "@prisma/client";
 *
 * type FlatUserInput = ArkosPrismaInput<Prisma.UserCreateInput>;
 *
 * const user: FlatUserInput = {
 *   name: "John",
 *   email: "john@example.com",
 *   posts: [
 *     { title: "My First Post" },              // creates new post
 *     { id: 1 },                                // connects to existing post
 *     { id: 2, title: "Updated" },              // updates existing post
 *     { id: 3, apiAction: "delete" }            // deletes post
 *   ]
 * };
 * ```
 */
export type ArkosPrismaInput<T> = FlattenRelations<T>;
