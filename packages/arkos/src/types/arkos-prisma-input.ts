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
/**
 * Extract type from Prisma's Enumerable wrapper
 * Currently acts as identity but can be extended to handle array unwrapping
 */
// type Unpack<T> = T extends Array<infer U> ? U : T extends (infer U)[] ? U : T;
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
    | {
        create?: { id?: any } | { id?: any }[];
      }
    | {
        connect?: { id?: any } | { id?: any }[];
      }
    | {
        update?: { where?: { id?: any }; data?: any };
      }
    | {
        delete?: { where?: { id?: any } };
      }
    | {
        disconnect?: { where?: { id?: any } };
      }
    ? true
    : false;
/**
 * Extracts the create data type from a Prisma relation field
 * @template T - The relation field type
 * @returns The type used in the create operation, or never if not present
 */
export type ExtractCreateType<T> =
  Exclude<T, undefined> extends { create?: infer C }
    ? C extends Array<infer U>
      ? (U & {
          apiAction?: "create";
        })[]
      : C & {
          apiAction?: "create";
        }
    : never;

type ExtractConnectType<
  T,
  action extends "connect" | "delete" | "udpate" | "disconnect" | "deleteMany",
> =
  Exclude<T, undefined> extends { [k in action]?: infer C }
    ? C extends Array<infer U>
      ? (U & {
          apiAction?: action;
        })[]
      : C & {
          apiAction?: action;
        }
    : never;
/**
 * Extracts and merges the update data type from a Prisma relation field
 * Combines the 'where' clause and 'data' fields into a single type
 * @template T - The relation field type
 * @returns Merged type of where & data fields, or never if not present
 */
type ExtractUpdateType<T> = T extends {
  update?: infer U;
}
  ? U extends Array<infer Item>
    ? Item extends {
        where: infer W;
        data: infer D;
      }
      ? ((W & D) & { apiAction?: "update" })[]
      : never
    : U extends {
          where: infer W;
          data: infer D;
        }
      ? (W & D) & { apiAction?: "update" }
      : never
  : never;

/**
 * Creates a flattened union type for a single relation field
 * Combines all possible Prisma operations (create, connect, update, delete, etc.) into a discriminated union
 * Each variant includes an optional apiAction field for explicit operation specification
 * @template T - The Prisma relation field type
 */
type FlattenRelationField<T> =
  /**
   * Create Operation - Creates a new related entity
   * Extracts the 'create' data type and recursively flattens nested relations
   * @example { name: "New Item", apiAction?: "create" }
   */
  | (ExtractCreateType<T> extends never
      ? never
      : FlattenRelations<ExtractCreateType<T>>)
  /**
   * Connect Operation - Links to an existing entity using unique fields
   * Extracts the 'connect' data type (typically unique identifiers like id, email, etc.)
   * @example { id: 123, apiAction?: "connect" } or { email: "user@example.com", apiAction?: "connect" }
   */
  | (ExtractConnectType<T, "connect"> extends never
      ? never
      : FlattenRelations<ExtractConnectType<T, "connect">>)
  /**
   * Update Operation - Modifies an existing related entity
   * Combines the 'where' clause and 'data' fields into a single flat object
   * @example { id: 123, name: "Updated Name", apiAction?: "update" }
   */
  | (ExtractUpdateType<T> extends never
      ? never
      : FlattenRelations<ExtractUpdateType<T>> & {
          apiAction?: "update";
        })
  /**
   * Delete Operation - Removes a related entity from the database
   * Requires unique identifier(s) and explicit apiAction: "delete"
   * For arrays, automatically uses deleteMany; for singular relations uses delete
   * @example { id: 123, apiAction: "delete" }
   */
  | (T extends {
      delete?: any;
    }
      ? {
          apiAction: "delete";
        } & ExtractConnectType<T, "delete">
      : never)
  /**
   * Disconnect Operation - Breaks the relationship without deleting the entity
   * Requires unique identifier(s) and explicit apiAction: "disconnect"
   * Only available for optional relations
   * @example { id: 123, apiAction: "disconnect" }
   */
  | (T extends {
      disconnect?: any;
    }
      ? {
          apiAction: "disconnect";
        } & ExtractConnectType<T, "disconnect">
      : never)
  /**
   * Set Operation - Replaces all related entities with a new set
   * Typically used for many-to-many relations to completely replace the relation set
   * @example { id: 456, apiAction?: "set" }
   */
  | (T extends {
      set?: infer S;
    }
      ? Unpack<S> & {
          apiAction?: "set";
        }
      : never)
  /**
   * Delete Many Operation - Removes multiple related entities matching criteria
   * Requires unique identifier(s) and explicit apiAction: "deleteMany"
   * Used for bulk deletion of related records
   * @example { id: 123, apiAction: "deleteMany" }
   */
  | (T extends {
      deleteMany?: any;
    }
      ? {
          apiAction: "deleteMany";
        } & ExtractConnectType<T, "deleteMany">
      : never);

type FlattenRelations<T> = {
  [K in keyof T]: IsRelationField<T[K]> extends true
    ? Exclude<XOR<FlattenRelationField<T[K]>, T[K]>, "AND">
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
