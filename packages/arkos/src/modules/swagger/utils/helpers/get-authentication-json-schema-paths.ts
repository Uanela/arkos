import { OpenAPIV3 } from "openapi-types";
import {
  getSchemaRef,
  localValidatorFileExists,
} from "./swagger.router.helpers";
import { ArkosConfig, RouterConfig } from "../../../../exports";
import { getModuleComponents } from "../../../../utils/dynamic-loader";
import { isEndpointDisabled } from "../../../base/utils/helpers/base.router.helpers";

export const getSchemaMode = async (
  action: string,
  arkosConfig: ArkosConfig
): Promise<"prisma" | "zod" | "class-validator"> => {
  const swaggerMode = arkosConfig.swagger?.mode;
  const isStrict = arkosConfig.swagger?.strict;

  if (!swaggerMode) return "prisma";
  if (isStrict) return swaggerMode;

  const actionKey = action as any;
  const localFileExists = await localValidatorFileExists(
    actionKey,
    "user",
    arkosConfig
  );

  if (!localFileExists) return "prisma";
  return swaggerMode;
};

export default async function getAuthenticationJsonSchemaPaths(
  arkosConfig: ArkosConfig
) {
  const paths: OpenAPIV3.PathsObject = {};

  if (!arkosConfig.swagger?.mode) return paths;

  const AuthModuleComponents = getModuleComponents("auth");
  const routerConfig = AuthModuleComponents?.router
    ?.config as RouterConfig<"auth">;

  if (routerConfig?.disable === true) return paths;

  const isAuthEndpointDisabled = (endpoint: string): boolean => {
    return isEndpointDisabled(routerConfig, endpoint as any);
  };

  if (!isAuthEndpointDisabled("login")) {
    const loginMode = await getSchemaMode("login", arkosConfig);
    paths["/api/auth/login"] = {
      post: {
        tags: ["Authentication"],
        summary: "Login to the system",
        description: "Authenticates a user and returns an access token",
        operationId: "login",
        requestBody: {
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
          "200": {
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
          "400": {
            description: "Invalid input data",
          },
          "401": {
            description: "Invalid credentials",
          },
        },
      },
    };
  }

  if (!isAuthEndpointDisabled("logout")) {
    paths["/api/auth/logout"] = {
      delete: {
        tags: ["Authentication"],
        summary: "Logout from the system",
        description: "Invalidates the current user's JWT token",
        operationId: "logout",
        security: [{ BearerAuth: [] }],
        responses: {
          "204": {
            description: "Logout successful",
          },
          "401": {
            description: "Authentication required",
          },
        },
      },
    };
  }

  if (!isAuthEndpointDisabled("signup")) {
    const signupMode = await getSchemaMode("signup", arkosConfig);
    const userMode = await getSchemaMode("user", arkosConfig);
    paths["/api/auth/signup"] = {
      post: {
        tags: ["Authentication"],
        summary: "Register a new user",
        description: "Creates a new user account",
        operationId: "signup",
        requestBody: {
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
          "201": {
            description: "User created successfully",
            content: {
              "application/json": {
                schema: {
                  $ref: getSchemaRef("User", userMode),
                },
              },
            },
          },
          "400": {
            description: "Invalid input data",
          },
          "409": {
            description: "User already exists",
          },
        },
      },
    };
  }

  if (!isAuthEndpointDisabled("updatePassword")) {
    const updatePasswordMode = await getSchemaMode(
      "updatePassword",
      arkosConfig
    );
    paths["/api/auth/update-password"] = {
      post: {
        tags: ["Authentication"],
        summary: "Update user password",
        description: "Changes the password for the authenticated user",
        operationId: "updatePassword",
        security: [{ BearerAuth: [] }],
        requestBody: {
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
          "200": {
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
          "400": {
            description: "Invalid input data or current password incorrect",
          },
          "401": {
            description: "Authentication required",
          },
        },
      },
    };
  }

  if (!isAuthEndpointDisabled("getMe")) {
    const findMeMode = await getSchemaMode("getMe", arkosConfig);
    paths["/api/users/me"] = {
      get: {
        tags: ["Authentication"],
        summary: "Get current user information",
        description:
          "Retrieves information about the currently authenticated user",
        operationId: "getMe",
        security: [{ BearerAuth: [] }],
        responses: {
          "200": {
            description: "User information retrieved successfully",
            content: {
              "application/json": {
                schema: {
                  $ref: getSchemaRef("GetMe", findMeMode),
                },
              },
            },
          },
          "401": {
            description: "Authentication required",
          },
        },
      },
    };
  }

  if (!isAuthEndpointDisabled("updateMe")) {
    const updateMeMode = await getSchemaMode("updateMe", arkosConfig);
    const userMode = await getSchemaMode("user", arkosConfig);
    if (!paths["/api/users/me"]) paths["/api/users/me"] = {};
    paths["/api/users/me"]!.patch = {
      tags: ["Authentication"],
      summary: "Update current user information",
      description: "Updates information for the currently authenticated user",
      operationId: "updateMe",
      security: [{ BearerAuth: [] }],
      requestBody: {
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
        "200": {
          description: "User updated successfully",
          content: {
            "application/json": {
              schema: {
                $ref: getSchemaRef("User", userMode),
              },
            },
          },
        },
        "400": {
          description: "Invalid input data",
        },
        "401": {
          description: "Authentication required",
        },
      },
    };
  }

  if (!isAuthEndpointDisabled("deleteMe")) {
    if (!paths["/api/users/me"]) paths["/api/users/me"] = {};
    paths["/api/users/me"]!.delete = {
      tags: ["Authentication"],
      summary: "Delete current user account",
      description: "Marks the current user's account as deleted",
      operationId: "deleteMe",
      security: [{ BearerAuth: [] }],
      responses: {
        "200": {
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
        "401": {
          description: "Authentication required",
        },
      },
    };
  }

  if (!isAuthEndpointDisabled("findManyAuthAction")) {
    paths["/api/auth-actions"] = {
      get: {
        tags: ["Authentication"],
        summary: "Get all authentication actions",
        description:
          "Retrieves a list of all available authentication actions and permissions",
        operationId: "findManyAuthAction",
        security: [{ BearerAuth: [] }],
        responses: {
          "200": {
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
          "401": {
            description: "Authentication required",
          },
          "403": {
            description: "Insufficient permissions",
          },
        },
      },
    };
  }

  return paths;
}
