import { kebabCase } from "../../../../exports/utils";
import {
  AccessControlConfig,
  DetailedAccessControlRule,
} from "../../../../types/auth";
import { getArkosConfig } from "../../../../utils/helpers/arkos-config.helpers";
import { capitalize } from "../../../../utils/helpers/text.helpers";

interface AuthAction {
  roles?: string[] | "*";
  action: string;
  resource: string;
  name?: string;
  description?: string;
  errorMessage?: string;
}

class AuthActionService {
  authActions: AuthAction[] = [
    {
      roles: [],
      action: "View",
      resource: "auth-action",
      name: "View auth action",
      description: "View an auth action",
      errorMessage: "You do not have permission to perform this operation",
    },
  ];

  add(action: string, resource: string, accessControl?: AccessControlConfig) {
    const transformedAction = this.transformAccessControlToValidAuthAction(
      action,
      resource,
      accessControl
    );
    const existingAuthAction = this.getOne(action, resource);

    if (existingAuthAction) {
      const inconsistencies: string[] = [];

      const defaultName = `${capitalize(kebabCase(action).replace(/-/g, " "))} ${capitalize(kebabCase(resource).replace(/-/g, " "))}`;
      const defaultDescription = `${capitalize(kebabCase(action).replace(/-/g, " "))} ${capitalize(kebabCase(resource).replace(/-/g, " "))}`;
      const defaultErrorMessage =
        "You do not have permission to perform this operation";

      const isNonDefault = (
        value: string | undefined,
        defaultValue: string
      ): boolean => {
        return value !== undefined && value !== defaultValue;
      };

      if (
        isNonDefault(existingAuthAction.name, defaultName) &&
        isNonDefault(transformedAction.name, defaultName) &&
        existingAuthAction.name !== transformedAction.name
      ) {
        inconsistencies.push(
          `  - name: "${existingAuthAction.name}" vs "${transformedAction.name}"`
        );
      }

      if (
        isNonDefault(existingAuthAction.description, defaultDescription) &&
        isNonDefault(transformedAction.description, defaultDescription) &&
        existingAuthAction.description !== transformedAction.description
      ) {
        inconsistencies.push(
          `  - description: "${existingAuthAction.description}" vs "${transformedAction.description}"`
        );
      }

      if (
        isNonDefault(existingAuthAction.errorMessage, defaultErrorMessage) &&
        isNonDefault(transformedAction.errorMessage, defaultErrorMessage) &&
        existingAuthAction.errorMessage !== transformedAction.errorMessage
      ) {
        inconsistencies.push(
          `  - errorMessage: "${existingAuthAction.errorMessage}" vs "${transformedAction.errorMessage}"`
        );
      }
      if (inconsistencies.length > 0) {
        throw new Error(
          `Inconsistent metadata for permission "${action}:${resource}". ` +
            `The same action+resource combination is being defined with different values:\n` +
            inconsistencies.join("\n") +
            `\n\nPlease ensure all definitions of "${action}:${resource}" have the same name, description, and errorMessage values.`
        );
      }

      const mergedRoles =
        existingAuthAction.roles || transformedAction.roles
          ? [
              ...(existingAuthAction.roles || []),
              ...(transformedAction.roles || []),
            ]
          : undefined;

      const uniqueRoles = mergedRoles
        ? [...new Set(mergedRoles)].sort()
        : undefined;

      const merged: AuthAction = {
        action: existingAuthAction.action,
        resource: existingAuthAction.resource,
        roles: uniqueRoles,
        name: existingAuthAction.name ?? transformedAction.name,
        description:
          existingAuthAction.description ?? transformedAction.description,
        errorMessage:
          existingAuthAction.errorMessage ?? transformedAction.errorMessage,
      };

      this.remove(action, resource);
      this.authActions.push(merged);
    } else {
      if (transformedAction.roles) {
        transformedAction.roles = [...transformedAction.roles].sort();
      }
      this.authActions.push(transformedAction);
    }
  }

  remove(action: string, resource: string) {
    this.authActions = this.authActions.filter(
      (authAction) =>
        !(authAction.action === action && authAction.resource === resource)
    );
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
      name: `${capitalize(kebabCase(action).replace(/-/g, " "))} ${capitalize(kebabCase(resource).replace(/-/g, " "))}`,
      description: `${capitalize(kebabCase(action).replace(/-/g, " "))} ${capitalize(kebabCase(resource).replace(/-/g, " "))}`,
      errorMessage: `You do not have permission to perform this operation`,
    };

    const config = getArkosConfig();

    if (config?.authentication?.mode === "dynamic") delete baseAuthAction.roles;

    if (!accessControl) return baseAuthAction;

    if (Array.isArray(accessControl)) return baseAuthAction;

    const actionRule =
      accessControl !== "*" ? accessControl[action] : undefined;

    if (actionRule) {
      if (Array.isArray(actionRule)) {
        return baseAuthAction;
      } else if (typeof actionRule === "object") {
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

  getUniqueActions(): string[] {
    return [
      ...new Set(this.authActions.map((authAction) => authAction.action)),
    ];
  }

  getUniqueResources(): string[] {
    return [
      ...new Set(this.authActions.map((authAction) => authAction.resource)),
    ];
  }

  getByResource(resource: string): AuthAction[] | undefined {
    return this.authActions.filter(
      (authAction) => authAction.resource === resource
    );
  }

  getByAction(action: string): AuthAction[] {
    return this.authActions.filter(
      (authAction) => authAction.action === action
    );
  }

  exists(action: string, resource: string): boolean {
    return !!this.getOne(action, resource);
  }
}

const authActionService = new AuthActionService();

export default authActionService;
