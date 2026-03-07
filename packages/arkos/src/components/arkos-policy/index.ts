import { User } from "../../types";
import { ArkosPolicyRule, IArkosPolicy, PolicyWithActions } from "./types";
import authService from "../../modules/auth/auth.service";

/**
 * Creates a typed policy for a Prisma model resource.
 *
 * Each `.rule()` call registers an action and returns the policy
 * with a typed `can{Action}` permission checker and a typed `{Action}`
 * entry — both passable to the `authentication` field on `ArkosRouteHook`
 * and `ArkosRouter`, and callable for fine-grained permission checks.
 *
 * @param resource - The resource name in kebab-case (e.g. `"user"`, `"blog-post"`)
 *
 * @example
 * ```ts
 * const userPolicy = ArkosPolicy("user")
 *   .rule("Create", ["Admin", "Editor"])
 *   .rule("View", "*")
 *   .rule("Delete", ["Admin"]);
 *
 * // Pass to authentication field
 * userRouter.post({ path: "/users", authentication: userPolicy.Create });
 * userRouteHook.deleteOne({ authentication: userPolicy.Delete });
 *
 * // Fine-grained check
 * if (userPolicy.canCreate(req.user)) { ... }
 *
 * export default userPolicy;
 * ```
 *
 * @see {@link https://www.arkosjs.com/docs/api-referency/arkos-policy}
 */
export function ArkosPolicy<TResource extends string>(
  resource: TResource
): IArkosPolicy<TResource, never> {
  return buildPolicy(resource, {});
}

function buildPolicy<TResource extends string, TActions extends string>(
  resource: TResource,
  store: Record<string, ArkosPolicyRule>
): PolicyWithActions<TResource, TActions> {
  const rule = <TAction extends string>(
    action: TAction,
    config: ArkosPolicyRule
  ): PolicyWithActions<TResource, TActions | TAction> => {
    const newStore = { ...store, [action]: config };
    return buildPolicy<TResource, TActions | TAction>(resource, newStore);
  };

  const actionEntries = Object.fromEntries(
    Object.entries(store).flatMap(([action, config]) => {
      const permission = Object.assign(
        (user?: User): Promise<boolean> =>
          authService.permission(action, resource, { [action]: config })(user),
        {
          resource,
          action,
          rule: config,
        }
      );

      const canKey = `can${action.charAt(0).toUpperCase()}${action.slice(1)}`;

      return [
        [action, permission],
        [canKey, permission],
      ];
    })
  );

  return {
    __type: "ArkosPolicy" as const,
    resource,
    rule,
    ...actionEntries,
  } as unknown as PolicyWithActions<TResource, TActions>;
}
