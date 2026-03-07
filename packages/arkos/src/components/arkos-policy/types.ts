import { User } from "../../types";
import { DetailedAccessControlRule } from "../../types/auth";

export type ArkosPolicyRule = string[] | DetailedAccessControlRule | "*";

export type PolicyEntry<TResource extends string, TAction extends string> = ((
  user?: User
) => boolean) & {
  readonly resource: TResource;
  readonly action: TAction;
  readonly rule: ArkosPolicyRule;
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
    config: ArkosPolicyRule
  ): PolicyWithActions<TResource, TActions | TAction>;
}
