import { User, UserRole } from "../../types";
import { DetailedAccessControlRule } from "../../types/auth";

export type ArkosPolicyRule = UserRole[] | DetailedAccessControlRule | "*";

export type PolicyAuthEntry<
  TResource extends string,
  TAction extends string,
> = {
  readonly resource: TResource;
  readonly action: TAction;
  readonly rule: ArkosPolicyRule;
};

export type PolicyChecker = (user?: User) => Promise<boolean>;

type CanKey<TAction extends string> = `can${Capitalize<TAction>}`;

export type PolicyWithActions<
  TResource extends string,
  TActions extends string,
> = IArkosPolicy<TResource, TActions> & {
  [K in TActions]: PolicyAuthEntry<TResource, K>;
} & {
  [K in CanKey<TActions>]: PolicyChecker;
};

export interface IArkosPolicy<
  TResource extends string,
  TActions extends string = never,
> {
  readonly __type: "ArkosPolicy";
  readonly resource: TResource;

  rule<TAction extends string>(
    action: TAction,
    config?: ArkosPolicyRule
  ): PolicyWithActions<TResource, TActions | TAction>;
}
