import { kebabCase } from "../../../../exports/utils";
import {
  AccessControlConfig,
  DetailedAccessControlRule,
} from "../../../../types/auth";
import { capitalize } from "../../../../utils/helpers/text.helpers";

interface AuthAction {
  /** role name, e.g Admin, Manager */
  roles: string[];
  /** action name, e.g Create, View, Update, Download, Cancel */
  action: string;
  /** resource name, e.g user, user-role, product, author */
  resource: string;
  /** Human-readable name for this permission (optional) */
  name?: string;
  /** Detailed description of what this permission allows (optional) */
  description?: string;
  /** Detailed error message of what must be returned on forbidden response (optional)
   *
   * Note: not yet implemented
   */
  errorMessage?: string;
}

class AuthActionService {
  authActions: AuthAction[] = [
    {
      roles: [],
      action: "View",
      resource: "auth-action",
      name: "View auth action",
      description: "Viewm an auth action",
      errorMessage: "You do not have permission to perform this operation",
    },
  ];

  add(action: string, resource: string, accessControl?: AccessControlConfig) {
    if (!this.getOne(action, resource)) {
      const transformedAction = this.transformAccessControlToValidAuthAction(
        action,
        resource,
        accessControl
      );
      this.authActions.push(transformedAction);
    }
  }

  getAll(): AuthAction[] {
    return this.authActions;
  }

  getOne(action: string, resource: string): AuthAction | undefined {
    return this.authActions.find(
      (authAction) =>
        authAction.action === action && authAction.resource === resource
    );
  }

  private transformAccessControlToValidAuthAction(
    action: string,
    resource: string,
    accessControl?: AccessControlConfig
  ): AuthAction {
    const baseAuthAction: AuthAction = {
      roles:
        (accessControl &&
          (Array.isArray(accessControl)
            ? accessControl
            : typeof accessControl === "string"
              ? [accessControl]
              : Array.isArray(accessControl?.[action] || {})
                ? (accessControl[action] as string[])
                : (accessControl[action] as DetailedAccessControlRule)
                    ?.roles)) ||
        [],
      action,
      resource,
      name: `${action} ${resource}`,
      description: `${capitalize(kebabCase(action).replace(/-/g, " "))} ${capitalize(kebabCase(resource).replace(/-/g, " "))}`,
      errorMessage: `You do not have permission to perform this operation`,
    };

    // If accessControl is not provided, return the base action
    if (!accessControl) {
      return baseAuthAction;
    }

    // If accessControl is an array of roles, just return the base action
    if (Array.isArray(accessControl)) {
      return baseAuthAction;
    }

    // If accessControl is an object with specific rules
    const actionRule = accessControl[action];

    if (actionRule) {
      if (Array.isArray(actionRule)) {
        // If it's just an array of roles, keep the base action
        return baseAuthAction;
      } else if (typeof actionRule === "object") {
        // If it's a detailed rule object, use its metadata
        return {
          ...baseAuthAction,
          name: actionRule.name || baseAuthAction.name,
          description: actionRule?.description || baseAuthAction.description,
          errorMessage: actionRule?.errorMessage || baseAuthAction.errorMessage,
        };
      }
    }

    return baseAuthAction;
  }

  /**
   * Get all unique actions across all auth actions
   */
  getUniqueActions(): string[] {
    return [
      ...new Set(this.authActions.map((authAction) => authAction.action)),
    ];
  }

  /**
   * Get all unique resources across all auth actions
   */
  getUniqueResources(): string[] {
    return [
      ...new Set(this.authActions.map((authAction) => authAction.resource)),
    ];
  }

  /**
   * Get all auth actions for a specific resource
   */
  getByResource(resource: string): AuthAction[] {
    return this.authActions.filter(
      (authAction) => authAction.resource === resource
    );
  }

  /**
   * Get all auth actions for a specific action
   */
  getByAction(action: string): AuthAction[] {
    return this.authActions.filter(
      (authAction) => authAction.action === action
    );
  }

  /**
   * Check if an auth action exists
   */
  exists(action: string, resource: string): boolean {
    return !!this.getOne(action, resource);
  }
}

const authActionService = new AuthActionService();

export default authActionService;
