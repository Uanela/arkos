import {
  ExtractPrismaData,
  ExtractPrismaFilters,
  ExtractPrismaQueryOptions,
  PrismaModels,
} from "../../generated";
import { ArkosPrismaInput } from "../../types/arkos-prisma-input";
import { User } from "../../types";

type UserModel = PrismaModels<any>["user"];

export type AuthUser = Omit<User, "password">;

export type GetMeOptions = ExtractPrismaQueryOptions<
  UserModel["FindFirstArgs"],
  "where"
>;
export type LoginOptions = GetMeOptions;
export type UpdateMeOptions = ExtractPrismaQueryOptions<
  UserModel["UpdateArgs"],
  "where" | "data"
>;
export type DeleteMeOptions = UpdateMeOptions;
export type SignupOptions = ExtractPrismaQueryOptions<
  UserModel["CreateArgs"],
  "data"
>;

export type SignupDto =
  | ExtractPrismaData<UserModel["CreateArgs"]>
  | ArkosPrismaInput<ExtractPrismaData<UserModel["CreateArgs"]>>;

export type UpdateMeDto =
  | ExtractPrismaData<UserModel["UpdateArgs"]>
  | ArkosPrismaInput<ExtractPrismaData<UserModel["UpdateArgs"]>>;

export type OverridableAuthMethod =
  | "getMe"
  | "updateMe"
  | "signup"
  | "deleteMe"
  | "login"
  | "updatePassword"
  | "logout";

export interface UpdatePasswordInput {
  currentPassword: string;
  newPassword: string;
}

type ListOperator = "some" | "every" | "none";
type Primitive = string | number | boolean | bigint | Date;
type LogicalOperator = "AND" | "OR" | "NOT";
type MaxPathDepth = 3;

type LastSegment<P extends string> = P extends `${string}.${infer R}`
  ? LastSegment<R>
  : P;

type PathSelect<P extends string> = P extends `${infer H}.${infer T}`
  ? H extends ListOperator
    ? PathSelect<T>
    : { [K in H]: { select: PathSelect<T> } }
  : { [K in P]: true };

type ElementOf<T> = T extends readonly (infer E)[] ? E : T;

type PathValue<T, P extends string> = P extends `${infer H}.${infer R}`
  ? H extends ListOperator
    ? PathValue<T, R>
    : H extends keyof T
      ? PathValue<ElementOf<NonNullable<T[H]>>, R>
      : never
  : P extends keyof T
    ? T[P]
    : never;

type WhereInputOf<V> = Extract<V, { AND?: any }>;

type WherePaths<W, D extends unknown[] = []> = D["length"] extends MaxPathDepth
  ? never
  : {
      [K in Exclude<keyof W, LogicalOperator> & string]-?: NonNullable<
        W[K]
      > extends infer V
        ? [Extract<V, Primitive>] extends [never]
          ? V extends { some?: infer S }
            ? `${K}.some.${WherePaths<NonNullable<S>, [...D, 0]>}`
            : [WhereInputOf<V>] extends [never]
              ? never
              : `${K}.${WherePaths<WhereInputOf<V>, [...D, 0]>}`
          : K
        : never;
    }[Exclude<keyof W, LogicalOperator> & string];

/**
 * Every scalar path reachable from the `User` model, in the same dot notation
 * accepted by `authentication.login.allowedUsernames`
 * (e.g. `"email"`, `"profile.nickname"`, `"phones.some.number"`).
 */
export type LoginUsernameField = WherePaths<
  NonNullable<ExtractPrismaFilters<UserModel["FindFirstArgs"]>>
>;

/**
 * Login payload for a given username field. The key holding the username is the
 * last segment of the field path and its type is read from the Prisma schema.
 */
export type LoginInput<F extends LoginUsernameField = LoginUsernameField> =
  F extends F
    ? { usernameField: F; password: string } & {
        [K in LastSegment<F>]: NonNullable<
          PathValue<
            PrismaModels<{ select: PathSelect<F> }>["user"]["GetPayload"],
            F
          >
        >;
      }
    : never;

