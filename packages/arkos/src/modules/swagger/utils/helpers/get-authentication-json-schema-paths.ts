import { OpenAPIV3 } from "openapi-types";
import {
  getSchemaRef,
  localValidatorFileExists,
} from "./swagger.router.helpers";
import { ArkosConfig, RouterConfig } from "../../../../exports";
import { getModuleComponents } from "../../../../utils/dynamic-loader";
import { isEndpointDisabled } from "../../../base/utils/helpers/base.router.helpers";

export const getSchemaMode = (
  action: string,
  arkosConfig: ArkosConfig
): "prisma" | "zod" | "class-validator" => {
  const swaggerMode = arkosConfig.swagger?.mode;
  const isStrict = arkosConfig.swagger?.strict;

  if (!swaggerMode) return "prisma";
  if (isStrict) return swaggerMode;

  const actionKey = action as any;
  const localFileExists = localValidatorFileExists(
    actionKey,
    "auth",
    arkosConfig
  );

  if (!localFileExists) return "prisma";
  return swaggerMode;
};

export default function getAuthenticationJsonSchemaPaths(
  arkosConfig: ArkosConfig,
  existingPaths: OpenAPIV3.PathsObject
) {
  const paths: OpenAPIV3.PathsObject = { ...existingPaths };

  if (!arkosConfig.swagger?.mode) return paths;

  const AuthModuleComponents = getModuleComponents("auth");
  const routerConfig = AuthModuleComponents?.router
    ?.config as RouterConfig<"auth">;

  if (routerConfig?.disable === true) return paths;

  const isAuthEndpointDisabled = (endpoint: string): boolean => {
    return isEndpointDisabled(routerConfig, endpoint as any);
  };

  // Login
  if (!isAuthEndpointDisabled("login")) {
    const pathname = "/api/auth/login";
    if (!paths[pathname]) paths[pathname] = {};
    const loginMode = getSchemaMode("login", arkosConfig);
    const currentPath = paths[pathname]!.post;

    const defaultSpec = {
      tags: ["Authentication", ...(currentPath?.tags || [])].filter(
        (tag) => tag !== "Defaults"
      ),
      summary:
        currentPath?.summary === pathname || !currentPath?.summary
          ? "Login to the system"
          : currentPath?.summary,
      description:
        currentPath?.description ||
        "Authenticates a user and returns an access token",
      operationId: currentPath?.operationId?.includes(pathname)
        ? "login"
        : currentPath?.operationId,
      requestBody: currentPath?.requestBody || {
        description: "User credentials",
        required: true,
        content: {
          "application/json": {
            schema: {
              $ref: getSchemaRef("Login", loginMode),
            },
          },
        },
      },
      responses: {
        ...(currentPath?.responses || {}),
        "200": currentPath?.responses?.["200"] || {
          description: "Login successful",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  accessToken: {
                    type: "string",
                    description: "JWT access token",
                  },
                },
              },
            },
          },
        },
        "400": currentPath?.responses?.["400"] || {
          description: "Invalid input data",
        },
        "401": currentPath?.responses?.["401"] || {
          description: "Invalid credentials",
        },
      },
    };

    paths[pathname]!.post = { ...(currentPath || {}), ...defaultSpec };
  }

  // Logout
  if (!isAuthEndpointDisabled("logout")) {
    const pathname = "/api/auth/logout";
    if (!paths[pathname]) paths[pathname] = {};
    const currentPath = paths[pathname]!.delete;

    const defaultSpec = {
      tags: ["Authentication", ...(currentPath?.tags || [])].filter(
        (tag) => tag !== "Defaults"
      ),
      summary:
        currentPath?.summary === pathname || !currentPath?.summary
          ? "Logout from the system"
          : currentPath?.summary,
      description:
        currentPath?.description || "Invalidates the current user's JWT token",
      operationId: currentPath?.operationId?.includes(pathname)
        ? "logout"
        : currentPath?.operationId,
      security: [{ BearerAuth: [] }],
      responses: {
        ...(currentPath?.responses || {}),
        "204": currentPath?.responses?.["204"] || {
          description: "Logout successful",
        },
        "401": currentPath?.responses?.["401"] || {
          description: "Authentication required",
        },
      },
    };

    paths[pathname]!.delete = { ...(currentPath || {}), ...defaultSpec };
  }

  // Signup
  if (!isAuthEndpointDisabled("signup")) {
    const pathname = "/api/auth/signup";
    if (!paths[pathname]) paths[pathname] = {};
    const signupMode = getSchemaMode("signup", arkosConfig);
    const userMode = getSchemaMode("user", arkosConfig);
    const currentPath = paths[pathname]!.post;

    const defaultSpec = {
      tags: ["Authentication", ...(currentPath?.tags || [])].filter(
        (tag) => tag !== "Defaults"
      ),
      summary:
        currentPath?.summary === pathname || !currentPath?.summary
          ? "Register a new user"
          : currentPath?.summary,
      description: currentPath?.description || "Creates a new user account",
      operationId: currentPath?.operationId?.includes(pathname)
        ? "signup"
        : currentPath?.operationId,
      requestBody: currentPath?.requestBody || {
        description: "User registration data",
        required: true,
        content: {
          "application/json": {
            schema: {
              $ref: getSchemaRef("Signup", signupMode),
            },
          },
        },
      },
      responses: {
        ...(currentPath?.responses || {}),
        "201": currentPath?.responses?.["201"] || {
          description: "User created successfully",
          content: {
            "application/json": {
              schema: {
                $ref: getSchemaRef("User", userMode),
              },
            },
          },
        },
        "400": currentPath?.responses?.["400"] || {
          description: "Invalid input data",
        },
        "409": currentPath?.responses?.["409"] || {
          description: "User already exists",
        },
      },
    };

    paths[pathname]!.post = { ...(currentPath || {}), ...defaultSpec };
  }

  // Update Password
  if (!isAuthEndpointDisabled("updatePassword")) {
    const pathname = "/api/auth/update-password";
    if (!paths[pathname]) paths[pathname] = {};
    const updatePasswordMode = getSchemaMode("updatePassword", arkosConfig);
    const currentPath = paths[pathname]!.post;

    const defaultSpec = {
      tags: ["Authentication", ...(currentPath?.tags || [])].filter(
        (tag) => tag !== "Defaults"
      ),
      summary:
        currentPath?.summary === pathname || !currentPath?.summary
          ? "Update user password"
          : currentPath?.summary,
      description:
        currentPath?.description ||
        "Changes the password for the authenticated user",
      operationId: currentPath?.operationId?.includes(pathname)
        ? "updatePassword"
        : currentPath?.operationId,
      security: [{ BearerAuth: [] }],
      requestBody: currentPath?.requestBody || {
        description: "Current and new password",
        required: true,
        content: {
          "application/json": {
            schema: {
              $ref: getSchemaRef("UpdatePassword", updatePasswordMode),
            },
          },
        },
      },
      responses: {
        ...(currentPath?.responses || {}),
        "200": currentPath?.responses?.["200"] || {
          description: "Password updated successfully",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  status: {
                    type: "string",
                    example: "success",
                  },
                  message: {
                    type: "string",
                    example: "Password updated successfully!",
                  },
                },
              },
            },
          },
        },
        "400": currentPath?.responses?.["400"] || {
          description: "Invalid input data or current password incorrect",
        },
        "401": currentPath?.responses?.["401"] || {
          description: "Authentication required",
        },
      },
    };

    paths[pathname]!.post = { ...(currentPath || {}), ...defaultSpec };
  }

  // Get Me
  if (!isAuthEndpointDisabled("getMe")) {
    const pathname = "/api/users/me";
    if (!paths[pathname]) paths[pathname] = {};
    const findMeMode = getSchemaMode("getMe", arkosConfig);
    const currentPath = paths[pathname]!.get;

    const defaultSpec = {
      tags: ["Authentication", ...(currentPath?.tags || [])].filter(
        (tag) => tag !== "Defaults"
      ),
      summary:
        currentPath?.summary === pathname || !currentPath?.summary
          ? "Get current user information"
          : currentPath?.summary,
      description:
        currentPath?.description ||
        "Retrieves information about the currently authenticated user",
      operationId: currentPath?.operationId?.includes(pathname)
        ? "getMe"
        : currentPath?.operationId,
      security: [{ BearerAuth: [] }],
      responses: {
        ...(currentPath?.responses || {}),
        "200": currentPath?.responses?.["200"] || {
          description: "User information retrieved successfully",
          content: {
            "application/json": {
              schema: {
                $ref: getSchemaRef("GetMe", findMeMode),
              },
            },
          },
        },
        "401": currentPath?.responses?.["401"] || {
          description: "Authentication required",
        },
      },
    };

    paths[pathname]!.get = { ...(currentPath || {}), ...defaultSpec };
  }

  // Update Me
  if (!isAuthEndpointDisabled("updateMe")) {
    const pathname = "/api/users/me";
    if (!paths[pathname]) paths[pathname] = {};
    const updateMeMode = getSchemaMode("updateMe", arkosConfig);
    const userMode = getSchemaMode("user", arkosConfig);
    const currentPath = paths[pathname]!.patch;

    const defaultSpec = {
      tags: ["Authentication", ...(currentPath?.tags || [])].filter(
        (tag) => tag !== "Defaults"
      ),
      summary:
        currentPath?.summary === pathname || !currentPath?.summary
          ? "Update current user information"
          : currentPath?.summary,
      description:
        currentPath?.description ||
        "Updates information for the currently authenticated user",
      operationId: currentPath?.operationId?.includes(pathname)
        ? "updateMe"
        : currentPath?.operationId,
      security: [{ BearerAuth: [] }],
      requestBody: currentPath?.requestBody || {
        description: "User data to update",
        required: true,
        content: {
          "application/json": {
            schema: {
              $ref: getSchemaRef("UpdateMe", updateMeMode),
            },
          },
        },
      },
      responses: {
        ...(currentPath?.responses || {}),
        "200": currentPath?.responses?.["200"] || {
          description: "User updated successfully",
          content: {
            "application/json": {
              schema: {
                $ref: getSchemaRef("User", userMode),
              },
            },
          },
        },
        "400": currentPath?.responses?.["400"] || {
          description: "Invalid input data",
        },
        "401": currentPath?.responses?.["401"] || {
          description: "Authentication required",
        },
      },
    };

    paths[pathname]!.patch = { ...(currentPath || {}), ...defaultSpec };
  }

  // Delete Me
  if (!isAuthEndpointDisabled("deleteMe")) {
    const pathname = "/api/users/me";
    if (!paths[pathname]) paths[pathname] = {};
    const currentPath = paths[pathname]!.delete;

    const defaultSpec = {
      tags: ["Authentication", ...(currentPath?.tags || [])].filter(
        (tag) => tag !== "Defaults"
      ),
      summary:
        currentPath?.summary === pathname || !currentPath?.summary
          ? "Delete current user account"
          : currentPath?.summary,
      description:
        currentPath?.description ||
        "Marks the current user's account as deleted",
      operationId: currentPath?.operationId?.includes(pathname)
        ? "deleteMe"
        : currentPath?.operationId,
      security: [{ BearerAuth: [] }],
      responses: {
        ...(currentPath?.responses || {}),
        "200": currentPath?.responses?.["200"] || {
          description: "Account deleted successfully",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  message: {
                    type: "string",
                    example: "Account deleted successfully",
                  },
                },
              },
            },
          },
        },
        "401": currentPath?.responses?.["401"] || {
          description: "Authentication required",
        },
      },
    };

    paths[pathname]!.delete = { ...(currentPath || {}), ...defaultSpec };
  }

  // Find Many Auth Action
  if (!isAuthEndpointDisabled("findManyAuthAction")) {
    const pathname = "/api/auth-actions";
    if (!paths[pathname]) paths[pathname] = {};
    const currentPath = paths[pathname]!.get;

    const defaultSpec = {
      tags: ["Authentication", ...(currentPath?.tags || [])].filter(
        (tag) => tag !== "Defaults"
      ),
      summary:
        currentPath?.summary === pathname || !currentPath?.summary
          ? "Get all authentication actions"
          : currentPath?.summary,
      description:
        currentPath?.description ||
        "Retrieves a list of all available authentication actions and permissions",
      operationId: currentPath?.operationId?.includes(pathname)
        ? "findManyAuthAction"
        : currentPath?.operationId,
      security: [{ BearerAuth: [] }],
      responses: {
        ...(currentPath?.responses || {}),
        "200": currentPath?.responses?.["200"] || {
          description: "Auth actions retrieved successfully",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  total: {
                    type: "number",
                    description: "Total number of auth actions",
                  },
                  results: {
                    type: "number",
                    description: "Number of auth actions returned",
                  },
                  data: {
                    type: "array",
                    items: {
                      $ref: "#/components/schemas/FindManyAuthActionSystemSchema",
                    },
                  },
                },
              },
            },
          },
        },
        "401": currentPath?.responses?.["401"] || {
          description: "Authentication required",
        },
        "403": currentPath?.responses?.["403"] || {
          description: "Insufficient permissions",
        },
      },
    };

    paths[pathname]!.get = { ...(currentPath || {}), ...defaultSpec };
  }

  if (!isAuthEndpointDisabled("findOneAuthAction")) {
    const pathname = "/api/auth-actions/{resourceName}";
    if (!paths[pathname]) paths[pathname] = {};
    const currentPath = paths[pathname]!.get;

    const defaultParameters: OpenAPIV3.ParameterObject[] = [
      {
        name: "resourceName",
        in: "path",
        description: "Name of the resource to retrieve auth actions for",
        required: true,
        schema: { type: "string" },
      },
    ];

    const existingParams =
      (currentPath?.parameters as OpenAPIV3.ParameterObject[]) || [];
    const existingParamKeys = new Set(
      existingParams.map((p) => `${p.in}-${p.name}`)
    );

    const mergedParameters = [
      ...existingParams,
      ...defaultParameters.filter(
        (p) => !existingParamKeys.has(`${p.in}-${p.name}`)
      ),
    ];

    const defaultSpec = {
      tags: ["Authentication", ...(currentPath?.tags || [])].filter(
        (tag) => tag !== "Defaults"
      ),
      summary:
        currentPath?.summary === pathname || !currentPath?.summary
          ? "Get authentication actions by resource"
          : currentPath?.summary,
      description:
        currentPath?.description ||
        "Retrieves all authentication actions for a specific resource",
      operationId: currentPath?.operationId?.includes(pathname)
        ? "findOneAuthAction"
        : currentPath?.operationId,
      security: [{ BearerAuth: [] }],
      parameters: mergedParameters,
      responses: {
        ...(currentPath?.responses || {}),
        "200": currentPath?.responses?.["200"] || {
          description: "Auth actions for resource retrieved successfully",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  total: {
                    type: "number",
                    description:
                      "Total number of auth actions for this resource",
                  },
                  results: {
                    type: "number",
                    description: "Number of auth actions returned",
                  },
                  data: {
                    type: "array",
                    items: {
                      $ref: "#/components/schemas/FindManyAuthActionSystemSchema",
                    },
                  },
                },
              },
            },
          },
        },
        "401": currentPath?.responses?.["401"] || {
          description: "Authentication required",
        },
        "403": currentPath?.responses?.["403"] || {
          description: "Insufficient permissions",
        },
        "404": currentPath?.responses?.["404"] || {
          description: "Resource not found",
        },
      },
    };

    paths[pathname]!.get = { ...(currentPath || {}), ...defaultSpec };
  }

  return paths;
}
