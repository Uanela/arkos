import {
  ExtractPrismaData,
  ExtractPrismaQueryOptions,
  PrismaModels,
  RuntimeArkosConfig,
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

/**
 * The username fields accepted by the built-in login, derived from
 * `authentication.login.allowedUsernames` in the user's `arkos.config`.
 *
 * The generated `RuntimeArkosConfig` is a literal-typed view of the config;
 * when `allowedUsernames` is not configured it falls back to the runtime
 * default, `"username"` (see `getDefaultUsernameField`).
 */
export type LoginUsernames = RuntimeArkosConfig extends {
  authentication: {
    login: { allowedUsernames: readonly (infer U extends string)[] };
  };
}
  ? U
  : "username";

/**
 * The union of fields accepted as the login username.
 *
 * @deprecated Use `LoginUsernames`.
 */
export type LoginUsernameField = LoginUsernames;

type LoginUsernameValue<F extends string> = NonNullable<
  PathValue<PrismaModels<{ select: PathSelect<F> }>["user"]["GetPayload"], F>
>;

type LoginInputFor<F extends string> = {
  password: string;
} & (F extends `${string}.${string}`
  ? {
      /** Required for nested paths so the full dot-path is queried. */
      usernameField: F;
    }
  : {
      /** Only needed for nested paths; otherwise inferred from the username key. */
      usernameField?: F;
    }) & {
  [K in LastSegment<F>]: LoginUsernameValue<F>;
};

type DistributiveLoginInput<F extends string> = F extends any
  ? LoginInputFor<F>
  : never;

/**
 * Login payload for the configured username fields. Every entry in
 * `authentication.login.allowedUsernames` is accepted as an alternative, and the
 * key holding the username is the last segment of the field path, typed from the
 * Prisma schema.
 */
export type LoginInput = DistributiveLoginInput<LoginUsernames>;

