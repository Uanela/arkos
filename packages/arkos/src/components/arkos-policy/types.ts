import { User } from "../../types";
import { AccessControlRules } from "../../types/auth";

export type AccessControlConfig = string[] | Partial<AccessControlRules> | "*";

export type PolicyEntry<TResource extends string, TAction extends string> = ((
  user?: User
) => boolean) & {
  readonly resource: TResource;
  readonly action: TAction;
  readonly rule: AccessControlConfig;
};

type CanKey<TAction extends string> = `can${Capitalize<TAction>}`;

export type PolicyWithActions<
  TResource extends string,
  TActions extends string,
> = IArkosPolicy<TResource, TActions> & {
  [K in CanKey<TActions>]: PolicyEntry<
    TResource,
    K extends `can${infer A}` ? Uncapitalize<A> : never
  >;
} & {
  [K in TActions]: PolicyEntry<TResource, K>;
};

export interface IArkosPolicy<
  TResource extends string,
  TActions extends string = never,
> {
  readonly __type: "ArkosPolicy";
  readonly resource: TResource;

  rule<TAction extends string>(
    action: TAction,
    config: AccessControlConfig
  ): PolicyWithActions<TResource, TActions | TAction>;
}
